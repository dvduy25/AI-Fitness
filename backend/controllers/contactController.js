// controllers/contactController.js
const Contact = require('../models/Contact');

// ==========================================
// 1. DÀNH CHO USER
// ==========================================

// Gửi yêu cầu mới
const createContact = async (req, res) => {
  try {
    const { type, title, content } = req.body;

    const newContact = new Contact({
      user: req.user._id, // Lấy ID từ token đăng nhập
      type,
      title,
      content
    });

    await newContact.save();

    res.status(201).json({ 
      success: true, 
      message: "Gửi liên hệ thành công!" 
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: "Lỗi server khi gửi liên hệ", 
      error: error.message 
    });
  }
};

// Lấy lịch sử các tin nhắn đã gửi của 1 User cụ thể
const getUserContacts = async (req, res) => {
  try {
    const contacts = await Contact.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: contacts });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// ==========================================
// 2. DÀNH CHO ADMIN
// ==========================================

// Lấy TẤT CẢ các liên hệ từ mọi người dùng (Dành cho Admin Dashboard)
const getAllContacts = async (req, res) => {
  try {
    // Dùng populate để kéo thêm thông tin name và email của user dựa vào user._id
    const contacts = await Contact.find()
      .populate('user', 'name email')
      .sort({ createdAt: -1 });
      
    res.status(200).json({ success: true, data: contacts });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi server khi lấy danh sách liên hệ" });
  }
};

// Admin trả lời một yêu cầu
const replyContact = async (req, res) => {
  try {
    const { contactId } = req.params;
    // Đã sửa lại thành adminReply để khớp với Frontend
    const { adminReply } = req.body; 

    const contact = await Contact.findById(contactId);
    if (!contact) {
      return res.status(404).json({ message: "Không tìm thấy yêu cầu này!" });
    }

    // Cập nhật phản hồi
    contact.adminReply = adminReply;
    contact.repliedAt = Date.now();
    contact.status = 'resolved'; // Đổi trạng thái thành "Đã giải quyết"
    
    await contact.save();

    res.status(200).json({ success: true, message: "Đã gửi phản hồi cho người dùng!" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

module.exports = { 
  createContact, 
  getUserContacts, 
  getAllContacts, // Nhớ export hàm mới này
  replyContact 
};