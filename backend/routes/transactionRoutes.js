const express = require('express');
const router = express.Router();

// Import các hàm từ Controller của bạn (đổi đường dẫn cho khớp với dự án của bạn)
const { 
  paymentWebhook, 
  adMobWebhook, 
  virtualAdView, 
  getMyTransactions ,
  createPaymentUrl,
  virtualPayment
} = require('../controllers/transactionController'); 

// Import middleware xác thực (kiểm tra Token JWT)
const { verifyToken } = require("../middleware/authMiddleware"); // Middleware bạn đang dùng để lấy req.user

// ==========================================
// CÁC ROUTE PUBLIC (Không cần Token)
// Các cổng thanh toán (MoMo, VNPay) hoặc Google Admob sẽ gọi thẳng vào đây
// ==========================================

// [POST] Webhook nhận thông báo thanh toán thành công
router.post('/webhook/payment', paymentWebhook);

// [GET] Webhook nhận thông báo xem xong quảng cáo Admob
router.get('/webhook/admob', adMobWebhook);


// ==========================================
// CÁC ROUTE PROTECTED (Cần đăng nhập - Có Token)
// Chỉ User đang đăng nhập trên App mới được gọi
// ==========================================

// [POST] Xem quảng cáo ảo để nhận vé AI
router.post('/virtual-ad', verifyToken, virtualAdView);

// [GET] Xem lịch sử nạp VIP và nhận vé
router.get('/my-history', verifyToken, getMyTransactions);
// Thay verifyToken bằng middleware xác thực của bạn
router.post('/payment/create-url', verifyToken, createPaymentUrl);
router.post('/virtual-payment', verifyToken, virtualPayment);
module.exports = router;