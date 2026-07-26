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
  if (didWorkoutValid && !didEatRightValid) return "Hôm nay bạn hoàn thành việc tập, nhưng phần ăn uống chưa tuân thủ đúng kế hoạch.";
  if (!didWorkoutValid && didEatRightValid) return "Bạn đã kiểm soát ăn uống tốt, nhưng lại quên tập luyện rồi.";
  return "Hôm nay là một ngày lười biếng. Xốc lại tinh thần vào ngày mai nhé!";
};

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

  // Khởi tạo/Reset bộ đếm tuần nếu chưa có hoặc nay là thứ Hai
  if (isMonday || !gamification.currentWeekTrackers) {
    gamification.currentWeekTrackers = { eatWrong: 0, noWorkout: 0, bothFail: 0, isPenalizedThisWeek: false };
  }

  // 2. Kiểm tra Tập luyện
  const workoutDoc = await WorkoutLog.findOne({ 
    userId, 
    $or: [{ date: todayStr }, { date: { $gte: startOfDay, $lte: endOfDay } }] 
  });
  
  const hasWorkoutLog = !!workoutDoc;
  const isRestDay = hasWorkoutLog ? (workoutDoc.isRestDay === true) : true;
  const actualWorkout = hasWorkoutLog ? (workoutDoc.didWorkout === true || workoutDoc.isCompleted === true) : false;
  const didWorkoutValid = actualWorkout || isRestDay;

  // 3. Kiểm tra Dinh dưỡng
  let dietDoc = await DailyDietLog.findOne({ userId, date: { $gte: startOfDay, $lte: endOfDay } });
  let didEatRightValid = false;

  if (dietDoc) {
    if (dietDoc.isDayCompleted) {
      didEatRightValid = true;
    } else {
      const mealsToCheck = dietDoc.adjustedUpcomingMeals || dietDoc.meals || [];
      const areAllMealsCompleted = mealsToCheck.length > 0 
        ? mealsToCheck.every(m => m.isCompleted || m.isEaten || m.status === 'COMPLETED')
        : true;

      didEatRightValid = areAllMealsCompleted; 
    }
  } else {
    didEatRightValid = true; 
  }

  // 4. CỘNG ĐIỂM / TĂNG BỘ ĐẾM VI PHẠM
  const isPerfectDay = didWorkoutValid && didEatRightValid;

  if (isPerfectDay) {
    // 🌟 HOÀN HẢO 100%: Tặng +10 Điểm & +1 Chuỗi Streak
    gamification.rankPoints += 10;
    gamification.streak += 1;
  } 
  else {
    // ⚠️ HÔM NAY CÓ VI PHẠM (Chỉ xử lý phạt khi hôm nay BỊ LỖI)
    
    // Đã làm sai thì chuỗi Streak bị gãy về 0 ngay lập tức
    gamification.streak = 0; 

    if (didWorkoutValid && !didEatRightValid) {
      gamification.rankPoints += 5; // Tập tốt nhưng Ăn sai: Thưởng nhẹ +5
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

    // 5. LOGIC PHẠT TUẦN (Chỉ kích hoạt VÀO NGÀY SAI và CHỈ PHẠT 1 LẦN / TUẦN)
    const alreadyPenalized = gamification.currentWeekTrackers.isPenalizedThisWeek || false;

    if (!alreadyPenalized) {
      if (gamification.currentWeekTrackers.bothFail > 1) { 
        gamification.rankPoints -= 100; 
        gamification.currentWeekTrackers.isPenalizedThisWeek = true;
      } else if (gamification.currentWeekTrackers.eatWrong > 2 || gamification.currentWeekTrackers.noWorkout > 3) {
        gamification.rankPoints -= 50; 
        gamification.currentWeekTrackers.isPenalizedThisWeek = true;
      }
    }
  }

  // Đảm bảo Rank Point không bao giờ bị âm
  if (gamification.rankPoints < 0) gamification.rankPoints = 0;

  gamification.lastEvaluatedDate = new Date();
  gamification.markModified('currentWeekTrackers'); 
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
    message: isPerfectDay ? "Chốt sổ thành công! (+10 Rank & +1 Streak)" : "Chốt sổ thành công!",
    rankPoints: gamification.rankPoints,
    streak: gamification.streak
  };
};

const startDailyClosingJob = () => {
  cron.schedule('55 23 * * *', async () => {
    try {
      const users = await User.find({});
      for (const user of users) await closeDayForUser(user._id);
    } catch (error) { console.error(error); }
  });

  cron.schedule('0 0 1 * *', async () => {
    try { await Gamification.updateMany({}, { $set: { rankPoints: 0, lastRankResetDate: new Date() } }); } 
    catch (error) {}
  });
};

module.exports = { startDailyClosingJob, closeDayForUser };