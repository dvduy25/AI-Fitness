const mongoose = require("mongoose");

const gamificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  
  // Chỉ số Rank (Reset hàng tháng)
  rankPoints: { type: Number, default: 0 },
  lastRankResetDate: { type: Date, default: Date.now },
  
  // Chuỗi hiện tại
  streak: { type: Number, default: 0 },
  
  // Chỉ số tích lũy trọn đời (Lifetime)
  totalWorkoutSessions: { type: Number, default: 0 }, 
  totalPerfectDietDays: { type: Number, default: 0 }, 
  
  failStats: {
    eatWrongDays: { type: Number, default: 0 },
    noWorkoutDays: { type: Number, default: 0 },
    totalFailsDays: { type: Number, default: 0 }
  },

  // Chỉ số theo dõi trong tuần (Dùng để phạt, reset vào Thứ 2)
  currentWeekTrackers: {
    eatWrong: { type: Number, default: 0 },
    noWorkout: { type: Number, default: 0 },
    bothFail: { type: Number, default: 0 }
  },
  
  lastEvaluatedDate: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model("Gamification", gamificationSchema);