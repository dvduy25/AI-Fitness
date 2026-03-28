const express = require("express");
const router = express.Router();

// ==========================================
// 1. IMPORT MIDDLEWARES
// ==========================================
const { 
  verifyToken, 
  verifyPremiumOrTicket 
} = require("../middleware/authMiddleware");

// ==========================================
// 2. IMPORT CONTROLLERS
// ==========================================
// AI Trainer (Tạo lịch tập & lịch ăn gốc)
const { 
  generatePTWorkoutPlan, 
  generatePTMealPlan 
} = require("../controllers/aiTrainerController"); 

// AI Correction (Quản lý nhật ký & Chữa cháy/Điều chỉnh calo)
const { 
  getTodayDietLog,
  logActualMealWithAI, 
  deleteConsumedMeal,
  editConsumedMeal,
  syncDietLogWithNewPlan,
  getCalorieHistory // <-- Đã thêm hàm đồng bộ lịch mới
} = require("../controllers/aiCorrectionController");
const { evaluateMasterMealPlan, evaluateMasterWorkoutPlan,
  evaluateDietWithGemini,evaluateExerciseProgress } = require("../controllers/aiEvaluationController");

// ==========================================
// 3. KHAI BÁO ROUTES
// ==========================================

// --- NHÓM 1: TẠO LỘ TRÌNH (Yêu cầu Premium hoặc Vé AI) ---

// [POST] /api/ai/generate-workout-plan - AI Tạo lịch tập 7 ngày (tùy chỉnh giờ rảnh)
router.post("/generate-workout-plan", verifyToken,verifyPremiumOrTicket,  generatePTWorkoutPlan);

// [POST] /api/ai/generate-meal-plan - AI Tạo lộ trình ăn uống cố định (Master Plan)
router.post("/generate-meal-plan", verifyToken, verifyPremiumOrTicket, generatePTMealPlan);


router.get("/diet-evaluation", verifyToken,verifyPremiumOrTicket, evaluateDietWithGemini);
// --- NHÓM 2: NHẬT KÝ ĂN UỐNG & ĐIỀU CHỈNH HÀNG NGÀY ---

// [GET] /api/ai/daily-log - Lấy dữ liệu ăn uống hôm nay (Bao gồm lịch đã ăn & sắp tới)
router.get("/daily-log", verifyToken, getTodayDietLog);

// [POST] /api/ai/log-meal - Ghi nhận bữa ăn thực tế & AI tự động tính/điều chỉnh calo
router.post("/log-meal", verifyToken,  logActualMealWithAI);

// [DELETE] /api/ai/daily-log/meal/:mealId - Xóa bữa ăn đã nạp & AI khôi phục lại lịch
router.delete("/daily-log/meal/:mealId", verifyToken, verifyPremiumOrTicket, deleteConsumedMeal);

// [PUT] /api/ai/daily-log/meal/:mealId - Chỉnh sửa bữa ăn đã nạp & AI tính toán lại
router.put("/daily-log/meal/:mealId", verifyToken, verifyPremiumOrTicket, editConsumedMeal);

// [POST] /api/ai/daily-log/sync-plan - Đồng bộ lại các bữa sắp tới trong ngày khi Master Plan bị thay đổi
router.post("/daily-log/sync-plan", verifyToken, verifyPremiumOrTicket, syncDietLogWithNewPlan);
router.get("/daily-log/history", verifyToken, getCalorieHistory);
// Thêm phần import ở đầu file:


// ... (các route cũ của bạn)

// ==========================================
// API ĐÁNH GIÁ LỊCH TRÌNH DỰA THEO BỆNH LÝ
// ==========================================

// [GET] /api/ai/evaluate-meal-plan - AI đánh giá độ phù hợp của Lịch Ăn gốc
router.get("/evaluate-meal-plan", verifyToken, verifyPremiumOrTicket, evaluateMasterMealPlan);

// [GET] /api/ai/evaluate-workout-plan - AI đánh giá độ phù hợp của Lịch Tập gốc
router.get("/evaluate-workout-plan", verifyToken, verifyPremiumOrTicket, evaluateMasterWorkoutPlan);
router.post("/evaluate-exercise", verifyToken, verifyPremiumOrTicket, evaluateExerciseProgress);
module.exports = router;