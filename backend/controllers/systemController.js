const SystemSetting = require('../models/SystemSetting');
const jwt = require('jsonwebtoken');

/**
 * Middleware kiểm tra bảo trì từ Database
 */
exports.checkMaintenance = async (req, res, next) => {
  try {
    // BƯỚC 1: Ngoại lệ bắt buộc - Cho qua API kiểm tra trạng thái bảo trì
    // Nếu không cho qua, chính trang web sẽ không biết hệ thống có bảo trì hay không để hiện màn hình bảo trì
    if (req.originalUrl === '/api/system/maintenance') {
      return next();
    }

    // BƯỚC 2: KIỂM TRA ĐẶC QUYỀN ADMIN (LỤC TÚI TÌM THẺ VIP)
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      
      try {
        // Giải mã token bằng mã bí mật JWT_SECRET trong file .env của bạn
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Cực kỳ quan trọng: Nếu đúng là ADMIN -> Cho qua luôn! Bất chấp bảo trì bật hay tắt
        if (decoded && decoded.role === 'admin') {
          req.user = decoded; // Lưu thông tin admin vào req để dùng ở các hàm sau nếu cần
          return next();
        }
      } catch (jwtError) {
        // Token bị sai, giả mạo hoặc hết hạn -> Xem như user vãng lai, cho trôi xuống check bảo trì tiếp
        console.log('Token không hợp lệ trong lúc bảo trì:', jwtError.message);
      }
    }

    // BƯỚC 3: KIỂM TRA TRẠNG THÁI BẢO TRÌ TRONG DATABASE (Dành cho User thường và Khách)
    const config = await SystemConfig.findOne(); // Lấy cấu hình hệ thống
    
    // Nếu trạng thái bảo trì đang bật (isActive = true) và loại cấu hình là MAINTENANCE
    if (config && config.isActive && config.type === 'MAINTENANCE') {
      return res.status(503).json({
        success: false,
        isMaintenance: true,
        message: config.message || 'Hệ thống đang bảo trì định kỳ. Vui lòng quay lại sau!'
      });
    }

    // BƯỚC 4: Bình thường, không bảo trì -> Cho đi tiếp thoải mái
    next();
  } catch (error) {
    console.error('Lỗi nghiêm trọng tại Middleware Bảo trì:', error);
    // Nếu code backend lỗi, cho next() để tránh sập toàn bộ luồng app của user
    next(); 
  }
};

/**
 * API: Admin cập nhật thông báo / bảo trì
 * POST /api/system/maintenance
 */
exports.toggleMaintenance = async (req, res) => {
  const { type, message, isActive } = req.body; 
  // Yêu cầu truyền lên: { "type": "NORMAL"/"MAINTENANCE", "message": "Nội dung...", "isActive": true/false }

  if (!["NORMAL", "MAINTENANCE"].includes(type)) {
    return res.status(400).json({ success: false, message: "Type phải là NORMAL hoặc MAINTENANCE!" });
  }

  try {
    let config = await SystemSetting.findOne({ key: "system_notification" });
    if (!config) {
      config = new SystemSetting({ key: "system_notification" });
    }

    config.type = type;
    config.message = message;
    config.isActive = isActive;
    await config.save();

    return res.status(200).json({ 
      success: true, 
      data: config,
      message: "Cập nhật cấu hình hệ thống thành công!" 
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Lỗi máy chủ khi lưu cấu hình!" });
  }
};

/**
 * API: Lấy trạng thái hiện tại (Công khai cho cả khách và user xem)
 * GET /api/system/maintenance
 */
exports.getMaintenanceStatus = async (req, res) => { // <--- ĐÃ SỬA LỖI TYPO TẠI ĐÂY
  try {
    let config = await SystemSetting.findOne({ key: "system_notification" });
    if (!config) {
      config = { type: "NORMAL", message: "", isActive: false };
    }
    return res.status(200).json({ success: true, data: config });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Lỗi kết nối database!" });
  }
};