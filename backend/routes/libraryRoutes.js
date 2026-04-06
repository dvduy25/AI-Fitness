// 📄 routes/libraryRoutes.js
const express = require("express");
const router = express.Router();
const libraryController = require("../controllers/libraryController");

// Middleware xác thực
const { verifyToken } = require("../middleware/authMiddleware");

// 1. Lưu bài viết (chứa lịch tập/ăn) vào kho thư viện
router.post("/", verifyToken, libraryController.saveToLibrary);

// 2. Lấy danh sách kho lưu trữ của bản thân (Có thể truyền thêm query ?type=workout hoặc ?type=diet)
router.get("/", verifyToken, libraryController.getMyLibrary);

// 3. Xóa một mục khỏi kho lưu trữ
router.delete("/:libraryId", verifyToken, libraryController.removeFromLibrary);

// 4. Áp dụng dữ liệu từ kho đè vào Lịch Master cá nhân
router.post("/:libraryId/apply", verifyToken, libraryController.applyFromLibrary);

module.exports = router;