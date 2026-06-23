const cron = require('node-cron');
const User = require('../models/User');
const Gamification = require('../models/Gamification');
const WorkoutLog = require('../models/WorkoutLog');
const DailyDietLog = require('../models/DailyDietLog');

const generateDailyReview = (didWorkout, didEatRight) => {
  if (didWorkout && didEatRight) return "Tuyệt vời! Bạn đã có một ngày kỷ luật 100%.";
  if (didWorkout && !didEatRight) return "Hôm nay bạn tập rất chăm, nhưng phần ăn uống chưa tuân thủ đúng kế hoạch.";
  if (!didWorkout && didEatRight) return "Bạn đã kiểm soát ăn uống tốt, nhưng lại quên tập luyện rồi.";
  return "Hôm nay là một ngày lười biếng. Xốc lại tinh thần vào ngày mai nhé!";
};

// --- HÀM XỬ LÝ CHỐT SỔ TRONG NGÀY CHO 1 USER ---
const closeDayForUser = async (userId) => {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const isMonday = now.getDay() === 1;

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

  // Kiểm tra nhật ký thực tế trong ngày
  const workout = await WorkoutLog.findOne({ userId, date: { $gte: startOfDay, $lte: endOfDay }, isCompleted: true });
  let diet = await DailyDietLog.findOne({ userId, date: { $gte: startOfDay, $lte: endOfDay } });

  const didWorkout = !!workout;
  const didEatRight = !!(diet && diet.isDayCompleted);

  // XỬ LÝ ĐIỂM SỐ & CHUỖI (Không cộng dồn Total tại đây để tránh lệch số)
  if (didWorkout && didEatRight) {
    gamification.rankPoints += 10;
    gamification.streak += 1;
  } 
  else if (didWorkout && !didEatRight) {
    gamification.rankPoints += 5;
    gamification.failStats.eatWrongDays += 1; 
    gamification.currentWeekTrackers.eatWrong += 1; 
  } 
  else if (!didWorkout && didEatRight) {
    gamification.failStats.noWorkoutDays += 1; 
    gamification.currentWeekTrackers.noWorkout += 1;
  } 
  else {
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

  if (gamification.rankPoints < 0) gamification.rankPoints = 0;

  // Đánh dấu ngày chốt sổ gần nhất
  gamification.lastEvaluatedDate = new Date();
  await gamification.save();

  // CẬP NHẬT HOẶC TẠO NHẬT KÝ REVIEW
  if (diet) {
    diet.isDayCompleted = true;
    diet.dailyAiSummary = generateDailyReview(didWorkout, didEatRight);
    await diet.save();
  } else {
    await DailyDietLog.create({
      userId,
      date: now,
      isDayCompleted: true,
      dailyAiSummary: generateDailyReview(didWorkout, didEatRight)
    });
  }

  return { success: true, message: "Chốt sổ ngày thành công!" };
};

// --- HỆ THỐNG CRON TỰ ĐỘNG CHẠY NGẦM ---
const startDailyClosingJob = () => {

  // 1. Quét vét chốt sổ tự động lúc 23:55 cho những ai quên không bấm chốt thủ công
  cron.schedule('55 23 * * *', async () => {
    console.log("🕒 [CRON] Đang tự động quét chốt sổ ngày...");
    try {
      const users = await User.find({});
      for (const user of users) {
        // Hàm closeDayForUser đã chặn trùng lặp, ai chốt rồi cron sẽ tự bỏ qua
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