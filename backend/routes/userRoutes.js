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
  changePassword
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
router.post("/:id/follow", verifyToken, toggleFollow);
router.get("/:id/following", verifyToken, getFollowing);
router.get("/:id/followers", verifyToken, getFollowers);

module.exports = router;