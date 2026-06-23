const Gamification = require('../models/Gamification');
const WorkoutLog = require('../models/WorkoutLog');
const DailyDietLog = require('../models/DailyDietLog');
const { closeDayForUser } = require('../services/cronService');

// API: GET /api/gamification/stats
const getUserStats = async (req, res) => {
  try {
    const userId = req.user.id; 
    let stats = await Gamification.findOne({ userId });
    if (!stats) stats = new Gamification({ userId });

    const now = new Date();
    const dayOfWeek = now.getDay() || 7; 
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek + 1, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);

    // Đếm trực tiếp từ Log thực tế (Nguồn sự thật duy nhất)
    const [
      realWorkouts, realDietDays,
      workoutsThisWeek, workoutsThisMonth,
      dietThisWeek, dietThisMonth
    ] = await Promise.all([
      WorkoutLog.countDocuments({ userId, isCompleted: true }), 
      DailyDietLog.countDocuments({ userId, isDayCompleted: true }), 
      
      WorkoutLog.countDocuments({ userId, isCompleted: true, date: { $gte: startOfWeek } }), 
      WorkoutLog.countDocuments({ userId, isCompleted: true, date: { $gte: startOfMonth } }), 
      
      DailyDietLog.countDocuments({ userId, isDayCompleted: true, date: { $gte: startOfWeek } }), 
      DailyDietLog.countDocuments({ userId, isDayCompleted: true, date: { $gte: startOfMonth } }) 
    ]);

    // Ép kiểu sang Object thuần để gán đè dữ liệu realtime trả về client mà không cần lưu vào DB
    const responseStats = stats.toObject();
    responseStats.totalWorkoutSessions = realWorkouts;
    responseStats.totalPerfectDietDays = realDietDays;

    res.status(200).json({ 
      success: true, 
      stats: responseStats, 
      periodStats: { workoutsThisWeek, workoutsThisMonth, dietThisWeek, dietThisMonth }
    });

  } catch (error) {
    console.error("Lỗi lấy dữ liệu Gamification:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// API: POST /api/gamification/manual-close (Chốt sổ sớm ngay trong ngày)
const manualCloseDay = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await closeDayForUser(userId);
    
    if (!result.success) {
      return res.status(400).json({ success: false, message: result.message });
    }
    return res.status(200).json({ success: true, message: result.message });
  } catch (error) {
    console.error("Lỗi API chốt sổ thủ công:", error);
    res.status(500).json({ success: false, message: "Lỗi hệ thống khi chốt sổ." });
  }
};

module.exports = { getUserStats, manualCloseDay };