const mongoose = require("mongoose");

function imageLimit(val) {
  return val.length <= 10;
}

// Danh sách từ khóa cấm (Hệ thống tự quét)
const BANNED_KEYWORDS = ["phản động", "lừa đảo", "đánh bạc", "mutit", "damtac", "hack"]; 

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

  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  commentsCount: { type: Number, default: 0 },
  savesCount: { type: Number, default: 0 },
  viewsCount: { type: Number, default: 0 },
  sharesCount: { type: Number, default: 0 },

  // ==========================================
  // HỆ THỐNG HẬU KIỂM TỰ ĐỘNG
  // ==========================================
  status: { 
    type: String, 
    enum: ['approved', 'pending_review', 'hidden_by_system', 'banned'], 
    default: 'approved' // Đăng ngay lập tức không cần chờ duyệt thủ công
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

// Tự động kích hoạt chặn từ khóa xấu bằng Mongoose Middleware
postSchema.pre("save", function (next) {
  if (this.isModified("content") && this.content) {
    const textToScan = this.content.toLowerCase();
    const hasBannedWord = BANNED_KEYWORDS.some(word => textToScan.includes(word));
    
    if (hasBannedWord) {
      this.status = 'hidden_by_system';
      this.moderationNote = "Hệ thống tự động ẩn: Phát hiện từ khóa thô tục/cấm trong nội dung.";
    }
  }
  next();
});

module.exports = mongoose.model("Post", postSchema);