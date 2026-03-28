const MasterWorkoutPlan = require("../models/WorkoutPlan");

// =========================================================================
// PHẦN 1: QUẢN LÝ TỔNG THỂ LỊCH TẬP (CẢ TUẦN / TỪNG NGÀY)
// =========================================================================

// 1. Lấy lịch tập hiện tại của user
exports.getWorkoutPlan = async (req, res) => {
  try {
    const userId = req.user.id;
    const plan = await MasterWorkoutPlan.findOne({ userId })
      .populate("weeklySchedule.exercises.exerciseId", "name muscleGroup level equipmentRequired videoUrl");

    if (!plan) {
      return res.status(404).json({ message: "Bạn chưa có lịch tập nào. Hãy dùng AI để tạo nhé!" });
    }

    res.status(200).json({ plan });
  } catch (error) {
    res.status(500).json({ message: "Lỗi lấy lịch tập", error: error.message });
  }
};

// 2. Tạo mới hoặc Ghi đè toàn bộ lịch tập (7 ngày)
exports.upsertWorkoutPlan = async (req, res) => {
  try {
    const userId = req.user.id;
    const { weeklySchedule } = req.body;

    if (!weeklySchedule || !Array.isArray(weeklySchedule)) {
      return res.status(400).json({ message: "Dữ liệu weeklySchedule không hợp lệ!" });
    }

    const updatedPlan = await MasterWorkoutPlan.findOneAndUpdate(
      { userId: userId },
      { $set: { weeklySchedule: weeklySchedule } },
      { new: true, upsert: true }
    );

    res.status(200).json({ message: "Đã lưu lịch tập thành công!", plan: updatedPlan });
  } catch (error) {
    res.status(500).json({ message: "Lỗi lưu lịch tập", error: error.message });
  }
};

// 3. Cập nhật thông tin cơ bản của 1 ngày (Đổi tên, giờ tập...)
exports.updateDayInPlan = async (req, res) => {
  try {
    const userId = req.user.id;
    const { dayOfWeek, title, scheduledTime, isRestDay, durationEstimated, exercises } = req.body;

    const plan = await MasterWorkoutPlan.findOne({ userId });
    if (!plan) return res.status(404).json({ message: "Không tìm thấy lịch tập!" });

    const dayIndex = plan.weeklySchedule.findIndex(day => day.dayOfWeek === dayOfWeek);
    if (dayIndex === -1) return res.status(404).json({ message: `Không tìm thấy ngày ${dayOfWeek}!` });

    if (title !== undefined) plan.weeklySchedule[dayIndex].title = title;
    if (scheduledTime !== undefined) plan.weeklySchedule[dayIndex].scheduledTime = scheduledTime;
    if (isRestDay !== undefined) plan.weeklySchedule[dayIndex].isRestDay = isRestDay;
    if (durationEstimated !== undefined) plan.weeklySchedule[dayIndex].durationEstimated = durationEstimated;
    if (exercises !== undefined) plan.weeklySchedule[dayIndex].exercises = exercises;

    await plan.save();
    res.status(200).json({ message: `Đã cập nhật lịch tập ngày ${dayOfWeek}!`, plan });
  } catch (error) {
    res.status(500).json({ message: "Lỗi cập nhật ngày tập", error: error.message });
  }
};

// 4. Xóa toàn bộ lịch tập
exports.deleteWorkoutPlan = async (req, res) => {
  try {
    const userId = req.user.id;
    const deletedPlan = await MasterWorkoutPlan.findOneAndDelete({ userId });
    
    if (!deletedPlan) return res.status(404).json({ message: "Không tìm thấy lịch tập để xóa!" });
    res.status(200).json({ message: "Đã xóa toàn bộ lịch tập thành công!" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi xóa lịch tập", error: error.message });
  }
};

// =========================================================================
// PHẦN 2: QUẢN LÝ CHI TIẾT TỪNG BÀI TẬP TRONG 1 NGÀY (THÊM / SỬA / XÓA)
// =========================================================================

// 5. Thêm 1 bài tập mới vào 1 ngày (ĐÃ SỬA ĐỂ KHỚP VỚI FRONTEND)
// 5. Thêm 1 bài tập mới vào 1 ngày (BẢN FIX HOÀN THIỆN)
exports.addExerciseToDay = async (req, res) => {
  try {
    const userId = req.user.id;
    const { dayOfWeek, exerciseId, sets, reps, restTimeInSeconds, aiNotes } = req.body; 

    const plan = await MasterWorkoutPlan.findOne({ userId });
    if (!plan) return res.status(404).json({ message: "Không tìm thấy lịch tập!" });

    const day = plan.weeklySchedule.find(d => d.dayOfWeek === dayOfWeek);
    if (!day) return res.status(404).json({ message: "Không tìm thấy ngày này!" });

    // FIX: Thêm "ex && ex.exerciseId" để kiểm tra an toàn trước khi toString()
    const isExist = day.exercises.some(ex => 
      ex && ex.exerciseId && ex.exerciseId.toString() === exerciseId
    );
    
    if (isExist) {
      return res.status(400).json({ message: "Bài tập này đã có trong ngày rồi!" });
    }

    day.exercises.push({
      exerciseId: exerciseId,
      sets: sets || 3,
      reps: String(reps || "10"),
      restTimeInSeconds: restTimeInSeconds || 60,
      aiNotes: aiNotes || ""
    });
    
    day.isRestDay = false;
    await plan.save();

    // Trả về dữ liệu đã populate để Frontend hiển thị tên bài tập ngay
    const updatedPlan = await MasterWorkoutPlan.findById(plan._id)
      .populate("weeklySchedule.exercises.exerciseId");

    res.status(200).json({ message: `Đã thêm bài tập vào ${dayOfWeek}!`, plan: updatedPlan });
  } catch (error) {
    res.status(500).json({ message: "Lỗi hệ thống khi thêm bài tập", error: error.message });
  }
};

// 6. Sửa thông số (Reps, Sets, Notes) của 1 bài tập đã có
exports.updateExerciseInDay = async (req, res) => {
  try {
    const userId = req.user.id;
    const { dayOfWeek, exerciseId, sets, reps, restTimeInSeconds, aiNotes } = req.body;

    const plan = await MasterWorkoutPlan.findOne({ userId });
    if (!plan) return res.status(404).json({ message: "Không tìm thấy lịch tập!" });

    const day = plan.weeklySchedule.find(d => d.dayOfWeek === dayOfWeek);
    if (!day) return res.status(404).json({ message: "Không tìm thấy ngày này!" });

    const exerciseToUpdate = day.exercises.find(ex => ex.exerciseId && ex.exerciseId.toString() === exerciseId);
    if (!exerciseToUpdate) return res.status(404).json({ message: "Bài tập này không tồn tại trong ngày!" });

    if (sets !== undefined) exerciseToUpdate.sets = sets;
    if (reps !== undefined) exerciseToUpdate.reps = reps;
    if (restTimeInSeconds !== undefined) exerciseToUpdate.restTimeInSeconds = restTimeInSeconds;
    if (aiNotes !== undefined) exerciseToUpdate.aiNotes = aiNotes;

    await plan.save();
    res.status(200).json({ message: `Đã cập nhật bài tập trong ngày ${dayOfWeek}!`, plan });
  } catch (error) {
    res.status(500).json({ message: "Lỗi cập nhật bài tập", error: error.message });
  }
};

// 7. Xóa 1 bài tập khỏi 1 ngày
exports.removeExerciseFromDay = async (req, res) => {
  try {
    const userId = req.user.id;
    const { dayOfWeek, exerciseId } = req.body;

    const plan = await MasterWorkoutPlan.findOne({ userId });
    if (!plan) return res.status(404).json({ message: "Không tìm thấy lịch tập!" });

    const day = plan.weeklySchedule.find(d => d.dayOfWeek === dayOfWeek);
    if (!day) return res.status(404).json({ message: "Không tìm thấy ngày này!" });

    // FIX: Kiểm tra ex và ex.exerciseId trước khi so sánh
    day.exercises = day.exercises.filter(ex => 
      ex && ex.exerciseId && ex.exerciseId.toString() !== exerciseId
    );

    if (day.exercises.length === 0) {
      day.isRestDay = true;
    }

    await plan.save();
    res.status(200).json({ message: `Đã xóa bài tập khỏi ${dayOfWeek}!`, plan });
  } catch (error) {
    res.status(500).json({ message: "Lỗi xóa bài tập", error: error.message });
  }
};

// =========================================================================
// PHẦN 3: LẤY LỊCH TẬP THEO NGÀY (DÀNH CHO DASHBOARD HÀNG NGÀY)
// =========================================================================

// 8. Lấy lịch tập của ngày hôm nay (hoặc một ngày cụ thể truyền vào)
exports.getWorkoutPlanForToday = async (req, res) => {
  try {
    const userId = req.user.id;
    // Frontend có thể truyền ?dayOfWeek=Monday (Tùy chọn)
    const queryDay = req.query.dayOfWeek; 
    
    // Nếu không truyền dayOfWeek, tự động tính thứ của ngày hôm nay
    let targetDayOfWeek = queryDay;
    if (!targetDayOfWeek) {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const today = new Date();
      targetDayOfWeek = days[today.getDay()];
    }

    const plan = await MasterWorkoutPlan.findOne({ userId })
      .populate("weeklySchedule.exercises.exerciseId", "name muscleGroup level equipmentRequired videoUrl");

    if (!plan) {
      return res.status(200).json({ 
        message: "Bạn chưa có lịch tập nào.", 
        hasPlan: false,
        todayWorkout: null
      });
    }

    // Tìm lịch tập của ngày mục tiêu
    const todayWorkout = plan.weeklySchedule.find(d => d.dayOfWeek === targetDayOfWeek);

    if (!todayWorkout) {
       return res.status(200).json({ 
        message: `Không tìm thấy dữ liệu tập luyện cho ngày ${targetDayOfWeek}.`, 
        hasPlan: true,
        todayWorkout: null
      });
    }

    res.status(200).json({ 
        message: "Lấy lịch tập ngày thành công!", 
        hasPlan: true,
        dayOfWeek: targetDayOfWeek,
        todayWorkout: todayWorkout
    });

  } catch (error) {
    console.error("Lỗi lấy lịch tập ngày hôm nay:", error);
    res.status(500).json({ message: "Lỗi Server", error: error.message });
  }
};