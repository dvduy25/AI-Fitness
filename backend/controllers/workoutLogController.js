// controllers/workoutLogController.js (VIẾT LẠI)
// =====================================================
// Chỉ 2 chức năng:
//   1. Check-in hôm nay có tập không
//   2. Cập nhật kỷ lục max tạ / max rep từng bài
// =====================================================
const WorkoutLog = require("../models/WorkoutLog");
const Exercise   = require("../models/Exercise");

const toDateStr = () => new Date().toISOString().split("T")[0];

// ─────────────────────────────────────────────────
// POST /api/workout-logs/checkin
// Body: { didWorkout: true | false, note? }
// Tạo hoặc cập nhật record ngày hôm nay
// ─────────────────────────────────────────────────
exports.checkIn = async (req, res) => {
  try {
    const userId = req.user._id;
    const { didWorkout, note = "" } = req.body;

    if (typeof didWorkout !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "didWorkout phải là true hoặc false!",
      });
    }

    const today = toDateStr();

    const log = await WorkoutLog.findOneAndUpdate(
      { userId, date: today },
      {
        $set: {
          didWorkout,
          note,
          // Nếu đổi sang nghỉ → xóa exerciseMaxes
          ...(!didWorkout ? { exerciseMaxes: [] } : {}),
        },
      },
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
// Body: { exerciseId, maxWeight, maxReps }
// Cập nhật kỷ lục 1 bài tập hôm nay
// ─────────────────────────────────────────────────
exports.updateExerciseMax = async (req, res) => {
  try {
    const userId = req.user._id;
    const { exerciseId, maxWeight, maxReps } = req.body;

    if (!exerciseId || maxWeight == null || maxReps == null) {
      return res.status(400).json({
        success: false,
        message: "Thiếu exerciseId, maxWeight hoặc maxReps!",
      });
    }
    if (Number(maxWeight) < 0 || Number(maxReps) < 0) {
      return res.status(400).json({ success: false, message: "Giá trị không thể âm!" });
    }

    const today = toDateStr();

    // Kiểm tra đã check-in tập hôm nay chưa
    const todayLog = await WorkoutLog.findOne({ userId, date: today });
    if (!todayLog || !todayLog.didWorkout) {
      return res.status(400).json({
        success: false,
        message: "Bạn chưa check-in tập hôm nay! Hãy xác nhận 'Có tập' trước.",
      });
    }

    // Lấy tên bài tập để cache
    const exercise = await Exercise.findById(exerciseId).select("name");
    const exerciseName = exercise?.name || "Không rõ";

    // Lấy kỷ lục cũ để lưu prev
    const existing = todayLog.exerciseMaxes.find(
      (e) => e.exerciseId.toString() === exerciseId.toString()
    );

    const prevMaxWeight = existing?.maxWeight ?? 0;
    const prevMaxReps   = existing?.maxReps ?? 0;

    // Chỉ cập nhật nếu cao hơn kỷ lục cũ
    const newMaxWeight = Math.max(Number(maxWeight), prevMaxWeight);
    const newMaxReps   = Math.max(Number(maxReps), prevMaxReps);

    // Upsert vào mảng exerciseMaxes
    const existsInArray = todayLog.exerciseMaxes.some(
      (e) => e.exerciseId.toString() === exerciseId.toString()
    );

    let updatedLog;
    if (existsInArray) {
      updatedLog = await WorkoutLog.findOneAndUpdate(
        { userId, date: today, "exerciseMaxes.exerciseId": exerciseId },
        {
          $set: {
            "exerciseMaxes.$.maxWeight":    newMaxWeight,
            "exerciseMaxes.$.maxReps":      newMaxReps,
            "exerciseMaxes.$.prevMaxWeight": prevMaxWeight,
            "exerciseMaxes.$.prevMaxReps":   prevMaxReps,
            "exerciseMaxes.$.exerciseName":  exerciseName,
          },
        },
        { new: true }
      );
    } else {
      updatedLog = await WorkoutLog.findOneAndUpdate(
        { userId, date: today },
        {
          $push: {
            exerciseMaxes: {
              exerciseId,
              exerciseName,
              maxWeight: newMaxWeight,
              maxReps:   newMaxReps,
              prevMaxWeight,
              prevMaxReps,
            },
          },
        },
        { new: true }
      );
    }

    const improved =
      newMaxWeight > prevMaxWeight || newMaxReps > prevMaxReps;

    return res.json({
      success: true,
      message: improved ? "Kỷ lục mới!" : "Đã cập nhật (không vượt kỷ lục cũ).",
      improved,
      current: { exerciseName, maxWeight: newMaxWeight, maxReps: newMaxReps },
      previous: { maxWeight: prevMaxWeight, maxReps: prevMaxReps },
      log: updatedLog,
    });
  } catch (error) {
    console.error("[updateExerciseMax]", error.message);
    res.status(500).json({ success: false, message: "Lỗi server!", error: error.message });
  }
};

// ─────────────────────────────────────────────────
// GET /api/workout-logs/today  — Lấy log hôm nay
// ─────────────────────────────────────────────────
exports.getTodayLog = async (req, res) => {
  try {
    const userId = req.user._id;
    const today = toDateStr();

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
    res.status(500).json({ success: false, message: "Lỗi server!" });
  }
};

// ─────────────────────────────────────────────────
// GET /api/workout-logs/history?month=2025-07
// Lịch sử tập trong tháng (dùng cho calendar UI)
// ─────────────────────────────────────────────────
exports.getHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const { month } = req.query; // "2025-07"

    const filter = { userId };
    if (month) filter.date = { $regex: `^${month}` };

    const logs = await WorkoutLog.find(filter)
      .sort({ date: 1 })
      .select("date didWorkout exerciseMaxes note");

    // Tính streak liên tiếp
    const workedOutDates = logs
      .filter((l) => l.didWorkout)
      .map((l) => l.date)
      .sort();

    let streak = 0;
    const today = toDateStr();
    let checkDate = new Date(today);

    while (true) {
      const dateStr = checkDate.toISOString().split("T")[0];
      if (!workedOutDates.includes(dateStr)) break;
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    return res.json({
      success: true,
      logs,
      stats: {
        totalDays: logs.length,
        workedOutDays: workedOutDates.length,
        restDays: logs.filter((l) => !l.didWorkout).length,
        currentStreak: streak,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi server!" });
  }
};

// ─────────────────────────────────────────────────
// GET /api/workout-logs/personal-records
// Tất cả kỷ lục cá nhân của user (max mọi thời gian)
// ─────────────────────────────────────────────────
exports.getPersonalRecords = async (req, res) => {
  try {
    const userId = req.user._id;

    const records = await WorkoutLog.aggregate([
      { $match: { userId, didWorkout: true } },
      { $unwind: "$exerciseMaxes" },
      {
        $group: {
          _id: "$exerciseMaxes.exerciseId",
          exerciseName:  { $last: "$exerciseMaxes.exerciseName" },
          allTimeWeight: { $max: "$exerciseMaxes.maxWeight" },
          allTimeReps:   { $max: "$exerciseMaxes.maxReps" },
          lastUpdated:   { $max: "$date" },
        },
      },
      { $sort: { allTimeWeight: -1 } },
    ]);

    return res.json({ success: true, records });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi server!" });
  }
};
