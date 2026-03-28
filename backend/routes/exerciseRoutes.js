const express = require("express");
const router = express.Router();

// 1. Import Middleware phân quyền và Upload
const { verifyToken, authorizeRoles } = require("../middleware/authMiddleware");
const uploadVideoMiddleware = require("../middleware/uploadMiddleware");

// 2. Import các hàm xử lý từ Controller
const { 
  createExercise, 
  getExercises, 
  getExerciseById, 
  updateExercise, 
  deleteExercise,
  uploadExerciseVideo // <--- Đã thêm hàm upload video
} = require("../controllers/exerciseController");

// ==========================================
// PUBLIC / USER ROUTES
// ==========================================

// Lấy danh sách toàn bộ bài tập (có hỗ trợ lọc qua query)
router.get("/", verifyToken, getExercises);

// Lấy chi tiết 1 bài tập
router.get("/:id", verifyToken, getExerciseById);


// ==========================================
// ADMIN ROUTES (BẢO MẬT KÉP)
// ==========================================

// [QUAN TRỌNG] Đặt route upload-video lên trước route /:id để Express không bị nhầm lẫn
// Upload Video bài tập (Chỉ Admin) - Yêu cầu key là "video" trong form-data
router.post(
  "/upload-video", 
  verifyToken, 
  authorizeRoles("admin"), 
  uploadVideoMiddleware.single("video"), 
  uploadExerciseVideo
);

// Thêm bài tập mới (Chỉ Admin)
router.post("/", verifyToken, authorizeRoles("admin"), createExercise);

// Cập nhật thông tin bài tập (Chỉ Admin)
router.put("/:id", verifyToken, authorizeRoles("admin"), updateExercise);

// Xóa bài tập (Chỉ Admin)
router.delete("/:id", verifyToken, authorizeRoles("admin"), deleteExercise);

module.exports = router;