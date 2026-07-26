// services/coachingService.js

const MESSAGES = {
  VIOLATION: {
    EASY: "Dạo này bạn hơi xao nhãng chút rồi đó. Cùng nỗ lực lại từ hôm nay nha! 💕",
    SERIOUS: "CẢNH BÁO: Bạn đang tích lũy vi phạm kỷ luật. Chuỗi Streak và điểm Rank sẽ bị tổn hại.",
    STRICT: "🚨 CẢNH BÁO ĐỎ! Bạn đang lười biếng một cách thảm hại! Nhấn 'Cam kết sửa sai' ngay trước khi bị trừ sạch điểm Rank! 💣"
  },

  WORKOUT_UPCOMING: {
    EASY: "Sắp tới giờ tập rồi kìa, chuẩn bị khởi động cho giãn gân cốt nha 🏃‍♂️",
    SERIOUS: "Sắp đến lịch tập luyện. Hãy khởi động kỹ để tránh chấn thương.",
    STRICT: "🔥 Chuẩn bị đến giờ tập! Đừng có viện lý do trì hoãn. Cất điện thoại đi và vào việc ngay! 🏋️‍♂️"
  },
  WORKOUT_OVERDUE: {
    EASY: "Muộn lịch tập rồi đấy bạn ơi! Tập nhẹ nhàng một chút rồi nghỉ ngơi nhé? 🧘‍♂️",
    SERIOUS: "Đã quá giờ lịch tập và bạn chưa hoàn thành. Việc này làm chậm trễ tiến độ.",
    STRICT: "⚠️ Quá lịch tập rồi! Lại định lười biếng đúng không? XỎ GIÀY VÀO NGAY NẾU KHÔNG MUỐN MẤT CƠ BẮP! 👟💥"
  },

  MEAL_UPCOMING: (mealName) => ({
    EASY: `Sắp tới giờ cho bữa ${mealName || 'ăn'} rồi, chuẩn bị món ăn ngon miệng nhé 🍱`,
    SERIOUS: `Sắp đến lịch dùng bữa ${mealName || 'ăn'}. Vui lòng chuẩn bị thực phẩm đúng định lượng.`,
    STRICT: `⏰ Còn chưa đầy 30p nữa là tới bữa ${mealName || 'ăn'}! Nhấc mông lên chuẩn bị đồ ăn đi, đừng để đói rồi ăn bậy bạ! 🥩`
  }),
  MEAL_OVERDUE: (mealName) => ({
    EASY: `Bữa ${mealName || 'ăn'} bị trễ mất tiêu rồi nè. Nhớ nạp năng lượng đầy đủ nhé! 🥗`,
    SERIOUS: `CẢNH BÁO: Bạn đã trễ bữa ${mealName || 'ăn'}. Bỏ bữa sẽ làm rối loạn chuyển hóa calo của bạn.`,
    STRICT: `🚨 Lại quá giờ bữa ${mealName || 'ăn'}! Cơ bắp đang bị dị hóa tiêu biến vì sự vô kỷ luật của bạn đấy! Đi ăn ngay! 😡🔥`
  }),

  CALORIE_UNDER: (diff, isCompleted) => ({
    EASY: isCompleted ? `Hôm nay chốt ăn xong rồi mà hình như thiếu khoảng ${diff} kcal đó nha. Mai đắp thêm bù nha! 🍲` : `Bạn đang thiếu ~${diff} kcal đó, cẩn thận đói nhé.`,
    SERIOUS: isCompleted ? `LƯU Ý: Bạn đã hoàn tất ăn uống nhưng hụt mất ${diff} kcal so với mục tiêu. Cần cân đối lại vào ngày mai.` : `Bạn đang nạp thiếu ${diff} kcal. Hãy bổ sung theo kế hoạch.`,
    STRICT: isCompleted ? `🛑 BÁO ĐỘNG! Bấm hoàn thành ăn uống rồi mà vẫn hụt tận ${diff} kcal? Cơ bắp đang thiếu hụt trầm trọng! Nhớ mặt ngày mai đấy! 📉` : `Cảnh báo dị hóa! Đang hụt ${diff} kcal! Mau nạp thêm năng lượng đi!`
  }),
  CALORIE_OVER: (diff, isCompleted) => ({
    EASY: isCompleted ? `Hôm nay bạn lỡ vui miệng dư ra ~${diff} kcal rồi. Không sao, mai rút kinh nghiệm nhé! 😅` : `Đang vượt lố ${diff} kcal rồi nha, tém tém lại xíu 🤐`,
    SERIOUS: isCompleted ? `CẢNH BÁO: Bạn đã hoàn thành chế độ nhưng vượt mức ${diff} kcal. Quá trình giảm mỡ sẽ bị ảnh hưởng.` : `Bạn đã vượt mục tiêu ${diff} kcal. Dừng nạp calo ngay.`,
    STRICT: isCompleted ? `🛑 NGỪNG LẠI! Chốt ngày mà dư tận ${diff} kcal? Kỷ luật của bạn vứt đi đâu rồi? Lượng mỡ này ngày mai tập bù lòi bản họng nhé! 🐷` : `Ăn quá đà lố ${diff} kcal rồi đấy! Dừng mồm lại ngay!`
  }),

  WORKOUT_DONE: {
    EASY: "Tuyệt vời quá! Bạn đã đổ mồ hôi hoàn thành bài tập hôm nay rồi! 🎉",
    SERIOUS: "Ghi nhận: Đã hoàn thành buổi tập. Phong độ rất ổn định.",
    STRICT: "🦾 Tốt! Ít nhất hôm nay bạn không làm tôi thất vọng. Khá khen cho nỗ lực tập luyện!"
  },
  DIET_DONE: {
    EASY: "Hôm nay ăn uống chuẩn chỉnh lắm nha, thưởng cho bạn một điểm 10! ✨",
    SERIOUS: "Dinh dưỡng hôm nay đạt mức hoàn hảo trong giới hạn calo.",
    STRICT: "🥗 Dinh dưỡng hôm nay kiểm soát rất tốt. Hãy duy trì sự khắt khe này cho những ngày sau!"
  },

  REST_DAY: {
    EASY: "Hôm nay là ngày nghỉ ngơi nhưng nhớ VẪN PHẢI ĂN UỐNG ĐẦY ĐỦ mới được chốt sổ nha! 🛋️",
    SERIOUS: "Hôm nay là Rest Day. Bạn không cần tập nhưng bắt buộc phải hoàn thành mục tiêu dinh dưỡng để chốt sổ.",
    STRICT: "🛌 Nay nghỉ tập! Nhưng MỒM thì không được nghỉ kỷ luật! Phải hoàn thành chế độ ăn mới được phép nhấn chốt sổ! Rõ chưa? ⚡"
  },

  ALL_COMPLETED: {
    EASY: "Wowww! Hoàn thành xuất sắc 100% mục tiêu! Bấm chốt sổ rồi đi ngủ ngon thôi nào! 🌟",
    SERIOUS: "Hệ thống xác nhận 100% mục tiêu hoàn tất. Vui lòng bấm CHỐT SỔ để lưu lại chuỗi Streak.",
    STRICT: "🎯 Hôm nay xuất sắc! Mọi nhiệm vụ đã xong. Bấm CHỐT SỔ NGAY và chuẩn bị tinh thần cho ngày mai!"
  },
  WELCOME: {
    EASY: "Chào ngày mới! Cùng nhau làm một ngày thật hiệu quả nhé! 😊",
    SERIOUS: "Bắt đầu ngày mới. Hệ thống đã kích hoạt theo dõi chỉ số.",
    STRICT: "⏰ Dậy đi! Mục tiêu mới không chờ những kẻ lười biếng! Bắt tay vào kỷ luật ngay lập tức!"
  }
};

const generateCoachingNotifications = ({ style = 'SERIOUS', isViolating, workout, diet, canCloseDay }) => {
  const selectedStyle = ['EASY', 'SERIOUS', 'STRICT'].includes(style) ? style : 'SERIOUS';
  const notifications = [];
  
  // Lấy giờ chuẩn theo múi giờ Việt Nam
  const vnTime = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }));
  const timeStr = `${vnTime.getHours().toString().padStart(2, '0')}:${vnTime.getMinutes().toString().padStart(2, '0')}`;

  // 1. Vi phạm nghiêm trọng
  if (isViolating) {
    notifications.push({ id: 'violation', time: timeStr, text: MESSAGES.VIOLATION[selectedStyle], type: 'error' });
  }

  // 2. Xét trạng thái Dinh dưỡng & Calo (Quan trọng kể cả ngày nghỉ)
  if (diet?.hasPlan) {
    if (diet.didEatRight) {
      // Đã báo hoàn thành ăn, nhưng kiểm tra xem có hụt/thừa calo không
      if (diet.calorieStatus === 'UNDER' && diet.calorieDiff > 0) {
        notifications.push({ id: 'calorie_under_done', time: timeStr, text: MESSAGES.CALORIE_UNDER(diet.calorieDiff.toFixed(0), true)[selectedStyle], type: 'warning' });
      } else if (diet.calorieStatus === 'OVER' && diet.calorieDiff > 0) {
        notifications.push({ id: 'calorie_over_done', time: timeStr, text: MESSAGES.CALORIE_OVER(diet.calorieDiff.toFixed(0), true)[selectedStyle], type: 'error' });
      } else {
        notifications.push({ id: 'diet_done', time: timeStr, text: MESSAGES.DIET_DONE[selectedStyle], type: 'success' });
      }
    } else {
      // Chưa ăn xong, cảnh báo nếu quá bữa / sắp tới bữa
      if (diet.isMealOverdue) {
        const meal = diet.overdueMealName?.toUpperCase();
        notifications.push({ id: 'meal_overdue', time: timeStr, text: MESSAGES.MEAL_OVERDUE(meal)[selectedStyle], type: 'error' });
      } else if (diet.isMealUpcoming) {
        const meal = diet.upcomingMealName?.toUpperCase();
        notifications.push({ id: 'meal_upcoming', time: timeStr, text: MESSAGES.MEAL_UPCOMING(meal)[selectedStyle], type: 'warning' });
      }
      
      // Nếu chưa hết ngày mà đã lố calo / hụt calo
      if (diet.calorieStatus === 'OVER' && diet.calorieDiff > 0) {
        notifications.push({ id: 'calorie_over_current', time: timeStr, text: MESSAGES.CALORIE_OVER(diet.calorieDiff.toFixed(0), false)[selectedStyle], type: 'error' });
      } else if (diet.calorieStatus === 'UNDER' && diet.calorieDiff > 0) {
        notifications.push({ id: 'calorie_under_current', time: timeStr, text: MESSAGES.CALORIE_UNDER(diet.calorieDiff.toFixed(0), false)[selectedStyle], type: 'warning' });
      }
    }
  }

  // 3. Xét trạng thái Tập Luyện
  if (workout?.isRestDay && !workout?.didWorkout) {
    notifications.push({ id: 'rest_day', time: '08:00', text: MESSAGES.REST_DAY[selectedStyle], type: 'info' });
  } else if (workout?.didWorkout) {
    notifications.push({ id: 'workout_done', time: timeStr, text: MESSAGES.WORKOUT_DONE[selectedStyle], type: 'success' });
  } else {
    if (workout?.isOverdue) {
      notifications.push({ id: 'workout_overdue', time: timeStr, text: MESSAGES.WORKOUT_OVERDUE[selectedStyle], type: 'error' });
    } else if (workout?.isUpcoming) {
      notifications.push({ id: 'workout_upcoming', time: timeStr, text: MESSAGES.WORKOUT_UPCOMING[selectedStyle], type: 'warning' });
    }
  }

  // 4. Nếu đủ mọi điều kiện Chốt Sổ (Tập xong + Ăn xong)
  if (canCloseDay) {
    notifications.push({ id: 'all_completed', time: timeStr, text: MESSAGES.ALL_COMPLETED[selectedStyle], type: 'success' });
  }

  // 5. Mặc định
  if (notifications.length === 0) {
    notifications.push({ id: 'welcome', time: '07:00', text: MESSAGES.WELCOME[selectedStyle], type: 'info' });
  }

  // Trả về, thông báo nào push sau cùng sẽ có ID đè ưu tiên nếu cần ở UI
  return notifications;
};

module.exports = { generateCoachingNotifications };