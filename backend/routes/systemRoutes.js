const express = require("express");
const router = express.Router();
const systemController = require("../controllers/systemController");

// Import các middleware bảo mật từ file quản lý auth của bạn
// Hãy đảm bảo đường dẫn "../middlewares/authMiddleware" khớp với cấu trúc thư mục thực tế của bạn
const { verifyToken, authorizeRoles } = require("../middleware/authMiddleware");

/**
 * @route   GET /api/system/maintenance
 * @desc    API công khai để React Frontend kiểm tra trạng thái hệ thống khi vừa tải trang
 * @access  Public (Không cần Token)
 */
router.get("/maintenance", systemController.getMaintenanceStatus);

/**
 * @route   POST /api/system/maintenance
 * @desc    API bảo mật để bật/tắt cấu hình bảo trì hoặc thông báo hệ thống
 * @access  Private (Yêu cầu có Token hợp lệ & Quyền tài khoản phải là 'admin')
 */
router.post(
  "/maintenance", 
  verifyToken,               // Bước 1: Giải mã JWT để lấy req.user.id
  authorizeRoles("admin"),   // Bước 2: Truy vấn Database xem user này có role === "admin" không
  systemController.toggleMaintenance
);

module.exports = router;