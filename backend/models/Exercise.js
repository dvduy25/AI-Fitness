const mongoose = require("mongoose");

const exerciseSchema = new mongoose.Schema({
  name: String, 
  muscleGroup: String,
  level: { 
    type: String, 
    enum: ["beginner", "intermediate", "advanced"],
    default: "beginner"
  },
  equipmentRequired: { 
    type: String, 
    default: "Không cần dụng cụ" 
  },
  videoUrl: { 
    type: String, 
    default: "" 
  },
  description: { 
    type: String, 
    default: "" 
  },
  // 🌟 ĐÃ THÊM: Độ hiệu quả của bài tập (Thang điểm từ 1 đến 5)
  effectiveness: {
    type: Number,
    min: 1,
    max: 5,
    default: 5 // Mặc định là 5 điểm nếu không nhập
  }
}, { timestamps: true });

module.exports = mongoose.model("Exercise", exerciseSchema);