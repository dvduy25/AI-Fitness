const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const {
  getUserMealPlan,
  addMeal,
  deleteMeal,
  addFoodToMeal,
  updateFoodQuantity,
  removeFoodFromMeal
} = require("../controllers/mealPlanController");

router.get("/my-plan", verifyToken, getUserMealPlan);
// Routes cho Bữa ăn
router.post("/meal", verifyToken, addMeal);
router.delete("/meal/:mealId", verifyToken, deleteMeal);

// Routes cho Món ăn
router.post("/item", verifyToken, addFoodToMeal);
router.patch("/item", verifyToken, updateFoodQuantity);
router.delete("/item/:mealId/:itemId", verifyToken, removeFoodFromMeal);

module.exports = router;