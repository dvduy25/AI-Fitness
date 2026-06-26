// routes/contactRoutes.js
const express = require('express');
const router = express.Router();
const { 
  createContact, 
  getUserContacts,
  getAllContacts, // Bổ sung hàm lấy tất cả
  replyContact ,
  editContactReply,    // Import hàm sửa
  deleteContactReply   // Bổ sung hàm trả lời
} = require('../controllers/contactController');

// Import middleware (Thêm verifyAdmin để check quyền)
const { verifyToken,  authorizeRoles } = require('../middleware/authMiddleware'); 

// ==========================================
// 1. DÀNH CHO USER
// ==========================================
// User gửi yêu cầu
router.post('/', verifyToken, createContact);

// User lấy lịch sử của mình
router.get('/my-history', verifyToken, getUserContacts);

router.put('/admin/:contactId/reply/edit', verifyToken, authorizeRoles("admin"), editContactReply);

// Admin xóa phản hồi
router.put('/admin/:contactId/reply/delete', verifyToken, authorizeRoles("admin"), deleteContactReply);
// ==========================================
// 2. DÀNH CHO ADMIN
// ==========================================
// Admin lấy danh sách toàn bộ yêu cầu
router.get('/admin/all', verifyToken, authorizeRoles("admin"), getAllContacts);

// Admin trả lời yêu cầu (Bắt buộc phải có quyền admin)
router.put('/admin/:contactId/reply', verifyToken, authorizeRoles("admin")  , replyContact);

module.exports = router;