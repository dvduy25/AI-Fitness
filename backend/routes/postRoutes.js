const express = require("express");
const router = express.Router();
const postController = require("../controllers/postController");
const { verifyToken } = require("../middleware/authMiddleware");

// ===== BẢNG TIN =====
router.get("/feed", verifyToken, postController.getFeed);           // "Dành cho bạn" — CẦN verifyToken vì dùng req.user.id
router.get("/latest", verifyToken, postController.getLatestPosts);  // "Mới nhất"
router.get("/following", verifyToken, postController.getFollowingPosts); // "Đang theo dõi"
router.get("/liked", verifyToken, postController.getLikedPosts);    // "Đã thích"
router.get("/user/:userId", verifyToken, postController.getUserPosts); // Bài viết trang cá nhân

// ===== ĐĂNG BÀI =====
router.post("/", verifyToken, postController.createPost);
router.post("/share-master", verifyToken, postController.shareMasterPlan);
router.post("/share-library", verifyToken, postController.shareFromLibrary);

// ===== CHI TIẾT / SỬA / XÓA =====
router.get("/:postId", verifyToken, postController.getPostById);
router.put("/:postId", verifyToken, postController.updatePost);     // đổi PATCH -> PUT cho khớp frontend (api.put)
router.delete("/:postId", verifyToken, postController.deletePost);

// ===== TƯƠNG TÁC =====
router.post("/:postId/like", verifyToken, postController.toggleLike);
router.post("/:postId/comment", verifyToken, postController.addComment);
router.get("/:postId/comments", verifyToken, postController.getComments);
router.put("/comments/:commentId", verifyToken, postController.updateComment);
router.delete("/comments/:commentId", verifyToken, postController.deleteComment);

// ===== LƯU VỀ KHO =====
router.post("/clone", verifyToken, postController.cloneSnapshot);

// ===== CHIA SẺ / BÁO CÁO =====
router.post("/:postId/share", verifyToken, postController.incrementShare);
router.post("/:postId/share-to-user", verifyToken, postController.sharePostToUser);
router.post("/:postId/report", verifyToken, postController.reportPost);

// ===== THÔNG BÁO =====
router.get("/notifications", verifyToken, postController.getNotifications);
router.get("/notifications/unread-count", verifyToken, postController.getUnreadNotificationCount);
router.patch("/notifications/:notiId/read", verifyToken, postController.markNotificationAsRead);
router.patch("/notifications/read-all", verifyToken, postController.markAllNotificationsAsRead);
router.delete("/notifications/:notiId", verifyToken, postController.deleteNotification);

module.exports = router;