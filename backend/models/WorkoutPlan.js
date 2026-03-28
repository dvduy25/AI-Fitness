const mongoose = require("mongoose");

const MasterWorkoutPlanSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  weeklySchedule: [
    {
      dayOfWeek: { type: String, enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] },
      title: { type: String },
      scheduledTime: { type: String },
      isRestDay: { type: Boolean, default: false },
      durationEstimated: { type: Number, default: 0 },
      exercises: [
        {
          exerciseId: { type: mongoose.Schema.Types.ObjectId, ref: "Exercise" },
          sets: Number,
          reps: String,
          restTimeInSeconds: Number,
          aiNotes: String
        }
      ]
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model("MasterWorkoutPlan", MasterWorkoutPlanSchema);