// models/WorkoutLog.js
// =====================================================
// Lưu trữ dữ liệu tập luyện hàng ngày của User:
//   1. Hôm nay có tập không? (didWorkout)
//   2. Chi tiết các hiệp tập trong ngày (exercises)
//   3. Kỷ lục cá nhân (max tạ + max rep) (exerciseMaxes)
//   4. Trạng thái khóa buổi tập (isCompleted)
// =====================================================
const mongoose = require("mongoose");

// --- 1. Schema lưu chi tiết từng hiệp tập ---
const setSchema = new mongoose.Schema(
  {
    weight: { type: Number, default: 0 }, // Mức tạ (kg)
    reps: { type: Number, default: 0 },   // Số lần lặp (reps)
  },
  { _id: false }
);

// --- 2. Schema lưu danh sách bài tập & hiệp tập đã thực hiện trong ngày ---
const exerciseHistorySchema = new mongoose.Schema(
  {
    exerciseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exercise",
      required: true,
    },
    exerciseName: { type: String }, // Cache tên bài tập
    setsPerformed: [setSchema],     // Danh sách các hiệp đã tập
  },
  { _id: false }
);

// --- 3. Schema lưu Kỷ lục (Max) của bài tập trong ngày hôm đó ---
const exerciseMaxSchema = new mongoose.Schema(
  {
    exerciseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exercise",
      required: true,
    },
    exerciseName: { type: String },
    maxWeight: { type: Number, default: 0 }, // Tạ tối đa (kg) trong ngày
    maxReps: { type: Number, default: 0 },   // Số rep tối đa ở mức tạ đó
    
    // Kỷ lục cũ để so sánh / hiển thị tăng trưởng (nếu cần)
    prevMaxWeight: { type: Number, default: 0 },
    prevMaxReps: { type: Number, default: 0 },
  },
  { _id: false }
);

// --- 4. Schema chính (Workout Log) ---
const workoutLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Ngày lưu (dạng YYYY-MM-DD)
    date: {
      type: String,
      required: true,
    },
    // Trạng thái có tập luyện hay không
    didWorkout: {
      type: Boolean,
      required: true,
      default: false,
    },
    // Cờ đánh dấu buổi tập ĐÃ HOÀN THÀNH (Không cho phép sửa đổi nữa)
    isCompleted: {
      type: Boolean,
      default: false,
    },
    
    // Lưu chi tiết quá trình tập: Bài gì? Mấy hiệp? Bao nhiêu kg?
    exercises: [exerciseHistorySchema],

    // Lưu kỷ lục đạt được của từng bài tập trong ngày hôm nay
    exerciseMaxes: [exerciseMaxSchema],

    // Ghi chú tự do
    note: { type: String, maxlength: 500, default: "" },
  },
  { timestamps: true }
);

// ⚡ Unique: 1 user chỉ có 1 bản ghi WorkoutLog / 1 ngày
workoutLogSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("WorkoutLog", workoutLogSchema);