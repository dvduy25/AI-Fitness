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
// Body: { exerciseId, maxWeight, maxReps }
// ─────────────────────────────────────────────────
exports.updateExerciseMax = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { exerciseId, maxWeight, maxReps } = req.body;

    if (!exerciseId || maxWeight == null || maxReps == null) {
      return res.status(400).json({
        success: false,
        message: "Thiếu exerciseId, maxWeight hoặc maxReps!",
      });
    }

    const inputWeight = Number(maxWeight);
    const inputReps = Number(maxReps);

    if (inputWeight < 0 || inputReps < 0) {
      return res.status(400).json({ success: false, message: "Giá trị không thể âm!" });
    }

    const today = toLocalDateStr();

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
    const exerciseName = exercise?.name || "Bài tập";

    // Tìm kỷ lục đã ghi nhận trong ngày (nếu có)
    const existing = todayLog.exerciseMaxes.find(
      (e) => e.exerciseId.toString() === exerciseId.toString()
    );

    const prevMaxWeight = existing?.maxWeight ?? 0;
    const prevMaxReps = existing?.maxReps ?? 0;

    // --- LOGIC SO SÁNH KỶ LỤC CHUẨN GYM ---
    // Thành tích mới vượt kỷ lục nếu: Tạ nặng hơn OR (Tạ bằng AND Reps nhiều hơn)
    const isWeightHigher = inputWeight > prevMaxWeight;
    const isRepsHigher = inputWeight === prevMaxWeight && inputReps > prevMaxReps;
    const improved = isWeightHigher || isRepsHigher;

    // Nếu không vượt kỷ lục cũ trong ngày thì giữ nguyên kỷ lục cũ
    const finalWeight = improved ? inputWeight : prevMaxWeight;
    const finalReps = improved ? inputReps : prevMaxReps;

    const existsInArray = !!existing;
    let updatedLog;

    if (existsInArray) {
      updatedLog = await WorkoutLog.findOneAndUpdate(
        { userId, date: today, "exerciseMaxes.exerciseId": exerciseId },
        {
          $set: {
            "exerciseMaxes.$.maxWeight": finalWeight,
            "exerciseMaxes.$.maxReps": finalReps,
            "exerciseMaxes.$.prevMaxWeight": prevMaxWeight,
            "exerciseMaxes.$.prevMaxReps": prevMaxReps,
            "exerciseMaxes.$.exerciseName": exerciseName,
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
              maxWeight: finalWeight,
              maxReps: finalReps,
              prevMaxWeight,
              prevMaxReps,
            },
          },
        },
        { new: true }
      );
    }

    return res.json({
      success: true,
      message: improved ? "Kỷ lục mới!" : "Đã ghi nhận (chưa vượt kỷ lục cũ trong ngày).",
      improved,
      current: { exerciseName, maxWeight: finalWeight, maxReps: finalReps },
      previous: { maxWeight: prevMaxWeight, maxReps: prevMaxReps },
      log: updatedLog,
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

    // --- LÍNH TÍNH STREAK CHUẨN TỪ TOÀN BỘ LỊCH SỬ ---
    const allWorkedOutLogs = await WorkoutLog.find({ userId, didWorkout: true })
      .select("date")
      .sort({ date: -1 });

    const workedOutSet = new Set(allWorkedOutLogs.map((l) => l.date));

    let streak = 0;
    const checkDate = new Date();
    const todayStr = toLocalDateStr(checkDate);

    // Nếu hôm nay chưa tập, kiểm tra xem hôm qua có tập không để nối chuỗi
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