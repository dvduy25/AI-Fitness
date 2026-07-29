// routes/workoutLogRoutes.js
// =====================================================
// Route quản lý Nhật ký Tập luyện & Tiến độ Bài tập
// =====================================================
const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");

const {
  checkIn,
  updateExerciseMax,
  getTodayLog,
  getHistory,
  getPersonalRecords,
  getExerciseProgress,
} = require("../controllers/workoutLogController");

// Check-in ngày tập / ngày nghỉ
router.post("/checkin", verifyToken, checkIn);

// Hoàn thành buổi tập & Cập nhật Kỷ lục bài tập
router.put("/max", verifyToken, updateExerciseMax);

// Lấy log hôm nay
router.get("/today", verifyToken, getTodayLog);

// Lịch sử theo tháng + streak
router.get("/history", verifyToken, getHistory);

// Tất cả kỷ lục cá nhân (All-time PRs)
router.get("/personal-records", verifyToken, getPersonalRecords);

// Lịch sử tăng trưởng sức mạnh của 1 bài tập cụ thể
router.get("/exercise-progress/:exerciseId", verifyToken, getExerciseProgress);

module.exports = router;