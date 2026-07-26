const DailyDietLog = require("../models/DailyDietLog");

// ==========================================
// 1. LẤY LỊCH SỬ DINH DƯỠNG (CALO & MACROS)
// ==========================================
exports.getDietHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { period } = req.query; // Nhận 'week', 'month', hoặc 'all' từ Frontend

    // Xác định mốc thời gian bắt đầu
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0); // Đưa về 00:00 đầu ngày hôm nay

    if (period === 'week') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === 'month') {
      startDate.setMonth(startDate.getMonth() - 1);
    } else if (period === 'all') {
      startDate.setFullYear(2000); // Lấy toàn bộ từ trước đến nay
    } else {
      startDate.setDate(startDate.getDate() - 7); // Mặc định hiển thị 7 ngày gần nhất
    }

    const userLogs = await DailyDietLog.find({
      userId,
      date: { $gte: startDate }
    }).sort({ date: 1 });

    const formattedHistory = userLogs.map(log => ({
      date: log.date,
      calories: log.actualDailyTotal?.calories || 0,
      protein: log.actualDailyTotal?.protein || 0,
      carbs: log.actualDailyTotal?.carbs || 0,
      fat: log.actualDailyTotal?.fat || 0,
      isDayCompleted: log.isDayCompleted || false
    }));

    return res.status(200).json({ 
      message: "Lấy lịch sử thành công",
      data: formattedHistory,        
      pastRecords: formattedHistory  
    });

  } catch (error) {
    console.error("Lỗi lấy lịch sử ăn uống:", error);
    return res.status(500).json({ message: "Lỗi hệ thống khi lấy lịch sử dinh dưỡng!" });
  }
};

// ==========================================
// 2. LẤY CHI TIẾT DINH DƯỠNG THEO 1 NGÀY CỤ THỂ
// ==========================================
exports.getDietByDate = async (req, res) => {
  try {
    const userId = req.user.id;
    const { date } = req.query; // Nhận chuỗi định dạng YYYY-MM-DD từ Frontend

    if (!date) {
      return res.status(400).json({ message: "Vui lòng cung cấp ngày (date)!" });
    }

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const log = await DailyDietLog.findOne({
      userId,
      date: { $gte: startOfDay, $lte: endOfDay }
    });
    
    if (!log) {
      return res.status(200).json({ 
        data: null, 
        message: "Không tìm thấy dữ liệu lịch ăn cho ngày này" 
      });
    }

    const foundRecord = {
      calories: log.actualDailyTotal?.calories || 0,
      protein: log.actualDailyTotal?.protein || 0,
      carbs: log.actualDailyTotal?.carbs || 0,
      fat: log.actualDailyTotal?.fat || 0,
      isDayCompleted: log.isDayCompleted || false
    };

    return res.status(200).json({ data: foundRecord });

  } catch (error) {
    console.error("Lỗi getDietByDate:", error);
    return res.status(500).json({ message: "Lỗi hệ thống khi lấy dữ liệu ngày" });
  }
};

// ==========================================
// 3. CẬP NHẬT BỮA ĂN HÔM NAY (THÊM HOẶC GHI ĐÈ)
// ==========================================
exports.logMeal = async (req, res) => {
  try {
    const userId = req.user.id;
    const { mealType, mode, items, mealTotal } = req.body; 

    if (!mealType || !items || items.length === 0) {
      return res.status(400).json({ message: "Thiếu thông tin bữa ăn hoặc danh sách món!" });
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    let log = await DailyDietLog.findOne({
      userId,
      date: { $gte: startOfDay, $lte: endOfDay }
    });

    // ⛔ CHẶN TẬN GỐC: Nếu đã chốt sổ ngày hôm nay thì KHÔNG ĐƯỢC sửa đổi
    if (log && log.isDayCompleted) {
      return res.status(400).json({ 
        message: "Hôm nay bạn đã chốt sổ rồi! Không thể thêm, sửa hoặc xóa bữa ăn nữa." 
      });
    }

    if (!log) {
      log = new DailyDietLog({
        userId,
        date: new Date(),
        consumedMeals: [],
        actualDailyTotal: { calories: 0, protein: 0, carbs: 0, fat: 0 }
      });
    }

    const newMealRecord = {
      mealType,
      loggedAt: new Date(),
      isExactlyAsPlanned: false,
      items,
      mealTotal
    };

    if (mode === 'replace') {
      const filteredMeals = log.consumedMeals.filter(meal => meal.mealType !== mealType);
      log.consumedMeals = [];
      log.consumedMeals.push(...filteredMeals);
    }
    
    log.consumedMeals.push(newMealRecord);
    log.markModified('consumedMeals');

    // Tính lại tổng Calo & Macros trong ngày
    log.actualDailyTotal = log.consumedMeals.reduce((acc, meal) => {
      return {
        calories: acc.calories + (meal.mealTotal?.calories || 0),
        protein: acc.protein + (meal.mealTotal?.protein || 0),
        carbs: acc.carbs + (meal.mealTotal?.carbs || 0),
        fat: acc.fat + (meal.mealTotal?.fat || 0)
      };
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

    log.actualDailyTotal.calories = Math.round(log.actualDailyTotal.calories);
    log.actualDailyTotal.protein = Number(log.actualDailyTotal.protein.toFixed(1));
    log.actualDailyTotal.carbs = Number(log.actualDailyTotal.carbs.toFixed(1));
    log.actualDailyTotal.fat = Number(log.actualDailyTotal.fat.toFixed(1));

    await log.save();

    return res.status(200).json({ 
      message: mode === 'replace' ? "Thay thế bữa ăn thành công!" : "Thêm bữa ăn thành công!", 
      data: log 
    });

  } catch (error) {
    console.error("Lỗi khi lưu bữa ăn:", error);
    return res.status(500).json({ message: "Lỗi hệ thống khi lưu bữa ăn!" });
  }
};