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
// AI Trainer (Tạo lịch tập, lịch ăn gốc & sửa định lượng bằng AI)
const { 
  generatePTWorkoutPlan, 
  generatePTMealPlan,
  adjustMealPlanByAI, 
  searchOrEstimateFood // <-- ĐÃ THÊM: Import hàm tìm kiếm và ước lượng món ăn
} = require("../controllers/aiTrainerController"); 

// AI Correction (Quản lý nhật ký & Chữa cháy/Điều chỉnh calo)
const { 
  getTodayDietLog,
  logActualMealWithAI, 
  deleteConsumedMeal,
  editConsumedMeal,
  syncDietLogWithNewPlan,
  getCalorieHistory 
} = require("../controllers/aiCorrectionController");

// AI Evaluation (Đánh giá tiến trình, lịch trình & bệnh lý)
const { 
  evaluateMasterMealPlan, 
  evaluateMasterWorkoutPlan,
  evaluateDietWithGemini,
  evaluateExerciseProgress 
} = require("../controllers/aiEvaluationController");

// ==========================================
// 3. KHAI BÁO ROUTES
// ==========================================

// --- NHÓM 1: TẠO & ĐIỀU CHỈNH LỘ TRÌNH (Yêu cầu Premium hoặc Vé AI) ---

// [POST] /api/ai/generate-workout-plan - AI Tạo lịch tập 7 ngày (tùy chỉnh giờ rảnh)
router.post("/generate-workout-plan", verifyToken, verifyPremiumOrTicket, generatePTWorkoutPlan);

// [POST] /api/ai/generate-meal-plan - AI Tạo lộ trình ăn uống cố định (Master Plan)
router.post("/generate-meal-plan", verifyToken, verifyPremiumOrTicket, generatePTMealPlan);

// [POST] /api/ai/adjust-meal-plan-by-ai - AI cân bằng lại định lượng số gram thực đơn khi bị lệch Calo (Giữ nguyên món ăn)
router.post("/adjust-meal-plan-by-ai", verifyToken, verifyPremiumOrTicket, adjustMealPlanByAI);

// [GET] /api/ai/diet-evaluation - AI phân tích sâu thực đơn ăn uống hiện tại với Gemini
router.get("/diet-evaluation", verifyToken, verifyPremiumOrTicket, evaluateDietWithGemini);

// [GET] /api/ai/search-food - Tìm kiếm hoặc dùng AI ước lượng món ăn (Chỉ yêu cầu đăng nhập)
router.get("/search-food", verifyToken, searchOrEstimateFood);


// --- NHÓM 2: NHẬT KÝ ĂN UỐNG & ĐIỀU CHỈNH HÀNG NGÀY ---

// [GET] /api/ai/daily-log - Lấy dữ liệu ăn uống hôm nay (Bao gồm lịch đã ăn & sắp tới)
router.get("/daily-log", verifyToken, getTodayDietLog);

// [POST] /api/ai/log-meal - Ghi nhận bữa ăn thực tế & AI tự động tính/điều chỉnh calo
router.post("/log-meal", verifyToken, logActualMealWithAI);

// [DELETE] /api/ai/daily-log/meal/:mealId - Xóa bữa ăn đã nạp & AI khôi phục lại lịch
router.delete("/daily-log/meal/:mealId", verifyToken, verifyPremiumOrTicket, deleteConsumedMeal);

// [PUT] /api/ai/daily-log/meal/:mealId - Chỉnh sửa bữa ăn đã nạp & AI tính toán lại
router.put("/daily-log/meal/:mealId", verifyToken, verifyPremiumOrTicket, editConsumedMeal);

// [POST] /api/ai/daily-log/sync-plan - Đồng bộ lại các bữa sắp tới trong ngày khi Master Plan bị thay đổi
router.post("/daily-log/sync-plan", verifyToken, verifyPremiumOrTicket, syncDietLogWithNewPlan);

// [GET] /api/ai/daily-log/history - Lấy lịch sử biến động Calo theo thời gian
router.get("/daily-log/history", verifyToken, getCalorieHistory);


// --- NHÓM 3: ĐÁNH GIÁ LỊCH TRÌNH DỰA THEO BỆNH LÝ & TIẾN TRÌNH ---

// [GET] /api/ai/evaluate-meal-plan - AI đánh giá độ phù hợp của Lịch Ăn gốc với bệnh lý user
router.get("/evaluate-meal-plan", verifyToken, verifyPremiumOrTicket, evaluateMasterMealPlan);

// [GET] /api/ai/evaluate-workout-plan - AI đánh giá độ phù hợp của Lịch Tập gốc với chấn thương/bệnh lý user
router.get("/evaluate-workout-plan", verifyToken, verifyPremiumOrTicket, evaluateMasterWorkoutPlan);

// [POST] /api/ai/evaluate-exercise - AI phân tích và chấm điểm tiến trình tập luyện bài tập
router.post("/evaluate-exercise", verifyToken, verifyPremiumOrTicket, evaluateExerciseProgress);

module.exports = router;