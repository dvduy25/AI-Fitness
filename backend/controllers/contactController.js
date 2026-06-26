
// controllers/contactController.js
const Contact = require('../models/Contact');

// 1. DÀNH CHO USER: Lấy lịch sử các tin nhắn đã gửi và xem Admin đã trả lời chưa
const getUserContacts = async (req, res) => {
  try {
    const contacts = await Contact.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: contacts });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// 2. DÀNH CHO ADMIN: Viết câu trả lời
const replyContact = async (req, res) => {
  try {
    const { contactId } = req.params;
    const { replyContent } = req.body; // Nội dung Admin gõ

    const contact = await Contact.findById(contactId);
    if (!contact) {
      return res.status(404).json({ message: "Không tìm thấy yêu cầu này!" });
    }

    // Cập nhật phản hồi
    contact.adminReply = replyContent;
    contact.repliedAt = Date.now();
    contact.status = 'resolved'; // Đổi trạng thái thành "Đã giải quyết"
    
    await contact.save();

    res.status(200).json({ success: true, message: "Đã gửi phản hồi cho người dùng!" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// (Giữ nguyên hàm createContact cũ của bạn ở đây)


const createContact = async (req, res) => {
  try {
    const { type, title, content } = req.body;

    // Tạo mới một liên hệ
    const newContact = new Contact({
      user: req.user._id, // Lấy ID từ token đăng nhập
      type,
      title,
      content
    });

    // Lưu vào MongoDB
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

module.exports = { createContact, getUserContacts, replyContact };