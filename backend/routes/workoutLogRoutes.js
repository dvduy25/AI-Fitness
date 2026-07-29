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

const auth = require("../middleware/auth"); // Middleware xác thực của bạn

// 👈 2. Khai báo route /date (đặt phía trên các route dạng dynamic parameter)
router.get("/date", auth, getLogByDate);

router.post("/checkin", auth, checkIn);
router.put("/max", auth, updateExerciseMax);
router.get("/today", auth, getTodayLog);
router.get("/history", auth, getHistory);
router.get("/personal-records", auth, getPersonalRecords);
router.get("/exercise-progress/:exerciseId", auth, getExerciseProgress);

module.exports = router;