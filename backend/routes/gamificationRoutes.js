const express = require('express');
const router = express.Router();
const { getUserStats } = require('../controllers/gamificationController');

// CHÚ Ý: Import middleware kiểm tra token của bạn vào đây. 
// Đổi đường dẫn và tên hàm cho đúng với project của bạn nhé!
const { verifyToken } = require('../middleware/authMiddleware'); 

// Endpoint: GET /api/gamification/stats
router.get('/stats', verifyToken, getUserStats);

module.exports = router;