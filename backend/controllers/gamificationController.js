const Gamification = require('../models/Gamification');
const WorkoutLog = require('../models/WorkoutLog');
const DailyDietLog = require('../models/DailyDietLog');

// API: GET /api/gamification/stats
const getUserStats = async (req, res) => {
  try {
    const userId = req.user.id; 

    // 1. Tìm bảng Gamification của User
    let stats = await Gamification.findOne({ userId });

    // Nếu chưa có thì tạo mới một cái sườn
    if (!stats) {
      stats = new Gamification({ userId });
    }

    // ==========================================
    // 2. AUTO-SYNC: TỰ ĐỘNG ĐẾM LẠI DỮ LIỆU CŨ
    // ==========================================
    // Chạy song song 2 lệnh đếm để không làm chậm API
    const [realWorkouts, realDietDays] = await Promise.all([
      WorkoutLog.countDocuments({ userId, isCompleted: true }), // Đếm các buổi tập ĐÃ HOÀN THÀNH
      DailyDietLog.countDocuments({ userId, isDayCompleted: true }) // Đếm các ngày ăn ĐÃ HOÀN THÀNH
    ]);

    // Ghi đè con số thực tế vào stats
    stats.totalWorkoutSessions = realWorkouts;
    stats.totalPerfectDietDays = realDietDays;

    // Lưu lại vào Database để chốt sổ
    await stats.save();
    // ==========================================

    // Trả về cho Frontend
    res.status(200).json({ success: true, stats });

  } catch (error) {
    console.error("Lỗi lấy dữ liệu Gamification:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

module.exports = { getUserStats };