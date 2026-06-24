const Transaction = require("../models/Transaction");
const User = require("../models/User"); // Giả định bạn có model User

// =========================================================
// CHỨC NĂNG 1: THỐNG KÊ DOANH THU THEO NGÀY, THÁNG, NĂM
// =========================================================
exports.getRevenueStats = async (req, res) => {
  try {
    const now = new Date();

    // Thiết lập mốc thời gian đầu ngày, đầu tháng, đầu năm
    const startOfToday = new Date(now.setHours(0, 0, 0, 0));
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    // Hàm phụ để tính tổng tiền trong một khoảng thời gian
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

    // Chạy song song cả 3 truy vấn để tối ưu tốc độ
    const [todayData, monthData, yearData] = await Promise.all([
      calculateRevenue(startOfToday),
      calculateRevenue(startOfMonth),
      calculateRevenue(startOfYear)
    ]);

    // Lấy chi tiết 10 giao dịch mua bán gần nhất để hiển thị ra màn hình lịch sử
    const recentTransactions = await Transaction.find({
      transactionType: "PREMIUM_UPGRADE",
      status: "SUCCESS"
    })
      .populate("userId", "name email") // Lấy thêm tên và email người mua
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
// CHỨC NĂNG 2: THUẬT TOÁN PHÁT HIỆN TÀI KHOẢN HACK VIP
// =========================================================
// =========================================================
// CHỨC NĂNG 2: THUẬT TOÁN PHÁT HIỆN TÀI KHOẢN HACK VIP (ĐÃ CẢI TIẾN)
// =========================================================

// =========================================================
// CHỨC NĂNG 2: HỆ THỐNG AN NINH (QUÉT VIP LẬU & RÀ SOÁT ADMIN)
// =========================================================
exports.checkPremiumHack = async (req, res) => {
  try {
    // ---------------------------------------------------
    // TÁC VỤ 1: TÌM HACKER LÁCH LUẬT LẤY VIP
    // ---------------------------------------------------
    const hackerList = await User.aggregate([
      // Lọc user có Premium NHƯNG KHÔNG PHẢI LÀ ADMIN
      { 
        $match: { 
          isPremium: true, 
          role: { $ne: "admin" } // Đổi thành isAdmin: { $ne: true } nếu DB của bạn dùng biến isAdmin
        } 
      }, 
      // Nối với bảng giao dịch
      {
        $lookup: {
          from: "transactions", 
          localField: "_id",
          foreignField: "userId",
          as: "paymentHistory"
        }
      },
      // Lọc ra các hóa đơn Mua Premium thành công
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
      // Nếu không có hóa đơn nào -> Hacker
      {
        $match: {
          $expr: { $eq: [{ $size: "$validPremiumInvoices" }, 0] }
        }
      },
      // Ẩn các trường không cần thiết
      {
        $project: { password: 0, paymentHistory: 0, validPremiumInvoices: 0, __v: 0 }
      }
    ]);

    // ---------------------------------------------------
    // TÁC VỤ 2: RÀ SOÁT TÀI KHOẢN ADMIN (MỚI THÊM)
    // ---------------------------------------------------
    // Tìm tất cả user đang có quyền Admin
    const adminList = await User.find({ 
      role: "admin" // Đổi thành isAdmin: true nếu DB của bạn dùng biến isAdmin
    })
    .select("name email createdAt role") // Chỉ lấy các thông tin cần thiết, tuyệt đối không lấy password
    .sort({ createdAt: -1 });

    // ---------------------------------------------------
    // TRẢ VỀ KẾT QUẢ TỔNG HỢP CHO FRONTEND
    // ---------------------------------------------------
    const isSystemSafe = hackerList.length === 0;

    return res.status(200).json({
      success: true,
      isSystemSafe: isSystemSafe, 
      warningMessage: isSystemSafe 
        ? "Hệ thống an toàn. Số tiền khớp với VIP." 
        : `⚠️ PHÁT HIỆN: Có ${hackerList.length} tài khoản VIP lậu!`,
      
      // Trả về danh sách VIP lậu
      hackers: hackerList,
      
      // Trả về thêm danh sách Admin để đối soát
      totalAdmins: adminList.length,
      admins: adminList
    });

  } catch (error) {
    console.error("Lỗi kiểm tra bảo mật hệ thống:", error);
    return res.status(500).json({ message: "Lỗi máy chủ khi quét lỗ hổng bảo mật!" });
  }
};