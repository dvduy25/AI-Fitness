const express = require("express");
const router = express.Router();

// 1. Import Middleware phân quyền
const { verifyToken, authorizeRoles } = require("../middleware/authMiddleware");

const { 
  getAllFoods, 
  createFood, 
  updateFood, 
  deleteFood 
} = require("../controllers/foodController");

// ==========================================
// PUBLIC / USER ROUTES
// ==========================================
// Lấy danh sách (User đã đăng nhập mới xem được)
router.get("/", verifyToken, getAllFoods);

// ==========================================
// ADMIN ROUTES (BẢO MẬT KÉP)
// ==========================================
// Thêm, sửa, xóa -> Phải có token VÀ role là "admin"
router.post("/", verifyToken, authorizeRoles("admin"), createFood);
router.put("/:id", verifyToken, authorizeRoles("admin"), updateFood);
router.delete("/:id", verifyToken, authorizeRoles("admin"), deleteFood);

module.exports = router;