// 📄 models/Food.js
const mongoose = require("mongoose");

const foodSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true // Tự động loại bỏ khoảng trắng thừa ở đầu/cuối
  },
  imageUrl: { 
    type: String, 
    default: "" 
  },
  // Chuẩn hóa: Dữ liệu này tính trên 100g của thực phẩm
  baseUnit: { 
    type: String, 
    default: "100g" 
  }, 
  proteinPer100g: { 
    type: Number, 
    required: true,
    min: 0 
  },
  carbsPer100g: { 
    type: Number, 
    required: true,
    min: 0 
  },
  fatPer100g: { 
    type: Number, 
    required: true,
    min: 0 
  },
  caloriesPer100g: { 
    type: Number, 
    required: true,
    min: 0 
  },
  
  // 🌟 THÀNH PHẦN ĐÁNH GIÁ THỰC PHẨM MỚI THÊM
  rating: { 
    type: Number, 
    default: 5, // Mặc định là 5 sao
    min: 1,
    max: 5
  },
  healthStatus: {
    type: String,
    enum: ["healthy", "normal", "restricted"], // healthy: Lành mạnh, normal: Bình thường, restricted: Hạn chế
    default: "healthy"
  }
}, {
  timestamps: true // Tự động thêm ngày tạo (createdAt) và ngày cập nhật (updatedAt)
});

module.exports = mongoose.model("Food", foodSchema);