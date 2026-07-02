// controllers/ptHireController.js
// =====================================================
// THUÊ PT - FLOW ĐẶT LỊCH
// User đặt → PT xác nhận/từ chối → Hoàn thành → Đánh giá
// =====================================================
const PTHireRequest  = require("../models/PTHireRequest");
const PTAvailability = require("../models/PTAvailability");
const Notification   = require("../models/Notification");
const User           = require("../models/User");

// ─────────────────────────────────────────────────
// POST /api/pt/hire
// User đặt lịch thuê PT
// Body: { ptId, availabilityId, slotId, goal, price }
// ─────────────────────────────────────────────────
exports.createHireRequest = async (req, res) => {
  try {
    const userId = req.user._id;
    const { ptId, availabilityId, slotId, goal, price } = req.body;

    if (!ptId || !availabilityId || !slotId || !price) {
      return res.status(400).json({ success: false, message: "Thiếu thông tin đặt lịch!" });
    }

    // Không cho tự thuê mình
    if (userId.toString() === ptId) {
      return res.status(400).json({ success: false, message: "Không thể tự đặt lịch với chính mình!" });
    }

    // Kiểm tra PT tồn tại và đúng role
    const pt = await User.findById(ptId).select("name role isLocked");
    if (!pt || pt.role !== "trainer") {
      return res.status(404).json({ success: false, message: "PT không tồn tại!" });
    }
    if (pt.isLocked) {
      return res.status(400).json({ success: false, message: "PT này hiện không hoạt động!" });
    }

    // Tìm slot và lock nó (atomic update để tránh race condition)
    const availability = await PTAvailability.findOneAndUpdate(
      {
        _id: availabilityId,
        ptId,
        isAvailable: true,
        "slots._id": slotId,
        "slots.isBooked": false,
      },
      {
        $set: {
          "slots.$.isBooked": true,
          "slots.$.bookedBy": userId,
        },
      },
      { new: true }
    );

    if (!availability) {
      return res.status(409).json({
        success: false,
        message: "Khung giờ này đã được đặt hoặc không còn trống. Vui lòng chọn khung giờ khác!",
      });
    }

    // Lấy thông tin slot vừa đặt
    const slot = availability.slots.find((s) => s._id.toString() === slotId.toString());

    // Tạo hire request
    const hireRequest = await PTHireRequest.create({
      userId,
      ptId,
      availabilityId,
      slotId,
      date: availability.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      goal: goal || "",
      price: Number(price),
      status: "pending",
    });

    // Cập nhật hireRequestId vào slot
    await PTAvailability.updateOne(
      { _id: availabilityId, "slots._id": slotId },
      { $set: { "slots.$.hireRequestId": hireRequest._id } }
    );

    // Gửi thông báo cho PT
    await Notification.create({
      userId: ptId,
      type: "hire_request",
      title: "Yêu cầu đặt lịch mới",
      body: `${req.user.name} muốn thuê bạn vào lúc ${slot.startTime} ngày ${availability.date}`,
      data: { hireRequestId: hireRequest._id },
    });

    return res.status(201).json({
      success: true,
      message: "Đã gửi yêu cầu đặt lịch! Chờ PT xác nhận.",
      hireRequest,
    });
  } catch (error) {
    console.error("[createHireRequest]", error.message);
    res.status(500).json({ success: false, message: "Lỗi server!", error: error.message });
  }
};

// ─────────────────────────────────────────────────
// GET /api/pt/hire/my-requests  — User xem lịch đã đặt
// ─────────────────────────────────────────────────
exports.getMyRequests = async (req, res) => {
  try {
    const userId = req.user._id;
    const { status, page = 1, limit = 20 } = req.query;

    const filter = { userId };
    if (status) filter.status = status;

    const requests = await PTHireRequest.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate("ptId", "name avatar isVerified phone");

    const total = await PTHireRequest.countDocuments(filter);

    return res.json({
      success: true,
      requests,
      pagination: { total, page: Number(page), totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi server!" });
  }
};

// ─────────────────────────────────────────────────
// GET /api/pt/hire/incoming  — PT xem lịch học viên đặt
// ─────────────────────────────────────────────────
exports.getIncomingRequests = async (req, res) => {
  try {
    const ptId = req.user._id;
    if (req.user.role !== "trainer") {
      return res.status(403).json({ success: false, message: "Chỉ dành cho PT!" });
    }

    const { status, page = 1, limit = 20 } = req.query;
    const filter = { ptId };
    if (status) filter.status = status;

    const requests = await PTHireRequest.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate("userId", "name avatar age goal medicalConditions");

    const total = await PTHireRequest.countDocuments(filter);

    return res.json({
      success: true,
      requests,
      pagination: { total, page: Number(page), totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi server!" });
  }
};

// ─────────────────────────────────────────────────
// PATCH /api/pt/hire/:requestId/confirm  — PT xác nhận
// ─────────────────────────────────────────────────
exports.confirmRequest = async (req, res) => {
  try {
    const ptId = req.user._id;
    const { requestId } = req.params;

    const request = await PTHireRequest.findOne({ _id: requestId, ptId, status: "pending" });
    if (!request) {
      return res.status(404).json({ success: false, message: "Yêu cầu không tồn tại hoặc đã được xử lý!" });
    }

    request.status = "confirmed";
    await request.save();

    await Notification.create({
      userId: request.userId,
      type: "hire_confirmed",
      title: "Lịch đã được xác nhận!",
      body: `PT ${req.user.name} đã xác nhận buổi tập ${request.startTime} ngày ${request.date}`,
      data: { hireRequestId: request._id },
    });

    return res.json({ success: true, message: "Đã xác nhận lịch!", request });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi server!" });
  }
};

// ─────────────────────────────────────────────────
// PATCH /api/pt/hire/:requestId/reject  — PT từ chối
// Body: { reason }
// ─────────────────────────────────────────────────
exports.rejectRequest = async (req, res) => {
  try {
    const ptId = req.user._id;
    const { requestId } = req.params;
    const { reason } = req.body;

    const request = await PTHireRequest.findOne({ _id: requestId, ptId, status: "pending" });
    if (!request) {
      return res.status(404).json({ success: false, message: "Yêu cầu không tồn tại!" });
    }

    request.status = "rejected";
    request.rejectReason = reason || "PT không thể nhận lịch này.";
    await request.save();

    // Mở lại slot đã bị lock
    await PTAvailability.updateOne(
      { _id: request.availabilityId, "slots._id": request.slotId },
      { $set: { "slots.$.isBooked": false, "slots.$.bookedBy": null, "slots.$.hireRequestId": null } }
    );

    await Notification.create({
      userId: request.userId,
      type: "hire_rejected",
      title: "Lịch không được xác nhận",
      body: `PT ${req.user.name} không thể nhận lịch ${request.startTime} ngày ${request.date}. Lý do: ${request.rejectReason}`,
      data: { hireRequestId: request._id },
    });

    return res.json({ success: true, message: "Đã từ chối yêu cầu!", request });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi server!" });
  }
};

// ─────────────────────────────────────────────────
// PATCH /api/pt/hire/:requestId/complete  — PT đánh dấu hoàn thành
// ─────────────────────────────────────────────────
exports.completeRequest = async (req, res) => {
  try {
    const ptId = req.user._id;
    const { requestId } = req.params;

    const request = await PTHireRequest.findOne({ _id: requestId, ptId, status: "confirmed" });
    if (!request) {
      return res.status(404).json({ success: false, message: "Không tìm thấy lịch đã xác nhận!" });
    }

    request.status = "completed";
    await request.save();

    await Notification.create({
      userId: request.userId,
      type: "hire_completed",
      title: "Buổi tập hoàn thành!",
      body: `Buổi tập với PT ${req.user.name} đã hoàn thành. Hãy để lại đánh giá nhé!`,
      data: { hireRequestId: request._id, canReview: true },
    });

    return res.json({ success: true, message: "Đã đánh dấu hoàn thành!", request });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi server!" });
  }
};

// ─────────────────────────────────────────────────
// POST /api/pt/hire/:requestId/review  — User đánh giá PT sau buổi tập
// Body: { rating, review }
// ─────────────────────────────────────────────────
exports.reviewPT = async (req, res) => {
  try {
    const userId = req.user._id;
    const { requestId } = req.params;
    const { rating, review } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: "Rating phải từ 1-5!" });
    }

    const request = await PTHireRequest.findOne({ _id: requestId, userId, status: "completed" });
    if (!request) {
      return res.status(404).json({ success: false, message: "Không tìm thấy buổi tập đã hoàn thành!" });
    }
    if (request.rating) {
      return res.status(400).json({ success: false, message: "Bạn đã đánh giá buổi tập này rồi!" });
    }

    request.rating = Number(rating);
    request.review = review || "";
    request.reviewedAt = new Date();
    await request.save();

    return res.json({ success: true, message: "Cảm ơn bạn đã đánh giá!", request });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi server!" });
  }
};

// ─────────────────────────────────────────────────
// PATCH /api/pt/hire/:requestId/cancel  — User/PT hủy lịch
// Body: { cancelledBy: "user" | "pt" }
// ─────────────────────────────────────────────────
exports.cancelRequest = async (req, res) => {
  try {
    const userId = req.user._id;
    const { requestId } = req.params;

    const request = await PTHireRequest.findById(requestId);
    if (!request) return res.status(404).json({ success: false, message: "Không tìm thấy yêu cầu!" });

    const isUser = request.userId.toString() === userId.toString();
    const isPT   = request.ptId.toString() === userId.toString();

    if (!isUser && !isPT) {
      return res.status(403).json({ success: false, message: "Bạn không có quyền hủy lịch này!" });
    }
    if (!["pending", "confirmed"].includes(request.status)) {
      return res.status(400).json({ success: false, message: "Không thể hủy lịch ở trạng thái này!" });
    }

    request.status = "cancelled";
    request.cancelledBy = isUser ? "user" : "pt";
    await request.save();

    // Mở lại slot
    await PTAvailability.updateOne(
      { _id: request.availabilityId, "slots._id": request.slotId },
      { $set: { "slots.$.isBooked": false, "slots.$.bookedBy": null, "slots.$.hireRequestId": null } }
    );

    // Thông báo bên còn lại
    const notifyUserId = isUser ? request.ptId : request.userId;
    const cancellerName = req.user.name;
    await Notification.create({
      userId: notifyUserId,
      type: "hire_cancelled",
      title: "Lịch đã bị hủy",
      body: `${cancellerName} đã hủy buổi tập ${request.startTime} ngày ${request.date}`,
      data: { hireRequestId: request._id },
    });

    return res.json({ success: true, message: "Đã hủy lịch!", request });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi server!" });
  }
};
