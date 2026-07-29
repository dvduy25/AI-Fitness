// controllers/workoutLogController.js
// =====================================================
// Chức năng: Check-in, Cập nhật Max & Theo dõi Tiến độ
// =====================================================
const mongoose = require("mongoose");
const WorkoutLog = require("../models/WorkoutLog");
const Exercise = require("../models/Exercise");

/**
 * Hàm hỗ trợ lấy chuỗi Date YYYY-MM-DD theo giờ địa phương (Local Time)
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
// Ghi nhận HOÀN THÀNH BUỔI TẬP & Cập nhật Kỷ lục bài tập (nếu có)
// Body: { date?, exercises: [{ exerciseId, maxWeight, maxReps }], exerciseId?, maxWeight?, maxReps? }
// ─────────────────────────────────────────────────
exports.updateExerciseMax = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { date, exercises, exerciseId, maxWeight, maxReps } = req.body;

    const today = date || toLocalDateStr();

    // 1. Luôn tự động đánh dấu HOÀN THÀNH BUỔI TẬP (didWorkout = true)
    let todayLog = await WorkoutLog.findOne({ userId, date: today });
    if (!todayLog) {
      todayLog = new WorkoutLog({ userId, date: today, didWorkout: true, exerciseMaxes: [] });
    } else {
      todayLog.didWorkout = true;
    }

    // 2. Chuẩn hóa dữ liệu đầu vào thành mảng
    let exercisesToProcess = [];
    if (exercises && Array.isArray(exercises)) {
      exercisesToProcess = exercises;
    } else if (exerciseId) {
      exercisesToProcess = [{ exerciseId, maxWeight, maxReps }];
    }

    let isAnyRecordBroken = false;

    // 3. Nếu người dùng CÓ nhập thông số bài tập -> Mới tiến hành cập nhật/so sánh Max
    if (exercisesToProcess.length > 0) {
      for (const ex of exercisesToProcess) {
        const exId = ex.exerciseId;
        if (!exId) continue;

        const inputWeight = Number(ex.maxWeight) || 0;
        const inputReps = Number(ex.maxReps) || 0;

        // Bỏ qua nếu không nhập chỉ số tạ & reps (> 0) để tránh tạo dữ liệu 0kg rác
        if (inputWeight <= 0 && inputReps <= 0) continue;

        const exDoc = await Exercise.findById(exId).select("name");
        const exerciseName = exDoc?.name || ex.exerciseName || "Bài tập";

        // Tìm kỷ lục đã lưu trong ngày hôm nay
        const existingIndex = todayLog.exerciseMaxes.findIndex(
          (e) => e.exerciseId.toString() === exId.toString()
        );
        const existing = existingIndex !== -1 ? todayLog.exerciseMaxes[existingIndex] : null;

        const prevMaxWeight = existing?.maxWeight ?? 0;
        const prevMaxReps = existing?.maxReps ?? 0;

        // --- LOGIC SO SÁNH PHÁ KỶ LỤC ---
        const isWeightHigher = inputWeight > prevMaxWeight;
        const isRepsHigher = inputWeight === prevMaxWeight && inputReps > prevMaxReps;
        const improved = isWeightHigher || isRepsHigher;

        // Chỉ cập nhật hoặc push thêm nếu chỉ số MỚI TỐT HƠN chỉ số CŨ trong ngày
        if (improved) {
          isAnyRecordBroken = true;

          if (existingIndex !== -1) {
            todayLog.exerciseMaxes[existingIndex].maxWeight = inputWeight;
            todayLog.exerciseMaxes[existingIndex].maxReps = inputReps;
            todayLog.exerciseMaxes[existingIndex].exerciseName = exerciseName;
          } else {
            todayLog.exerciseMaxes.push({
              exerciseId: exId,
              exerciseName: exerciseName,
              maxWeight: inputWeight,
              maxReps: inputReps,
              prevMaxWeight: prevMaxWeight,
              prevMaxReps: prevMaxReps,
            });
          }
        }
      }
    }

    // 4. Lưu bản ghi
    await todayLog.save();

    return res.json({
      success: true,
      message: isAnyRecordBroken
        ? "Tuyệt vời, bạn đã phá kỷ lục mới!"
        : "Đã ghi nhận hoàn thành buổi tập!",
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

    // Tính Streak chuỗi ngày tập liên tiếp
    const allWorkedOutLogs = await WorkoutLog.find({ userId, didWorkout: true })
      .select("date")
      .sort({ date: -1 });

    const workedOutSet = new Set(allWorkedOutLogs.map((l) => l.date));

    let streak = 0;
    const checkDate = new Date();
    const todayStr = toLocalDateStr(checkDate);

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
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const records = await WorkoutLog.aggregate([
      { $match: { userId: userObjectId, didWorkout: true } },
      { $unwind: "$exerciseMaxes" },
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

// ─────────────────────────────────────────────────
// GET /api/workout-logs/exercise-progress/:exerciseId
// Xem tiến độ tăng trưởng & Lịch sử mức tạ của 1 bài tập (Dùng cho Biểu đồ LineChart)
// ─────────────────────────────────────────────────
exports.getExerciseProgress = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { exerciseId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(exerciseId)) {
      return res.status(400).json({ success: false, message: "exerciseId không hợp lệ!" });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const exerciseObjectId = new mongoose.Types.ObjectId(exerciseId);

    const rawProgress = await WorkoutLog.aggregate([
      { $match: { userId: userObjectId, didWorkout: true, "exerciseMaxes.exerciseId": exerciseObjectId } },
      { $unwind: "$exerciseMaxes" },
      { $match: { "exerciseMaxes.exerciseId": exerciseObjectId } },
      { $sort: { date: 1 } },
      {
        $project: {
          _id: 0,
          date: "$date",
          exerciseName: "$exerciseMaxes.exerciseName",
          maxWeight: "$exerciseMaxes.maxWeight",
          maxReps: "$exerciseMaxes.maxReps",
        },
      },
    ]);

    if (rawProgress.length === 0) {
      return res.json({
        success: true,
        message: "Chưa có dữ liệu tăng trưởng cho bài tập này.",
        summary: null,
        timeline: [],
      });
    }

    // Thống kê chuỗi thời gian & Tính 1RM (Epley formula: Weight * (1 + Reps / 30))
    const timeline = rawProgress.map((item) => {
      const estimatedOneRepMax = Math.round(item.maxWeight * (1 + item.maxReps / 30));
      return {
        date: item.date,
        maxWeight: item.maxWeight,
        maxReps: item.maxReps,
        estimatedOneRepMax,
      };
    });

    const firstRecord = timeline[0];
    const latestRecord = timeline[timeline.length - 1];
    const allTimeHighestWeight = Math.max(...timeline.map((t) => t.maxWeight));
    const weightGained = latestRecord.maxWeight - firstRecord.maxWeight;
    const growthPercentage =
      firstRecord.maxWeight > 0
        ? Number(((weightGained / firstRecord.maxWeight) * 100).toFixed(1))
        : 0;

    return res.json({
      success: true,
      exerciseName: rawProgress[0].exerciseName,
      summary: {
        firstRecorded: { date: firstRecord.date, weight: firstRecord.maxWeight, reps: firstRecord.maxReps },
        latestRecorded: { date: latestRecord.date, weight: latestRecord.maxWeight, reps: latestRecord.maxReps },
        allTimeHighestWeight,
        weightGained,
        growthPercentage,
        totalSessionsLogged: timeline.length,
      },
      timeline,
    });
  } catch (error) {
    console.error("[getExerciseProgress]", error.message);
    res.status(500).json({ success: false, message: "Lỗi server!", error: error.message });
  }
};