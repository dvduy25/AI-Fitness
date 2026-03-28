const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");

// Import các hàm từ Controller
const { 
  saveDailyLog, 
  getPreviousExerciseRecord,
  getTodayLog // 👈 THÊM HÀM NÀY VÀO ĐÂY
} = require("../controllers/workoutLogController");

// ==========================================
// ROUTES CHO LỊCH SỬ TẬP LUYỆN (WORKOUT LOGS)
// ==========================================

// [GET] Lấy dữ liệu buổi tập ĐANG TẬP DỞ của hôm nay (Để khi vào lại app vẫn giữ số tạ/rep)
// ⚠️ LUÔN ĐẶT ROUTE NÀY LÊN TRÊN ROUTE CÓ PARAM (/:id)
router.get("/today", verifyToken, getTodayLog); 

// [POST] Lưu kết quả của buổi tập ngày hôm nay (Tổng hợp các sets, reps, tạ...)
router.post("/", verifyToken, saveDailyLog);

// [GET] Lấy lịch sử/kỷ lục của buổi tập gần nhất đối với 1 bài tập cụ thể
// Dùng để hiển thị gợi ý: "Buổi trước bạn đẩy 60kg x 10 reps"
router.get("/previous/:exerciseId", verifyToken, getPreviousExerciseRecord);

module.exports = router;