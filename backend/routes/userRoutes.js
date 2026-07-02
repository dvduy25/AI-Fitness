const router = require("express").Router();
const { verifyToken } = require("../middleware/authMiddleware");
const { authLimiter } = require("../middleware/rateLimiter");
const { validate, schemas } = require("../middleware/validation");
const {
  login,
  register,
  getProfile,
  updateProfile,
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
