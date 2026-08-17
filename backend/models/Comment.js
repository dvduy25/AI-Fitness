const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema({
  postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true, maxLength: 500 },

  // Luôn trỏ về bình luận GỐC (cấp cao nhất) để giữ cấu trúc phẳng 1 tầng.
  // - Bình luận gốc: parentCommentId = null
  // - Reply (dù trả lời comment gốc hay trả lời 1 reply khác): parentCommentId = ID bình luận gốc
  parentCommentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null },

  // Khi reply 1 reply khác (không phải comment gốc), lưu lại đang trả lời ai để hiển thị "@tên"
  replyToUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  replyToUserName: { type: String, default: null },

  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

module.exports = mongoose.model("Comment", commentSchema);