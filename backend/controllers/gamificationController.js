const Gamification = require('../models/Gamification');

// API: GET /api/gamification/stats
const getUserStats = async (req, res) => {
  try {
    // req.user.id được lấy từ middleware xác thực (verifyToken)
    const userId = req.user.id; 

    let stats = await Gamification.findOne({ userId });

    // Nếu user mới tinh chưa có bảng điểm, trả về các chỉ số bằng 0
    if (!stats) {
      stats = {
        rankPoints: 0,
        streak: 0,
        weeklyStats: { eatWrongDays: 0, noWorkoutDays: 0, totalFailsDays: 0 }
      };
    }

    res.status(200).json({ success: true, stats });
  } catch (error) {
    console.error("Lỗi lấy dữ liệu Gamification:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

module.exports = { getUserStats };