// models/Post.js
const mongoose = require("mongoose");

function imageLimit(val) {
  return val.length <= 10;
}

const postSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, maxLength: 2000 }, 
  images: { 
    type: [String],
    validate: [imageLimit, 'Không được vượt quá 10 ảnh.'] 
  },
  video: { type: String, default: null },

  // ==========================================
  // THÊM: PHÂN LOẠI BÀI VIẾT ĐỂ FRONTEND RENDER UI ĐÚNG
  // ==========================================
  postType: { 
    type: String, 
    enum: ['text', 'workout_log', 'diet_log', 'master_workout', 'master_diet'], 
    default: 'text' 
  },

  // ==========================================
  // LƯU BẢN SAO (SNAPSHOT) THAY VÌ LƯU ID
  // ==========================================
  // Bỏ 'ref' cứng, vì ID này giờ có thể là WorkoutLog, DailyDietLog, MasterWorkoutPlan, hoặc MealPlan
  originalReferenceId: { type: mongoose.Schema.Types.ObjectId, default: null }, 
  
  workoutSnapshot: { type: mongoose.Schema.Types.Mixed, default: null },
  dietSnapshot: { type: mongoose.Schema.Types.Mixed, default: null },

  // ==========================================
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  commentsCount: { type: Number, default: 0 },
  savesCount: { type: Number, default: 0 } 

}, { timestamps: true });

module.exports = mongoose.model("Post", postSchema);