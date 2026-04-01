const express = require("express");
const router = express.Router();
const { getDietHistory,getDietByDate }= require("../controllers/dailyLogController");
 const { verifyToken } = require("../middleware/authMiddleware"); // Middleware check token của bạn

// Route: GET /api/diet/history?period=week
router.get("/history", verifyToken, getDietHistory);
router.get('/date', verifyToken, getDietByDate);
module.exports = router;