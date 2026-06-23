const express = require("express");
const router = express.Router();
const { 
  getDietHistory, 
  getDietByDate, 
  logMeal // Thêm hàm xử lý lưu bữa ăn mới vào đây
} = require("../controllers/dailyLogController");
const { verifyToken } = require("../middleware/authMiddleware"); 

// Route: GET /api/diet/history?period=week -> Lấy lịch sử theo tuần/tháng/tất cả
router.get("/history", verifyToken, getDietHistory);

// Route: GET /api/diet/date?date=YYYY-MM-DD -> Lấy chi tiết 1 ngày cụ thể
router.get('/date', verifyToken, getDietByDate);

// Route MỚI: POST /api/diet/log-meal -> Thêm mới hoặc ghi đè bữa ăn vào ngày hôm nay
router.post("/log-meal", verifyToken, logMeal);

module.exports = router;