const mongoose = require("mongoose");

const gamificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  
  // --- TẮT/BẬT CHẾ ĐỘ HUẤN LUYỆN VIÊN ---
  isCoachingEnabled: { type: Boolean, default: false },

  // --- TÍNH CÁCH CỦA HUẤN LUYỆN VIÊN ---
  coachingStyle: { 
    type: String, 
    enum: ['EASY', 'SERIOUS', 'STRICT'], 
    default: 'SERIOUS',
    description: "EASY: Không ép buộc | SERIOUS: Nhắc nhở chuẩn mực | STRICT: Áp lực, spam thông báo nếu vi phạm"
  },

  // --- TRẠNG THÁI VI PHẠM (Dùng cho chế độ STRICT) ---
  activeViolation: {
    isViolating: { type: Boolean, default: false }, 
    violationType: { 
      type: String, 
      enum: ['OVER_CALORIES', 'UNDER_CALORIES', 'MISSED_MEAL', 'MISSED_WORKOUT', null], 
      default: null 
    },
    lastNotifiedAt: { type: Date, default: null }, 
    nagCount: { type: Number, default: 0 } 
  },

  // --- CHỈ SỐ RANK (Reset hàng tháng) ---
  rankPoints: { type: Number, default: 0 },
  lastRankResetDate: { type: Date, default: Date.now },
  
  // --- CHUỖI HIỆN TẠI ---
  streak: { type: Number, default: 0 },
  
  // --- CHỈ SỐ TÍCH LŨY TRỌN ĐỜI (Lifetime) ---
  totalWorkoutSessions: { type: Number, default: 0 }, 
  totalPerfectDietDays: { type: Number, default: 0 }, 
  
  // --- THỐNG KÊ THẤT BẠI ---
  failStats: {
    eatWrongDays: { type: Number, default: 0 },
    noWorkoutDays: { type: Number, default: 0 },
    totalFailsDays: { type: Number, default: 0 }
  },

  // --- CHỈ SỐ THEO DÕI TRONG TUẦN (Dùng để phạt, reset vào Thứ 2) ---
  currentWeekTrackers: {
    eatWrong: { type: Number, default: 0 },
    noWorkout: { type: Number, default: 0 },
    bothFail: { type: Number, default: 0 }
  },
  
  lastEvaluatedDate: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model("Gamification", gamificationSchema);