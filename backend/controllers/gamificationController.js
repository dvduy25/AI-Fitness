const Gamification = require('../models/Gamification');
const WorkoutLog = require('../models/WorkoutLog');
const DailyDietLog = require('../models/DailyDietLog');

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

    // Chạy song song 6 lệnh đếm (2 trọn đời + 2 tuần + 2 tháng)
    const [
      realWorkouts, realDietDays,
      workoutsThisWeek, workoutsThisMonth,
      dietThisWeek, dietThisMonth
    ] = await Promise.all([
      WorkoutLog.countDocuments({ userId, isCompleted: true }), // Trọn đời
      DailyDietLog.countDocuments({ userId, isDayCompleted: true }), // Trọn đời
      
      WorkoutLog.countDocuments({ userId, isCompleted: true, date: { $gte: startOfWeek } }), // Tuần
      WorkoutLog.countDocuments({ userId, isCompleted: true, date: { $gte: startOfMonth } }), // Tháng
      
      DailyDietLog.countDocuments({ userId, isDayCompleted: true, date: { $gte: startOfWeek } }), // Tuần
      DailyDietLog.countDocuments({ userId, isDayCompleted: true, date: { $gte: startOfMonth } }) // Tháng
    ]);

    // Ghi đè số trọn đời vào Database để chốt sổ
    stats.totalWorkoutSessions = realWorkouts;
    stats.totalPerfectDietDays = realDietDays;
    await stats.save();

    res.status(200).json({ 
      success: true, 
      stats, 
      periodStats: { workoutsThisWeek, workoutsThisMonth, dietThisWeek, dietThisMonth }
    });

  } catch (error) {
    console.error("Lỗi lấy dữ liệu Gamification:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

module.exports = { getUserStats };