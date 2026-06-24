const jwt = require("jsonwebtoken");
const User = require("../models/User");

// ==========================================
// 1. KIỂM TRA ĐĂNG NHẬP (TOKEN) & TRẠNG THÁI KHÓA
// ==========================================
exports.verifyToken = async (req, res, next) => {
  const authHeader = req.header("Authorization");

  if (!authHeader) {
    return res.status(401).json({ success: false, message: "Từ chối truy cập. Không tìm thấy Token!" });
  }

  try {
    const token = authHeader.startsWith("Bearer ") 
      ? authHeader.split(" ")[1] 
      : authHeader;

    // Giải mã token
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    
    // TRUY VẤN DB 1 LẦN DUY NHẤT Ở ĐÂY
    const user = await User.findById(verified.id || verified._id);
    if (!user) {
      return res.status(401).json({ success: false, message: "Tài khoản không tồn tại trong hệ thống!" });
    }

    // 🛑 BẢO MẬT: CHẶN ĐỨNG NẾU TÀI KHOẢN ĐANG BỊ KHÓA
    if (user.isLocked) {
      return res.status(403).json({ 
        success: false,
        message: "Tài khoản của bạn đã bị khóa do vi phạm. Vui lòng liên hệ Admin!" 
      });
    }

    // 🔥 TỐI ƯU CỰC MẠNH: Gán thẳng object user từ DB vào req.user 
    // Để các middleware phía sau KHÔNG CẦN gọi Database lại nữa!
    req.user = user; 
    next(); 
  } catch (err) {
    res.status(401).json({ success: false, message: "Token không hợp lệ hoặc đã hết hạn!" }); 
  }
};

// ==========================================
// 2. KIỂM TRA QUYỀN DÙNG AI (PREMIUM HOẶC VÉ)
// ==========================================
exports.verifyPremiumOrTicket = async (req, res, next) => {
  try {
    // ⚡ Lấy user trực tiếp từ req.user (đã được verifyToken xử lý)
    const user = req.user; 
    if (!user) return res.status(404).json({ success: false, message: "Không tìm thấy thông tin người dùng!" });

    const now = new Date();
    const isPremium = user.isPremium && (!user.premiumUntil || user.premiumUntil > now);

    // 1. NẾU LÀ TÀI KHOẢN VIP -> CHO QUA LUÔN
    if (isPremium) {
      return next();
    }

    // 2. NẾU LÀ FREE NHƯNG CÓ VÉ TỪ QUẢNG CÁO -> TRỪ 1 VÉ RỒI CHO QUA
    if (user.aiTickets > 0) {
      user.aiTickets -= 1; 
      await user.save(); // Lúc này mới cần tương tác với DB để trừ vé
      return next();
    }

    // 3. NẾU KHÔNG CÓ VIP CŨNG KHÔNG CÓ VÉ -> BÁO LỖI KÈM MÃ
    return res.status(403).json({ 
      success: false,
      message: "Bạn cần nâng cấp Premium hoặc xem quảng cáo để sử dụng AI!",
      requiresAd: true 
    });

  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi xác thực quyền lợi", error: error.message });
  }
};

// ==========================================
// 3. KIỂM TRA QUYỀN TRUY CẬP (PHÂN QUYỀN ADMIN/USER)
// ==========================================
exports.authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => { // ⚡ Bỏ async đi vì không cần gọi DB nữa
    try {
      // ⚡ Sử dụng ngay user đã lưu trong req
      const user = req.user;

      if (!user) {
        return res.status(404).json({ success: false, message: "Không tìm thấy thông tin người dùng!" });
      }

      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({ 
          success: false,
          message: `Từ chối truy cập! Quyền của bạn (${user.role}) không được phép thực hiện hành động này.` 
        });
      }

      next();
    } catch (error) {
      res.status(500).json({ success: false, message: "Lỗi kiểm tra quyền truy cập", error: error.message });
    }
  };
};