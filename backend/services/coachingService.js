// services/coachingService.js

const MESSAGES = {
  // 1. Vi phạm kỷ luật nghiêm trọng
  VIOLATION: {
    EASY: "Dạo này bạn hơi xao nhãng chút rồi đó. Cùng nỗ lực lại từ hôm nay nha! 💕",
    SERIOUS: "CẢNH BÁO: Bạn đang tích lũy vi phạm kỷ luật. Chuỗi Streak và điểm Rank sẽ bị tổn hại.",
    STRICT: "🚨 CẢNH BÁO ĐỎ! Bạn đang lười biếng một cách thảm hại! Nhấn 'Cam kết sửa sai' ngay trước khi bị trừ sạch điểm Rank! 💣"
  },

  // 2. Trễ giờ tập (> 20:00)
  WORKOUT_OVERDUE: {
    EASY: "Muộn rồi đấy bạn ơi! Tập nhẹ nhàng một chút rồi nghỉ ngơi cho khỏe nhé? 🧘‍♂️",
    SERIOUS: "Đã qua 20:00 và bạn chưa hoàn thành bài tập. Việc này làm trễ tiến độ mục tiêu.",
    STRICT: "🔥 20h đêm rồi! Định nằm lướt điện thoại đến bao giờ? Muốn có cơ bắp hay mỡ thừa? XỎ GIÀY VÀO NGAY! 👟💥"
  },

  // 3. Trễ bữa ăn
  MEAL_OVERDUE: (mealName) => ({
    EASY: `Bữa ${mealName || 'ăn'} bị trễ chút rồi nè. Nhớ nạp năng lượng đầy đủ nhé! 🥗`,
    SERIOUS: `Bạn đã trễ giờ ăn bữa ${mealName || 'ăn'}. Việc bỏ bữa sẽ làm rối loạn trao đổi chất.`,
    STRICT: `⚠️ Lại bỏ bữa ${mealName || 'ăn'}? Cơ bắp đang bị tiêu hoại vì sự thiếu kỷ luật của bạn đấy! Ăn ngay! 🥩🔥`
  }),

  // 4. Tập luyện xong
  WORKOUT_DONE: {
    EASY: "Tuyệt vời quá! Bạn đã hoàn thành bài tập hôm nay rồi! 🎉",
    SERIOUS: "Ghi nhận: Đã hoàn thành buổi tập. Phong độ rất ổn định.",
    STRICT: "🦾 Tốt! Ít nhất hôm nay bạn không nuốt lời. Hoàn thành bài tập rồi đấy!"
  },

  // 5. Dinh dưỡng đạt chuẩn
  DIET_DONE: {
    EASY: "Hôm nay ăn uống chuẩn chỉnh lắm nha, thưởng cho bạn một điểm cộng! ✨",
    SERIOUS: "Lượng Calo và dinh dưỡng hôm nay nằm trong ngưỡng mục tiêu.",
    STRICT: "🥗 Dinh dưỡng hôm nay kiểm soát tốt. Giữ nguyên kỷ luật này cho các bữa sau!"
  },

  // 6. Hoàn thành cả Tập + Ăn (Chốt sổ)
  ALL_COMPLETED: {
    EASY: "Hôm nay bạn làm xuất sắc lắm! Bấm chốt sổ rồi nghỉ ngơi thôi nào! 🌟",
    SERIOUS: "Hoàn thành 100% mục tiêu ngày. Hãy chốt sổ để nhận thưởng Rank Points.",
    STRICT: "🎯 Xuất sắc! Hôm nay không có gì để chê trách. Bấm CHỐT SỔ ngay đi rồi nghỉ!"
  },

  // 7. Lời chào đầu ngày
  WELCOME: {
    EASY: "Chào ngày mới! Cùng nhau hoàn thành mục tiêu hôm nay thật vui nhé! 😊",
    SERIOUS: "Bắt đầu ngày mới. Hệ thống đã sẵn sàng theo dõi chỉ số của bạn.",
    STRICT: "⏰ Ngày mới rồi! Đừng tìm lý do biện hộ nữa, bắt tay vào kỷ luật ngay!"
  },

  // 8. Cảnh báo THIẾU Calo
  CALORIE_UNDER: (diff) => ({
    EASY: `Hình như bạn ăn chưa đủ (thiếu ~${diff} kcal). Nhớ ăn thêm một chút nha. 🍲`,
    SERIOUS: `Bạn chưa nạp đủ lượng calo (thiếu ${diff} kcal). Hãy bổ sung đúng kế hoạch nhé.`,
    STRICT: `🚨 Báo động! Bạn đang thiếu ${diff} kcal. Mau nạp năng lượng nếu không muốn cơ bắp bị dị hóa! 📉`
  }),

  // 9. Cảnh báo THỪA Calo
  CALORIE_OVER: (diff) => ({
    EASY: `Bạn ăn hơi lố ${diff} kcal rồi đó, ngày mai rút kinh nghiệm nhé. 😅`,
    SERIOUS: `Bạn đã vượt mức mục tiêu ${diff} kcal. Hãy điều chỉnh lượng ăn ngay.`,
    STRICT: `🛑 Dừng lại ngay! Bạn đã ăn lố ${diff} kcal rồi. Kỷ luật của bạn để đi đâu? 🐷`
  }),

  // 10. Ngày nghỉ ngơi (Rest Day)
  REST_DAY: {
    EASY: "Hôm nay là ngày nghỉ ngơi. Bạn có thể nhấn Chốt Sổ bất cứ lúc nào để tận hưởng ngày thảnh thơi nha! 🛋️",
    SERIOUS: "Hôm nay là ngày nghỉ ngơi. Bạn có thể chốt sổ hệ thống bất cứ lúc nào.",
    STRICT: "🛌 Nay là ngày nghỉ. Phục hồi cơ bắp để mai chiến tiếp! Bạn có thể nhấn Chốt Sổ sớm nhưng nhớ giữ kỷ luật ăn uống!"
  }
};

/**
 * Hàm phát sinh danh sách Thông báo & Chỉ trích động
 */
const generateCoachingNotifications = ({ style = 'SERIOUS', isViolating, workout, diet }) => {
  const selectedStyle = ['EASY', 'SERIOUS', 'STRICT'].includes(style) ? style : 'SERIOUS';
  const notifications = [];
  const now = new Date();
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  // 1. Vi phạm kỷ luật
  if (isViolating) {
    notifications.push({
      id: 'violation',
      time: timeStr,
      text: MESSAGES.VIOLATION[selectedStyle],
      type: 'error'
    });
  }

  // 2. Trạng thái Tập luyện & Ngày nghỉ
  if (workout?.isRestDay && !workout?.didWorkout) {
    // Nếu là ngày nghỉ và chưa tập (bạn có thể có bài tập nhẹ vào ngày nghỉ, nếu đã tập rồi thì hiện WORKOUT_DONE)
    notifications.push({
      id: 'rest_day',
      time: '08:00', // Giờ giả định cho lời nhắc đầu ngày
      text: MESSAGES.REST_DAY[selectedStyle],
      type: 'info'
    });
  } else if (workout?.didWorkout) {
    notifications.push({
      id: 'workout_done',
      time: timeStr,
      text: MESSAGES.WORKOUT_DONE[selectedStyle],
      type: 'success'
    });
  } else if (workout?.isOverdue) {
    notifications.push({
      id: 'workout_overdue',
      time: '20:00',
      text: MESSAGES.WORKOUT_OVERDUE[selectedStyle],
      type: 'warning'
    });
  }

  // 3. Trạng thái Dinh dưỡng & Calo
  if (diet?.hasPlan) {
    if (diet.didEatRight || diet.isCaloriesMet) {
      notifications.push({
        id: 'diet_done',
        time: timeStr,
        text: MESSAGES.DIET_DONE[selectedStyle],
        type: 'success'
      });
    } else {
      // Kiểm tra trễ bữa
      if (diet.isMealOverdue) {
        const meal = diet.overdueMealName ? diet.overdueMealName.toUpperCase() : "một bữa";
        notifications.push({
          id: 'meal_overdue',
          time: timeStr,
          text: MESSAGES.MEAL_OVERDUE(meal)[selectedStyle],
          type: 'warning'
        });
      }

      // Kiểm tra thừa/thiếu calo
      if (diet.calorieStatus === 'UNDER' && diet.calorieDiff > 0) {
        const diffStr = diet.calorieDiff.toFixed(0);
        notifications.push({
          id: 'calorie_under',
          time: timeStr,
          text: MESSAGES.CALORIE_UNDER(diffStr)[selectedStyle],
          type: 'warning' // hoặc 'error' tuỳ mức độ bạn muốn
        });
      } else if (diet.calorieStatus === 'OVER' && diet.calorieDiff > 0) {
        const diffStr = diet.calorieDiff.toFixed(0);
        notifications.push({
          id: 'calorie_over',
          time: timeStr,
          text: MESSAGES.CALORIE_OVER(diffStr)[selectedStyle],
          type: 'error'
        });
      }
    }
  }

  // 4. Nếu xong tất cả (Tập xong / Ngày nghỉ VÀ Ăn đúng)
  const isWorkoutClear = workout?.didWorkout || workout?.isRestDay;
  const isDietClear = !diet?.hasPlan || diet?.didEatRight || diet?.isCaloriesMet;

  if (isWorkoutClear && isDietClear && (workout?.didWorkout || diet?.didEatRight)) {
    // Chỉ báo hoàn thành khi có ít nhất một hành động (tập hoặc ăn) đã được hoàn thành
    notifications.push({
      id: 'all_completed',
      time: timeStr,
      text: MESSAGES.ALL_COMPLETED[selectedStyle],
      type: 'info'
    });
  }

  // 5. Mặc định nếu chưa có thông báo đặc biệt (và không có vi phạm gì)
  if (notifications.length === 0) {
    notifications.push({
      id: 'welcome',
      time: '07:00',
      text: MESSAGES.WELCOME[selectedStyle],
      type: 'info'
    });
  }

  return notifications;
};

module.exports = { generateCoachingNotifications };