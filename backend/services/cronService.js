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

const startDailyClosingJob = () => {
  // Chạy tự động vào 23:55 mỗi ngày
  cron.schedule('55 23 * * *', async () => {
    console.log("🕒 [CRON] Đang chạy tự động chốt sổ ngày...");

    try {
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));
      const endOfDay = new Date(today.setHours(23, 59, 59, 999));
      const isMonday = today.getDay() === 1;

      const users = await User.find({});

      for (const user of users) {
        const userId = user._id;

        // 1. TÌM HOẶC TẠO MỚI BẢNG ĐIỂM
        let gamification = await Gamification.findOne({ userId });
        if (!gamification) gamification = new Gamification({ userId });

        // Reset cảnh báo vi phạm vào đầu tuần (Thứ Hai)
        if (isMonday && (!gamification.lastEvaluatedDate || gamification.lastEvaluatedDate < startOfDay)) {
          gamification.weeklyStats = { eatWrongDays: 0, noWorkoutDays: 0, totalFailsDays: 0 };
        }

        // Bỏ qua nếu đã chốt rồi
        if (gamification.lastEvaluatedDate && gamification.lastEvaluatedDate >= startOfDay) continue;

        // 2. KIỂM TRA LOG HÔM NAY
        const workout = await WorkoutLog.findOne({ userId, date: { $gte: startOfDay, $lte: endOfDay }, isCompleted: true });
        let diet = await DailyDietLog.findOne({ userId, date: { $gte: startOfDay, $lte: endOfDay } });

        const didWorkout = !!workout;
        const didEatRight = diet && diet.isDayCompleted;

        // 3. LOGIC CỘNG ĐIỂM VÀ CHUỖI
        let { rankPoints, streak, weeklyStats } = gamification;
        
        if (didWorkout && didEatRight) {
          rankPoints += 10; streak += 1;
        } else if (didWorkout && !didEatRight) {
          rankPoints += 5; weeklyStats.eatWrongDays += 1;
        } else if (!didWorkout && didEatRight) {
          weeklyStats.noWorkoutDays += 1;
        } else {
          weeklyStats.noWorkoutDays += 1;
          weeklyStats.eatWrongDays += 1;
          weeklyStats.totalFailsDays += 1;
        }

        // 4. KIỂM TRA PHẠT TUẦN
        let isPenalized = false;
        if (weeklyStats.totalFailsDays > 1) { // Lười cả 2 quá 1 ngày
          rankPoints -= 100; streak = 0; isPenalized = true;
        } else if (!isPenalized && (weeklyStats.eatWrongDays > 1 || weeklyStats.noWorkoutDays > 3)) {
          rankPoints -= 50; streak = 0;
        }

        if (rankPoints < 0) rankPoints = 0; // Đảm bảo điểm không bị âm

        // Lưu thông số
        gamification.rankPoints = rankPoints;
        gamification.streak = streak;
        gamification.weeklyStats = weeklyStats;
        gamification.lastEvaluatedDate = new Date();
        await gamification.save();

        // 5. VIẾT NHẬN XÉT VÀO DIET LOG
        if (diet) {
          diet.isDayCompleted = true;
          diet.dailyAiSummary = generateDailyReview(didWorkout, didEatRight);
          await diet.save();
        }
      }
      console.log("✅ [CRON] Chốt sổ và viết đánh giá thành công!");
    } catch (error) {
      console.error("❌ [CRON] Lỗi:", error);
    }
  });
};

module.exports = { startDailyClosingJob };