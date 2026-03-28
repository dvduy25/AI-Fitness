// models/WorkoutLog.js
const mongoose = require("mongoose");

const workoutLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  date: { type: Date, default: Date.now }, // Ngày tập thực tế
  planDay: { type: String }, // Lưu lại xem hôm đó tập ngày nào (VD: Monday)
  exercises: [
    {
      exerciseId: { type: mongoose.Schema.Types.ObjectId, ref: "Exercise" },
      // Thay vì lưu 1 cục reps/sets như plan, giờ ta lưu chi tiết từng hiệp
      setsPerformed: [
        {
          setNumber: Number, // Hiệp 1, Hiệp 2...
          reps: Number,      // Số lần đẩy được
          weight: Number     // Mức tạ (Kg)
        }
      ]
    }
  ],
  isCompleted: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model("WorkoutLog", workoutLogSchema);