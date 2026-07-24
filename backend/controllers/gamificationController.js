const Gamification = require('../models/Gamification');
const WorkoutLog = require('../models/WorkoutLog');
const DailyDietLog = require('../models/DailyDietLog');
const { closeDayForUser } = require('../services/cronService');

// API: GET /api/gamification/stats
const getUserStats = async (req, res) => {
  try {
    const userId = req.user.id; 
    let stats = await Gamification.findOne({ userId });
    if (!stats) stats = await Gamification.create({ userId }); // Dùng create để lưu thẳng vào DB nếu chưa có

    const now = new Date();
    
    // --- BỔ SUNG: Cấu hình mốc thời gian ngày hôm nay ---
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const dayOfWeek = now.getDay() || 7; 
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek + 1, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);

    // Đếm trực tiếp từ Log thực tế (Nguồn sự thật duy nhất) + KIỂM TRA NGÀY HÔM NAY
    const [
      realWorkouts, realDietDays,
      workoutsThisWeek, workoutsThisMonth,
      dietThisWeek, dietThisMonth,
      todayWorkout, todayDiet 
    ] = await Promise.all([
      WorkoutLog.countDocuments({ userId, isCompleted: true }), 
      DailyDietLog.countDocuments({ userId, isDayCompleted: true }), 
      
      WorkoutLog.countDocuments({ userId, isCompleted: true, date: { $gte: startOfWeek } }), 
      WorkoutLog.countDocuments({ userId, isCompleted: true, date: { $gte: startOfMonth } }), 
      
      DailyDietLog.countDocuments({ userId, isDayCompleted: true, date: { $gte: startOfWeek } }), 
      DailyDietLog.countDocuments({ userId, isDayCompleted: true, date: { $gte: startOfMonth } }),

      // Kiểm tra xem hôm nay đã hoàn thành bài tập và ăn uống chưa
      WorkoutLog.findOne({ userId, date: { $gte: startOfDay, $lte: endOfDay }, isCompleted: true }),
      DailyDietLog.findOne({ userId, date: { $gte: startOfDay, $lte: endOfDay }, isDayCompleted: true })
    ]);

    // Ép kiểu sang Object thuần để gán đè dữ liệu realtime trả về client
    const responseStats = stats.toObject();
    responseStats.totalWorkoutSessions = realWorkouts;
    responseStats.totalPerfectDietDays = realDietDays;

    res.status(200).json({ 
      success: true, 
      stats: responseStats, 
      periodStats: { workoutsThisWeek, workoutsThisMonth, dietThisWeek, dietThisMonth },
      todayStatus: {
        didWorkout: !!todayWorkout,
        didEatRight: !!todayDiet
      }
    });

  } catch (error) {
    console.error("Lỗi lấy dữ liệu Gamification:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// API: POST /api/gamification/manual-close (Chốt sổ sớm ngay trong ngày)
const manualCloseDay = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await closeDayForUser(userId);
    
    if (!result.success) {
      return res.status(400).json({ success: false, message: result.message });
    }
    return res.status(200).json({ success: true, message: result.message });
  } catch (error) {
    console.error("Lỗi API chốt sổ thủ công:", error);
    res.status(500).json({ success: false, message: "Lỗi hệ thống khi chốt sổ." });
  }
};

// ================= CÁC CHỨC NĂNG MỚI BỔ SUNG =================

// API: PUT /api/gamification/coaching-style (Cập nhật tính cách HLV)
const updateCoachingStyle = async (req, res) => {
  try {
    const userId = req.user.id;
    const { style } = req.body; // Gửi lên 'EASY', 'SERIOUS', hoặc 'STRICT'

    if (!['EASY', 'SERIOUS', 'STRICT'].includes(style)) {
      return res.status(400).json({ success: false, message: "Tính cách không hợp lệ (Phải là EASY, SERIOUS, hoặc STRICT)." });
    }

    const stats = await Gamification.findOneAndUpdate(
      { userId },
      { coachingStyle: style },
      { new: true, upsert: true }
    );

    res.status(200).json({ 
      success: true, 
      message: `Đã cập nhật tính cách AI thành ${style}`, 
      coachingStyle: stats.coachingStyle 
    });
  } catch (error) {
    console.error("Lỗi cập nhật coaching style:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// API: POST /api/gamification/resolve-violation (Cam kết sửa sai để tắt spam thông báo STRICT mode)
const resolveViolation = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const stats = await Gamification.findOne({ userId });
    if (!stats) return res.status(404).json({ success: false, message: "Không tìm thấy dữ liệu Gamification" });

    if (!stats.activeViolation.isViolating) {
      return res.status(400).json({ success: false, message: "Bạn hiện không có vi phạm nào cần xử lý." });
    }

    // Reset cờ vi phạm để ngưng cronjob spam 5 phút/lần
    stats.activeViolation.isViolating = false;
    stats.activeViolation.violationType = null;
    stats.activeViolation.nagCount = 0;
    
    await stats.save();

    res.status(200).json({ 
      success: true, 
      message: "Tuyệt vời! Hãy nhớ giữ đúng cam kết của bạn nhé. Hệ thống đã tắt cảnh báo liên tục." 
    });
  } catch (error) {
    console.error("Lỗi xử lý vi phạm:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

module.exports = { 
  getUserStats, 
  manualCloseDay,
  updateCoachingStyle,  // <--- Bổ sung export
  resolveViolation      // <--- Bổ sung export
};