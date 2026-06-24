const jwt = require("jsonwebtoken");
const User = require("../models/User"); // Đưa lên đầu file để tối ưu hiệu năng

// ==========================================
// 1. KIỂM TRA ĐĂNG NHẬP (TOKEN) & TRẠNG THÁI KHÓA
// ==========================================
exports.verifyToken = async (req, res, next) => {
  const authHeader = req.header("Authorization");

  if (!authHeader) {
    return res.status(401).json({ message: "Từ chối truy cập. Không tìm thấy Token!" });
  }

  try {
    const token = authHeader.startsWith("Bearer ") 
      ? authHeader.split(" ")[1] 
      : authHeader;

    // Giải mã token
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    
    // TRUY VẤN DB: Kiểm tra trạng thái tồn tại và khóa của tài khoản
    const user = await User.findById(verified.id || verified._id);
    if (!user) {
      return res.status(401).json({ message: "Tài khoản không tồn tại trong hệ thống!" });
    }

    // 🛑 BẢO MẬT: CHẶN ĐỨNG NẾU TÀI KHOẢN ĐANG BỊ KHÓA
    if (user.isLocked) {
      return res.status(403).json({ 
        success: false,
        message: "Tài khoản của bạn đã bị khóa do vi phạm. Vui lòng liên hệ Admin!" 
      });
    }

    req.user = verified;
    next(); 
  } catch (err) {
    res.status(401).json({ message: "Token không hợp lệ hoặc đã hết hạn!" }); 
  }
};

// ==========================================
// 2. KIỂM TRA QUYỀN DÙNG AI (PREMIUM HOẶC VÉ)
// ==========================================
exports.verifyPremiumOrTicket = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id || req.user._id);
    if (!user) return res.status(404).json({ message: "Không tìm thấy người dùng!" });

    const now = new Date();
    const isPremium = user.isPremium && (!user.premiumUntil || user.premiumUntil > now);

    // 1. NẾU LÀ TÀI KHOẢN VIP -> CHO QUA LUÔN
    if (isPremium) {
      return next();
    }

    // 2. NẾU LÀ FREE NHƯNG CÓ VÉ TỪ QUẢNG CÁO -> TRỪ 1 VÉ RỒI CHO QUA
    if (user.aiTickets > 0) {
      user.aiTickets -= 1; // Xé 1 vé
      await user.save();
      return next();
    }

    // 3. NẾU KHÔNG CÓ VIP CŨNG KHÔNG CÓ VÉ -> BÁO LỖI KÈM MÃ ĐỂ FRONTEND BẬT QUẢNG CÁO
    return res.status(403).json({ 
      message: "Bạn cần nâng cấp Premium hoặc xem quảng cáo để sử dụng AI!",
      requiresAd: true // Dấu hiệu nhận biết cho React Frontend
    });

  } catch (error) {
    res.status(500).json({ message: "Lỗi xác thực quyền lợi", error: error.message });
  }
};

// ==========================================
// 3. KIỂM TRA QUYỀN TRUY CẬP (PHÂN QUYỀN ADMIN/USER)
// ==========================================
exports.authorizeRoles = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      const user = await User.findById(req.user.id || req.user._id);

      if (!user) {
        return res.status(404).json({ message: "Không tìm thấy người dùng!" });
      }

      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({ 
          message: `Từ chối truy cập! Quyền của bạn (${user.role}) không được phép thực hiện hành động này.` 
        });
      }

      next();
    } catch (error) {
      res.status(500).json({ message: "Lỗi kiểm tra quyền truy cập", error: error.message });
    }
  };
};