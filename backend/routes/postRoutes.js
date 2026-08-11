// 📄 backend/routes/postRoutes.js
const express = require("express");
const router = express.Router();
const postController = require("../controllers/postController");

// Middleware xác thực, Upload & Bộ lọc từ khóa cấm
const { verifyToken } = require("../middleware/authMiddleware"); 
const uploadMedia = require("../middleware/uploadMiddleware");
const { checkBannedWords } = require("../middleware/contentFilter"); // 🌟 Đã tích hợp bộ quét từ khóa

// Cấu hình upload chung cho các bài đăng có kèm media
const mediaUpload = uploadMedia.fields([
  { name: "images", maxCount: 10 }, 
  { name: "video", maxCount: 1 }
]);

// ==========================================
// 1. QUẢN LÝ BÀI VIẾT (POSTS) - CÓ QUÉT TỪ KHÓA CẤM
// ==========================================

// Tạo bài viết từ nhật ký hàng ngày (WorkoutLog/DietLog)
router.post("/", verifyToken, mediaUpload, checkBannedWords, postController.createPost);

// Chia sẻ lịch Master (Lịch tập/ăn gốc của bản thân)
router.post("/share-master", verifyToken, mediaUpload, checkBannedWords, postController.shareMasterPlan);

// Chia sẻ bài viết từ Kho lưu trữ (Saved Library)
router.post("/share-library", verifyToken, mediaUpload, checkBannedWords, postController.shareFromLibrary);

// ==========================================
// 2. CÁC TÍNH NĂNG LẤY BẢNG TIN (FEED) & THÔNG BÁO
// ⚠️ LƯU Ý: CÁC ROUTE CỐ ĐỊNH PHẢI ĐỨNG TRÊN ROUTE BIẾN ĐỘNG /:postId
// ==========================================
router.get("/feed", verifyToken, postController.getFeed);
router.get("/latest", verifyToken, postController.getLatestPosts);
router.get("/following", verifyToken, postController.getFollowingPosts);
router.get("/liked", verifyToken, postController.getLikedPosts);

// Các Route quản lý thông báo
router.get("/notifications", verifyToken, postController.getNotifications);
router.get("/notifications/unread-count", verifyToken, postController.getUnreadNotificationCount);
router.patch("/notifications/read-all", verifyToken, postController.markAllNotificationsAsRead);
router.patch("/notifications/:notiId/read", verifyToken, postController.markNotificationAsRead);
router.delete("/notifications/:notiId", verifyToken, postController.deleteNotification);

// ==========================================
// 3. HỆ THỐNG BÁO CÁO VI PHẠM (REPORT)
// ⚠️ Phải đặt trên các route biến động để tránh bị lỗi nuốt route
// ==========================================


// ==========================================
// 4. CHI TIẾT BÀI VIẾT, SỬA & XÓA (ROUTE ĐỘNG NẰM DƯỚI)
// ==========================================
router.get("/:postId", verifyToken, postController.getPostById);
router.get("/user/:userId", verifyToken, postController.getUserPosts);
router.put("/:postId", verifyToken, checkBannedWords, postController.updatePost); // Quét từ khóa khi sửa bài
router.delete("/:postId", verifyToken, postController.deletePost);

// ==========================================
// 5. TƯƠNG TÁC (LIKE, COMMENT, SHARE & REPORT ACTION)
// ==========================================

// Thả tim & Chia sẻ (Share công khai)
router.post("/:postId/like", verifyToken, postController.toggleLike);
router.post("/:postId/share", verifyToken, postController.incrementShare);

// Gửi bài viết trực tiếp cho người đang Follow
router.post("/:postId/share-to-user", verifyToken, postController.sharePostToUser);

// Gửi báo cáo vi phạm bài viết lên hệ thống
router.post("/:postId/report", verifyToken, postController.reportPost);

// Bình luận (Gắn bộ lọc từ khóa cấm để chặn bình luận thô tục)
router.get("/:postId/comments", postController.getComments);
router.post("/:postId/comments", verifyToken, checkBannedWords, postController.addComment);
router.put("/comment/:commentId", verifyToken, checkBannedWords, postController.updateComment);
router.delete("/comment/:commentId", verifyToken, postController.deleteComment);

// ==========================================
// 6. TÍNH NĂNG CLONE (SAO CHÉP)
// ==========================================

// Lưu lịch từ bài đăng của người khác về nhật ký của mình
router.post("/clone", verifyToken, postController.cloneSnapshot);

module.exports = router;