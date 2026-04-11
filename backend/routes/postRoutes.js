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
router.get("/feed",verifyToken, postController.getFeed);
router.get("/:postId", verifyToken, postController.getPostById);

// Sửa & Xóa bài viết
router.put("/:postId", verifyToken, postController.updatePost);
router.delete("/:postId", verifyToken, postController.deletePost);

// ==========================================
// 2. TƯƠNG TÁC (LIKE, COMMENT & SHARE)
// ==========================================

// Thả tim
// Lấy bảng tin (Feed) & Chi tiết bài viết
router.get("/feed", verifyToken, postController.getFeed); // Đây là dòng cũ

// THÊM 2 DÒNG NÀY VÀO ĐÂY NHÉ 👇
router.get("/following", verifyToken, postController.getFollowingPosts);
router.get("/liked", verifyToken, postController.getLikedPosts);

router.get("/:postId", postController.getPostById); // Đây là dòng cũ
router.post("/:postId/like", verifyToken, postController.toggleLike);

// 🌟 ĐÃ THÊM ROUTE NÀY: Gọi API để tăng lượt chia sẻ (Share)
router.post("/:postId/share", verifyToken, postController.incrementShare);
// Thêm dòng này vào danh sách các route của Feed
router.get("/latest", verifyToken, postController.getLatestPosts);
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