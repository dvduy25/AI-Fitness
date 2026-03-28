const mongoose = require('mongoose');

const premiumPackageSchema = new mongoose.Schema({
  packageId: { type: String, required: true, unique: true }, // Vd: '1_MONTH'
  name: { type: String, required: true },                    // Vd: 'Premium 1 Tháng'
  price: { type: Number, required: true },                   // Giá tiền (VNĐ)
  months: { type: Number, required: true },                  // Số tháng cộng thêm
  isActive: { type: Boolean, default: true },                // Bật/tắt gói này
  description: { type: String }                              // (Tùy chọn) Mô tả gói
}, { timestamps: true });

module.exports = mongoose.model('PremiumPackage', premiumPackageSchema);