// controllers/gamificationController.js

const Gamification = require('../models/Gamification');
const WorkoutLog = require('../models/WorkoutLog');
const DailyDietLog = require('../models/DailyDietLog');
const User = require('../models/User');
const { closeDayForUser } = require('../services/cronService');
const { generateCoachingNotifications } = require('../services/coachingService');

// ==========================================
// API: GET /api/gamification/stats
// ==========================================
const getUserStats = async (req, res) => {
  try {
    const userId = req.user.id; 
    let stats = await Gamification.findOne({ userId });
    if (!stats) stats = await Gamification.create({ userId });

    // 1. XỬ LÝ MÚI GIỜ VIỆT NAM (UTC+7)
    const vnTime = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }));
    const yyyy = vnTime.getFullYear();
    const mm = String(vnTime.getMonth() + 1).padStart(2, '0');
    const dd = String(vnTime.getDate()).padStart(2, '0');
    const todayStrVn = `${yyyy}-${mm}-${dd}`;

    const startOfDayVN = new Date(`${todayStrVn}T00:00:00.000+07:00`);
    const endOfDayVN = new Date(`${todayStrVn}T23:59:59.999+07:00`);

    const dayOfWeek = vnTime.getDay() || 7; 
    const startOfWeek = new Date(vnTime);
    startOfWeek.setDate(vnTime.getDate() - dayOfWeek + 1);
    const startOfWeekStr = `${startOfWeek.getFullYear()}-${String(startOfWeek.getMonth() + 1).padStart(2, '0')}-${String(startOfWeek.getDate()).padStart(2, '0')}`;
    const startOfMonthStr = `${yyyy}-${mm}-01`;

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
      DailyDietLog.countDocuments({ userId, isDayCompleted: true, createdAt: { $gte: startOfDayVN } }), 
      DailyDietLog.countDocuments({ userId, isDayCompleted: true, date: { $gte: startOfMonthStr } }),
      WorkoutLog.findOne({ userId, date: todayStrVn }),
      DailyDietLog.findOne({ 
        userId, 
        $or: [
          { date: todayStrVn },
          { date: { $gte: startOfDayVN, $lte: endOfDayVN } },
          { createdAt: { $gte: startOfDayVN, $lte: endOfDayVN } }
        ]
      }),
      User.findById(userId)
    ]);

    const currentTotalMins = vnTime.getHours() * 60 + vnTime.getMinutes();
    const currentHour = vnTime.getHours();

    // --- 2. WORKOUT STATUS ---
    const hasWorkoutLog = !!todayWorkoutDoc;
    const didWorkout = hasWorkoutLog ? (todayWorkoutDoc.didWorkout || todayWorkoutDoc.isCompleted) : false;
    const isRestDay = hasWorkoutLog ? (todayWorkoutDoc.isRestDay === true) : false; 
    
    let isWorkoutOverdue = false;
    let isWorkoutUpcoming = false;

    if (!didWorkout && !isRestDay) {
      if (todayWorkoutDoc?.scheduledTime) {
        const timeMatch = String(todayWorkoutDoc.scheduledTime).match(/(\d+):(\d+)/);
        if (timeMatch) {
          let wHours = parseInt(timeMatch[1], 10);
          const wMinutes = parseInt(timeMatch[2], 10);
          if (String(todayWorkoutDoc.scheduledTime).toLowerCase().includes('pm') && wHours < 12) wHours += 12;
          const diffMins = (wHours * 60 + wMinutes) - currentTotalMins;
          
          if (diffMins < 0) isWorkoutOverdue = true;
          else if (diffMins <= 30) isWorkoutUpcoming = true; 
        }
      } else {
        if (currentHour >= 20) isWorkoutOverdue = true;
        else if (currentHour === 19) isWorkoutUpcoming = true;
      }
    }

    // --- 3. DIET STATUS (LOGIC XỬ LÝ TUẦN TỰ) ---
    const hasDietPlan = true; // Luôn bật theo dõi ăn uống
    const isDayCompleted = todayDietDoc?.isDayCompleted || false;
    let didEatRight = isDayCompleted;
    let isMealOverdue = false;
    let isMealUpcoming = false;
    let overdueMealName = null;
    let upcomingMealName = null;
    
    let consumedCalories = 0;
    let targetCalories = userDoc?.targetMacros?.calories || todayDietDoc?.targetCalories || 2000;
    let isCaloriesMet = false;
    let calorieStatus = 'PERFECT'; 
    let calorieDiff = 0;
    let areAllMealsCompleted = false;

    if (todayDietDoc) {
      consumedCalories = todayDietDoc.actualDailyTotal?.calories || todayDietDoc.totalCaloriesConsumed || 0;
      if (targetCalories > 0) {
        const calRatio = consumedCalories / targetCalories;
        isCaloriesMet = didEatRight || (calRatio >= 0.85 && calRatio <= 1.05);
        calorieDiff = Math.abs(targetCalories - consumedCalories);
        
        if (calRatio < 0.85) calorieStatus = 'UNDER';
        else if (calRatio > 1.05) calorieStatus = 'OVER';
      }
    }

    // KHUNG BỮA ĂN MẶC ĐỊNH KHÔNG THỂ BỎ QUA
    const DEFAULT_MEALS = [
      { mealType: 'BREAKFAST', name: 'sáng', scheduledTime: '08:00', defaultMins: 8 * 60 },
      { mealType: 'LUNCH', name: 'trưa', scheduledTime: '12:30', defaultMins: 12 * 60 + 30 },
      { mealType: 'SNACK', name: 'phụ', scheduledTime: '16:00', defaultMins: 16 * 60 },
      { mealType: 'DINNER', name: 'tối', scheduledTime: '19:30', defaultMins: 19 * 60 + 30 }
    ];

    let uneatenMeals = [];

    if (todayDietDoc) {
      let rawMeals = [];
      const possibleArrays = [
        todayDietDoc.adjustedUpcomingMeals, todayDietDoc.upcomingMeals, 
        todayDietDoc.meals, todayDietDoc.plannedMeals
      ];
      for (const arr of possibleArrays) {
        if (Array.isArray(arr) && arr.length > 0) {
          rawMeals = arr;
          break;
        }
      }

      if (rawMeals.length > 0) {
        // Lọc các bữa chưa ăn từ DB
        uneatenMeals = rawMeals.filter(m => !m.isEaten && !m.isCompleted && m.status !== 'COMPLETED' && m.status !== 'EATEN');
      } else {
        // Nếu DB chưa chia mảng bữa ăn, lọc dựa theo consumedMeals đã lưu
        const consumedTypes = (todayDietDoc.consumedMeals || []).map(m => 
          String(m.mealType || m.name || m.type || '').toUpperCase()
        );
        uneatenMeals = DEFAULT_MEALS.filter(defM => 
          !consumedTypes.some(ct => ct.includes(defM.mealType) || ct.includes(defM.name.toUpperCase()))
        );
      }
    } else {
      // Nếu chưa có doc hôm nay -> Coi như chưa ăn bữa nào cả
      uneatenMeals = [...DEFAULT_MEALS];
    }

    // Helper lấy số phút trong ngày của bữa ăn
    const getMealMins = (meal) => {
      if (meal.defaultMins) return meal.defaultMins;
      const mealTimeStr = meal.scheduledTime || meal.time || meal.mealTime || meal.timeStr;
      if (mealTimeStr) {
        const timeMatch = String(mealTimeStr).match(/(\d+):(\d+)/);
        if (timeMatch) {
          let mHours = parseInt(timeMatch[1], 10);
          const mMinutes = parseInt(timeMatch[2], 10);
          if (String(mealTimeStr).toLowerCase().includes('pm') && mHours < 12) mHours += 12;
          if (String(mealTimeStr).toLowerCase().includes('am') && mHours === 12) mHours = 0;
          return mHours * 60 + mMinutes;
        }
      }
      const upper = String(meal.mealType || meal.name || meal.title || '').toUpperCase();
      if (upper.includes('BREAKFAST') || upper.includes('SÁNG')) return 8 * 60;
      if (upper.includes('LUNCH') || upper.includes('TRƯA')) return 12 * 60 + 30;
      if (upper.includes('SNACK') || upper.includes('PHỤ')) return 16 * 60;
      if (upper.includes('DINNER') || upper.includes('TỐI')) return 19 * 60 + 30;
      return 12 * 60;
    };

    // Helper dịch tên bữa ăn
    const translateMealName = (nameStr) => {
      const upper = String(nameStr).toUpperCase();
      if (upper.includes('BREAKFAST') || upper.includes('SÁNG')) return 'sáng';
      if (upper.includes('LUNCH') || upper.includes('TRƯA')) return 'trưa';
      if (upper.includes('DINNER') || upper.includes('TỐI')) return 'tối';
      if (upper.includes('SNACK') || upper.includes('PHỤ')) return 'phụ';
      return nameStr;
    };

    // SẮP XẾP BỮA ĂN CHƯA HOÀN THÀNH THEO THỨ TỰ THỜI GIAN
    uneatenMeals.sort((a, b) => getMealMins(a) - getMealMins(b));

    if (todayDietDoc && uneatenMeals.length === 0) {
      areAllMealsCompleted = true;
    } else {
      areAllMealsCompleted = isDayCompleted; 
    }

    // XÉT DUY NHẤT BỮA ĂN ĐẦU TIÊN TRONG HÀNG CHỜ (CHƯA ĂN)
    if (!isDayCompleted && !areAllMealsCompleted && uneatenMeals.length > 0) {
      const firstUnEatenMeal = uneatenMeals[0]; // Bữa sớm nhất chưa tick
      const mealTotalMins = getMealMins(firstUnEatenMeal);
      const rawName = firstUnEatenMeal.mealType || firstUnEatenMeal.name || firstUnEatenMeal.title || "ăn";
      const mealName = translateMealName(rawName);

      const diffMins = mealTotalMins - currentTotalMins;

      if (diffMins < 0) {
        isMealOverdue = true;
        overdueMealName = mealName;
      } else if (diffMins <= 30) {
        isMealUpcoming = true;
        upcomingMealName = mealName;
      }
    }

    // --- 4. TỔNG HỢP KẾT QUẢ & THÔNG BÁO ---
    const canCloseDay = !isDayCompleted; 

    const todayStatus = {
      canCloseDay, isDayCompleted,
      workout: { hasLog: hasWorkoutLog, didWorkout, isOverdue: isWorkoutOverdue, isUpcoming: isWorkoutUpcoming, isRestDay },
      diet: {
        hasPlan: hasDietPlan, didEatRight, targetCalories, consumedCalories, areAllMealsCompleted,
        isCaloriesMet, isMealOverdue, isMealUpcoming, overdueMealName, upcomingMealName, calorieStatus, calorieDiff
      }
    };

    let notifications = [];
    if (stats.isCoachingEnabled && userDoc?.isPremium) {
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
    if (!result.success) return res.status(400).json({ success: false, message: result.message });
    
    const updatedStats = await Gamification.findOne({ userId });
    return res.status(200).json({ success: true, message: result.message, stats: updatedStats, rankPoints: result.rankPoints, streak: result.streak });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi hệ thống khi chốt sổ." });
  }
};

const updateCoachingStyle = async (req, res) => {
  try {
    const userId = req.user.id;
    const { isEnabled, style } = req.body; 
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "Không tìm thấy người dùng." });
    if (!user.isPremium) return res.status(403).json({ success: false, message: "Tính năng này dành cho Premium!" });

    let updateData = {};
    if (typeof isEnabled === 'boolean') updateData.isCoachingEnabled = isEnabled;
    if (style && ['EASY', 'SERIOUS', 'STRICT'].includes(style)) updateData.coachingStyle = style;
    
    const stats = await Gamification.findOneAndUpdate({ userId }, { $set: updateData }, { new: true, upsert: true });
    res.status(200).json({ success: true, message: "Đã cập nhật AI.", isCoachingEnabled: stats.isCoachingEnabled, coachingStyle: stats.coachingStyle });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

const resolveViolation = async (req, res) => {
  try {
    const userId = req.user.id;
    const stats = await Gamification.findOne({ userId });
    if (!stats || !stats.activeViolation?.isViolating) return res.status(400).json({ success: false, message: "Không có vi phạm." });

    stats.activeViolation.isViolating = false;
    stats.activeViolation.violationType = null;
    stats.activeViolation.nagCount = 0;
    await stats.save();

    res.status(200).json({ success: true, message: "Đã ghi nhận cam kết sửa sai!" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

module.exports = { getUserStats, manualCloseDay, updateCoachingStyle, resolveViolation };