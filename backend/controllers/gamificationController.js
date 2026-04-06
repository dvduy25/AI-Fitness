const Gamification = require('../models/Gamification');
const WorkoutLog = require('../models/WorkoutLog');
const DailyDietLog = require('../models/DailyDietLog');

// API: GET /api/gamification/stats
const getUserStats = async (req, res) => {
  try {
    const userId = req.user.id; 

    // 1. Lấy thông tin Gamification cơ bản
    let stats = await Gamification.findOne({ userId });
    if (!stats) {
      stats = new Gamification({ userId });
      await stats.save();
    }

    // ==========================================
    // 2. TÍNH TOÁN DỮ LIỆU TUẦN VÀ THÁNG
    // ==========================================
    const now = new Date();
    
    // Tìm ngày Thứ 2 của tuần hiện tại
    const dayOfWeek = now.getDay() || 7; // Chuyển Chủ Nhật (0) thành 7
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek + 1, 0, 0, 0);
    
    // Tìm ngày mùng 1 của tháng hiện tại
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);

    // Chạy song song 4 lệnh đếm để đảm bảo API vẫn chạy siêu nhanh
    const [workoutsThisWeek, workoutsThisMonth, dietThisWeek, dietThisMonth] = await Promise.all([
      WorkoutLog.countDocuments({ userId, isCompleted: true, date: { $gte: startOfWeek } }),
      WorkoutLog.countDocuments({ userId, isCompleted: true, date: { $gte: startOfMonth } }),
      DailyDietLog.countDocuments({ userId, isDayCompleted: true, date: { $gte: startOfWeek } }),
      DailyDietLog.countDocuments({ userId, isDayCompleted: true, date: { $gte: startOfMonth } })
    ]);

    // Trả về cho Frontend cả stats gốc + dữ liệu theo giai đoạn (periodStats)
    res.status(200).json({ 
      success: true, 
      stats, 
      periodStats: {
        workoutsThisWeek,
        workoutsThisMonth,
        dietThisWeek,
        dietThisMonth
      }
    });

  } catch (error) {
    console.error("Lỗi lấy dữ liệu Gamification:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

module.exports = { getUserStats };