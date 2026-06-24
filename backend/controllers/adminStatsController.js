const Transaction = require("../models/Transaction");
const User = require("../models/User");

// =========================================================
// CHỨC NĂNG 1: THỐNG KÊ DOANH THU THEO NGÀY, THÁNG, NĂM
// =========================================================
exports.getRevenueStats = async (req, res) => {
  try {
    const now = new Date();

    const startOfToday = new Date(now.setHours(0, 0, 0, 0));
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const calculateRevenue = async (startDate) => {
      const result = await Transaction.aggregate([
        {
          $match: {
            transactionType: "PREMIUM_UPGRADE",
            status: "SUCCESS",
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: "$amount" },
            count: { $sum: 1 }
          }
        }
      ]);
      return result[0] || { totalAmount: 0, count: 0 };
    };

    const [todayData, monthData, yearData] = await Promise.all([
      calculateRevenue(startOfToday),
      calculateRevenue(startOfMonth),
      calculateRevenue(startOfYear)
    ]);

    const recentTransactions = await Transaction.find({
      transactionType: "PREMIUM_UPGRADE",
      status: "SUCCESS"
    })
      .populate("userId", "name email")
      .sort({ createdAt: -1 })
      .limit(10);

    return res.status(200).json({
      success: true,
      data: {
        today: { revenue: todayData.totalAmount, orders: todayData.count },
        thisMonth: { revenue: monthData.totalAmount, orders: monthData.count },
        thisYear: { revenue: yearData.totalAmount, orders: yearData.count },
        recentHistory: recentTransactions
      }
    });

  } catch (error) {
    console.error("Lỗi thống kê doanh thu:", error);
    return res.status(500).json({ message: "Lỗi máy chủ khi lấy thống kê!" });
  }
};

// =========================================================
// CHỨC NĂNG 2: HỆ THỐNG AN NINH TỰ ĐỘNG
// =========================================================
// =========================================================
// HỆ THỐNG AN NINH TỰ ĐỘNG (RADAR)
// =========================================================
exports.checkPremiumHack = async (req, res) => {
  try {
    const currentAdminId = req.user?._id || req.userId || null;

    // ---------------------------------------------------
    // TÁC VỤ 1: QUÉT TÌM HACKER LÁCH LUẬT LẤY VIP LẬU
    // ---------------------------------------------------
    const hackerList = await User.aggregate([
      { $match: { isPremium: true, role: { $ne: "admin" } } }, 
      {
        $lookup: {
          from: "transactions", 
          localField: "_id",
          foreignField: "userId",
          as: "paymentHistory"
        }
      },
      {
        $addFields: {
          validPremiumInvoices: {
            $filter: {
              input: "$paymentHistory",
              as: "invoice",
              cond: {
                $and: [
                  { $eq: ["$$invoice.transactionType", "PREMIUM_UPGRADE"] },
                  { $eq: ["$$invoice.status", "SUCCESS"] }
                ]
              }
            }
          }
        }
      },
      { $match: { $expr: { $eq: [{ $size: "$validPremiumInvoices" }, 0] } } },
      { $project: { password: 0, paymentHistory: 0, validPremiumInvoices: 0, __v: 0 } }
    ]);

    // ---------------------------------------------------
    // TÁC VỤ 2: QUÉT TÌM ADMIN LẬU (XÂM NHẬP HỆ THỐNG)
    // ---------------------------------------------------
    const allAdmins = await User.find({ role: "admin" }).select("-password").sort({ createdAt: 1 });
    let adminHackers = [];
    let secondaryAdminDetected = false;

    if (allAdmins.length > 1) {
      secondaryAdminDetected = true;
      adminHackers = allAdmins.slice(1);
      for (let intruder of adminHackers) {
        if (currentAdminId && intruder._id.toString() === currentAdminId.toString()) continue; 
        if (!intruder.isLocked) {
          intruder.isLocked = true; 
          await intruder.save();
        }
      }
    }

    // ---------------------------------------------------
    // TÁC VỤ 3: QUÉT TRAINER THIẾU THÔNG TIN KHẨN CẤP
    // Khớp 100% với mongoose.model("User") của bạn
    // ---------------------------------------------------
    const incompleteTrainers = await User.find({
      role: "trainer",
      $or: [
        { phone: { $exists: false } },
        { phone: "" },
        { address: { $exists: false } },
        { address: "" },
        { cccd: { $exists: false } },
        { cccd: "" }
      ]
    }).select("name email createdAt role isLocked phone address cccd");

    let lockedTrainersCount = 0;
    for (let trainer of incompleteTrainers) {
      if (!trainer.isLocked) {
        trainer.isLocked = true; // Kích hoạt lệnh phong tỏa tự động
        await trainer.save();
        lockedTrainersCount++;
      }
    }

    // Đánh giá trạng thái an toàn tổng thể
    const isSystemSafe = hackerList.length === 0 && adminHackers.length === 0 && incompleteTrainers.length === 0;

    return res.status(200).json({
      success: true,
      isSystemSafe: isSystemSafe, 
      warningMessage: isSystemSafe ? "Hệ thống an toàn." : "Phát hiện tài khoản vi phạm chính sách hoặc có dấu hiệu xâm nhập!",
      hackers: hackerList,
      adminHackers: adminHackers,
      incompleteTrainers: incompleteTrainers, 
      secondaryAdminDetected: secondaryAdminDetected,
      totalAdmins: allAdmins.length,
      lockedTrainersCount: lockedTrainersCount
    });

  } catch (error) {
    console.error("Lỗi kiểm tra bảo mật hệ thống:", error);
    return res.status(500).json({ message: "Lỗi máy chủ khi quét lỗ hổng bảo mật!" });
  }
};
// =========================================================
// CHỨC NĂNG 3: THỰC THI LỆNH TRỪNG PHẠT TRỰC TIẾP TỪ RADAR
// =========================================================

// API: Khóa/Mở khóa tài khoản nhanh
exports.quickLockUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, message: "Không tìm thấy người dùng!" });

    user.isLocked = !user.isLocked;
    await user.save();

    return res.status(200).json({ 
      success: true, 
      message: user.isLocked ? "Đã khóa tài khoản thành công!" : "Đã mở khóa tài khoản!",
      isLocked: user.isLocked 
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Lỗi thực thi khóa tài khoản." });
  }
};

// API: Hủy quyền VIP Premium lập tức
exports.quickRevokePremium = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, message: "Không tìm thấy người dùng!" });

    user.isPremium = false;
    user.premiumUntil = null;
    await user.save();

    return res.status(200).json({ 
      success: true, 
      message: "Đã tước quyền VIP Premium của tài khoản này vĩnh viễn!" 
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Lỗi thực thi tước quyền VIP." });
  }
};

// API: Tước quyền Admin lậu về lại làm User (MỚI BỔ SUNG CHO FRONTEND)
exports.quickRevokeAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    
    if (!user) return res.status(404).json({ success: false, message: "Không tìm thấy người dùng!" });
    
    // Bảo vệ không cho tự tước quyền của chính mình đang đăng nhập
    if (req.user && req.user._id.toString() === id.toString()) {
      return res.status(403).json({ success: false, message: "Không thể tự tước quyền của chính mình!" });
    }

    user.role = 'user'; // Hạ cấp về dân thường
    await user.save();

    return res.status(200).json({ 
      success: true, 
      message: "Đã tước quyền Admin của kẻ gian lận, hạ cấp về tài khoản cơ bản!" 
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Lỗi thực thi tước quyền Admin." });
  }
};
exports.quickRevokeTrainer = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Tìm trainer và cập nhật: Chuyển role về "user" đồng thời mở khóa (isLocked = false) 
    // để họ có thể đăng nhập lại như một người dùng bình thường nhưng không còn quyền trainer.
    const user = await User.findByIdAndUpdate(
      id,
      { role: "user", isLocked: false },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: "Không tìm thấy tài khoản." });
    }

    return res.status(200).json({
      success: true,
      message: `Đã hủy tư cách Trainer của tài khoản ${user.email}. Tài khoản đã được chuyển về quyền User thường.`
    });
  } catch (error) {
    console.error("Lỗi khi hủy tư cách Trainer:", error);
    return res.status(500).json({ success: false, message: "Lỗi máy chủ khi thực thi lệnh." });
  }
};