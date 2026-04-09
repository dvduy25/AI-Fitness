const router = require("express").Router();

const { verifyToken } = require("../middleware/authMiddleware");
const { 
    login,
    register,
    getProfile, 
    updateProfile,
    // 🌟 THÊM CÁC HÀM MỚI TỪ CONTROLLER VÀO ĐÂY:
    toggleFollow,
    getFollowing,
    getFollowers
} = require("../controllers/userController");

// ==========================================
// TÀI KHOẢN (ĐĂNG NHẬP / ĐĂNG KÝ)
// ==========================================
router.post("/register", register);
router.post("/login", login);

// ==========================================
// THÔNG TIN CÁ NHÂN (PROFILE)
// ==========================================
// Lấy thông tin chính mình
router.get("/me", verifyToken, getProfile);

// Cập nhật profile (Cân nặng, mục tiêu, thiết bị...)
router.put("/me", verifyToken, updateProfile);

// ==========================================
// TÍNH NĂNG MẠNG XÃ HỘI (FOLLOW & TÍCH XANH)
// ==========================================
// Bấm Theo dõi / Bỏ theo dõi 1 người dùng
router.post("/:id/follow", verifyToken, toggleFollow);

// Lấy danh sách người MÌNH ĐANG THEO DÕI (Following)
router.get("/:id/following", verifyToken, getFollowing);

// Lấy danh sách người ĐANG THEO DÕI MÌNH (Followers)
router.get("/:id/followers", verifyToken, getFollowers);

// Cấp / Thu hồi tích xanh (Chỉ Admin)


module.exports = router;