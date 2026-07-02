// routes/ptRoutes.js
// =====================================================
// Tất cả route liên quan đến PT:
//   /api/pt/availability/* — Lịch rảnh
//   /api/pt/hire/*         — Thuê PT
//   /api/pt/nearby         — Tìm PT gần khu vực
// =====================================================
const express = require("express");
const router  = express.Router();
const { verifyToken, authorizeRoles } = require("../middleware/authMiddleware");
const { generalLimiter } = require("../middleware/rateLimiter");

const {
  setAvailability,
  getMyAvailability,
  getPTAvailabilityForUser,
  getNearbyAvailablePTs,
  deleteAvailability,
} = require("../controllers/ptAvailabilityController");

const {
  createHireRequest,
  getMyRequests,
  getIncomingRequests,
  confirmRequest,
  rejectRequest,
  completeRequest,
  reviewPT,
  cancelRequest,
} = require("../controllers/ptHireController");

// ══════════════════════════════════════════════════
// LỊCH RỔI (AVAILABILITY)
// ══════════════════════════════════════════════════

// PT thiết lập lịch rảnh
router.post(
  "/availability",
  verifyToken,
  authorizeRoles("trainer"),
  setAvailability
);

// PT xem lịch của mình
router.get(
  "/availability/my",
  verifyToken,
  authorizeRoles("trainer"),
  getMyAvailability
);

// PT xóa lịch 1 ngày
router.delete(
  "/availability/:date",
  verifyToken,
  authorizeRoles("trainer"),
  deleteAvailability
);

// User xem lịch rảnh của 1 PT cụ thể
router.get(
  "/:ptId/availability",
  verifyToken,
  getPTAvailabilityForUser
);

// Tìm PT rảnh gần khu vực
router.get(
  "/nearby",
  verifyToken,
  generalLimiter,
  getNearbyAvailablePTs
);

// ══════════════════════════════════════════════════
// ĐẶT LỊCH THUÊ PT (HIRE REQUESTS)
// ══════════════════════════════════════════════════

// User đặt lịch
router.post(
  "/hire",
  verifyToken,
  authorizeRoles("user"),
  createHireRequest
);

// User xem lịch đã đặt
router.get(
  "/hire/my-requests",
  verifyToken,
  getMyRequests
);

// PT xem yêu cầu từ học viên
router.get(
  "/hire/incoming",
  verifyToken,
  authorizeRoles("trainer"),
  getIncomingRequests
);

// PT xác nhận
router.patch(
  "/hire/:requestId/confirm",
  verifyToken,
  authorizeRoles("trainer"),
  confirmRequest
);

// PT từ chối
router.patch(
  "/hire/:requestId/reject",
  verifyToken,
  authorizeRoles("trainer"),
  rejectRequest
);

// PT đánh dấu hoàn thành
router.patch(
  "/hire/:requestId/complete",
  verifyToken,
  authorizeRoles("trainer"),
  completeRequest
);

// User đánh giá PT sau buổi tập
router.post(
  "/hire/:requestId/review",
  verifyToken,
  authorizeRoles("user"),
  reviewPT
);

// Hủy lịch (user hoặc PT đều được)
router.patch(
  "/hire/:requestId/cancel",
  verifyToken,
  cancelRequest
);

module.exports = router;
