const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { verifyToken, authorizeRoles } = require("../middleware/authMiddleware");
const packageController = require('../controllers/packageController');
const adminStatsController = require("../controllers/adminStatsController");
// ==========================================
// 1. ROUTE CHO USER (Phải đặt TRƯỚC lệnh chặn Admin)
// ==========================================
// Dùng verifyToken để req.user có dữ liệu (nhằm phân biệt User hay Admin ở Controller)
router.get('/packages', verifyToken, packageController.getAllPackages);


// ==========================================
// 2. BỨC TƯỜNG LỬA (Chặn Admin)
// TẤT CẢ các route bên dưới dòng này bắt buộc phải là Admin
// ==========================================
router.use(verifyToken, authorizeRoles("admin")); 

// const { verifyToken, isAdmin } = require("../middlewares/authMiddleware"); // Nên dùng bảo mật nếu có

// Route lấy báo cáo doanh thu Ngày / Tháng / Năm
router.get("/revenue-report", adminStatsController.getRevenueStats);

// Route kích hoạt radar quét Hacker chỉnh sửa DB hoặc API lậu
router.get("/security-audit", adminStatsController.checkPremiumHack);
// 1. Dashboard Stats
router.get("/dashboard", adminController.getDashboardStats);

// 2. User Management
router.route("/users")
  .get(adminController.getAllUsers)
  .post(adminController.createUser);

router.route("/users/:id")
  .get(adminController.getUserById)
  .put(adminController.updateUser)
  .delete(adminController.deleteUser);

// 3. Admin thao tác Gói Premium (Thêm, Sửa, Xóa)
// (Không cần gọi lại verifyToken/authorizeRoles vì dòng router.use ở trên đã lo rồi)
router.post('/packages', packageController.createPackage);
router.put('/packages/:id', packageController.updatePackage);
router.delete('/packages/:id', packageController.deletePackage);

module.exports = router;