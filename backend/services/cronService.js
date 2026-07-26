// services/cronService.js

const cron = require('node-cron');
const User = require('../models/User');
const Gamification = require('../models/Gamification');
const WorkoutLog = require('../models/WorkoutLog');
const DailyDietLog = require('../models/DailyDietLog');

const toYYYYMMDD = (dateObj) => {
  const yyyy = dateObj.getFullYear();
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const dd = String(dateObj.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const generateDailyReview = (didWorkoutValid, didEatRightValid) => {
  if (didWorkoutValid && didEatRightValid) return "Tuyệt vời! Bạn đã có một ngày kỷ luật 100%.";
  if (didWorkoutValid && !didEatRightValid) return "Hôm nay bạn đã hoàn thành việc tập, nhưng phần ăn uống chưa tuân thủ đúng kế hoạch.";
  if (!didWorkoutValid && didEatRightValid) return "Bạn đã kiểm soát ăn uống tốt, nhưng lại quên tập luyện rồi.";
  return "Hôm nay là một ngày lười biếng. Xốc lại tinh thần vào ngày mai nhé!";
};

// --- HÀM XỬ LÝ CHỐT SỔ TRONG NGÀY CHO 1 USER ---
const closeDayForUser = async (userId) => {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const isMonday = now.getDay() === 1;
  const todayStr = toYYYYMMDD(now);

  let gamification = await Gamification.findOne({ userId });
  if (!gamification) gamification = new Gamification({ userId });

  // 1. Chặn chốt trùng lặp trong ngày
  if (gamification.lastEvaluatedDate && gamification.lastEvaluatedDate >= startOfDay) {
    return { success: false, message: "Hôm nay bạn đã chốt sổ rồi!" };
  }

  // Reset bộ đếm tuần nếu là Thứ Hai
  if (isMonday || !gamification.currentWeekTrackers) {
    gamification.currentWeekTrackers = { eatWrong: 0, noWorkout: 0, bothFail: 0 };
  }

  // Lấy target calories của User
  const userDoc = await User.findById(userId);
  const targetCalories = userDoc?.targetMacros?.calories || 0;

  // 2. Kiểm tra Tập luyện (Linh hoạt cả kiểu String YYYY-MM-DD lẫn Date)
  const workoutDoc = await WorkoutLog.findOne({ 
    userId, 
    $or: [
      { date: todayStr },
      { date: { $gte: startOfDay, $lte: endOfDay } }
    ] 
  });
  
  const hasWorkoutLog = !!workoutDoc;
  const isRestDay = hasWorkoutLog ? (workoutDoc.isRestDay === true) : true;
  const actualWorkout = hasWorkoutLog ? (workoutDoc.didWorkout === true || workoutDoc.isCompleted === true) : false;
  const didWorkoutValid = actualWorkout || isRestDay;

  // 3. Kiểm tra Dinh dưỡng (Tính toán thực tế chứ không phụ thuộc isDayCompleted)
  let dietDoc = await DailyDietLog.findOne({ userId, date: { $gte: startOfDay, $lte: endOfDay } });
  let didEatRightValid = false;

  if (dietDoc) {
    if (dietDoc.isDayCompleted) {
      didEatRightValid = true;
    } else {
      const consumedCalories = dietDoc.actualDailyTotal?.calories || 0;
      const mealsToCheck = dietDoc.adjustedUpcomingMeals || dietDoc.meals || [];
      
      const areAllMealsCompleted = mealsToCheck.length > 0 
        ? mealsToCheck.every(m => m.isCompleted || m.isEaten || m.status === 'COMPLETED')
        : true;

      let isCalorieMet = true;
      if (targetCalories > 0) {
        const ratio = consumedCalories / targetCalories;
        isCalorieMet = ratio >= 0.85 && ratio <= 1.15; // Ngưỡng chấp nhận được
      }

      didEatRightValid = areAllMealsCompleted && isCalorieMet;
    }
  } else {
    // Nếu không có lịch ăn tạo sẵn, mặc định tính là hợp lệ ăn uống
    didEatRightValid = true; 
  }

  // 4. Cộng/Trừ Điểm & Chuỗi
  if (didWorkoutValid && didEatRightValid) {
    gamification.rankPoints += 10;
    gamification.streak += 1;
  } 
  else if (didWorkoutValid && !didEatRightValid) {
    gamification.rankPoints += 5;
    gamification.failStats.eatWrongDays += 1; 
    gamification.currentWeekTrackers.eatWrong += 1; 
  } 
  else if (!didWorkoutValid && didEatRightValid) {
    gamification.failStats.noWorkoutDays += 1; 
    gamification.currentWeekTrackers.noWorkout += 1;
  } 
  else {
    gamification.failStats.totalFailsDays += 1; 
    gamification.currentWeekTrackers.bothFail += 1;
  }

  // 5. Logic phạt tuần (Chỉ phạt nếu tái phạm thật sự)
  let isPenalized = false;
  if (gamification.currentWeekTrackers.bothFail > 1) { 
    gamification.rankPoints -= 100; 
    gamification.streak = 0; 
    isPenalized = true;
  } else if (!isPenalized && (gamification.currentWeekTrackers.eatWrong > 2 || gamification.currentWeekTrackers.noWorkout > 3)) {
    gamification.rankPoints -= 50; 
    gamification.streak = 0;
  }

  if (gamification.rankPoints < 0) gamification.rankPoints = 0;

  gamification.lastEvaluatedDate = new Date();
  await gamification.save();

  // Cập nhật Nhật ký DailyDietLog
  if (dietDoc) {
    dietDoc.isDayCompleted = true;
    dietDoc.dailyAiSummary = generateDailyReview(didWorkoutValid, didEatRightValid);
    await dietDoc.save();
  } else {
    await DailyDietLog.create({
      userId,
      date: now,
      isDayCompleted: true,
      dailyAiSummary: generateDailyReview(didWorkoutValid, didEatRightValid)
    });
  }

  return { 
    success: true, 
    message: "Chốt sổ ngày thành công!",
    rankPoints: gamification.rankPoints,
    streak: gamification.streak
  };
};

// --- CRON JOBS ---
const startDailyClosingJob = () => {
  cron.schedule('55 23 * * *', async () => {
    console.log("🕒 [CRON] Tự động quét chốt sổ ngày...");
    try {
      const users = await User.find({});
      for (const user of users) {
        await closeDayForUser(user._id);
      }
      console.log("✅ [CRON] Hoàn tất chốt sổ ngày!");
    } catch (error) {
      console.error("❌ [CRON] Lỗi chốt sổ:", error);
    }
  });

  cron.schedule('0 0 1 * *', async () => {
    try {
      await Gamification.updateMany({}, { $set: { rankPoints: 0, lastRankResetDate: new Date() } });
    } catch (error) {
      console.error("❌ [CRON] Lỗi reset Rank:", error);
    }
  });
};

module.exports = { startDailyClosingJob, closeDayForUser };