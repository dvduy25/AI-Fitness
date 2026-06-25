const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs"); // 🛑 Thư viện quản lý file của Node.js

// 1. Import Middleware phân quyền
const { verifyToken, authorizeRoles } = require("../middleware/authMiddleware");

// 2. Import các hàm từ controller
const { 
  getAllFoods, 
  createFood, 
  updateFood, 
  deleteFood,
  suggestFood,
  uploadFoodImage,
  checkAndSuggestFood // 🌟 IMPORT THÊM HÀM AI Ở ĐÂY
} = require("../controllers/foodController");

// ==========================================
// CẤU HÌNH MULTER TỰ ĐỘNG TẠO THƯ MỤC
// ==========================================
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = "uploads/images/";
    
    // 🛑 ĐOẠN CODE THẦN THÁNH: Nếu thư mục chưa có, tự động tạo luôn!
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    cb(null, dir); 
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// ==========================================
// PUBLIC / USER ROUTES
// ==========================================
router.get("/", verifyToken, getAllFoods);
router.get("/suggest-food", verifyToken, suggestFood);

// ==========================================
// ADMIN ROUTES (BẢO MẬT KÉP)
// ==========================================

// 🌟 API AI Kiểm tra và Gợi ý thực phẩm (Chỉ Admin mới có quyền)
router.post("/ai-suggest", verifyToken, authorizeRoles("admin"), checkAndSuggestFood);

// API Tải ảnh lên
router.post("/upload-image", verifyToken, authorizeRoles("admin"), upload.single("image"), uploadFoodImage);

// Thêm, sửa, xóa
router.post("/", verifyToken, authorizeRoles("admin"), createFood);
router.put("/:id", verifyToken, authorizeRoles("admin"), updateFood);
router.delete("/:id", verifyToken, authorizeRoles("admin"), deleteFood);

module.exports = router;