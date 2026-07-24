const express = require('express');
const router = express.Router();
// Thêm manualCloseDay vào phần import từ controller
const { getUserStats, manualCloseDay,updateCoachingStyle,resolveViolation } = require('../controllers/gamificationController');

// CHÚ Ý: Import middleware kiểm tra token của bạn vào đây. 
// Đổi đường dẫn và tên hàm cho đúng với project của bạn nhé!
const { verifyToken } = require('../middleware/authMiddleware'); 

// Endpoint: GET /api/gamification/stats (Lấy thống kê)
router.get('/stats', verifyToken, getUserStats);

// Endpoint: POST /api/gamification/manual-close (Chốt sổ sớm ngay trong ngày)
router.post('/manual-close', verifyToken, manualCloseDay);
// Cập nhật tính cách (Nên đặt ở trang Settings hoặc Profile của app)
router.put('/coaching-style', verifyToken, updateCoachingStyle);

// Bấm nút cam kết hết vi phạm (Nên gọi khi user bấm nút "Tôi sẽ sửa sai" ở Popup thông báo)
router.post('/resolve-violation', verifyToken, resolveViolation);
module.exports = router;