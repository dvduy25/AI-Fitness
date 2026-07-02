// controllers/ptAvailabilityController.js
// =====================================================
// QUẢN LÝ LỊCH RỖI CỦA PT
// =====================================================
const PTAvailability = require("../models/PTAvailability");
const PTHireRequest  = require("../models/PTHireRequest");

// Helper: format date thành YYYY-MM-DD
const toDateStr = (d) => new Date(d).toISOString().split("T")[0];

// ─────────────────────────────────────────────────
// POST /api/pt/availability
// PT tạo / cập nhật lịch rảnh cho 1 ngày
// Body: { date, slots: [{startTime, endTime}], location, coordinates }
// ─────────────────────────────────────────────────
exports.setAvailability = async (req, res) => {
  try {
    const ptId = req.user._id;
    const { date, slots, isAvailable = true, location, coordinates } = req.body;

    if (!date || !slots || !Array.isArray(slots)) {
      return res.status(400).json({ success: false, message: "Thiếu date hoặc slots!" });
    }

    const dateStr = toDateStr(date);

    // Validate slots
    for (const slot of slots) {
      if (!slot.startTime || !slot.endTime) {
        return res.status(400).json({
          success: false,
          message: "Mỗi slot phải có startTime và endTime!",
        });
      }
      if (slot.startTime >= slot.endTime) {
        return res.status(400).json({
          success: false,
          message: `Slot ${slot.startTime}-${slot.endTime} không hợp lệ: giờ bắt đầu phải trước giờ kết thúc!`,
        });
      }
    }

    // Kiểm tra trùng khung giờ
    const times = slots.map((s) => s.startTime);
    if (new Set(times).size !== times.length) {
      return res.status(400).json({
        success: false,
        message: "Có khung giờ bị trùng lặp!",
      });
    }

    const availability = await PTAvailability.findOneAndUpdate(
      { ptId, date: dateStr },
      {
        slots: slots.map((s) => ({
          startTime: s.startTime,
          endTime: s.endTime,
          isBooked: false,
          bookedBy: null,
        })),
        isAvailable,
        location: location || null,
        coordinates: coordinates || { lat: null, lng: null },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.json({
      success: true,
      message: "Đã cập nhật lịch rảnh!",
      availability,
    });
  } catch (error) {
    console.error("[setAvailability]", error.message);
    res.status(500).json({ success: false, message: "Lỗi server!", error: error.message });
  }
};

// ─────────────────────────────────────────────────
// GET /api/pt/availability/my?month=2025-07
// PT xem lịch rảnh của mình trong tháng
// ─────────────────────────────────────────────────
exports.getMyAvailability = async (req, res) => {
  try {
    const ptId = req.user._id;
    const { month } = req.query; // "2025-07"

    let filter = { ptId };
    if (month) {
      filter.date = { $regex: `^${month}` };
    }

    const records = await PTAvailability.find(filter).sort({ date: 1 });
    return res.json({ success: true, records });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi server!", error: error.message });
  }
};

// ─────────────────────────────────────────────────
// GET /api/pt/:ptId/availability?date=2025-07-01
// User xem lịch rảnh của 1 PT (chỉ xem slot chưa bị đặt)
// ─────────────────────────────────────────────────
exports.getPTAvailabilityForUser = async (req, res) => {
  try {
    const { ptId } = req.params;
    const { date } = req.query;

    const dateStr = date ? toDateStr(date) : toDateStr(new Date());

    const record = await PTAvailability.findOne({
      ptId,
      date: dateStr,
      isAvailable: true,
    }).populate("ptId", "name avatar isVerified");

    if (!record) {
      return res.json({ success: true, available: false, slots: [] });
    }

    // Chỉ trả về slot chưa bị đặt
    const freeSlots = record.slots
      .filter((s) => !s.isBooked)
      .map((s) => ({
        _id: s._id,
        startTime: s.startTime,
        endTime: s.endTime,
      }));

    return res.json({
      success: true,
      available: record.isAvailable,
      date: record.date,
      location: record.location,
      coordinates: record.coordinates,
      pt: record.ptId,
      freeSlots,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi server!", error: error.message });
  }
};

// ─────────────────────────────────────────────────
// GET /api/pt/nearby?lat=21.02&lng=105.83&date=2025-07-01&radius=10
// Tìm PT rảnh gần khu vực trong ngày
// ─────────────────────────────────────────────────
exports.getNearbyAvailablePTs = async (req, res) => {
  try {
    const { lat, lng, date, radius = 10 } = req.query;
    const dateStr = date ? toDateStr(date) : toDateStr(new Date());

    // Query PT có lịch rảnh hôm đó còn slot trống
    const records = await PTAvailability.find({
      date: dateStr,
      isAvailable: true,
      "slots.isBooked": false,
    })
      .populate("ptId", "name avatar isVerified role")
      .lean();

    // Tính khoảng cách nếu có toạ độ
    let results = records.map((r) => {
      let distance = null;
      if (lat && lng && r.coordinates?.lat && r.coordinates?.lng) {
        const dLat = ((r.coordinates.lat - parseFloat(lat)) * Math.PI) / 180;
        const dLng = ((r.coordinates.lng - parseFloat(lng)) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos((parseFloat(lat) * Math.PI) / 180) *
            Math.cos((r.coordinates.lat * Math.PI) / 180) *
            Math.sin(dLng / 2) ** 2;
        distance = parseFloat((6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1));
      }

      return {
        ptId: r.ptId,
        date: r.date,
        location: r.location,
        coordinates: r.coordinates,
        freeSlots: r.slots.filter((s) => !s.isBooked).map((s) => ({
          _id: s._id,
          startTime: s.startTime,
          endTime: s.endTime,
        })),
        distance,
      };
    });

    // Lọc theo bán kính nếu có
    if (lat && lng) {
      results = results
        .filter((r) => r.distance === null || r.distance <= parseFloat(radius))
        .sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999));
    }

    return res.json({ success: true, pts: results, total: results.length });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi server!", error: error.message });
  }
};

// ─────────────────────────────────────────────────
// DELETE /api/pt/availability/:date  — PT xóa lịch 1 ngày
// ─────────────────────────────────────────────────
exports.deleteAvailability = async (req, res) => {
  try {
    const ptId = req.user._id;
    const dateStr = toDateStr(req.params.date);

    // Không cho xóa nếu đã có slot bị đặt
    const record = await PTAvailability.findOne({ ptId, date: dateStr });
    if (!record) return res.status(404).json({ success: false, message: "Không tìm thấy lịch!" });

    const hasBooked = record.slots.some((s) => s.isBooked);
    if (hasBooked) {
      return res.status(400).json({
        success: false,
        message: "Không thể xóa vì đã có học viên đặt lịch trong ngày này!",
      });
    }

    await PTAvailability.deleteOne({ ptId, date: dateStr });
    return res.json({ success: true, message: "Đã xóa lịch!" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi server!" });
  }
};
