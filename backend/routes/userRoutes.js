const router = require("express").Router();

const { verifyToken } = require("../middleware/authMiddleware");
const { 
    login,
    register,
    getProfile, 
    updateProfile
    
} = require("../controllers/userController");

// Lấy thông tin chính mình
router.get("/me", verifyToken, getProfile);

// Cập nhật profile (Cân nặng, mục tiêu, thiết bị...)
router.put("/me", verifyToken, updateProfile);


router.post("/register",register);
router.post("/login", login);

module.exports = router;