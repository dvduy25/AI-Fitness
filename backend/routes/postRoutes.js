// 📄 routes/postRoutes.js
const express = require("express");
const router = express.Router();
const postController = require("../controllers/postController");
// Import middleware xác thực (bạn tự đối chiếu với code của bạn)
const {verifyToken} = require("../middleware/authMiddleware"); 
// Import middleware Multer vừa tạo
const uploadMedia = require("../middleware/uploadMiddleware");

// Gắn uploadMedia.fields() vào route tạo bài viết
router.post(
  "/", 
  verifyToken, 
  uploadMedia.fields([
    { name: "images", maxCount: 4 }, // Cho phép tối đa 4 ảnh
    { name: "video", maxCount: 1 }   // Cho phép tối đa 1 video
  ]), 
  postController.createPost
);

// Các routes khác giữ nguyên...
// router.get("/feed", ...);

      // Đăng bài
router.get("/feed", postController.getFeed);                 // Lấy bảng tin
router.patch("/:postId", verifyToken, postController.updatePost); // Sửa bài
router.delete("/:postId", verifyToken, postController.deletePost); // Xóa bài
router.post("/clone", verifyToken, postController.cloneSnapshot); // Lưu về kho
router.post("/:postId/like", verifyToken, postController.toggleLike);
router.get("/:postId", postController.getPostById);
router.post("/:postId/comment", verifyToken, postController.addComment);
// Lấy danh sách bình luận (Không cần đăng nhập cũng xem được, hoặc tuỳ bạn cấu hình authMiddleware)
router.get("/:postId/comments", postController.getComments);

// Sửa bình luận (Cần đăng nhập)
router.put("/comment/:commentId", verifyToken, postController.updateComment);

// Xóa bình luận (Cần đăng nhập)
router.delete("/comment/:commentId", verifyToken, postController.deleteComment);
module.exports = router;