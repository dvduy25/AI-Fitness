const express = require("express");
const router = express.Router();
const libraryController = require("../controllers/libraryController");

// Middleware xác thực (Điều chỉnh đường dẫn theo dự án của bạn)
const { verifyToken } = require("../middleware/authMiddleware");

// 1. Lưu bài viết có chứa lịch vào kho
router.post("/", verifyToken, libraryController.saveToLibrary);

// 2. Lưu lịch Master HIỆN TẠI của bản thân vào kho
router.post("/save-master", verifyToken, libraryController.saveMasterToLibrary);

// 3. Lấy danh sách kho lưu trữ (?type=workout hoặc ?type=diet)
router.get("/", verifyToken, libraryController.getMyLibrary);

// 4. Xóa một mục khỏi kho lưu trữ
router.delete("/:libraryId", verifyToken, libraryController.removeFromLibrary);

// 5. Áp dụng lịch từ kho (Dùng cho code Frontend mới: /api/library/:id/apply)
router.post("/:libraryId/apply", verifyToken, libraryController.applyFromLibrary);

// 6. Áp dụng lịch từ kho (Dùng cho code Frontend cũ: gọi POST thẳng vào gốc kèm body.libraryId)
router.post("/apply", verifyToken, libraryController.applyFromLibrary);

module.exports = router;