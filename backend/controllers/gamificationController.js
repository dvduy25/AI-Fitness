// controllers/gamificationController.js

const Gamification = require('../models/Gamification');
const WorkoutLog = require('../models/WorkoutLog');
const DailyDietLog = require('../models/DailyDietLog');
const { closeDayForUser } = require('../services/cronService');
const { generateCoachingNotifications } = require('../services/coachingService');

const toYYYYMMDD = (dateObj) => {
  const yyyy = dateObj.getFullYear();
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const dd = String(dateObj.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

// ==========================================
// API: GET /api/gamification/stats
// ==========================================
const getUserStats = async (req, res) => {
  try {
    const userId = req.user.id; 
    let stats = await Gamification.findOne({ userId });
    if (!stats) stats = await Gamification.create({ userId });

    const now = new Date();
    
    // --- 1. Mốc thời gian ---
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    
    const dayOfWeek = now.getDay() || 7; 
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek + 1, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);

    const todayStr = toYYYYMMDD(now);
    const startOfWeekStr = toYYYYMMDD(startOfWeek);
    const startOfMonthStr = toYYYYMMDD(startOfMonth);

    // --- 2. Query dữ liệu song song ---
    const [
      realWorkouts, realDietDays,
      workoutsThisWeek, workoutsThisMonth,
      dietThisWeek, dietThisMonth,
      todayWorkoutDoc, todayDietDoc
    ] = await Promise.all([
      WorkoutLog.countDocuments({ userId, didWorkout: true }), 
      DailyDietLog.countDocuments({ userId, isDayCompleted: true }), 
      
      WorkoutLog.countDocuments({ userId, didWorkout: true, date: { $gte: startOfWeekStr } }), 
      WorkoutLog.countDocuments({ userId, didWorkout: true, date: { $gte: startOfMonthStr } }), 
      
      DailyDietLog.countDocuments({ userId, isDayCompleted: true, date: { $gte: startOfWeek } }), 
      DailyDietLog.countDocuments({ userId, isDayCompleted: true, date: { $gte: startOfMonth } }),

      WorkoutLog.findOne({ userId, date: todayStr }),
      DailyDietLog.findOne({ userId, date: { $gte: startOfDay, $lte: endOfDay } })
    ]);

    // --- 3. Kiểm tra trạng thái Workout ---
    const hasWorkoutLog = !!todayWorkoutDoc;
    const didWorkout = hasWorkoutLog ? todayWorkoutDoc.didWorkout : false;
    const currentHour = now.getHours();
    const isWorkoutOverdue = !didWorkout && (currentHour >= 20);

    // --- 4. Kiểm tra trạng thái Diet ---
    const hasDietPlan = !!todayDietDoc;
    let didEatRight = false;
    let isMealOverdue = false;
    let overdueMealName = null;
    let consumedCalories = 0;
    let targetCalories = 0;
    let isCaloriesMet = false;

    if (hasDietPlan) {
      didEatRight = todayDietDoc.isDayCompleted;
      consumedCalories = todayDietDoc.actualDailyTotal?.calories || 0;

      const upcomingCalories = todayDietDoc.adjustedUpcomingMeals.reduce((sum, meal) => sum + (meal.mealTotal?.calories || 0), 0);
      targetCalories = consumedCalories + upcomingCalories;

      if (targetCalories > 0) {
        const calRatio = consumedCalories / targetCalories;
        isCaloriesMet = didEatRight || (calRatio >= 0.9 && calRatio <= 1.1);
      }

      if (todayDietDoc.adjustedUpcomingMeals && todayDietDoc.adjustedUpcomingMeals.length > 0) {
        for (const meal of todayDietDoc.adjustedUpcomingMeals) {
          if (meal.scheduledTime) {
            const [mHours, mMinutes] = meal.scheduledTime.split(':').map(Number);
            const mealDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), mHours, mMinutes, 0);
            
            if (now > mealDate) {
              isMealOverdue = true;
              overdueMealName = meal.mealType;
              break; 
            }
          }
        }
      }
    }

    // --- 5. TẠO THÔNG BÁO CHỈ TRÍCH ĐỘNG TỪ SERVICE ---
    const todayStatus = {
      workout: { hasLog: hasWorkoutLog, didWorkout, isOverdue: isWorkoutOverdue },
      diet: {
        hasPlan: hasDietPlan, didEatRight, targetCalories, consumedCalories,
        isCaloriesMet, isMealOverdue, overdueMealName
      }
    };

    const notifications = generateCoachingNotifications({
      style: stats.coachingStyle,
      isViolating: stats.activeViolation?.isViolating,
      workout: todayStatus.workout,
      diet: todayStatus.diet
    });

    // --- 6. TRẢ VỀ RESPONSE ---
    const responseStats = stats.toObject();
    responseStats.totalWorkoutSessions = realWorkouts;
    responseStats.totalPerfectDietDays = realDietDays;

    res.status(200).json({ 
      success: true, 
      stats: responseStats, 
      periodStats: { workoutsThisWeek, workoutsThisMonth, dietThisWeek, dietThisMonth },
      todayStatus: todayStatus,
      notifications: notifications // Trả danh sách chỉ trích động về Frontend
    });

  } catch (error) {
    console.error("Lỗi lấy dữ liệu Gamification:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

const manualCloseDay = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await closeDayForUser(userId);
    if (!result.success) return res.status(400).json({ success: false, message: result.message });
    return res.status(200).json({ success: true, message: result.message });
  } catch (error) {
    console.error("Lỗi API chốt sổ thủ công:", error);
    res.status(500).json({ success: false, message: "Lỗi hệ thống khi chốt sổ." });
  }
};

const updateCoachingStyle = async (req, res) => {
  try {
    const userId = req.user.id;
    const { style } = req.body; 

    if (!['EASY', 'SERIOUS', 'STRICT'].includes(style)) {
      return res.status(400).json({ success: false, message: "Tính cách không hợp lệ." });
    }

    const stats = await Gamification.findOneAndUpdate(
      { userId },
      { coachingStyle: style },
      { new: true, upsert: true }
    );

    res.status(200).json({ 
      success: true, 
      message: `Đã cập nhật tính cách AI thành ${style}`, 
      coachingStyle: stats.coachingStyle 
    });
  } catch (error) {
    console.error("Lỗi cập nhật coaching style:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

const resolveViolation = async (req, res) => {
  try {
    const userId = req.user.id;
    const stats = await Gamification.findOne({ userId });
    if (!stats) return res.status(404).json({ success: false, message: "Không tìm thấy dữ liệu" });

    if (!stats.activeViolation?.isViolating) {
      return res.status(400).json({ success: false, message: "Bạn không có vi phạm nào cần xử lý." });
    }

    stats.activeViolation.isViolating = false;
    stats.activeViolation.violationType = null;
    stats.activeViolation.nagCount = 0;
    
    await stats.save();

    res.status(200).json({ 
      success: true, 
      message: "Đã ghi nhận cam kết sửa sai! Hãy giữ đúng kỷ luật." 
    });
  } catch (error) {
    console.error("Lỗi xử lý vi phạm:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

module.exports = { 
  getUserStats, 
  manualCloseDay,
  updateCoachingStyle, 
  resolveViolation     
};