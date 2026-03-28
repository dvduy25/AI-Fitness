const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  transactionType: { 
    type: String, 
    enum: ['PREMIUM_UPGRADE', 'AD_REWARD_VIRTUAL', 'AD_REWARD_ADMOB'], 
    required: true 
  },
  amount: { type: Number, required: true }, // Có thể là VNĐ (nếu mua VIP) hoặc số vé (nếu xem QC)
  orderId: { type: String, unique: true, sparse: true }, // Mã đơn hàng từ cổng thanh toán (MoMo/VNPay)
  packageInfo: { type: String }, // Ghi chú gói (vd: "Gói 1 tháng", "Vé AI")
  status: { type: String, enum: ['SUCCESS', 'FAILED', 'PENDING'], default: 'SUCCESS' }
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);