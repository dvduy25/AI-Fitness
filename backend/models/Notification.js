const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { 
    type: String, 
    // Bỏ 'follow', thêm 'new_post' và 'share_post'
    enum: ['like', 'comment', 'save_plan', 'new_post', 'share_post'], 
    required: true 
  },
  postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', default: null },
  isRead: { type: Boolean, default: false }
}, { timestamps: true });

// 🌟 QUAN TRỌNG: Lệnh này bảo MongoDB tự động xóa document sau 30 ngày
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });

module.exports = mongoose.model("Notification", notificationSchema);