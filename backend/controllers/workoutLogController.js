// controllers/workoutLogController.js
// =====================================================
// Chức năng: Check-in, Cập nhật Max, Lưu lịch sử & Theo dõi Tiến độ
// Tính năng mới: Khóa buổi tập không cho sửa sau khi hoàn thành
// =====================================================
const mongoose = require("mongoose");
const WorkoutLog = require("../models/WorkoutLog");
const Exercise = require("../models/Exercise");

const toLocalDateStr = (dateObj = new Date()) => {
  const yyyy = dateObj.getFullYear();
  const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
  const dd = String(dateObj.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

// ─────────────────────────────────────────────────
// POST /api/workout-logs/checkin
// ─────────────────────────────────────────────────
exports.checkIn = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { didWorkout, note } = req.body;

    if (typeof didWorkout !== "boolean") {
      return res.status(400).json({ success: false, message: "didWorkout phải là true/false!" });
    }

    const today = toLocalDateStr();
    
    // Kiểm tra xem buổi tập đã bị khóa chưa
    const existingLog = await WorkoutLog.findOne({ userId, date: today });
    if (existingLog && existingLog.isCompleted) {
      return res.status(403).json({
        success: false,
        message: "Buổi tập hôm nay đã hoàn thành, không thể thay đổi trạng thái Check-in!",
      });
    }

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
// Ghi nhận HOÀN THÀNH BUỔI TẬP: Khóa vĩnh viễn không cho sửa
// ─────────────────────────────────────────────────
exports.updateExerciseMax = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { date, exercises, exerciseId, maxWeight, maxReps } = req.body;

    const today = date || toLocalDateStr();

    let todayLog = await WorkoutLog.findOne({ userId, date: today });
    
    // 🔴 1. KIỂM TRA KHÓA: Nếu đã hoàn thành thì văng lỗi, chặn không cho lưu
    if (todayLog && todayLog.isCompleted) {
      return res.status(403).json({
        success: false,
        message: "Buổi tập hôm nay đã được hoàn thành và khóa lại, không thể chỉnh sửa nữa!",
      });
    }

    if (!todayLog) {
      todayLog = new WorkoutLog({ 
        userId, 
        date: today, 
        didWorkout: true, 
        exerciseMaxes: [],
        exercises: [],
        isCompleted: false // Mặc định tạo mới là chưa khóa
      });
    } else {
      todayLog.didWorkout = true;
      if (!todayLog.exercises) todayLog.exercises = [];
      if (!todayLog.exerciseMaxes) todayLog.exerciseMaxes = [];
    }

    let exercisesToProcess = [];
    if (exercises && Array.isArray(exercises)) {
      exercisesToProcess = exercises;
    } else if (exerciseId) {
      exercisesToProcess = [{ exerciseId, maxWeight, maxReps }];
    }

    if (exercisesToProcess.length === 0) {
      todayLog.isCompleted = true; // Khóa luôn nếu submit rỗng
      await todayLog.save();
      return res.json({ success: true, message: "Đã hoàn thành buổi tập!", log: todayLog });
    }

    // 2. Gom nhóm Set tập
    const groupedExercises = {};
    for (const ex of exercisesToProcess) {
      const exId = ex.exerciseId;
      if (!exId) continue;

      const weight = Number(ex.maxWeight || ex.weight) || 0;
      const reps = Number(ex.maxReps || ex.reps) || 0;

      if (weight <= 0 && reps <= 0) continue;

      if (!groupedExercises[exId]) {
        let exerciseName = ex.exerciseName;
        if (!exerciseName) {
          const exDoc = await Exercise.findById(exId).select("name");
          exerciseName = exDoc?.name || "Bài tập";
        }
        groupedExercises[exId] = { exerciseId: exId, exerciseName: exerciseName, sets: [] };
      }
      groupedExercises[exId].sets.push({ weight, reps });
    }

    if (exercises && Array.isArray(exercises)) {
      const incomingIds = Object.keys(groupedExercises);
      todayLog.exercises = todayLog.exercises.filter(e => incomingIds.includes(e.exerciseId.toString()));
      todayLog.exerciseMaxes = todayLog.exerciseMaxes.filter(e => incomingIds.includes(e.exerciseId.toString()));
    }

    let isAnyRecordBroken = false;

    // 3. Xử lý ghi đè và tìm Max
    for (const exId of Object.keys(groupedExercises)) {
      const data = groupedExercises[exId];

      const exIndex = todayLog.exercises.findIndex(e => e.exerciseId.toString() === exId.toString());
      if (exIndex !== -1) {
        todayLog.exercises[exIndex].setsPerformed = data.sets; 
        todayLog.exercises[exIndex].exerciseName = data.exerciseName;
      } else {
        todayLog.exercises.push({
          exerciseId: exId,
          exerciseName: data.exerciseName,
          setsPerformed: data.sets
        });
      }

      let dailyMaxWeight = 0;
      let dailyMaxReps = 0;
      for (const s of data.sets) {
        if (s.weight > dailyMaxWeight) {
          dailyMaxWeight = s.weight;
          dailyMaxReps = s.reps;
        } else if (s.weight === dailyMaxWeight && s.reps > dailyMaxReps) {
          dailyMaxReps = s.reps;
        }
      }

      const maxIndex = todayLog.exerciseMaxes.findIndex(e => e.exerciseId.toString() === exId.toString());
      if (maxIndex !== -1) {
        const oldMaxWeight = todayLog.exerciseMaxes[maxIndex].maxWeight;
        const oldMaxReps = todayLog.exerciseMaxes[maxIndex].maxReps;
        
        if (dailyMaxWeight > oldMaxWeight || (dailyMaxWeight === oldMaxWeight && dailyMaxReps > oldMaxReps)) {
          isAnyRecordBroken = true;
        }
        
        todayLog.exerciseMaxes[maxIndex].maxWeight = dailyMaxWeight;
        todayLog.exerciseMaxes[maxIndex].maxReps = dailyMaxReps;
        todayLog.exerciseMaxes[maxIndex].exerciseName = data.exerciseName;
      } else {
        isAnyRecordBroken = true;
        todayLog.exerciseMaxes.push({
          exerciseId: exId,
          exerciseName: data.exerciseName,
          maxWeight: dailyMaxWeight,
          maxReps: dailyMaxReps,
          prevMaxWeight: 0,
          prevMaxReps: 0
        });
      }
    }

    // 🔴 4. ĐÁNH DẤU HOÀN THÀNH & KHÓA SỬA ĐỔI
    todayLog.isCompleted = true; 

    await todayLog.save();

    return res.json({
      success: true,
      message: isAnyRecordBroken
        ? "Đã hoàn thành buổi tập! Tuyệt vời, bạn có kỷ lục mới!"
        : "Đã lưu và khóa lịch sử buổi tập!",
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

    const log = await WorkoutLog.findOne({ userId, date: today })
      .populate("exerciseMaxes.exerciseId", "name muscleGroup")
      .populate("exercises.exerciseId", "name muscleGroup"); 

    return res.json({
      success: true,
      date: today,
      log: log || null,
      didWorkout: log?.didWorkout ?? null,
      isCompleted: log?.isCompleted ?? false // 🔴 Trả về cho Frontend biết đã khóa hay chưa để ẩn nút Sửa
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
      .select("date didWorkout isCompleted exerciseMaxes note");

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
// ─────────────────────────────────────────────────
// GET /api/workout-logs/date?date=YYYY-MM-DD
// ─────────────────────────────────────────────────
exports.getLogByDate = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { date } = req.query;

    const targetDate = date || toLocalDateStr();

    const log = await WorkoutLog.findOne({ userId, date: targetDate })
      .populate("exerciseMaxes.exerciseId", "name muscleGroup")
      .populate("exercises.exerciseId", "name muscleGroup");

    // Trả về HTTP 200 kèm log (hoặc null nếu chưa có dữ liệu)
    // Việc này giúp Axios ở Frontend không bị bắn lỗi 404 ra console
    return res.json({
      success: true,
      date: targetDate,
      log: log || null,
      didWorkout: log?.didWorkout ?? null,
      isCompleted: log?.isCompleted ?? false,
    });
  } catch (error) {
    console.error("[getLogByDate]", error.message);
    res.status(500).json({ success: false, message: "Lỗi server!", error: error.message });
  }
};