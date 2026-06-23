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

    // TỐI ƯU: Ép MongoDB lọc theo userId và mốc thời gian ngay tại tầng database
    // Đồng thời sắp xếp tăng dần theo ngày (Cũ -> Mới) để Frontend vẽ chart chính xác
    const userLogs = await DailyDietLog.find({
      userId,
      date: { $gte: startDate }
    }).sort({ date: 1 });

    // Định dạng cấu trúc dữ liệu gọn nhẹ để trả ra Frontend
    const formattedHistory = userLogs.map(log => ({
      date: log.date,
      calories: log.actualDailyTotal?.calories || 0,
      protein: log.actualDailyTotal?.protein || 0,
      carbs: log.actualDailyTotal?.carbs || 0,
      fat: log.actualDailyTotal?.fat || 0,
      isDayCompleted: log.isDayCompleted || false
    }));

    // Phản hồi dữ liệu (Giữ cả hai key 'data' và 'pastRecords' để tương thích tốt với code FE cũ)
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

    // TỐI ƯU: Tạo khoảng thời gian giới hạn trọn vẹn trong ngày cần tìm (00:00:00 -> 23:59:59)
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Tìm duy nhất 1 bản ghi nằm trong khoảng thời gian của ngày đó
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

    // Trích xuất đóng gói dữ liệu dinh dưỡng cốt lõi
    const foundRecord = {
      calories: log.actualDailyTotal?.calories || 0,
      protein: log.actualDailyTotal?.protein || 0,
      carbs: log.actualDailyTotal?.carbs || 0,
      fat: log.actualDailyTotal?.fat || 0,
    };

    return res.status(200).json({ data: foundRecord });

  } catch (error) {
    console.error("Lỗi getDietByDate:", error);
    return res.status(500).json({ message: "Lỗi hệ thống khi lấy dữ liệu ngày" });
  }
};