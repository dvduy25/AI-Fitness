const jwt = require('jsonwebtoken'); // Nhớ import thư viện JWT

// Biến lưu trạng thái bảo trì trong bộ nhớ RAM của Server
let isMaintenanceMode = false; 

/**
 * Middleware kiểm tra trạng thái bảo trì
 */
exports.checkMaintenance = (req, res, next) => {
  // 1. Cho phép các API của Admin chạy bình thường (Dashboard, Quản lý...)
  if (req.originalUrl.startsWith('/api/admin')) {
    return next();
  }

  // 2. Cho phép gọi chính API kiểm tra trạng thái bảo trì để Frontend có thể cập nhật UI
  if (req.originalUrl === '/api/system/maintenance') {
    return next();
  }

  // 3. XỬ LÝ KHI ĐANG BẬT BẢO TRÌ
  if (isMaintenanceMode) {
    let isAdmin = false;

    // Lấy token từ Header của request để kiểm tra danh tính
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        // Giải mã token (Lưu ý: dùng đúng process.env.JWT_SECRET của bạn)
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Cải tiến: Kiểm tra xem user này có quyền admin không
        // (Sửa lại biến role hoặc isAdmin cho khớp với lúc bạn tạo token)
        if (decoded.role === 'admin' || decoded.isAdmin === true) {
          isAdmin = true;
        }
      } catch (error) {
        // Nếu token hết hạn hoặc sai, bỏ qua (coi như người dùng bình thường)
      }
    }

    // Nếu là Admin -> Cho phép đi xuyên qua màng bảo vệ để test giao diện người dùng
    if (isAdmin) {
      return next();
    }

    // Nếu không phải Admin -> Chặn đứng và trả về 503
    return res.status(503).json({ 
      success: false, 
      isMaintenance: true,
      message: "Hệ thống đang được bảo trì để nâng cấp. Vui lòng quay lại sau!" 
    });
  }

  // 4. Nếu hệ thống bình thường (isMaintenanceMode = false), ai cũng được vào
  next();
};

/**
 * API: Bật / Tắt chế độ bảo trì (Chỉ dành cho Admin gọi)
 * POST /api/system/maintenance
 */
exports.toggleMaintenance = (req, res) => {
  const { status } = req.body; 

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