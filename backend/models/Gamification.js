// models/Gamification.js
const mongoose = require("mongoose");

const gamificationSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true,
    unique: true // Đảm bảo mối quan hệ 1-1 (1 User chỉ có 1 bảng điểm)
  },
  
  rankPoints: { type: Number, default: 0 },
  streak: { type: Number, default: 0 },
  
  weeklyStats: {
    eatWrongDays: { type: Number, default: 0 },
    noWorkoutDays: { type: Number, default: 0 },
    totalFailsDays: { type: Number, default: 0 }
  },
  
  lastEvaluatedDate: { type: Date, default: null }
}, { 
  timestamps: true 
});

module.exports = mongoose.model("Gamification", gamificationSchema);