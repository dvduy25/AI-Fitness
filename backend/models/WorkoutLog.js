// models/WorkoutLog.js (THIẾT KẾ LẠI)
// =====================================================
// Chỉ lưu 2 thứ:
//   1. Hôm nay có tập không? (didWorkout)
//   2. Kỷ lục cá nhân (max tạ + max rep) của từng bài tập
// - 1 user = 1 record / 1 ngày (unique index)
// =====================================================
const mongoose = require("mongoose");

const exerciseMaxSchema = new mongoose.Schema(
  {
    exerciseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exercise",
      required: true,
    },
    exerciseName: { type: String }, // Cache tên để không cần join
    maxWeight: { type: Number, default: 0 }, // Tạ tối đa (kg)
    maxReps:   { type: Number, default: 0 }, // Số rep tối đa
    // Kỷ lục trước đó để so sánh / hiển thị tăng trưởng
    prevMaxWeight: { type: Number, default: 0 },
    prevMaxReps:   { type: Number, default: 0 },
  },
  { _id: false }
);

const workoutLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Ngày lưu (dạng YYYY-MM-DD string cho dễ query)
    date: {
      type: String,
      required: true,
    },
    // Hôm nay có tập không
    didWorkout: {
      type: Boolean,
      required: true,
      default: false,
    },
    // Danh sách kỷ lục cập nhật hôm nay (chỉ cập nhật nếu didWorkout = true)
    exerciseMaxes: [exerciseMaxSchema],

    // Ghi chú tự do
    note: { type: String, maxlength: 500, default: "" },
  },
  { timestamps: true }
);

// ⚡ Unique: 1 user chỉ có 1 bản ghi / 1 ngày
workoutLogSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("WorkoutLog", workoutLogSchema);
