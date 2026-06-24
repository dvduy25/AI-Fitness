// Biến lưu trạng thái bảo trì trong bộ nhớ RAM của Server
let isMaintenanceMode = false; 

/**
 * Middleware kiểm tra trạng thái bảo trì
 * Cần đặt TRƯỚC các route của người dùng công cộng
 */
exports.checkMaintenance = (req, res, next) => {
  // 1. Cho phép các API của Admin chạy bình thường để Admin có thể sửa lỗi/tắt bảo trì
  if (req.originalUrl.startsWith('/api/admin')) {
    return next();
  }

  // 2. Cho phép gọi chính API kiểm tra trạng thái bảo trì
  if (req.originalUrl === '/api/system/maintenance') {
    return next();
  }

  // 3. Nếu đang bật bảo trì, chặn đứng tất cả các request khác và trả về lỗi 503
  if (isMaintenanceMode) {
    return res.status(503).json({ 
      success: false, 
      isMaintenance: true,
      message: "Hệ thống đang được bảo trì để nâng cấp. Vui lòng quay lại sau!" 
    });
  }

  next();
};

/**
 * API: Bật / Tắt chế độ bảo trì (Chỉ dành cho Admin gọi)
 * POST /api/system/maintenance
 */
exports.toggleMaintenance = (req, res) => {
  const { status } = req.body; // Yêu cầu truyền lên: { "status": true/false }

  if (typeof status !== 'boolean') {
    return res.status(400).json({ success: false, message: "Trạng thái 'status' phải là true hoặc false!" });
  }

  isMaintenanceMode = status;
  return res.status(200).json({ 
    success: true, 
    isMaintenance: isMaintenanceMode,
    message: `Đã ${isMaintenanceMode ? 'BẬT' : 'TẮT'} chế độ bảo trì hệ thống thành công.` 
  });
};

/**
 * API: Lấy trạng thái bảo trì hiện tại (Dành cho React gọi công khai)
 * GET /api/system/maintenance
 */
exports.getMaintenanceStatus = (req, res) => {
  return res.status(200).json({ 
    success: true,
    isMaintenance: isMaintenanceMode 
  });
};