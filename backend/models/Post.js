// models/Post.js
const mongoose = require("mongoose");

function imageLimit(val) {
  return val ? val.length <= 10 : true;
}

const postSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, maxLength: 2000 },
  images: {
    type: [String],
    validate: [imageLimit, 'Không được vượt quá 10 ảnh.']
  },
  video: { type: String, default: null },

  postType: {
    type: String,
    enum: ['text', 'workout_log', 'diet_log', 'master_workout', 'master_diet'],
    default: 'text'
  },

  originalReferenceId: { type: mongoose.Schema.Types.ObjectId, default: null },
  workoutSnapshot: { type: mongoose.Schema.Types.Mixed, default: null },
  dietSnapshot: { type: mongoose.Schema.Types.Mixed, default: null },

  // Tương tác bài viết
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  commentsCount: { type: Number, default: 0 },
  savesCount: { type: Number, default: 0 },
  
  // 🌟 Thêm trường viewedBy để theo dõi user nào đã xem bài viết
  viewedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  viewsCount: { type: Number, default: 0 },
  sharesCount: { type: Number, default: 0 },

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