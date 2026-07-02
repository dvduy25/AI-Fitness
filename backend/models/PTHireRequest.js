// models/PTHireRequest.js
// =====================================================
// YÊU CẦU THUÊ PT
// Flow: user đặt lịch → PT xác nhận/từ chối → hoàn thành
// =====================================================
const mongoose = require("mongoose");

const ptHireRequestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    ptId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    availabilityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PTAvailability",
      required: true,
    },
    slotId: {
      type: mongoose.Schema.Types.ObjectId, // _id của slot trong availability.slots
      required: true,
    },

    // Thông tin buổi thuê
    date: { type: String, required: true },       // "2025-07-01"
    startTime: { type: String, required: true },  // "08:00"
    endTime: { type: String, required: true },    // "09:00"

    // Mục tiêu buổi tập
    goal: { type: String, maxlength: 500 },

    // Giá đã thoả thuận (VNĐ)
    price: { type: Number, required: true },

    status: {
      type: String,
      enum: ["pending", "confirmed", "rejected", "completed", "cancelled"],
      default: "pending",
    },

    // PT từ chối / hủy với lý do
    rejectReason: { type: String, default: null },
    cancelledBy: {
      type: String,
      enum: ["user", "pt", null],
      default: null,
    },

    // Đánh giá sau buổi tập
    rating: { type: Number, min: 1, max: 5, default: null },
    review: { type: String, maxlength: 500, default: null },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

ptHireRequestSchema.index({ userId: 1, status: 1 });
ptHireRequestSchema.index({ ptId: 1, status: 1 });
ptHireRequestSchema.index({ ptId: 1, date: 1 });

module.exports = mongoose.model("PTHireRequest", ptHireRequestSchema);
