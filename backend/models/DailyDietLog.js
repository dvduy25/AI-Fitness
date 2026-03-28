const mongoose = require("mongoose");

const dailyDietLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  date: { type: Date, required: true },

  actualDailyTotal: {
    calories: { type: Number, default: 0 },
    protein: { type: Number, default: 0 },
    carbs: { type: Number, default: 0 },
    fat: { type: Number, default: 0 }
  },

  consumedMeals: [{
    mealType: String,
    loggedAt: { type: Date, default: Date.now },
    isExactlyAsPlanned: { type: Boolean, default: false },
    aiNote: { type: String, default: "" },
    items: [{
      foodId: { type: mongoose.Schema.Types.ObjectId, ref: "Food", default: null },
      foodName: String,
      quantityInGrams: Number,
      calories: Number,
      protein: Number,
      carbs: Number,
      fat: Number
    }],
    mealTotal: {
      calories: Number,
      protein: Number,
      carbs: Number,
      fat: Number
    }
  }],

  // ==========================================
  // HÀNG ĐỢI CÁC BỮA CHƯA ĂN TRONG NGÀY
  // Sẽ được AI tính toán lại mỗi khi có thay đổi ở consumedMeals
  // ==========================================
  adjustedUpcomingMeals: [{
    mealType: String,
    scheduledTime: String,
    items: [{
      foodId: { type: mongoose.Schema.Types.ObjectId, ref: "Food", default: null },
      foodName: String,
      quantityInGrams: Number,
      calories: Number,
      protein: Number,
      carbs: Number,
      fat: Number
    }],
    mealTotal: {
      calories: Number,
      protein: Number,
      carbs: Number,
      fat: Number
    }
  }],

  isDayCompleted: { type: Boolean, default: false },
  dailyAiSummary: { type: String, default: "" },

  pastRecords: [{
    date: Date,
    actualDailyTotal: {
      calories: { type: Number, default: 0 },
      protein: { type: Number, default: 0 },
      carbs: { type: Number, default: 0 },
      fat: { type: Number, default: 0 }
    },
    dailyAiSummary: String,
    isDayCompleted: Boolean
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model("DailyDietLog", dailyDietLogSchema);