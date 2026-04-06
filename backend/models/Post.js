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
  // LƯU BẢN SAO (SNAPSHOT) THAY VÌ LƯU ID
  // ==========================================
  originalWorkoutId: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkoutLog' },
  workoutSnapshot: { type: mongoose.Schema.Types.Mixed, default: null },

  originalDietId: { type: mongoose.Schema.Types.ObjectId, ref: 'DailyDietLog' },
  dietSnapshot: { type: mongoose.Schema.Types.Mixed, default: null },

  // ==========================================
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  commentsCount: { type: Number, default: 0 },
  savesCount: { type: Number, default: 0 } 

}, { timestamps: true });

module.exports = mongoose.model("Post", postSchema);