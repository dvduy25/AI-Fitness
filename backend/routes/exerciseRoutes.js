const express = require("express");
const router = express.Router();
const { verifyToken, authorizeRoles } = require("../middleware/authMiddleware");
const uploadVideoMiddleware = require("../middleware/uploadMiddleware");
const { 
  createExercise, 
  getExercises, 
  getExerciseById, 
  updateExercise, 
  deleteExercise,
  uploadExerciseVideo,
  checkAndSuggestExercise
} = require("../controllers/exerciseController");

// PUBLIC ROUTES (Bắt buộc đăng nhập để xem)
router.get("/", verifyToken, getExercises);
router.get("/:id", verifyToken, getExerciseById);

// ADMIN ROUTES
// Route upload tĩnh đặt trên :id để tránh lỗi bắt nhầm tham số params
router.post(
  "/upload-video", 
  verifyToken, 
  authorizeRoles("admin"), 
  uploadVideoMiddleware.single("video"), 
  uploadExerciseVideo
);

router.post("/", verifyToken, authorizeRoles("admin"), createExercise);
router.put("/:id", verifyToken, authorizeRoles("admin"), updateExercise);
router.delete("/:id", verifyToken, authorizeRoles("admin"), deleteExercise);
router.post("/ai-check-suggest", verifyToken,authorizeRoles("admin"), checkAndSuggestExercise);
module.exports = router;