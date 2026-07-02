const rateLimit = require("express-rate-limit");

// =============================================
// RATE LIMITER - Chống spam & bảo vệ API
// =============================================

/**
 * Giới hạn đăng nhập/đăng ký: 10 lần / 15 phút / IP
 * Chống brute-force mật khẩu
 */
exports.authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Quá nhiều lần thử đăng nhập. Vui lòng chờ 15 phút và thử lại."
  }
});

/**
 * Giới hạn gọi AI: 20 lần / 10 phút / IP
 * Chống spam tốn API key Gemini
 */
exports.aiLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 phút
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Bạn đang gọi AI quá nhanh. Vui lòng chờ một chút và thử lại."
  }
});

/**
 * Giới hạn chung: 200 request / 1 phút / IP
 * Chống DDoS cơ bản
 */
exports.generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 phút
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Quá nhiều yêu cầu từ IP này. Vui lòng thử lại sau."
  }
});

/**
 * Giới hạn webhook thanh toán: 50 lần / 10 phút / IP
 * Webhook từ MoMo/Admob không cần quá nhiều
 */
exports.webhookLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Quá nhiều yêu cầu webhook."
  }
});
