const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { verifyToken, authorizeRoles } = require("../middleware/authMiddleware");
const packageController = require('../controllers/packageController');
const adminStatsController = require("../controllers/adminStatsController");

// ==========================================
// 1. ROUTE CHO USER (Phải đặt TRƯỚC lệnh chặn Admin)
// ==========================================
router.get('/packages', verifyToken, packageController.getAllPackages);

// ==========================================
// 2. BỨC TƯỜNG LỬA (Chặn Admin)
// TẤT CẢ các route bên dưới dòng này tự động bắt buộc quyền Admin
// ==========================================
router.use(verifyToken, authorizeRoles("admin")); 

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

// 🔥 Đã xóa bỏ 'verifyAdmin' gây lỗi. Luồng request đi tới đây đã được bảo vệ bởi bức tường lửa.
router.put('/security/revoke-admin/:id', adminStatsController.quickRevokeAdmin); 
// Hủy tư cách Trainer khẩn cấp (Hạ cấp về user thường và mở khóa lại tài khoản)
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