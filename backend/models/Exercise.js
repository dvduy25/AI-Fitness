const mongoose = require("mongoose");
const exerciseSchema = new mongoose.Schema({
 name: String, muscleGroup: String,
 level: { type: String, enum: ["beginner", "intermediate", "advanced"] },
 equipmentRequired: { type: String, enum: ['bodyweight', 

    'dumbbells', 

    'barbell', 

    'pull_up_bar', 

    'cable_machine', 

    'machine', 

    'dip_station', 

    'resistance_band', 

    'box', 

    'ab_wheel', 

    'jump_rope', 

    'kettlebell'] },
    videoUrl: { 
    type: String, 
    default: "" // Có thể để trống nếu chưa tìm được clip
  },
  description: { type: String, default: "" } // Thêm mô tả ngắn nếu cần

}, { timestamps: true });
module.exports = mongoose.model("Exercise", exerciseSchema);