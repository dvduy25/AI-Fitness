// controllers/gamificationController.js

const Gamification = require('../models/Gamification');
const WorkoutLog = require('../models/WorkoutLog');
const DailyDietLog = require('../models/DailyDietLog');
const User = require('../models/User');
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
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    
    const dayOfWeek = now.getDay() || 7; 
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek + 1, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);

    const todayStr = toYYYYMMDD(now);
    const startOfWeekStr = toYYYYMMDD(startOfWeek);
    const startOfMonthStr = toYYYYMMDD(startOfMonth);

    const [
      realWorkouts, realDietDays,
      workoutsThisWeek, workoutsThisMonth,
      dietThisWeek, dietThisMonth,
      todayWorkoutDoc, todayDietDoc,
      userDoc
    ] = await Promise.all([
      WorkoutLog.countDocuments({ userId, didWorkout: true }), 
      DailyDietLog.countDocuments({ userId, isDayCompleted: true }), 
      WorkoutLog.countDocuments({ userId, didWorkout: true, date: { $gte: startOfWeekStr } }), 
      WorkoutLog.countDocuments({ userId, didWorkout: true, date: { $gte: startOfMonthStr } }), 
      DailyDietLog.countDocuments({ userId, isDayCompleted: true, date: { $gte: startOfWeek } }), 
      DailyDietLog.countDocuments({ userId, isDayCompleted: true, date: { $gte: startOfMonth } }),
      WorkoutLog.findOne({ userId, date: todayStr }),
      DailyDietLog.findOne({ userId, date: { $gte: startOfDay, $lte: endOfDay } }),
      User.findById(userId)
    ]);

    // Lấy thời gian chuẩn theo múi giờ Việt Nam
    const vnTime = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }));
    const currentTotalMins = vnTime.getHours() * 60 + vnTime.getMinutes();

    // --- 1. Workout Status ---
    const hasWorkoutLog = !!todayWorkoutDoc;
    const didWorkout = hasWorkoutLog ? (todayWorkoutDoc.didWorkout || todayWorkoutDoc.isCompleted) : false;
    const isRestDay = hasWorkoutLog ? (todayWorkoutDoc.isRestDay === true) : false; 
    
    let isWorkoutOverdue = false;
    let isWorkoutUpcoming = false;

    if (!didWorkout && !isRestDay) {
      if (todayWorkoutDoc?.scheduledTime) {
        const [wHours, wMinutes] = todayWorkoutDoc.scheduledTime.split(':').map(Number);
        const workoutTotalMins = wHours * 60 + wMinutes;
        const diffMins = workoutTotalMins - currentTotalMins;
        
        if (diffMins < 0) isWorkoutOverdue = true;
        else if (diffMins <= 30) isWorkoutUpcoming = true; 
      } else {
        const currentHour = vnTime.getHours();
        if (currentHour >= 20) isWorkoutOverdue = true;
        else if (currentHour === 19) isWorkoutUpcoming = true;
      }
    }

    // --- 2. Diet Status ---
    const hasDietPlan = !!todayDietDoc;
    const isDayCompleted = todayDietDoc?.isDayCompleted || false;
    let didEatRight = isDayCompleted;
    let isMealOverdue = false;
    let isMealUpcoming = false;
    let overdueMealName = null;
    let upcomingMealName = null;
    
    let consumedCalories = 0;
    let targetCalories = 0;
    let isCaloriesMet = false;
    let calorieStatus = 'PERFECT'; 
    let calorieDiff = 0;
    let areAllMealsCompleted = false;

    if (hasDietPlan) {
      consumedCalories = todayDietDoc.actualDailyTotal?.calories || todayDietDoc.totalCaloriesConsumed || 0;
      targetCalories = userDoc?.targetMacros?.calories || todayDietDoc.targetCalories || 0;

      if (targetCalories > 0) {
        const calRatio = consumedCalories / targetCalories;
        isCaloriesMet = didEatRight || (calRatio >= 0.85 && calRatio <= 1.05);
        calorieDiff = Math.abs(targetCalories - consumedCalories);
        
        if (calRatio < 0.85) calorieStatus = 'UNDER';
        else if (calRatio > 1.05) calorieStatus = 'OVER';
      }

      // Kiểm tra xem đã ăn hết các bữa chưa
      const hasConsumed = todayDietDoc.consumedMeals && todayDietDoc.consumedMeals.length > 0;
      const hasUpcoming = todayDietDoc.adjustedUpcomingMeals && todayDietDoc.adjustedUpcomingMeals.length > 0;
      
      // Nếu đã ăn ít nhất 1 bữa và không còn bữa sắp tới nào -> Đã hoàn thành toàn bộ bữa ăn
      if (hasConsumed && !hasUpcoming) {
        areAllMealsCompleted = true;
      } else {
        areAllMealsCompleted = isDayCompleted; 
      }

      const upcomingList = todayDietDoc.adjustedUpcomingMeals || [];
      if (!isDayCompleted && !areAllMealsCompleted && upcomingList.length > 0) {
        for (const meal of upcomingList) {
          if (meal.scheduledTime) {
            const [mHours, mMinutes] = meal.scheduledTime.split(':').map(Number);
            const mealTotalMins = mHours * 60 + mMinutes;
            const diffMins = mealTotalMins - currentTotalMins;

            if (diffMins < 0) {
              isMealOverdue = true;
              overdueMealName = meal.mealType || meal.name || "Bữa ăn";
              break; 
            } else if (diffMins <= 30) { 
              isMealUpcoming = true;
              upcomingMealName = meal.mealType || meal.name || "Bữa ăn";
            }
          }
        }
      }
    }

    // --- 3. ĐIỀU KIỆN HIỂN THỊ NÚT CHỐT SỔ ---
    // Nút "Chốt sổ" LUÔN LUÔN HIỆN (canCloseDay = true) miễn là ngày hôm nay CHƯA CHỐT SỔ (isDayCompleted = false).
    const canCloseDay = !isDayCompleted; 

    const todayStatus = {
      canCloseDay,
      isDayCompleted,
      workout: { hasLog: hasWorkoutLog, didWorkout, isOverdue: isWorkoutOverdue, isUpcoming: isWorkoutUpcoming, isRestDay },
      diet: {
        hasPlan: hasDietPlan, didEatRight, targetCalories, consumedCalories, areAllMealsCompleted,
        isCaloriesMet, isMealOverdue, isMealUpcoming, overdueMealName, upcomingMealName, calorieStatus, calorieDiff
      }
    };

    // --- 4. TẠO THÔNG BÁO TỪ SERVICE ---
    let notifications = [];
    const isPremiumUser = userDoc?.isPremium === true;

    if (stats.isCoachingEnabled && isPremiumUser) {
      notifications = generateCoachingNotifications({
        style: stats.coachingStyle,
        isViolating: stats.activeViolation?.isViolating,
        workout: todayStatus.workout,
        diet: todayStatus.diet,
        canCloseDay: todayStatus.canCloseDay
      });
    }

    const responseStats = stats.toObject();
    responseStats.totalWorkoutSessions = realWorkouts;
    responseStats.totalPerfectDietDays = realDietDays;

    res.status(200).json({ 
      success: true, 
      stats: responseStats, 
      periodStats: { workoutsThisWeek, workoutsThisMonth, dietThisWeek, dietThisMonth },
      todayStatus: todayStatus,
      notifications: notifications 
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
    
    if (!result.success) {
      return res.status(400).json({ success: false, message: result.message });
    }

    const updatedStats = await Gamification.findOne({ userId });

    return res.status(200).json({ 
      success: true, 
      message: result.message,
      stats: updatedStats,
      rankPoints: result.rankPoints,
      streak: result.streak
    });
  } catch (error) {
    console.error("Lỗi API chốt sổ thủ công:", error);
    res.status(500).json({ success: false, message: "Lỗi hệ thống khi chốt sổ." });
  }
};

const updateCoachingStyle = async (req, res) => {
  try {
    const userId = req.user.id;
    const { isEnabled, style } = req.body; 

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "Không tìm thấy người dùng." });

    if (!user.isPremium) {
      return res.status(403).json({ 
        success: false, 
        message: "Tính năng Huấn luyện viên AI chỉ dành cho tài khoản Premium. Vui lòng nâng cấp gói!" 
      });
    }

    let updateData = {};
    if (typeof isEnabled === 'boolean') updateData.isCoachingEnabled = isEnabled;
    if (style) {
      if (!['EASY', 'SERIOUS', 'STRICT'].includes(style)) {
        return res.status(400).json({ success: false, message: "Tính cách không hợp lệ." });
      }
      updateData.coachingStyle = style;
    }
    
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ success: false, message: "Không có dữ liệu cập nhật." });
    }

    const stats = await Gamification.findOneAndUpdate(
      { userId }, 
      { $set: updateData }, 
      { new: true, upsert: true }
    );
    
    res.status(200).json({ 
      success: true, 
      message: `${stats.isCoachingEnabled ? "Đã BẬT" : "Đã TẮT"} chế độ huấn luyện viên AI.`, 
      isCoachingEnabled: stats.isCoachingEnabled,
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
    if (!stats || !stats.activeViolation?.isViolating) {
      return res.status(400).json({ success: false, message: "Bạn không có vi phạm nào cần xử lý." });
    }

    stats.activeViolation.isViolating = false;
    stats.activeViolation.violationType = null;
    stats.activeViolation.nagCount = 0;
    await stats.save();

    res.status(200).json({ success: true, message: "Đã ghi nhận cam kết sửa sai! Hãy giữ đúng kỷ luật." });
  } catch (error) {
    console.error("Lỗi xử lý vi phạm:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

module.exports = { getUserStats, manualCloseDay, updateCoachingStyle, resolveViolation };