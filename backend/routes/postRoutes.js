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

// ==========================================
// 2. CÁC TÍNH NĂNG LẤY BẢNG TIN (FEED) & THÔNG BÁO
// ==========================================
router.get("/feed", verifyToken, postController.getFeed);
router.get("/latest", verifyToken, postController.getLatestPosts);
router.get("/following", verifyToken, postController.getFollowingPosts);
router.get("/liked", verifyToken, postController.getLikedPosts);

// Quản lý thông báo
router.get("/notifications", verifyToken, postController.getNotifications);
router.get("/notifications/unread-count", verifyToken, postController.getUnreadNotificationCount);
router.patch("/notifications/read-all", verifyToken, postController.markAllNotificationsAsRead);
router.patch("/notifications/:notiId/read", verifyToken, postController.markNotificationAsRead);
router.delete("/notifications/:notiId", verifyToken, postController.deleteNotification);

// Lấy chi tiết 1 bài viết (Route động /:postId phải nằm DƯỚI CÙNG của các lệnh GET)
router.get("/:postId", verifyToken, postController.getPostById);

// Sửa & Xóa bài viết
router.put("/:postId", verifyToken, postController.updatePost);
router.delete("/:postId", verifyToken, postController.deletePost);

// ==========================================
// 3. TƯƠNG TÁC (LIKE, COMMENT, SHARE & REPORT)
// ==========================================
// Thả tim & Chia sẻ
router.post("/:postId/like", verifyToken, postController.toggleLike);
router.post("/:postId/share", verifyToken, postController.incrementShare);

// Gửi bài viết trực tiếp cho người đang Follow
router.post("/:postId/share-to-user", verifyToken, postController.sharePostToUser);

// 🚨 BỔ SUNG: Nút Báo cáo bài viết vi phạm cho User
router.post("/:postId/report", verifyToken, postController.reportPost);
router.delete('/reports/:reportId', verifyToken, postController.deleteReport);
// Bình luận
router.get("/:postId/comments", postController.getComments);
router.post("/:postId/comments", verifyToken, postController.addComment);
router.put("/comment/:commentId", verifyToken, postController.updateComment);
router.delete("/comment/:commentId", verifyToken, postController.deleteComment);

// ==========================================
// 4. TÍNH NĂNG CLONE (SAO CHÉP)
// ==========================================
// Lưu lịch từ bài đăng của người khác về nhật ký của mình
router.post("/clone", verifyToken, postController.cloneSnapshot);

module.exports = router;