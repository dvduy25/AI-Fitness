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
// CHỨC NĂNG 2: HỆ THỐNG AN NINH TỰ ĐỘNG BIẾN ĐỔI VÀ ĐỐI SOÁT
// =========================================================
exports.checkPremiumHack = async (req, res) => {
  try {
    // ---------------------------------------------------
    // TÁC VỤ 1: QUÈT TÌM HACKER LÁCH LUẬT LẤY VIP LẬU
    // ---------------------------------------------------
    const hackerList = await User.aggregate([
      { 
        $match: { 
          isPremium: true, 
          role: { $ne: "admin" } 
        } 
      }, 
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
      {
        $match: {
          $expr: { $eq: [{ $size: "$validPremiumInvoices" }, 0] }
        }
      },
      {
        $project: { password: 0, paymentHistory: 0, validPremiumInvoices: 0, __v: 0 }
      }
    ]);

    // ---------------------------------------------------
    // TÁC VỤ 2: BẪY VÀ TỰ ĐỘNG KHÓA ADMIN THỨ 2 XUẤT HIỆN
    // ---------------------------------------------------
    // Sắp xếp theo thứ tự cũ nhất lên trước (Admin gốc tạo đầu tiên)
    const allAdmins = await User.find({ role: "admin" }).sort({ createdAt: 1 });
    
    let secondaryAdminDetected = false;
    let lockedIntrudersCount = 0;

    if (allAdmins.length > 1) {
      secondaryAdminDetected = true;
      // Trích xuất toàn bộ các tài khoản giả mạo quyền Admin từ tài khoản thứ 2 trở đi
      const intruderAdmins = allAdmins.slice(1);
      
      for (let intruder of intruderAdmins) {
        if (!intruder.isLocked) {
          intruder.isLocked = true; // Kích hoạt tự động khóa nghiêm ngặt
          await intruder.save();
          lockedIntrudersCount++;
        }
      }
    }

    // Lấy lại danh sách Admin sau khi đã xử lý khóa tự động để hiển thị chính xác trạng thái lên UI
    const updatedAdminList = await User.find({ role: "admin" })
      .select("name email createdAt role isLocked")
      .sort({ createdAt: 1 });

    const isSystemSafe = hackerList.length === 0 && !secondaryAdminDetected;

    return res.status(200).json({
      success: true,
      isSystemSafe: isSystemSafe, 
      secondaryAdminDetected: secondaryAdminDetected,
      lockedIntrudersCount: lockedIntrudersCount,
      warningMessage: isSystemSafe 
        ? "Hệ thống an toàn. Không phát hiện vi phạm bất thường." 
        : `Hệ thống phát hiện dấu hiệu xâm nhập trái phép!`,
      hackers: hackerList,
      totalAdmins: updatedAdminList.length,
      admins: updatedAdminList
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
    user.premiumUntil = null; // Trả về trạng thái tài khoản cơ bản free
    await user.save();

    return res.status(200).json({ 
      success: true, 
      message: "Đã tước quyền VIP Premium của tài khoản này vĩnh viễn!" 
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Lỗi thực thi tước quyền VIP." });
  }
};