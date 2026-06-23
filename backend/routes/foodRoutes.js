const express = require("express");
const router = express.Router();

// 1. Import Middleware phân quyền
const { verifyToken, authorizeRoles } = require("../middleware/authMiddleware");

// ĐÃ THÊM: Import hàm suggestFood từ controller
const { 
  getAllFoods, 
  createFood, 
  updateFood, 
  deleteFood,
  suggestFood 
} = require("../controllers/foodController");

// ==========================================
// PUBLIC / USER ROUTES
// ==========================================
// Lấy danh sách (User đã đăng nhập mới xem được)
router.get("/", verifyToken, getAllFoods);

// Khai báo route cho gợi ý món ăn khi đang gõ
router.get("/suggest-food", verifyToken, suggestFood);

// ==========================================
// ADMIN ROUTES (BẢO MẬT KÉP)
// ==========================================
// Thêm, sửa, xóa -> Phải có token VÀ role là "admin"
router.post("/", verifyToken, authorizeRoles("admin"), createFood);
router.put("/:id", verifyToken, authorizeRoles("admin"), updateFood);
router.delete("/:id", verifyToken, authorizeRoles("admin"), deleteFood);

module.exports = router;