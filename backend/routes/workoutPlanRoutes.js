const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");

// Import toàn bộ 7 hàm từ Controller
const { 
    getWorkoutPlan, 
    upsertWorkoutPlan, 
    updateDayInPlan, 
    deleteWorkoutPlan,
    addExerciseToDay,
    updateExerciseInDay,
    removeExerciseFromDay,
    getWorkoutPlanForToday
} = require("../controllers/workoutPlanController");

// ==========================================
// ROUTES CHO TOÀN BỘ LỊCH TẬP VÀ NGÀY
// ==========================================
router.get('/today', verifyToken, getWorkoutPlanForToday);
// [GET] Lấy lịch tập hiện tại (Dùng khi user vào màn hình Lịch Tập)
router.get("/", verifyToken, getWorkoutPlan);

// [PUT] Thêm mới / Ghi đè toàn bộ lịch tập
router.put("/", verifyToken, upsertWorkoutPlan);

// [DELETE] Xóa hoàn toàn lịch tập
router.delete("/", verifyToken, deleteWorkoutPlan);

// [PATCH] Sửa thông tin chung của 1 ngày (Ví dụ: Đổi "title" thành Ngày tập chân)
router.patch("/day", verifyToken, updateDayInPlan);

// ==========================================
// ROUTES TƯƠNG TÁC SÂU VÀO TỪNG BÀI TẬP
// ==========================================

// [POST] Thêm 1 bài tập mới vào 1 ngày
router.post("/exercise", verifyToken, addExerciseToDay);

// [PATCH] Cập nhật Reps, Sets, Notes của 1 bài tập
router.patch("/exercise", verifyToken, updateExerciseInDay);

// [DELETE] Xóa 1 bài tập khỏi 1 ngày
router.delete("/exercise", verifyToken, removeExerciseFromDay);

module.exports = router;