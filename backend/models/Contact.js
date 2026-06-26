// models/Contact.js
const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['help', 'bug', 'feedback'], required: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  status: { type: String, enum: ['pending', 'processing', 'resolved'], default: 'pending' },
  
  // 🌟 THÊM 2 DÒNG NÀY ĐỂ LƯU PHẢN HỒI CỦA ADMIN:
  adminReply: { type: String, default: null }, // Nội dung trả lời
  repliedAt: { type: Date, default: null }     // Thời gian trả lời
}, { 
  timestamps: true 
});

module.exports = mongoose.model('Contact', contactSchema);