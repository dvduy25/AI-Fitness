const express = require("express");
const router = express.Router();
const {
  paymentWebhook,
  adMobWebhook,
  virtualAdView,
  getMyTransactions,
  createPaymentUrl,
  virtualPayment
} = require("../controllers/transactionController");
const { verifyToken, authorizeRoles } = require("../middleware/authMiddleware");
const { webhookLimiter } = require("../middleware/rateLimiter");

// ==========================================
// WEBHOOK CÔNG KHAI (MoMo / AdMob gọi vào)
// Có rate limit riêng để chống spam webhook
// ==========================================
router.post("/webhook/payment", webhookLimiter, paymentWebhook);
router.get("/webhook/admob", webhookLimiter, adMobWebhook);

// ==========================================
// ROUTES PROTECTED (Cần đăng nhập)
// ==========================================
router.post("/virtual-ad", verifyToken, virtualAdView);
router.get("/my-history", verifyToken, getMyTransactions);
router.post("/payment/create-url", verifyToken, createPaymentUrl);

// ==========================================
// ⚠️  THANH TOÁN ẢO - CHỈ DÀNH CHO DEVELOPMENT
// Được bảo vệ bằng 2 lớp:
//   1. NODE_ENV !== "production"
//   2. Phải là Admin
// Nếu deploy production thì route này tự động bị vô hiệu hóa
// ==========================================
if (process.env.NODE_ENV !== "production") {
  router.post(
    "/virtual-payment",
    verifyToken,
    authorizeRoles("admin"),
    virtualPayment
  );
  console.log("⚠️  [DEV ONLY] Route /api/transactions/virtual-payment đang hoạt động (chỉ admin).");
}

module.exports = router;
