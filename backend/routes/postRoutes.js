const express = require("express");
const router = express.Router();
const postController = require("../controllers/postController");
const { verifyToken } = require("../middleware/authMiddleware");

router.post("/", verifyToken, postController.createPost);         // Đăng bài
router.get("/feed", postController.getFeed);                 // Lấy bảng tin
router.patch("/:postId", verifyToken, postController.updatePost); // Sửa bài
router.delete("/:postId", verifyToken, postController.deletePost); // Xóa bài
router.post("/clone", verifyToken, postController.cloneSnapshot); // Lưu về kho
router.post("/:postId/like", verifyToken, postController.toggleLike);
router.post("/:postId/comment", verifyToken, postController.addComment);
module.exports = router;