// models/PostSave.js
// =====================================================
// LƯU BÀI VIẾT CỦA PT
// - Mỗi user chỉ lưu 1 lần / 1 bài (unique index)
// - Phải xem quảng cáo HOẶC có Premium
// - 2.000 lượt lưu = PT kiếm được $1
// =====================================================
const mongoose = require("mongoose");

const postSaveSchema = new mongoose.Schema(
  {
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // PT sở hữu bài viết (để tính thu nhập nhanh, không join)
    ptId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Cách user mở khóa lượt lưu
    method: {
      type: String,
      enum: ["ad", "premium"],
      required: true,
    },
  },
  { timestamps: true }
);

// ⚡ Unique index: 1 user chỉ lưu 1 lần / 1 bài
postSaveSchema.index({ postId: 1, userId: 1 }, { unique: true });
// Index cho tính thu nhập PT
postSaveSchema.index({ ptId: 1, createdAt: -1 });
// Index cho query "user đã lưu bài này chưa"
postSaveSchema.index({ postId: 1 });

module.exports = mongoose.model("PostSave", postSaveSchema);
