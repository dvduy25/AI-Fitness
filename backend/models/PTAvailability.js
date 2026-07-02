// models/PTAvailability.js
// =====================================================
// LỊCH RỖI CỦA PT
// - PT tự thiết lập khung giờ rảnh theo ngày
// - User xem và đặt lịch thuê trong các khung đó
// =====================================================
const mongoose = require("mongoose");

const timeSlotSchema = new mongoose.Schema(
  {
    startTime: { type: String, required: true }, // "08:00"
    endTime:   { type: String, required: true }, // "09:00"
    isBooked:  { type: Boolean, default: false },
    bookedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    hireRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PTHireRequest",
      default: null,
    },
  },
  { _id: true }
);

const ptAvailabilitySchema = new mongoose.Schema(
  {
    ptId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Ngày áp dụng (lưu dạng YYYY-MM-DD string để query nhanh)
    date: {
      type: String,
      required: true,
    },
    slots: [timeSlotSchema],

    // PT có nhận lịch ngày này không
    isAvailable: {
      type: Boolean,
      default: true,
    },

    // Địa điểm PT sẽ dạy ngày hôm đó (có thể khác địa chỉ mặc định)
    location: {
      type: String,
      default: null,
    },

    // Toạ độ để user tìm PT gần mình
    coordinates: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
  },
  { timestamps: true }
);

// Unique: 1 PT chỉ có 1 record / 1 ngày
ptAvailabilitySchema.index({ ptId: 1, date: 1 }, { unique: true });
// Index tìm PT theo ngày + toạ độ
ptAvailabilitySchema.index({ date: 1, isAvailable: 1 });

module.exports = mongoose.model("PTAvailability", ptAvailabilitySchema);
