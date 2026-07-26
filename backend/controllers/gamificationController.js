// controllers/gamificationController.js

const Gamification = require('../models/Gamification');
const WorkoutLog = require('../models/WorkoutLog');
const DailyDietLog = require('../models/DailyDietLog');
const User = require('../models/User'); // Gọi model User
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
      userDoc // Fetch Data User
    ] = await Promise.all([
      WorkoutLog.countDocuments({ userId, didWorkout: true }), 
      DailyDietLog.countDocuments({ userId, isDayCompleted: true }), 
      WorkoutLog.countDocuments({ userId, didWorkout: true, date: { $gte: startOfWeekStr } }), 
      WorkoutLog.countDocuments({ userId, didWorkout: true, date: { $gte: startOfMonthStr } }), 
      DailyDietLog.countDocuments({ userId, isDayCompleted: true, date: { $gte: startOfWeek } }), 
      DailyDietLog.countDocuments({ userId, isDayCompleted: true, date: { $gte: startOfMonth } }),
      WorkoutLog.findOne({ userId, date: todayStr }),
      DailyDietLog.findOne({ userId, date: { $gte: startOfDay, $lte: endOfDay } }),
      User.findById(userId) // Tìm User
    ]);

    // Lấy thời gian chuẩn theo múi giờ Việt Nam
    const vnTime = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }));
    const currentTotalMins = vnTime.getHours() * 60 + vnTime.getMinutes();

    // --- 1. Workout Status ---
    const hasWorkoutLog = !!todayWorkoutDoc;
    const didWorkout = hasWorkoutLog ? todayWorkoutDoc.didWorkout : false;
    const isRestDay = hasWorkoutLog ? (todayWorkoutDoc.isRestDay === true) : true; 
    
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
    let didEatRight = false;
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
      didEatRight = todayDietDoc.isDayCompleted;
      
      // 1. Lượng calo thực tế đã nạp (Tổng các bữa đã ăn)
      consumedCalories = todayDietDoc.actualDailyTotal?.calories || 0;

      // 2. Lượng calo mục tiêu (Lấy chuẩn từ User Schema)
      targetCalories = userDoc?.targetMacros?.calories || 0;

      // 3. Tính toán độ chênh lệch (Dư/Thiếu)
      if (targetCalories > 0) {
        const calRatio = consumedCalories / targetCalories;
        isCaloriesMet = didEatRight || (calRatio >= 0.9 && calRatio <= 1.1);
        
        calorieDiff = Math.abs(targetCalories - consumedCalories);
        
        if (calRatio < 0.9) calorieStatus = 'UNDER';
        else if (calRatio > 1.1) calorieStatus = 'OVER';
      }

      // Kiểm tra Bữa ăn (Quá giờ / Sắp tới / Đã ăn hết chưa)
      const mealsToCheck = todayDietDoc.adjustedUpcomingMeals || todayDietDoc.meals || [];
      
      if (mealsToCheck.length > 0) {
        areAllMealsCompleted = mealsToCheck.every(meal => meal.isCompleted || meal.isEaten || meal.status === 'COMPLETED');
      } else {
        areAllMealsCompleted = didEatRight; 
      }

      // Chỉ báo quá giờ / sắp tới nếu chưa chốt sổ VÀ chưa tick hoàn thành hết các bữa
      if (!didEatRight && !areAllMealsCompleted && mealsToCheck.length > 0) {
        for (const meal of mealsToCheck) {
          if (meal.isCompleted || meal.isEaten || meal.status === 'COMPLETED') continue;
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

    // --- 3. ĐIỀU KIỆN CHỐT SỔ (STRICT) ---
    const workoutConditionMet = didWorkout || isRestDay;
    const dietConditionMet = hasDietPlan ? didEatRight : true;
    const canCloseDay = workoutConditionMet && dietConditionMet; 

    const todayStatus = {
      canCloseDay,
      workout: { hasLog: hasWorkoutLog, didWorkout, isOverdue: isWorkoutOverdue, isUpcoming: isWorkoutUpcoming, isRestDay },
      diet: {
        hasPlan: hasDietPlan, didEatRight, targetCalories, consumedCalories, areAllMealsCompleted,
        isCaloriesMet, isMealOverdue, isMealUpcoming, overdueMealName, upcomingMealName, calorieStatus, calorieDiff
      }
    };

    // --- 4. TẠO THÔNG BÁO TỪ SERVICE ---
    let notifications = [];
    if (stats.isCoachingEnabled) {
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

    // Lấy dữ liệu Gamification mới nhất đã cộng điểm từ DB
    const updatedStats = await Gamification.findOne({ userId });

    return res.status(200).json({ 
      success: true, 
      message: result.message,
      stats: updatedStats, // Trả dữ liệu mới về cho App/Web
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
    let updateData = {};

    if (typeof isEnabled === 'boolean') updateData.isCoachingEnabled = isEnabled;
    if (style) {
      if (!['EASY', 'SERIOUS', 'STRICT'].includes(style)) return res.status(400).json({ success: false, message: "Tính cách không hợp lệ." });
      updateData.coachingStyle = style;
    }
    if (Object.keys(updateData).length === 0) return res.status(400).json({ success: false, message: "Không có dữ liệu cập nhật." });

    const stats = await Gamification.findOneAndUpdate({ userId }, { $set: updateData }, { new: true, upsert: true });
    
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