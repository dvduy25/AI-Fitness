const express = require("express");
const router = express.Router();
const postController = require("../controllers/postController");

// Middleware xác thực & Upload
const { verifyToken } = require("../middleware/authMiddleware"); 
const uploadMedia = require("../middleware/uploadMiddleware");

// Cấu hình upload chung cho các bài đăng có kèm media
const mediaUpload = uploadMedia.fields([
  { name: "images", maxCount: 10 }, 
  { name: "video", maxCount: 1 }
]);

// ==========================================
// 1. QUẢN LÝ BÀI VIẾT (POSTS)
// ==========================================

// Tạo bài viết từ nhật ký hàng ngày (WorkoutLog/DietLog)
router.post("/", verifyToken, mediaUpload, postController.createPost);

// Chia sẻ lịch Master (Lịch tập/ăn gốc của bản thân)
router.post("/share-master", verifyToken, mediaUpload, postController.shareMasterPlan);

// Chia sẻ bài viết từ Kho lưu trữ (Saved Library)
router.post("/share-library", verifyToken, mediaUpload, postController.shareFromLibrary);

// Lấy bảng tin (Feed) & Chi tiết bài viết
router.get("/feed", postController.getFeed);
router.get("/:postId", postController.getPostById);

// Sửa & Xóa bài viết
router.put("/:postId", verifyToken, postController.updatePost); // Dùng PUT hoặc PATCH tùy bạn
router.delete("/:postId", verifyToken, postController.deletePost);

// ==========================================
// 2. TƯƠNG TÁC (LIKE & COMMENT)
// ==========================================

// Thả tim
router.post("/:postId/like", verifyToken, postController.toggleLike);

// Bình luận
router.get("/:postId/comments", postController.getComments);
router.post("/:postId/comments", verifyToken, postController.addComment);
router.put("/comment/:commentId", verifyToken, postController.updateComment);
router.delete("/comment/:commentId", verifyToken, postController.deleteComment);

// ==========================================
// 3. TÍNH NĂNG CLONE (SAO CHÉP)
// ==========================================

// Lưu lịch từ bài đăng của người khác về nhật ký của mình
router.post("/clone", verifyToken, postController.cloneSnapshot);

module.exports = router;