// models/Post.js
const mongoose = require("mongoose");

function imageLimit(val) {
  return val ? val.length <= 10 : true; // Kiểm tra an toàn tránh sập server nếu mảng trống
}

const postSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, maxLength: 2000 }, 
  images: { 
    type: [String],
    validate: [imageLimit, 'Không được vượt quá 10 ảnh.'] 
  },
  video: { type: String, default: null },

  // Phân loại bài viết để Frontend render giao diện tương ứng
  postType: { 
    type: String, 
    enum: ['text', 'workout_log', 'diet_log', 'master_workout', 'master_diet'], 
    default: 'text' 
  },

  // Lưu bản sao lịch tập / thực đơn tại thời điểm đăng bài
  originalReferenceId: { type: mongoose.Schema.Types.ObjectId, default: null }, 
  workoutSnapshot: { type: mongoose.Schema.Types.Mixed, default: null },
  dietSnapshot: { type: mongoose.Schema.Types.Mixed, default: null },

  // Tương tác bài viết
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  commentsCount: { type: Number, default: 0 },
  savesCount: { type: Number, default: 0 } ,

  // =================================================================
  // HỆ THỐNG KIỂM DUYỆT (Bắt buộc phải có để Admin Controller hoạt động)
  // =================================================================
  status: { 
    type: String, 
    enum: ['approved', 'pending_review', 'hidden_by_system', 'banned'], 
    default: 'approved' 
  },
  reports: [{
    reporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  }],
  reportsCount: { type: Number, default: 0 },
  moderatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  moderationNote: { type: String, default: "" }

}, { timestamps: true });

module.exports = mongoose.model("Post", postSchema);