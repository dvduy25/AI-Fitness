const Gamification = require('../models/Gamification');
const WorkoutLog = require('../models/WorkoutLog');
const DailyDietLog = require('../models/DailyDietLog');

// 1. API: GET /api/stats/gamification
const getUserStats = async (req, res) => {
  try {
    const userId = req.user.id; 
    let stats = await Gamification.findOne({ userId });

    if (!stats) {
      stats = {
        rankPoints: 0, streak: 0, totalWorkoutSessions: 0, totalPerfectDietDays: 0,
        failStats: { eatWrongDays: 0, noWorkoutDays: 0, totalFailsDays: 0 },
        currentWeekTrackers: { eatWrong: 0, noWorkout: 0, bothFail: 0 }
      };
    }

    res.status(200).json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// 2. API: GET /api/stats/history-counts
const getUserHistoryCounts = async (req, res) => {
  try {
    const userId = req.user.id;

    // Chạy song song đếm tổng số bản ghi đã tạo
    const [totalWorkouts, totalDietDays] = await Promise.all([
      WorkoutLog.countDocuments({ userId }),
      DailyDietLog.countDocuments({ userId })
    ]);

    res.status(200).json({ 
      success: true, 
      data: { totalWorkouts, totalDietDays }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

module.exports = { getUserStats, getUserHistoryCounts };