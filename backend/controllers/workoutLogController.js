// controllers/workoutLogController.js
// =====================================================
// Chức năng: Check-in tập luyện & Cập nhật Kỷ lục bài tập
// =====================================================
const WorkoutLog = require("../models/WorkoutLog");
const Exercise = require("../models/Exercise");

/**
 * Hàm hỗ trợ lấy chuỗi Date YYYY-MM-DD theo giờ địa phương (Local Time)
 * Tránh lỗi lệch múi giờ của toISOString()
 */
const toLocalDateStr = (dateObj = new Date()) => {
  const yyyy = dateObj.getFullYear();
  const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
  const dd = String(dateObj.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

// ─────────────────────────────────────────────────
// POST /api/workout-logs/checkin
// Body: { didWorkout: true | false, note? }
// ─────────────────────────────────────────────────
exports.checkIn = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { didWorkout, note } = req.body;

    if (typeof didWorkout !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "didWorkout phải là true hoặc false!",
      });
    }

    const today = toLocalDateStr();

    // Chuẩn bị object update
    const updateData = { didWorkout };
    if (note !== undefined) updateData.note = note;

    const log = await WorkoutLog.findOneAndUpdate(
      { userId, date: today },
      { $set: updateData },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.json({
      success: true,
      message: didWorkout ? "Check-in tập luyện thành công!" : "Đã ghi nhận ngày nghỉ!",
      log,
    });
  } catch (error) {
    console.error("[checkIn]", error.message);
    res.status(500).json({ success: false, message: "Lỗi server!", error: error.message });
  }
};

// ─────────────────────────────────────────────────
// PUT /api/workout-logs/max
// Body: Hỗ trợ gửi mảng { exercises: [...] } HOẶC gửi lẻ { exerciseId, maxWeight, maxReps }
// ─────────────────────────────────────────────────
exports.updateExerciseMax = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { date, exercises, exerciseId, maxWeight, maxReps } = req.body;

    const today = date || toLocalDateStr();

    // 1. Chuẩn hóa dữ liệu đầu vào thành mảng để xử lý (hỗ trợ cả Frontend cũ & mới)
    let exercisesToProcess = [];
    if (exercises && Array.isArray(exercises)) {
      exercisesToProcess = exercises;
    } else if (exerciseId) {
      exercisesToProcess = [{ exerciseId, maxWeight, maxReps }];
    }

    if (exercisesToProcess.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Không có dữ liệu bài tập hợp lệ!",
      });
    }

    // 2. Tìm hoặc tạo bản ghi log hôm nay (Tự động Check-in nếu người dùng quên)
    let todayLog = await WorkoutLog.findOne({ userId, date: today });
    if (!todayLog) {
      todayLog = new WorkoutLog({ userId, date: today, didWorkout: true, exerciseMaxes: [] });
    } else {
      todayLog.didWorkout = true; 
    }

    let isAnyRecordBroken = false;

    // 3. Duyệt qua danh sách bài tập để cập nhật MAX
    for (const ex of exercisesToProcess) {
      const exId = ex.exerciseId;
      const inputWeight = Number(ex.maxWeight) || 0;
      const inputReps = Number(ex.maxReps) || 0;

      if (inputWeight < 0 || inputReps < 0) continue; // Bỏ qua dữ liệu âm

      // Lấy tên bài tập (cache lại trong record)
      const exDoc = await Exercise.findById(exId).select("name");
      const exerciseName = exDoc?.name || "Bài tập";

      // Tìm kỷ lục đã ghi nhận trong ngày hôm nay
      const existingIndex = todayLog.exerciseMaxes.findIndex(
        (e) => e.exerciseId.toString() === exId.toString()
      );
      const existing = existingIndex !== -1 ? todayLog.exerciseMaxes[existingIndex] : null;

      const prevMaxWeight = existing?.maxWeight ?? 0;
      const prevMaxReps = existing?.maxReps ?? 0;

      // --- LOGIC SO SÁNH KỶ LỤC CHUẨN GYM ---
      // Vượt kỷ lục nếu: Tạ nặng hơn OR (Tạ bằng AND Reps nhiều hơn)
      const isWeightHigher = inputWeight > prevMaxWeight;
      const isRepsHigher = inputWeight === prevMaxWeight && inputReps > prevMaxReps;
      const improved = isWeightHigher || isRepsHigher;

      const finalWeight = improved ? inputWeight : prevMaxWeight;
      const finalReps = improved ? inputReps : prevMaxReps;

      if (improved) isAnyRecordBroken = true;

      // Lưu lại vào log
      if (existingIndex !== -1) {
        todayLog.exerciseMaxes[existingIndex].maxWeight = finalWeight;
        todayLog.exerciseMaxes[existingIndex].maxReps = finalReps;
        todayLog.exerciseMaxes[existingIndex].exerciseName = exerciseName;
      } else {
        todayLog.exerciseMaxes.push({
          exerciseId: exId,
          exerciseName: exerciseName,
          maxWeight: finalWeight,
          maxReps: finalReps,
          prevMaxWeight: 0, // Có thể fetch từ record ngày hôm qua nếu muốn mở rộng
          prevMaxReps: 0
        });
      }
    }

    // 4. Lưu bản ghi đã cập nhật
    await todayLog.save();

    return res.json({
      success: true,
      message: isAnyRecordBroken ? "Tuyệt vời, bạn đã phá kỷ lục mới!" : "Đã ghi nhận thành tích Max hôm nay.",
      log: todayLog,
    });
  } catch (error) {
    console.error("[updateExerciseMax]", error.message);
    res.status(500).json({ success: false, message: "Lỗi server!", error: error.message });
  }
};

// ─────────────────────────────────────────────────
// GET /api/workout-logs/today
// ─────────────────────────────────────────────────
exports.getTodayLog = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const today = toLocalDateStr();

    const log = await WorkoutLog.findOne({ userId, date: today }).populate(
      "exerciseMaxes.exerciseId",
      "name muscleGroup"
    );

    return res.json({
      success: true,
      date: today,
      log: log || null,
      didWorkout: log?.didWorkout ?? null,
    });
  } catch (error) {
    console.error("[getTodayLog]", error.message);
    res.status(500).json({ success: false, message: "Lỗi server!" });
  }
};

// ─────────────────────────────────────────────────
// GET /api/workout-logs/history?month=YYYY-MM
// ─────────────────────────────────────────────────
exports.getHistory = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { month } = req.query;

    const filter = { userId };
    if (month) filter.date = { $regex: `^${month}` };

    const logs = await WorkoutLog.find(filter)
      .sort({ date: 1 })
      .select("date didWorkout exerciseMaxes note");

    // --- LOGIC TÍNH STREAK CHUẨN TỪ TOÀN BỘ LỊCH SỬ ---
    const allWorkedOutLogs = await WorkoutLog.find({ userId, didWorkout: true })
      .select("date")
      .sort({ date: -1 });

    const workedOutSet = new Set(allWorkedOutLogs.map((l) => l.date));

    let streak = 0;
    const checkDate = new Date();
    const todayStr = toLocalDateStr(checkDate);

    // Nếu hôm nay chưa tập, lùi checkDate lại 1 ngày để kiểm tra chuỗi nối tiếp từ hôm qua
    if (!workedOutSet.has(todayStr)) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    while (true) {
      const dateStr = toLocalDateStr(checkDate);
      if (workedOutSet.has(dateStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return res.json({
      success: true,
      logs,
      stats: {
        totalDays: logs.length,
        workedOutDays: logs.filter((l) => l.didWorkout).length,
        restDays: logs.filter((l) => !l.didWorkout).length,
        currentStreak: streak,
      },
    });
  } catch (error) {
    console.error("[getHistory]", error.message);
    res.status(500).json({ success: false, message: "Lỗi server!" });
  }
};

// ─────────────────────────────────────────────────
// GET /api/workout-logs/personal-records
// Kỷ lục cá nhân (All-time PRs)
// ─────────────────────────────────────────────────
exports.getPersonalRecords = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;

    const records = await WorkoutLog.aggregate([
      { $match: { userId, didWorkout: true } },
      { $unwind: "$exerciseMaxes" },
      // Sắp xếp theo tạ giảm dần, reps giảm dần trước khi group
      {
        $sort: {
          "exerciseMaxes.maxWeight": -1,
          "exerciseMaxes.maxReps": -1,
          date: -1,
        },
      },
      {
        $group: {
          _id: "$exerciseMaxes.exerciseId",
          exerciseName: { $first: "$exerciseMaxes.exerciseName" },
          allTimeWeight: { $first: "$exerciseMaxes.maxWeight" },
          allTimeReps: { $first: "$exerciseMaxes.maxReps" },
          achievedDate: { $first: "$date" },
        },
      },
      { $sort: { allTimeWeight: -1 } },
    ]);

    return res.json({ success: true, records });
  } catch (error) {
    console.error("[getPersonalRecords]", error.message);
    res.status(500).json({ success: false, message: "Lỗi server!" });
  }
};