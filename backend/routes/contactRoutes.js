// routes/contactRoutes.js
const express = require('express');
const router = express.Router();
const { createContact, getUserContacts} = require('../controllers/contactController');
const { verifyToken } = require('../middleware/authMiddleware'); // Cần middleware check 'admin'

// User gửi yêu cầu
router.post('/', verifyToken, createContact);

// User lấy lịch sử của mình
router.get('/my-history', verifyToken, getUserContacts);

// Admin trả lời yêu cầu (Bắt buộc phải có quyền admin)


module.exports = router;