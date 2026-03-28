const mongoose = require("mongoose");

const mealPlanSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  
  // Tổng Calo/Macro mục tiêu CỐ ĐỊNH MỖI NGÀY
  dailyTotal: { 
    calories: { type: Number, default: 0 }, 
    protein: { type: Number, default: 0 }, 
    carbs: { type: Number, default: 0 }, 
    fat: { type: Number, default: 0 } 
  },
  
  // Lịch ăn cố định (ngày nào cũng lấy cái này làm chuẩn)
  meals: [{
    mealType: String, // Breakfast, Lunch, Dinner, Snack...
    scheduledTime: String, // "07:30"
    items: [{
      foodId: { type: mongoose.Schema.Types.ObjectId, ref: "Food" },
      foodName: String,
      quantityInGrams: Number,
      calories: Number, protein: Number, carbs: Number, fat: Number
    }],
    mealTotal: { calories: Number, protein: Number, carbs: Number, fat: Number }
  }]
}, { timestamps: true });

module.exports = mongoose.model("MealPlan", mealPlanSchema);