const router = require("express").Router();
const { verifyToken } = require("../middleware/authMiddleware");
const { authLimiter } = require("../middleware/rateLimiter");
const { validate, schemas } = require("../middleware/validation");
const uploadAvatarMiddleware = require("../middleware/uploadMiddleware");
const {
  login,
  register,
  getProfile,
  updateProfile,
  uploadAvatar,
  toggleFollow,
  getFollowing,
  getFollowers,
  getUserProfileById,
  changePassword,
  getPersonalQRCode,
  searchUsers,
  getNotFollowingBack
} = require("../controllers/userController");

// ==========================================
// AUTH (Có rate limit chống brute-force)
// ==========================================
router.post("/register", authLimiter, validate(schemas.register), register);
router.post("/login", authLimiter, validate(schemas.login), login);

// ==========================================
// PROFILE
// ==========================================
router.get("/me", verifyToken, getProfile);
router.put("/me", verifyToken, updateProfile);

// 🌟 Tìm kiếm user theo tên — đặt TRƯỚC "/:id/profile" vì cùng là route GET 1 segment
// tiếp theo /:id/... ("search" không trùng "profile" nên vốn không xung đột, nhưng đặt
// sớm ở đây để không bị lẫn với các route "/:id/..." phía dưới khi sau này có thêm route mới).
router.get("/search", verifyToken, searchUsers);

router.get("/:id/profile", verifyToken, getUserProfileById);

// Upload/sửa ảnh đại diện — bọc multer trong callback để bắt lỗi (file quá lớn, sai định dạng...)
// và trả JSON có message rõ ràng thay vì để Express crash với lỗi HTML mặc định.
router.post("/avatar", verifyToken, (req, res, next) => {
  uploadAvatarMiddleware.single("avatar")(req, res, (err) => {
    if (err) {
      const message = err.code === "LIMIT_FILE_SIZE"
        ? "Ảnh vượt quá dung lượng cho phép (tối đa 5MB)!"
        : err.message || "Lỗi khi tải ảnh lên.";
      return res.status(400).json({ success: false, message });
    }
    next();
  });
}, uploadAvatar);

// ==========================================
// ĐỔI MẬT KHẨU
// ==========================================
router.put("/change-password", verifyToken, validate(schemas.changePassword), changePassword);

// ==========================================
// MẠNG XÃ HỘI
// ==========================================
router.get("/qr-code", verifyToken,   getPersonalQRCode);

// 🌟 Danh sách người đang follow mình mà mình chưa follow lại — đặt TRƯỚC "/:id/follow"
// và các route "/:id/..." khác. "me" ở đây là segment cố định của "/me/not-following-back",
// khác với "/:id/following" (2 segment: :id + "following"), nên không đụng route cũ,
// nhưng vẫn đặt lên trên theo đúng nguyên tắc route cố định phải đứng trước route biến động.
router.get("/me/not-following-back", verifyToken, getNotFollowingBack);

router.post("/:id/follow", verifyToken, toggleFollow);
router.get("/:id/following", verifyToken, getFollowing);
router.get("/:id/followers", verifyToken, getFollowers);

module.exports = router;