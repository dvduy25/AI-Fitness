const Gamification = require('../models/Gamification');
const WorkoutLog = require('../models/WorkoutLog');
const DailyDietLog = require('../models/DailyDietLog');
const { closeDayForUser } = require('../services/cronJob');

// API: GET /api/gamification/stats
const getUserStats = async (req, res) => {
  try {
    const userId = req.user.id; 
    let stats = await Gamification.findOne({ userId });
    if (!stats) stats = new Gamification({ userId });

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const dayOfWeek = now.getDay() || 7; 
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek + 1, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);

    // Chạy song song kiểm tra đếm trọn đời/tuần/tháng + Lấy trạng thái CỦA RIÊNG NGÀY HÔM NAY
    const [
      realWorkouts, realDietDays,
      workoutsThisWeek, workoutsThisMonth,
      dietThisWeek, dietThisMonth,
      todayWorkout, todayDiet
    ] = await Promise.all([
      WorkoutLog.countDocuments({ userId, isCompleted: true }), 
      DailyDietLog.countDocuments({ userId, isDayCompleted: true }), 
      
      WorkoutLog.countDocuments({ userId, isCompleted: true, date: { $gte: startOfWeek } }), 
      WorkoutLog.countDocuments({ userId, isCompleted: true, date: { $gte: startOfMonth } }), 
      
      DailyDietLog.countDocuments({ userId, isDayCompleted: true, date: { $gte: startOfWeek } }), 
      DailyDietLog.countDocuments({ userId, isDayCompleted: true, date: { $gte: startOfMonth } }),

      // Kiểm tra xem hôm nay có log tập và log ăn hoàn thành chưa
      WorkoutLog.findOne({ userId, date: { $gte: startOfDay, $lte: endOfDay }, isCompleted: true }),
      DailyDietLog.findOne({ userId, date: { $gte: startOfDay, $lte: endOfDay }, isDayCompleted: true })
    ]);

    const responseStats = stats.toObject();
    responseStats.totalWorkoutSessions = realWorkouts;
    responseStats.totalPerfectDietDays = realDietDays;

    res.status(200).json({ 
      success: true, 
      stats: responseStats, 
      periodStats: { workoutsThisWeek, workoutsThisMonth, dietThisWeek, dietThisMonth },
      // Trả thêm object này về để Frontend biết hôm nay làm bài tập chưa
      todayStatus: {
        didWorkout: !!todayWorkout,
        didEatRight: !!todayDiet
      }
    });

  } catch (error) {
    console.error("Lỗi lấy dữ liệu Gamification:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// API: POST /api/gamification/manual-close
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