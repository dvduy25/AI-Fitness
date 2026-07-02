// routes/workoutLogRoutes.js (VIẾT LẠI)
const express = require("express");
const router  = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const {
  checkIn,
  updateExerciseMax,
  getTodayLog,
  getHistory,
  getPersonalRecords,
} = require("../controllers/workoutLogController");

// Check-in hôm nay (có tập hay không)
router.post("/checkin", verifyToken, checkIn);

// Cập nhật kỷ lục 1 bài tập
router.put("/max", verifyToken, updateExerciseMax);

// Lấy log hôm nay
router.get("/today", verifyToken, getTodayLog);

// Lịch sử theo tháng
router.get("/history", verifyToken, getHistory);

// Tất cả kỷ lục cá nhân
router.get("/personal-records", verifyToken, getPersonalRecords);

module.exports = router;
