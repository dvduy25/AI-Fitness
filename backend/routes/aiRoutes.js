const express = require("express");
const router = express.Router();
const { verifyToken, verifyPremiumOrTicket } = require("../middleware/authMiddleware");
const { aiLimiter } = require("../middleware/rateLimiter");

const {
  generatePTWorkoutPlan,
  generatePTMealPlan,
  adjustMealPlanByAI,
  searchOrEstimateFood
} = require("../controllers/aiTrainerController");

const {
  getTodayDietLog,
  logActualMealWithAI,
  deleteConsumedMeal,
  editConsumedMeal,
  syncDietLogWithNewPlan,
  getCalorieHistory
} = require("../controllers/aiCorrectionController");

const {
  evaluateMasterMealPlan,
  evaluateMasterWorkoutPlan,
  evaluateDietWithGemini,
  evaluateExerciseProgress
} = require("../controllers/aiEvaluationController");

// ==========================================
// TẠO & ĐIỀU CHỈNH LỘ TRÌNH (Premium/Vé AI)
// aiLimiter: chống spam tốn API key Gemini
// ==========================================
router.post("/generate-workout-plan", aiLimiter, verifyToken, verifyPremiumOrTicket, generatePTWorkoutPlan);
router.post("/generate-meal-plan", aiLimiter, verifyToken, verifyPremiumOrTicket, generatePTMealPlan);
router.post("/adjust-meal-plan-by-ai", aiLimiter, verifyToken, verifyPremiumOrTicket, adjustMealPlanByAI);
router.get("/diet-evaluation", aiLimiter, verifyToken, verifyPremiumOrTicket, evaluateDietWithGemini);

// Tìm kiếm món ăn (chỉ cần đăng nhập, vẫn cần rate limit AI)
router.get("/search-food", aiLimiter, verifyToken, searchOrEstimateFood);

// ==========================================
// NHẬT KÝ ĂN UỐNG HẰNG NGÀY
// ==========================================
router.get("/daily-log", verifyToken, getTodayDietLog);
router.post("/log-meal", verifyToken, logActualMealWithAI);
router.delete("/daily-log/meal/:mealId", verifyToken, verifyPremiumOrTicket, deleteConsumedMeal);
router.put("/daily-log/meal/:mealId", verifyToken, verifyPremiumOrTicket, editConsumedMeal);
router.post("/daily-log/sync-plan", verifyToken, verifyPremiumOrTicket, syncDietLogWithNewPlan);
router.get("/daily-log/history", verifyToken, getCalorieHistory);

// ==========================================
// ĐÁNH GIÁ AI THEO BỆNH LÝ & TIẾN TRÌNH
// ==========================================
router.get("/evaluate-meal-plan", aiLimiter, verifyToken, verifyPremiumOrTicket, evaluateMasterMealPlan);
router.get("/evaluate-workout-plan", aiLimiter, verifyToken, verifyPremiumOrTicket, evaluateMasterWorkoutPlan);
router.post("/evaluate-exercise", aiLimiter, verifyToken, verifyPremiumOrTicket, evaluateExerciseProgress);

module.exports = router;
