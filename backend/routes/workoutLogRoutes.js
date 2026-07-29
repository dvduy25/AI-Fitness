const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware"); // Middleware xác thực Token
const workoutLogController = require("../controllers/workoutLogController");

// Bắt buộc sử dụng middleware auth cho tất cả các route này
router.use(authMiddleware);

// 1. Khai báo các Route tĩnh / Route cụ thể TRƯỚC
router.post("/checkin", workoutLogController.checkIn);
router.put("/max", workoutLogController.updateExerciseMax);
router.put("/unlock", workoutLogController.unlockWorkout);
router.get("/today", workoutLogController.getTodayLog);
router.get("/date", workoutLogController.getLogByDate);
router.get("/history", workoutLogController.getHistory);
router.get("/personal-records", workoutLogController.getPersonalRecords);

// 2. Khai báo các Route có chứa tham số dynamic (:exerciseId) SAU
router.get("/previous/:exerciseId", workoutLogController.getPreviousExerciseLog);
router.get("/exercise-progress/:exerciseId", workoutLogController.getExerciseProgress);

module.exports = router;