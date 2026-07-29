// routes/workoutLogs.js (hoặc file router tương đương)
const express = require("express");
const router = express.Router();
const {
  checkIn,
  updateExerciseMax,
  getTodayLog,
  getLogByDate, // 👈 1. Import hàm mới
  getHistory,
  getPersonalRecords,
  getExerciseProgress,
} = require("../controllers/workoutLogController");

const{ verifyToken }= require("../middleware/authMiddleware"); // Middleware xác thực của bạn

// 👈 2. Khai báo route /date (đặt phía trên các route dạng dynamic parameter)
router.get("/date", verifyToken, getLogByDate);

router.post("/checkin", verifyToken , checkIn);
router.put("/max", verifyToken, updateExerciseMax);
router.get("/today", verifyToken, getTodayLog);
router.get("/history", verifyToken, getHistory);
router.get("/personal-records", verifyToken, getPersonalRecords);
router.get("/exercise-progress/:exerciseId", verifyToken, getExerciseProgress);

module.exports = router;