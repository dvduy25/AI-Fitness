// 📄 models/Food.js
const mongoose = require("mongoose");

const foodSchema = new mongoose.Schema({
  name: { type: String, required: true },
  imageUrl: { type: String, default: "" },
  // Chuẩn hóa: Dữ liệu này tính trên 100g của thực phẩm
  baseUnit: { type: String, default: "100g" }, 
  proteinPer100g: { type: Number, required: true },
  carbsPer100g: { type: Number, required: true },
  fatPer100g: { type: Number, required: true },
  caloriesPer100g: { type: Number, required: true }
});

module.exports = mongoose.model("Food", foodSchema);