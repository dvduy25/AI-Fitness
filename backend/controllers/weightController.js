const WeightLog = require("../models/WeightLog");
const User = require("../models/User");

// ==========================================
// HÀM TÍNH TOÁN LẠI CALO & MACROS (Giống bên userController)
// ==========================================
const calculateMacros = (age, gender, height, weight, goal, fitnessLevel) => {
  if (!age || !height || !weight) return null;

  // 1. Tính BMR (Tỷ lệ trao đổi chất cơ bản) theo công thức Mifflin-St Jeor
  let bmr = (10 * weight) + (6.25 * height) - (5 * age);
  bmr = gender === "male" ? bmr + 5 : bmr - 161;

  // 2. Tính TDEE (Tổng năng lượng tiêu hao) dựa trên mức độ vận động
  let tdeeMultiplier = 1.2; // Mặc định
  if (fitnessLevel === "beginner") tdeeMultiplier = 1.375;
  if (fitnessLevel === "intermediate") tdeeMultiplier = 1.55;
  if (fitnessLevel === "advanced") tdeeMultiplier = 1.725;
  
  let tdee = bmr * tdeeMultiplier;

  // 3. Tính Calo mục tiêu (Dựa vào Goal)
  let targetCalories = tdee;
  if (goal === "lose_weight") targetCalories -= 500;
  if (goal === "gain_muscle") targetCalories += 300;

  // 4. Phân bổ Macros (Protein, Carbs, Fat)
  let protein = 0, fat = 0, carbs = 0;
  if (goal === "lose_weight") {
    protein = (targetCalories * 0.4) / 4;
    fat = (targetCalories * 0.3) / 9;
    carbs = (targetCalories * 0.3) / 4;
  } else if (goal === "gain_muscle") {
    protein = (targetCalories * 0.3) / 4;
    fat = (targetCalories * 0.25) / 9;
    carbs = (targetCalories * 0.45) / 4;
  } else {
    protein = (targetCalories * 0.3) / 4;
    fat = (targetCalories * 0.3) / 9;
    carbs = (targetCalories * 0.4) / 4;
  }

  return {
    calories: Math.round(targetCalories),
    protein: Math.round(protein),
    carbs: Math.round(carbs),
    fat: Math.round(fat)
  };
};

// ==========================================
// 1. GHI NHẬN CÂN NẶNG & CẬP NHẬT HỒ SƠ
// ==========================================
exports.logWeight = async (req, res) => {
  try {
    const userId = req.user.id;
    const { weight, date } = req.body;

    if (!weight) {
      return res.status(400).json({ message: "Vui lòng nhập cân nặng!" });
    }

    // Chuẩn hóa ngày về 00:00:00 để mỗi ngày chỉ có tối đa 1 bản ghi
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    // 1. Cập nhật hoặc tạo mới lịch sử cân nặng trong WeightLog
    let weightLog = await WeightLog.findOne({ userId, date: targetDate });
    if (weightLog) {
      weightLog.weight = Number(weight);
      await weightLog.save();
    } else {
      weightLog = new WeightLog({
        userId,
        weight: Number(weight),
        date: targetDate
      });
      await weightLog.save();
    }

    // 2. Tìm người dùng để lấy các thông số hiện tại (tuổi, chiều cao...)
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng!" });
    }

    // 3. Tự động tính toán lại Macros mới nhất dựa trên cân nặng mới
    const newWeight = Number(weight);
    const newMacros = calculateMacros(
      user.age, 
      user.gender, 
      user.height, 
      newWeight, 
      user.goal, 
      user.fitnessLevel
    );

    // 4. Cập nhật thẳng vào DB để tránh bị ghi đè (Race Condition)
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          weight: newWeight,
          targetMacros: newMacros || user.targetMacros
        }
      },
      { new: true } // Trả về tài liệu đã được cập nhật
    );

    res.status(200).json({ 
      message: "Cập nhật cân nặng thành công! AI đã tính lại lộ trình.",
      currentWeight: updatedUser.weight,
      newMacros: updatedUser.targetMacros 
    });

  } catch (error) {
    console.error("Lỗi cập nhật cân nặng:", error);
    res.status(500).json({ message: "Lỗi hệ thống khi lưu cân nặng!" });
  }
};

// ==========================================
// 2. LẤY LỊCH SỬ CÂN NẶNG (ĐỂ VẼ BIỂU ĐỒ)
// ==========================================
// ==========================================
// 2. LẤY LỊCH SỬ CÂN NẶNG (ĐỂ VẼ BIỂU ĐỒ)
// ==========================================
exports.getWeightHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { period } = req.query; // 'week', 'month', 'year', 'all'

    let dateFilter = null;
    const today = new Date();

    if (period === 'week') {
      const lastWeek = new Date(today);
      lastWeek.setDate(today.getDate() - 7);
      dateFilter = { $gte: lastWeek };
    } else if (period === 'month') {
      const lastMonth = new Date(today);
      lastMonth.setMonth(today.getMonth() - 1);
      dateFilter = { $gte: lastMonth };
    } else if (period === 'year') { // BỔ SUNG: Logic cho Năm
      const lastYear = new Date(today);
      lastYear.setFullYear(today.getFullYear() - 1);
      dateFilter = { $gte: lastYear };
    }

    // Lọc theo User và khoảng thời gian (nếu có)
    const query = { userId };
    // Nếu có truyền period và không phải là 'all', thì áp dụng bộ lọc ngày
    if (period && period !== 'all' && dateFilter) {
      query.date = dateFilter;
    }

    // Tìm kiếm và SẮP XẾP TĂNG DẦN theo ngày để biểu đồ vẽ từ trái sang phải
    const history = await WeightLog.find(query).sort({ date: 1 }).select('weight date -_id');

    res.status(200).json({ data: history });
    
  } catch (error) {
    console.error("Lỗi lấy lịch sử cân nặng:", error);
    res.status(500).json({ message: "Lỗi hệ thống khi lấy lịch sử cân nặng!" });
  }
};