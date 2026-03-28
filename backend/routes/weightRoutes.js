const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const { logWeight, getWeightHistory } = require("../controllers/weightController");

// [POST] /api/weight - Ghi nhận cân nặng hôm nay
router.post("/", verifyToken, logWeight);

// [GET] /api/weight/history?period=month - Lấy lịch sử cân nặng (period có thể là 'week', 'month', 'all')
router.get("/history", verifyToken, getWeightHistory);

module.exports = router;