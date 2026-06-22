const MealPlan = require("../models/MealPlan");
const Food = require("../models/Food");
const User = require("../models/User"); // <-- Đã thêm để lấy thông tin targetMacros.calories của User

// Tiện ích làm tròn (Calo và Gram thường lấy số nguyên, Macros có thể lấy 1 số thập phân hoặc nguyên tùy bạn)
const formatCal = (val) => Math.round(Number(val)) || 0;
const formatMacro = (val) => Math.round(Number(val) * 10) / 10 || 0;

// Hàm phụ trợ: Tính toán lại toàn bộ Calo/Macro cho 1 Bữa ăn và Toàn bộ ngày
const recalculateTotals = (plan) => {
  let dayTotal = { calories: 0, protein: 0, carbs: 0, fat: 0 };

  plan.meals.forEach((meal) => {
    let mealTotal = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    
    meal.items.forEach((item) => {
      mealTotal.calories += item.calories || 0;
      mealTotal.protein += item.protein || 0;
      mealTotal.carbs += item.carbs || 0;
      mealTotal.fat += item.fat || 0;
    });

    // Gán lại tổng bữa ăn (làm tròn an toàn)
    meal.mealTotal = {
      calories: formatCal(mealTotal.calories),
      protein: formatMacro(mealTotal.protein),
      carbs: formatMacro(mealTotal.carbs),
      fat: formatMacro(mealTotal.fat),
    };

    // Cộng dồn vào tổng ngày
    dayTotal.calories += meal.mealTotal.calories;
    dayTotal.protein += meal.mealTotal.protein;
    dayTotal.carbs += meal.mealTotal.carbs;
    dayTotal.fat += meal.mealTotal.fat;
  });

  // Gán lại tổng ngày
  plan.dailyTotal = {
    calories: formatCal(dayTotal.calories),
    protein: formatMacro(dayTotal.protein),
    carbs: formatMacro(dayTotal.carbs),
    fat: formatMacro(dayTotal.fat),
  };
};

// ==========================================
// QUẢN LÝ BỮA ĂN (MEALS)
// ==========================================

// [GET] /api/meals/my-plan - Lấy lộ trình ăn uống cố định của user
exports.getUserMealPlan = async (req, res) => {
  try {
    const userId = req.user.id; 

    const mealPlan = await MealPlan.findOne({ userId }).populate("meals.items.foodId");

    if (!mealPlan) {
      return res.status(200).json({ 
        message: "Bạn chưa có lịch ăn nào. Hãy nhờ AI tạo một lộ trình mới nhé!",
        hasPlan: false 
      });
    }

    res.status(200).json({
      message: "Lấy lịch ăn thành công!",
      hasPlan: true,
      masterMealPlan: mealPlan
    });

  } catch (error) {
    console.error("Lỗi lấy Meal Plan:", error);
    res.status(500).json({ message: "Lỗi Server", error: error.message });
  }
};

// 1. Thêm một bữa ăn mới (Ví dụ: Thêm "Bữa xế chiều")
exports.addMeal = async (req, res) => {
  try {
    const { mealType, scheduledTime } = req.body;
    const plan = await MealPlan.findOne({ userId: req.user.id });
    if (!plan) return res.status(404).json({ message: "Không tìm thấy lịch ăn!" });

    plan.meals.push({ 
      mealType, 
      scheduledTime: scheduledTime || "12:00", 
      items: [], 
      mealTotal: { calories: 0, protein: 0, carbs: 0, fat: 0 } 
    });
    
    await plan.save();
    res.status(200).json({ message: "Đã thêm bữa ăn mới", masterMealPlan: plan });
  } catch (error) {
    res.status(500).json({ message: "Lỗi thêm bữa ăn", error: error.message });
  }
};

// 2. Xóa một bữa ăn
exports.deleteMeal = async (req, res) => {
  try {
    const { mealId } = req.params;
    const plan = await MealPlan.findOne({ userId: req.user.id });
    
    plan.meals = plan.meals.filter(m => m._id.toString() !== mealId);
    recalculateTotals(plan);
    
    await plan.save();
    res.status(200).json({ message: "Đã xóa bữa ăn", masterMealPlan: plan });
  } catch (error) {
    res.status(500).json({ message: "Lỗi xóa bữa ăn", error: error.message });
  }
};

// ==========================================
// QUẢN LÝ MÓN ĂN (ITEMS) TRONG BỮA
// ==========================================

// 3. Thêm món ăn vào bữa
exports.addFoodToMeal = async (req, res) => {
  try {
    const { mealId, foodId, quantityInGrams } = req.body;
    const plan = await MealPlan.findOne({ userId: req.user.id });
    const food = await Food.findById(foodId);

    if (!plan || !food) return res.status(404).json({ message: "Dữ liệu không tồn tại!" });

    const meal = plan.meals.id(mealId);
    if (!meal) return res.status(404).json({ message: "Không tìm thấy bữa ăn này!" });

    const ratio = quantityInGrams / 100;
    
    // Ép kiểu làm tròn ngay từ bước thêm món
    meal.items.push({
      foodId: food._id,
      foodName: food.name,
      quantityInGrams: formatCal(quantityInGrams),
      calories: formatCal(food.caloriesPer100g * ratio),
      protein: formatMacro(food.proteinPer100g * ratio),
      carbs: formatMacro(food.carbsPer100g * ratio),
      fat: formatMacro(food.fatPer100g * ratio)
    });

    recalculateTotals(plan);
    await plan.save();
    res.status(200).json({ message: "Đã thêm món ăn", masterMealPlan: plan });
  } catch (error) {
    res.status(500).json({ message: "Lỗi thêm món", error: error.message });
  }
};

// 4. Sửa số lượng (Grams) của món ăn
exports.updateFoodQuantity = async (req, res) => {
  try {
    const { mealId, itemId, newQuantity } = req.body;
    const plan = await MealPlan.findOne({ userId: req.user.id });
    
    const meal = plan.meals.id(mealId);
    if (!meal) return res.status(404).json({ message: "Không tìm thấy bữa ăn!" });

    const item = meal.items.id(itemId);
    if (!item) return res.status(404).json({ message: "Không tìm thấy món ăn trong bữa!" });

    const food = await Food.findById(item.foodId);
    if (!food) return res.status(404).json({ message: "Dữ liệu món ăn gốc đã bị xóa!" });

    const ratio = newQuantity / 100;
    
    // Gán lại giá trị đã làm tròn
    item.quantityInGrams = formatCal(newQuantity);
    item.calories = formatCal(food.caloriesPer100g * ratio);
    item.protein = formatMacro(food.proteinPer100g * ratio);
    item.carbs = formatMacro(food.carbsPer100g * ratio);
    item.fat = formatMacro(food.fatPer100g * ratio);

    recalculateTotals(plan);
    await plan.save();
    res.status(200).json({ message: "Đã cập nhật định lượng", masterMealPlan: plan });
  } catch (error) {
    res.status(500).json({ message: "Lỗi cập nhật món", error: error.message });
  }
};

// 5. Xóa món ăn khỏi bữa
exports.removeFoodFromMeal = async (req, res) => {
  try {
    const { mealId, itemId } = req.params;
    const plan = await MealPlan.findOne({ userId: req.user.id });

    const meal = plan.meals.id(mealId);
    if (!meal) return res.status(404).json({ message: "Không tìm thấy bữa ăn!" });

    meal.items.pull(itemId);

    recalculateTotals(plan);
    await plan.save();
    res.status(200).json({ message: "Đã xóa món ăn khỏi bữa", masterMealPlan: plan });
  } catch (error) {
    res.status(500).json({ message: "Lỗi xóa món", error: error.message });
  }
};

// Khởi tạo một lịch ăn trống thủ công cho User theo số bữa chọn
exports.initManualMealPlan = async (req, res) => {
  try {
    const userId = req.user.id;
    // Nhận số bữa ăn từ Frontend (Mặc định là 3 nếu không có)
    const mealsPerDay = Number(req.body.mealsPerDay) || 3; 

    let plan = await MealPlan.findOne({ userId });

    // Nếu chưa có lịch thì tiến hành tạo
    if (!plan) {
      let initialMeals = [];

      // Logic sinh số bữa ăn linh hoạt
      if (mealsPerDay === 2) {
        initialMeals = [
          { mealType: "Bữa 1", scheduledTime: "12:00", items: [], mealTotal: { calories: 0, protein: 0, carbs: 0, fat: 0 } },
          { mealType: "Bữa 2", scheduledTime: "19:00", items: [], mealTotal: { calories: 0, protein: 0, carbs: 0, fat: 0 } }
        ];
      } else if (mealsPerDay === 4) {
        initialMeals = [
          { mealType: "Bữa Sáng", scheduledTime: "07:00", items: [], mealTotal: { calories: 0, protein: 0, carbs: 0, fat: 0 } },
          { mealType: "Bữa Trưa", scheduledTime: "12:00", items: [], mealTotal: { calories: 0, protein: 0, carbs: 0, fat: 0 } },
          { mealType: "Bữa Phụ", scheduledTime: "15:30", items: [], mealTotal: { calories: 0, protein: 0, carbs: 0, fat: 0 } },
          { mealType: "Bữa Tối", scheduledTime: "19:30", items: [], mealTotal: { calories: 0, protein: 0, carbs: 0, fat: 0 } }
        ];
      } else if (mealsPerDay === 5) {
        initialMeals = [
          { mealType: "Bữa Sáng", scheduledTime: "07:00", items: [], mealTotal: { calories: 0, protein: 0, carbs: 0, fat: 0 } },
          { mealType: "Bữa Phụ Sáng", scheduledTime: "09:30", items: [], mealTotal: { calories: 0, protein: 0, carbs: 0, fat: 0 } },
          { mealType: "Bữa Trưa", scheduledTime: "12:30", items: [], mealTotal: { calories: 0, protein: 0, carbs: 0, fat: 0 } },
          { mealType: "Bữa Phụ Chiều", scheduledTime: "16:00", items: [], mealTotal: { calories: 0, protein: 0, carbs: 0, fat: 0 } },
          { mealType: "Bữa Tối", scheduledTime: "19:30", items: [], mealTotal: { calories: 0, protein: 0, carbs: 0, fat: 0 } }
        ];
      } else if (mealsPerDay === 6) {
        // Bổ sung thêm tùy chọn 6 bữa / ngày
        initialMeals = [
          { mealType: "Bữa Sáng", scheduledTime: "07:00", items: [], mealTotal: { calories: 0, protein: 0, carbs: 0, fat: 0 } },
          { mealType: "Bữa Phụ Sáng", scheduledTime: "09:30", items: [], mealTotal: { calories: 0, protein: 0, carbs: 0, fat: 0 } },
          { mealType: "Bữa Trưa", scheduledTime: "12:30", items: [], mealTotal: { calories: 0, protein: 0, carbs: 0, fat: 0 } },
          { mealType: "Bữa Phụ Chiều", scheduledTime: "15:30", items: [], mealTotal: { calories: 0, protein: 0, carbs: 0, fat: 0 } },
          { mealType: "Bữa Tối", scheduledTime: "19:00", items: [], mealTotal: { calories: 0, protein: 0, carbs: 0, fat: 0 } },
          { mealType: "Bữa Phụ Tối", scheduledTime: "21:30", items: [], mealTotal: { calories: 0, protein: 0, carbs: 0, fat: 0 } }
        ];
      } else {
        // Mặc định 3 bữa chuẩn
        initialMeals = [
          { mealType: "Bữa Sáng", scheduledTime: "07:00", items: [], mealTotal: { calories: 0, protein: 0, carbs: 0, fat: 0 } },
          { mealType: "Bữa Trưa", scheduledTime: "12:00", items: [], mealTotal: { calories: 0, protein: 0, carbs: 0, fat: 0 } },
          { mealType: "Bữa Tối", scheduledTime: "19:00", items: [], mealTotal: { calories: 0, protein: 0, carbs: 0, fat: 0 } }
        ];
      }

      // Lưu vào database
      plan = new MealPlan({
        userId,
        meals: initialMeals,
        dailyTotal: { calories: 0, protein: 0, carbs: 0, fat: 0 }
      });
      await plan.save();
    }

    res.status(200).json({ message: "Khởi tạo lịch thủ công thành công!", masterMealPlan: plan });
  } catch (error) {
    res.status(500).json({ message: "Lỗi tạo lịch thủ công", error: error.message });
  }
};

// Xóa toàn bộ lịch ăn của User
exports.deleteEntireMealPlan = async (req, res) => {
  try {
    const userId = req.user.id;
    const deletedPlan = await MealPlan.findOneAndDelete({ userId });
    
    if (!deletedPlan) {
      return res.status(404).json({ message: "Không tìm thấy lịch ăn để xóa!" });
    }
    
    res.status(200).json({ message: "Đã xóa toàn bộ lịch ăn thành công!" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi xóa lịch ăn", error: error.message });
  }
};

// ==========================================
// KIỂM TRA ĐỘ LỆCH CALO THỰC ĐƠN (ĐÃ FIX BUG)
// ==========================================
// [GET] /api/ai/check-meal-plan
exports.checkMealPlanDeviation = async (req, res) => {
  try {
    const userId = req.user.id;

    // Lấy thông tin mục tiêu calo của người dùng và lịch ăn hiện tại
    const user = await User.findById(userId);
    const mealPlan = await MealPlan.findOne({ userId });

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy thông tin người dùng!" });
    }
    
    // Nếu chưa tạo thực đơn thì chưa có gì để tính toán độ lệch
    if (!mealPlan) {
      return res.status(200).json({
        success: true,
        isDeviated: false,
        isDeviationHigh: false,
        message: "Người dùng chưa khởi tạo lịch ăn cố định."
      });
    }

    // 🔥 FIX BUG 2: Ép hệ thống tính toán lại tổng Calo thời gian thực từ các món ăn hiện tại.
    // Điều này giúp tránh trường hợp AI tạo thực đơn nhưng quên cập nhật trường dailyTotal trong DB.
    recalculateTotals(mealPlan);

    // Lấy calories mục tiêu (mặc định 2000 nếu chưa cấu hình) và calories thực tế sau khi đã tính lại
    const targetCalories = user.targetMacros?.calories || 2000;
    const currentCalories = mealPlan.dailyTotal?.calories || 0;

    // Định nghĩa ngưỡng lệch cho phép: Vượt quá hoặc thiếu hụt 10% mục tiêu calo ngày
    const thresholdPercentage = 0.10; 
    const diff = Math.abs(targetCalories - currentCalories);
    const maxDiffAllowed = targetCalories * thresholdPercentage;

    let isDeviated = false;
    let message = "Dinh dưỡng nằm trong ngưỡng an toàn cho phép.";

    // Kích hoạt trạng thái cảnh báo nếu vượt ngưỡng cho phép (10%)
    if (targetCalories > 0 && diff > maxDiffAllowed) {
      isDeviated = true;
      const statusText = currentCalories > targetCalories ? "vượt quá" : "chưa đủ";
      message = `Tổng Calo lịch ăn hiện tại (${currentCalories} kcal) đang ${statusText} và lệch ${Math.round(diff)} kcal so với mục tiêu (${targetCalories} kcal) của bạn.`;
    }

    // 🔥 FIX BUG 1: Trả về đồng thời cả 2 kiểu đặt tên biến (isDeviated và isDeviationHigh)
    // để đảm bảo dù Frontend đang viết theo chuẩn nào cũng sẽ nhận được dữ liệu chính xác!
    return res.status(200).json({
      success: true,
      
      // Cặp biến kiểu 1 (Khuyên dùng cho Frontend của bạn)
      isDeviated: isDeviated, 
      message: isDeviated ? message : "Dinh dưỡng đạt tiêu chuẩn!",

      // Cặp biến kiểu 2 (Giữ lại để không làm lỗi các logic cũ nếu có)
      isDeviationHigh: isDeviated, 
      warningMessage: isDeviated ? message : null,  

      analysis: {
        targetCalories,
        currentCalories,
        difference: Math.round(diff),
        deviationPercentage: ((diff / targetCalories) * 100).toFixed(1) + "%"
      }
    });

  } catch (error) {
    console.error("Lỗi kiểm tra độ lệch calo thực đơn:", error);
    res.status(500).json({ message: "Lỗi hệ thống khi kiểm tra thực đơn", error: error.message });
  }
};