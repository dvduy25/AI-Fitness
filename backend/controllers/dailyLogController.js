const DailyDietLog = require("../models/DailyDietLog"); 

// ==========================================
// LẤY LỊCH SỬ DINH DƯỠNG (CALO & MACROS)
// ==========================================
exports.getDietHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { period } = req.query; // Nhận 'week', 'month', hoặc 'all' từ Frontend

    // 1. Xác định mốc thời gian bắt đầu
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0); // Bắt đầu từ 0h00 sáng

    if (period === 'week') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === 'month') {
      startDate.setMonth(startDate.getMonth() - 1);
    } else if (period === 'all') {
      startDate.setFullYear(2000); // Nếu 'all', lấy từ rất lâu
    } else {
      startDate.setDate(startDate.getDate() - 7); // Mặc định là 7 ngày
    }

    // 2. Tìm TẤT CẢ các bản ghi của User này
    const userLogs = await DailyDietLog.find({ userId });

    let combinedRecords = [];

    // 3. Quét tất cả dữ liệu (Gom từ actualDailyTotal hiện tại LẪN mảng pastRecords)
    userLogs.forEach(log => {
      // Bốc dữ liệu của ngày chính (nếu nằm trong khoảng thời gian đã chọn)
      if (new Date(log.date) >= startDate) {
        combinedRecords.push({
          date: log.date,
          calories: log.actualDailyTotal?.calories || 0,
          protein: log.actualDailyTotal?.protein || 0,
          carbs: log.actualDailyTotal?.carbs || 0,
          fat: log.actualDailyTotal?.fat || 0,
          isDayCompleted: log.isDayCompleted
        });
      }

      // Bốc dữ liệu từ mảng pastRecords (nếu có)
      if (log.pastRecords && log.pastRecords.length > 0) {
        log.pastRecords.forEach(record => {
          if (new Date(record.date) >= startDate) {
            combinedRecords.push({
              date: record.date,
              calories: record.actualDailyTotal?.calories || 0,
              protein: record.actualDailyTotal?.protein || 0,
              carbs: record.actualDailyTotal?.carbs || 0,
              fat: record.actualDailyTotal?.fat || 0,
              isDayCompleted: record.isDayCompleted
            });
          }
        });
      }
    });

    // 4. Lọc trùng lặp (Phòng trường hợp 1 ngày bị lưu 2 lần ở 2 chỗ khác nhau)
    const uniqueRecordsMap = new Map();
    combinedRecords.forEach(record => {
      // Cắt lấy đoạn YYYY-MM-DD để làm key so sánh
      const dateStr = new Date(record.date).toISOString().split('T')[0]; 
      
      // Nếu ngày này chưa có, hoặc bản ghi này đã hoàn thành (isDayCompleted) thì ưu tiên ghi đè
      if (!uniqueRecordsMap.has(dateStr) || record.isDayCompleted) {
        uniqueRecordsMap.set(dateStr, record);
      }
    });

    // 5. Chuyển Map thành Array và Sắp xếp theo ngày tăng dần (Cũ -> Mới) để vẽ biểu đồ cho đẹp
    const formattedHistory = Array.from(uniqueRecordsMap.values()).sort((a, b) => new Date(a.date) - new Date(b.date));

    // 6. Trả về Frontend (Gửi cả biến data và pastRecords để Frontend trước đó đọc được)
    res.status(200).json({ 
      message: "Lấy lịch sử thành công",
      data: formattedHistory,        
      pastRecords: formattedHistory  
    });

  } catch (error) {
    console.error("Lỗi lấy lịch sử ăn uống:", error);
    res.status(500).json({ message: "Lỗi hệ thống khi lấy lịch sử dinh dưỡng!" });
  }
};