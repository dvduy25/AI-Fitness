// models/PTEarning.js
// =====================================================
// THU NHẬP PT TỪ LƯỢT LƯU
// - Mỗi 2.000 lượt lưu = $1
// - Lưu lịch sử mốc đạt được để tính tiền chính xác
// =====================================================
const mongoose = require("mongoose");

const ptEarningSchema = new mongoose.Schema(
  {
    ptId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // 1 PT = 1 record tổng hợp
    },
    // Tổng lượt lưu tích lũy từ trước tới nay
    totalSaves: {
      type: Number,
      default: 0,
    },
    // Tổng số $ đã quy đổi (floor(totalSaves / 2000))
    totalDollarsEarned: {
      type: Number,
      default: 0,
    },
    // Số $ đã được thanh toán (Admin xác nhận)
    totalDollarsPaid: {
      type: Number,
      default: 0,
    },
    // Số $ chờ thanh toán
    pendingDollars: {
      type: Number,
      default: 0,
    },
    // Lịch sử các lần thanh toán
    paymentHistory: [
      {
        amount: Number,        // $ đã trả
        paidAt: Date,
        note: String,          // "Tháng 6/2025", v.v.
        adminId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("PTEarning", ptEarningSchema);
