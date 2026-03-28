const cron = require("node-cron");
const MealPlan = require("../models/MealPlan");
const WorkoutPlan = require("../models/WorkoutPlan");

const startCronJobs = () => {
  // Chạy mỗi phút 1 lần
  cron.schedule("* * * * *", async () => {
    try {
      // Lấy giờ hiện tại chuẩn HH:mm theo múi giờ server
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      const todayStart = new Date(); todayStart.setHours(0,0,0,0);
      const todayEnd = new Date(); todayEnd.setHours(23,59,59,999);

      // 1. Quét Lịch Tập
      const workouts = await WorkoutPlan.find({
        date: { $gte: todayStart, $lte: todayEnd },
        scheduledTime: currentTime,
        isNotified: false
      }).populate("userId");

      for (const w of workouts) {
        console.log(`[PUSH NOTIFICATION] Tới ${w.userId.name}: Đã đến giờ tập: ${w.title}!`);
        // Tương lai code Firebase FCM ở đây: sendFCM(w.userId.fcmToken, "Đến giờ tập!", w.title);
        w.isNotified = true;
        await w.save();
      }

      // 2. Quét Lịch Ăn
      const mealPlans = await MealPlan.find({
        date: { $gte: todayStart, $lte: todayEnd },
        "meals.scheduledTime": currentTime,
        "meals.isNotified": false
      }).populate("userId");

      for (const mp of mealPlans) {
        for (const meal of mp.meals) {
          if (meal.scheduledTime === currentTime && !meal.isNotified) {
             console.log(`[PUSH NOTIFICATION] Tới ${mp.userId.name}: Đã đến giờ ăn bữa ${meal.mealType}!`);
             // Tương lai code Firebase FCM ở đây
             meal.isNotified = true;
          }
        }
        await mp.save();
      }

    } catch (error) {
      console.error("Lỗi Cron Job Notification:", error);
    }
  });
  console.log("🟢 Hệ thống HLV chạy ngầm đã khởi động!");
};

module.exports = startCronJobs;