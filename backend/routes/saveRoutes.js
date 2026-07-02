// routes/saveRoutes.js
const express = require("express");
const router  = express.Router();
const {
  savePost,
  unsavePost,
  getMySaves,
  checkSaved,
  getMyEarning,
} = require("../controllers/saveController");
const { verifyToken } = require("../middleware/authMiddleware");
const { generalLimiter } = require("../middleware/rateLimiter");

// User: lưu / bỏ lưu bài viết
router.post("/:postId",    verifyToken, generalLimiter, savePost);
router.delete("/:postId",  verifyToken, unsavePost);

// User: danh sách đã lưu
router.get("/my",          verifyToken, getMySaves);

// User: kiểm tra bài viết đã lưu chưa
router.get("/check/:postId", verifyToken, checkSaved);

// PT: xem thu nhập từ lượt lưu
router.get("/pt-earning",  verifyToken, getMyEarning);

module.exports = router;
