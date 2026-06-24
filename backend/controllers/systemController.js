const SystemSetting = require('../models/SystemSetting');
const jwt = require('jsonwebtoken');

/**
 * Middleware kiểm tra bảo trì từ Database
 */
exports.checkMaintenance = async (req, res, next) => {
  // 1. Luôn cho phép các API Admin và API check trạng thái đi qua
  if (req.originalUrl.startsWith('/api/admin') || req.originalUrl === '/api/system/maintenance') {
    return next();
  }

  try {
    // 2. Lấy cấu hình từ Database
    const config = await SystemSetting.findOne({ key: "system_notification" });

    // 3. Nếu ĐANG BẬT chế độ BẢO TRÌ ➔ Chặn người dùng thường
    if (config && config.isActive && config.type === "MAINTENANCE") {
      let isAdmin = false;

      // Kiểm tra Token xem có phải Admin không
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          if (decoded.role === 'admin' || decoded.isAdmin === true) {
            isAdmin = true;
          }
        } catch (error) {
          // Token lỗi hoặc hết hạn ➔ Coi như user thường
        }
      }

      // Nếu là Admin ➔ Cho phép đi "xuyên qua" để test web công cộng
      if (isAdmin) {
        return next();
      }

      // Không phải Admin ➔ Chặn đứng quăng lỗi 503
      return res.status(503).json({ 
        success: false, 
        isMaintenance: true,
        type: "MAINTENANCE",
        message: config.message || "Hệ thống đang bảo trì để nâng cấp!" 
      });
    }

    // 4. Nếu là thông báo NORMAL hoặc không bật (isActive = false) ➔ Cho qua bình thường
    next();
  } catch (error) {
    console.error("Lỗi kiểm tra bảo trì:", error);
    next(); // Nếu DB lỗi, cho qua để tránh sập toàn bộ hệ thống
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