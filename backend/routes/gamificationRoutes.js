const express = require('express');
const router = express.Router();
// Thêm manualCloseDay vào phần import từ controller
const { getUserStats, manualCloseDay } = require('../controllers/gamificationController');

// CHÚ Ý: Import middleware kiểm tra token của bạn vào đây. 
// Đổi đường dẫn và tên hàm cho đúng với project của bạn nhé!
const { verifyToken } = require('../middleware/authMiddleware'); 

// Endpoint: GET /api/gamification/stats (Lấy thống kê)
router.get('/stats', verifyToken, getUserStats);

// Endpoint: POST /api/gamification/manual-close (Chốt sổ sớm ngay trong ngày)
router.post('/manual-close', verifyToken, manualCloseDay);

module.exports = router;