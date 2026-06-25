// 📄 backend/routes/adminRoutes.js
const express = require("express");
const router = express.Router();

const adminController = require("../controllers/adminController");
const packageController = require('../controllers/packageController');
const adminStatsController = require("../controllers/adminStatsController");

// Import thêm Controller chuyên xử lý Post cho Admin
const postAdminController = require("../controllers/postAdminController");

const { verifyToken, authorizeRoles } = require("../middleware/authMiddleware");

// ==========================================
// 1. ROUTE CHO USER (Phải đặt TRƯỚC lệnh chặn Admin)
// ==========================================
router.get('/packages', verifyToken, packageController.getAllPackages);

// ==========================================
// 2. BỨC TƯỜNG LỬA (Chặn Admin/Moderator)
// TẤT CẢ các route bên dưới dòng này tự động bắt buộc quyền Admin (hoặc Moderator)
// ==========================================
router.use(verifyToken, authorizeRoles("admin", "moderator")); 

// =========================================================
// 🛡️ HỆ THỐNG KIỂM DUYỆT BÀI VIẾT (MODERATION)
// =========================================================
// Lấy danh sách hàng đợi các bài viết bị lỗi AI chặn / bị cộng đồng report
router.get("/posts/queue", postAdminController.getAdminReportedPosts);

// Xử lý phán quyết cuối cùng cho một bài viết (Khôi phục hoặc Xóa vĩnh viễn)
router.patch("/posts/:id/resolve", postAdminController.resolveModeration);

// =========================================================
// 🚀 BÁO CÁO & RADAR AN NINH TỰ ĐỘNG
// =========================================================
router.get("/revenue-report", adminStatsController.getRevenueStats);
router.get("/security-audit", adminStatsController.checkPremiumHack);

// =========================================================
// ⚡ CÁC TÍNH NĂNG TRỪNG PHẠT KHẨN CẤP TỪ RADAR
// =========================================================
router.put("/security/lock/:id", adminStatsController.quickLockUser);
router.put("/security/revoke-vip/:id", adminStatsController.quickRevokePremium); 
router.put('/security/revoke-admin/:id', adminStatsController.quickRevokeAdmin); 
router.put("/security/revoke-trainer/:id", adminStatsController.quickRevokeTrainer);

// =========================================================
// 📊 DASHBOARD & QUẢN LÝ NGƯỜI DÙNG GỐC
// =========================================================
router.get("/dashboard", adminController.getDashboardStats);

router.route("/users")
  .get(adminController.getAllUsers)
  .post(adminController.createUser);

router.route("/users/:id")
  .get(adminController.getUserById)
  .put(adminController.updateUser)
  .delete(adminController.deleteUser);

router.put("/users/:id/toggle-lock", adminController.toggleLockUser);

// =========================================================
// 💎 QUẢN LÝ GÓI PREMIUM (PACKAGES)
// =========================================================
router.post('/packages', packageController.createPackage);
router.put('/packages/:id', packageController.updatePackage);
router.delete('/packages/:id', packageController.deletePackage);

module.exports = router;