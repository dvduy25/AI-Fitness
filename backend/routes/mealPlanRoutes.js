const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const {
  getUserMealPlan,
  addMeal,
  deleteMeal,
  addFoodToMeal,
  updateFoodQuantity,
  removeFoodFromMeal,
  initManualMealPlan,
  deleteEntireMealPlan

} = require("../controllers/mealPlanController");

router.get("/my-plan", verifyToken, getUserMealPlan);
// Routes cho Bữa ăn
router.post("/meal", verifyToken, addMeal);
router.delete("/meal/:mealId", verifyToken, deleteMeal);

// Routes cho Món ăn
router.post("/item", verifyToken, addFoodToMeal);
router.patch("/item", verifyToken, updateFoodQuantity);
router.delete("/item/:mealId/:itemId", verifyToken, removeFoodFromMeal);
router.post("/init-manual", verifyToken, initManualMealPlan);
router.delete("/my-plan", verifyToken, deleteEntireMealPlan);
module.exports = router;