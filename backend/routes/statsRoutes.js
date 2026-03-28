// const express = require("express");
// const router = express.Router();
// const { verifyToken } = require("../middleware/authMiddleware");
// const { getWeightStats, getMacroStats } = require("../controllers/statsController");

// // [GET] /api/stats/weight - Lấy thống kê cân nặng trung bình theo từng tháng/năm
// router.get("/weight", verifyToken, getWeightStats);

// // [GET] /api/stats/macros - Lấy thống kê Calo, Protein, Carbs, Fat trong 7 ngày gần nhất
// router.get("/macros", verifyToken, getMacroStats);

// module.exports = router;