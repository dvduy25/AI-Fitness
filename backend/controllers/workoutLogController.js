// controllers/workoutLogController.js
const WorkoutLog = require("../models/WorkoutLog");

// ==========================================
// 1. LƯU HOẶC CẬP NHẬT KẾT QUẢ TẬP HÔM NAY (UPSERT)
// ==========================================
// ==========================================
// 1. LƯU HOẶC CẬP NHẬT KẾT QUẢ TẬP HÔM NAY (UPSERT AN TOÀN)
// ==========================================
// controllers/workoutLogController.js

exports.saveDailyLog = async (req, res) => {
  try {
    const userId = req.user.id;
    const { planDay, exercises } = req.body;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // BƯỚC 1: Tìm xem hôm nay đã có nhật ký chưa
    let log = await WorkoutLog.findOne({ 
      userId, 
      date: { $gte: startOfDay, $lte: endOfDay } 
    });

    if (log) {
      // BƯỚC 2: Nếu có rồi thì cập nhật bài tập và ngày trong lịch
      log.exercises = exercises;
      log.planDay = planDay;
      log.isCompleted = true;
      await log.save();
    } else {
      // BƯỚC 3: Nếu chưa có thì tạo mới hoàn toàn
      log = new WorkoutLog({
        userId,
        planDay,
        exercises,
        isCompleted: true,
        date: new Date() // Ngày hiện tại
      });
      await log.save();
    }

    res.status(200).json({ message: "Đã đồng bộ kết quả tập!", log });
  } catch (error) {
    console.error("Lỗi Backend saveDailyLog:", error);
    res.status(500).json({ message: "Lỗi lưu kết quả", error: error.message });
  }
};

// ==========================================
// 2. LẤY MỨC TẠ CỦA LẦN GẦN NHẤT (ĐỂ SO SÁNH TĂNG TIẾN)
// ==========================================
exports.getPreviousExerciseRecord = async (req, res) => {
  try {
    const userId = req.user.id;
    const { exerciseId } = req.params;

    // 1. Tạo mốc thời gian 00:00:00 của ngày hôm nay
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // 2. Tìm buổi tập gần nhất BÉ HƠN ngày hôm nay (loại trừ buổi đang tập dở)
    const lastLog = await WorkoutLog.findOne({ 
      userId, 
      "exercises.exerciseId": exerciseId,
      date: { $lt: startOfToday } // <-- ĐIỂM QUAN TRỌNG NHẤT LÀ ĐÂY
    }).sort({ date: -1 });

    if (!lastLog) {
      return res.status(200).json({ hasHistory: false, message: "Đây là lần đầu tập bài này hoặc chưa có dữ liệu cũ" });
    }

    // 3. Lọc ra đúng bài tập đó trong buổi tập cũ
    const previousRecord = lastLog.exercises.find(ex => ex.exerciseId.toString() === exerciseId);

    if (!previousRecord || previousRecord.setsPerformed.length === 0) {
      return res.status(200).json({ hasHistory: false });
    }

    // 4. Trả về thành công
    res.status(200).json({ 
      hasHistory: true, 
      date: lastLog.date, 
      previousSets: previousRecord.setsPerformed 
    });
  } catch (error) {
    console.error("Lỗi API getPreviousExerciseRecord:", error);
    res.status(500).json({ message: "Lỗi lấy lịch sử", error: error.message });
  }
};

// ==========================================
// 3. LẤY DỮ LIỆU ĐANG TẬP DỞ CỦA NGÀY HÔM NAY (ĐỂ TIẾP TỤC TẬP)
// ==========================================
exports.getTodayLog = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Lấy mốc thời gian từ 00:00:00 đến 23:59:59 của ngày hôm nay
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const todayLog = await WorkoutLog.findOne({
      userId,
      date: { $gte: startOfDay, $lte: endOfDay }
    });

    res.status(200).json({ log: todayLog });
  } catch (error) {
    res.status(500).json({ message: "Lỗi lấy dữ liệu hôm nay", error: error.message });
  }
};