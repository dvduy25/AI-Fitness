// services/cronService.js

const cron = require('node-cron');
const User = require('../models/User');
const Gamification = require('../models/Gamification');
const WorkoutLog = require('../models/WorkoutLog');
const DailyDietLog = require('../models/DailyDietLog');

// Hàm chuyển Date sang chuỗi YYYY-MM-DD (Đồng bộ với WorkoutLog)
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
  const todayStr = toYYYYMMDD(now); // Định dạng chuẩn cho WorkoutLog

  let gamification = await Gamification.findOne({ userId });
  if (!gamification) gamification = new Gamification({ userId });

  // Nếu hôm nay đã chốt sổ rồi -> Chặn lại không cho cộng/trừ điểm trùng lặp
  if (gamification.lastEvaluatedDate && gamification.lastEvaluatedDate >= startOfDay) {
    return { success: false, message: "Hôm nay bạn đã chốt sổ rồi!" };
  }

  // Làm mới bộ đếm tuần nếu là thứ Hai
  if (isMonday || !gamification.currentWeekTrackers) {
    gamification.currentWeekTrackers = { eatWrong: 0, noWorkout: 0, bothFail: 0 };
  }

  // 1. Kiểm tra nhật ký Tập luyện (Dùng todayStr và kiểm tra didWorkout / isRestDay)
  const workoutDoc = await WorkoutLog.findOne({ userId, date: todayStr });
  const hasWorkoutLog = !!workoutDoc;
  const isRestDay = hasWorkoutLog ? (workoutDoc.isRestDay === true) : true;
  const actualWorkout = hasWorkoutLog ? (workoutDoc.didWorkout === true) : false;
  
  // Hợp lệ tập luyện: Đã tập HOẶC là ngày nghỉ
  const didWorkoutValid = actualWorkout || isRestDay;

  // 2. Kiểm tra nhật ký Dinh dưỡng (Dùng khoảng thời gian Date object)
  let dietDoc = await DailyDietLog.findOne({ userId, date: { $gte: startOfDay, $lte: endOfDay } });
  const didEatRightValid = !!(dietDoc && dietDoc.isDayCompleted);

  // XỬ LÝ ĐIỂM SỐ & CHUỖI 
  if (didWorkoutValid && didEatRightValid) {
    // 🌟 HOÀN HẢO: Cộng điểm, cộng chuỗi
    gamification.rankPoints += 10;
    gamification.streak += 1;
  } 
  else if (didWorkoutValid && !didEatRightValid) {
    // TẬP CHUẨN, ĂN LỆCH
    gamification.rankPoints += 5;
    gamification.failStats.eatWrongDays += 1; 
    gamification.currentWeekTrackers.eatWrong += 1; 
  } 
  else if (!didWorkoutValid && didEatRightValid) {
    // ĂN CHUẨN, KHÔNG TẬP
    gamification.failStats.noWorkoutDays += 1; 
    gamification.currentWeekTrackers.noWorkout += 1;
  } 
  else {
    // TỆ CẢ HAI: HỦY CHUỖI, GHI NHẬN THẤT BẠI
    gamification.failStats.totalFailsDays += 1; 
    gamification.currentWeekTrackers.bothFail += 1;
  }

  // LOGIC PHẠT TUẦN
  let isPenalized = false;
  if (gamification.currentWeekTrackers.bothFail > 1) { 
    gamification.rankPoints -= 100; 
    gamification.streak = 0; 
    isPenalized = true;
  } else if (!isPenalized && (gamification.currentWeekTrackers.eatWrong > 1 || gamification.currentWeekTrackers.noWorkout > 3)) {
    gamification.rankPoints -= 50; 
    gamification.streak = 0;
  }

  // Rank không được nhỏ hơn 0
  if (gamification.rankPoints < 0) gamification.rankPoints = 0;

  // Đánh dấu ngày chốt sổ gần nhất
  gamification.lastEvaluatedDate = new Date();
  await gamification.save();

  // CẬP NHẬT HOẶC TẠO NHẬT KÝ REVIEW
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

  return { success: true, message: "Chốt sổ ngày thành công! Điểm và chuỗi đã được cập nhật." };
};

// --- HỆ THỐNG CRON TỰ ĐỘNG CHẠY NGẦM ---
const startDailyClosingJob = () => {

  // 1. Quét vét chốt sổ tự động lúc 23:55 cho những ai quên không bấm chốt thủ công
  cron.schedule('55 23 * * *', async () => {
    console.log("🕒 [CRON] Đang tự động quét chốt sổ ngày...");
    try {
      const users = await User.find({});
      for (const user of users) {
        await closeDayForUser(user._id);
      }
      console.log("✅ [CRON] Quét vét chốt sổ cuối ngày hoàn tất!");
    } catch (error) {
      console.error("❌ [CRON] Lỗi chạy tự động chốt sổ ngày:", error);
    }
  });

  // 2. RESET RANK (00:00 ngày mùng 1 hàng tháng)
  cron.schedule('0 0 1 * *', async () => {
    console.log("🔄 [CRON] Đang Reset Rank Point...");
    try {
        await Gamification.updateMany({}, { $set: { rankPoints: 0, lastRankResetDate: new Date() } });
        console.log(`✅ [CRON] Đã reset Rank đầu tháng!`);
    } catch (error) {
        console.error("❌ [CRON] Lỗi reset Rank:", error);
    }
  });
};

module.exports = { startDailyClosingJob, closeDayForUser };