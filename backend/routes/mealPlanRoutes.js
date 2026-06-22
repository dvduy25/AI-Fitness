const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");

// ==========================================
// 1. IMPORT CONTROLLERS
// ==========================================
const {
  getUserMealPlan,
  addMeal,
  deleteMeal,
  addFoodToMeal,
  updateFoodQuantity,
  removeFoodFromMeal,
  initManualMealPlan,
  deleteEntireMealPlan,
  checkMealPlanDeviation // <-- Đã thêm hàm kiểm tra độ lệch Calo từ MealPlanController
} = require("../controllers/mealPlanController");

const libraryController = require("../controllers/libraryController");

// ==========================================
// 2. KHAI BÁO ROUTES TỔNG QUAN LỊCH ĂN
// ==========================================

// [GET] /api/meals/my-plan - Lấy lộ trình ăn uống cố định của user
router.get("/my-plan", verifyToken, getUserMealPlan);

// [DELETE] /api/meals/my-plan - Xóa toàn bộ lịch ăn hiện tại của user
router.delete("/my-plan", verifyToken, deleteEntireMealPlan);

// [POST] /api/meals/init-manual - Khởi tạo lịch ăn trống thủ công theo số bữa chọn (2,3,4,5,6 bữa)
router.post("/init-manual", verifyToken, initManualMealPlan);

// [POST] /api/meals/apply-library - Áp dụng thực đơn mẫu có sẵn từ thư viện hệ thống
router.post("/apply-library", verifyToken, libraryController.applyFromLibrary);

// [GET] /api/meals/check-deviation - Kiểm tra lịch ăn thủ công hiện tại có bị lệch chuẩn Calo mục tiêu không
router.get("/check-deviation", verifyToken, checkMealPlanDeviation);

// ==========================================
// 3. ROUTES QUẢN LÝ BỮA ĂN (MEALS)
// ==========================================

// [POST] /api/meals/meal - Thêm một bữa ăn mới trống (Ví dụ: Thêm bữa xế)
router.post("/meal", verifyToken, addMeal);

// [DELETE] /api/meals/meal/:mealId - Xóa một bữa ăn cụ thể khỏi lịch trình
router.delete("/meal/:mealId", verifyToken, deleteMeal);

// ==========================================
// 4. ROUTES QUẢN LÝ MÓN ĂN TRONG BỮA (ITEMS)
// ==========================================

// [POST] /api/meals/item - Thêm món ăn mới vào một bữa ăn cụ thể
router.post("/item", verifyToken, addFoodToMeal);

// [PATCH] /api/meals/item - Sửa số lượng (Gram) của một món ăn đang có trong bữa
router.patch("/item", verifyToken, updateFoodQuantity);

// [DELETE] /api/meals/item/:mealId/:itemId - Xóa một món ăn ra khỏi bữa ăn
router.delete("/item/:mealId/:itemId", verifyToken, removeFoodFromMeal);

module.exports = router;