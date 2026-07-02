// controllers/saveController.js
// =====================================================
// HỆ THỐNG LƯU BÀI VIẾT CỦA PT
//
// Rules:
//   - Chỉ user mới được lưu (không phải chính PT đó)
//   - Mỗi user chỉ lưu 1 lần / 1 bài
//   - Phải xem quảng cáo HOẶC có Premium
//   - 2.000 lượt lưu = PT kiếm $1 (tự động tính)
// =====================================================
const Post      = require("../models/Post");
const PostSave  = require("../models/PostSave");
const PTEarning = require("../models/PTEarning");
const User      = require("../models/User");

const SAVES_PER_DOLLAR = 2000;

// ─────────────────────────────────────────────────
// Hàm nội bộ: cập nhật thu nhập PT sau mỗi lượt lưu
// ─────────────────────────────────────────────────
async function updatePTEarning(ptId) {
  const earning = await PTEarning.findOneAndUpdate(
    { ptId },
    { $inc: { totalSaves: 1 } },
    { upsert: true, new: true }
  );

  const newDollarsEarned = Math.floor(earning.totalSaves / SAVES_PER_DOLLAR);

  if (newDollarsEarned > earning.totalDollarsEarned) {
    const newPending = newDollarsEarned - earning.totalDollarsEarned;
    await PTEarning.findOneAndUpdate(
      { ptId },
      {
        $set:  { totalDollarsEarned: newDollarsEarned },
        $inc:  { pendingDollars: newPending },
      }
    );
  }

  return earning;
}

// ─────────────────────────────────────────────────
// POST /api/saves/:postId
// Body: { method: "ad" | "premium" }
// ─────────────────────────────────────────────────
exports.savePost = async (req, res) => {
  try {
    const userId = req.user._id;
    const { postId } = req.params;
    const { method } = req.body; // "ad" hoặc "premium"

    // 1. Kiểm tra bài viết tồn tại và là của PT
    const post = await Post.findById(postId).select("userId postType status");
    if (!post) {
      return res.status(404).json({ success: false, message: "Bài viết không tồn tại!" });
    }
    if (post.status !== "approved") {
      return res.status(400).json({ success: false, message: "Bài viết chưa được duyệt!" });
    }

    // Chỉ cho lưu bài chia sẻ lịch tập / lịch ăn của PT
    const allowedTypes = ["master_workout", "master_diet"];
    if (!allowedTypes.includes(post.postType)) {
      return res.status(400).json({
        success: false,
        message: "Chỉ có thể lưu lịch tập / lịch ăn do PT chia sẻ!",
      });
    }

    // 2. Không cho PT lưu bài của chính mình
    if (post.userId.toString() === userId.toString()) {
      return res.status(400).json({
        success: false,
        message: "Bạn không thể lưu bài viết của chính mình!",
      });
    }

    // 3. Kiểm tra đã lưu chưa
    const existingSave = await PostSave.findOne({ postId, userId });
    if (existingSave) {
      return res.status(409).json({
        success: false,
        message: "Bạn đã lưu bài viết này rồi!",
        alreadySaved: true,
      });
    }

    // 4. Kiểm tra quyền lưu
    const user = req.user;
    const isPremium = user.isPremium && (!user.premiumUntil || user.premiumUntil > new Date());

    if (method === "premium") {
      if (!isPremium) {
        return res.status(403).json({
          success: false,
          message: "Bạn không có Premium!",
          requiresUpgrade: true,
        });
      }
    } else if (method === "ad") {
      // Frontend đã xử lý hiển thị quảng cáo và gọi API này sau khi xem xong
      // Đây là điểm trust frontend — trong production cần ad callback verification
    } else {
      return res.status(400).json({
        success: false,
        message: "method phải là 'ad' hoặc 'premium'!",
      });
    }

    // 5. Lưu
    const ptId = post.userId;
    await PostSave.create({ postId, userId, ptId, method });

    // 6. Tăng savesCount trên Post
    const updatedPost = await Post.findByIdAndUpdate(
      postId,
      { $inc: { savesCount: 1 } },
      { new: true, select: "savesCount" }
    );

    // 7. Cập nhật thu nhập PT
    const earning = await updatePTEarning(ptId);

    // 8. Kiểm tra vừa vượt mốc $1 không để thông báo
    const justHitMilestone =
      earning.totalSaves % SAVES_PER_DOLLAR === 0 ||
      (updatedPost.savesCount % SAVES_PER_DOLLAR === 0);

    return res.status(201).json({
      success: true,
      message: "Đã lưu thành công!",
      savesCount: updatedPost.savesCount,
      ptEarning: {
        totalSaves: earning.totalSaves + 1,
        totalDollarsEarned: earning.totalDollarsEarned,
        savesToNextDollar: SAVES_PER_DOLLAR - ((earning.totalSaves + 1) % SAVES_PER_DOLLAR),
      },
      justHitMilestone,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Bạn đã lưu bài viết này rồi!",
        alreadySaved: true,
      });
    }
    console.error("[savePost]", error.message);
    res.status(500).json({ success: false, message: "Lỗi server!", error: error.message });
  }
};

// ─────────────────────────────────────────────────
// DELETE /api/saves/:postId  (bỏ lưu)
// ─────────────────────────────────────────────────
exports.unsavePost = async (req, res) => {
  try {
    const userId = req.user._id;
    const { postId } = req.params;

    const deleted = await PostSave.findOneAndDelete({ postId, userId });
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Bạn chưa lưu bài viết này!" });
    }

    // Giảm savesCount (không giảm dưới 0)
    await Post.findByIdAndUpdate(postId, [
      { $set: { savesCount: { $max: [0, { $subtract: ["$savesCount", 1] } ] } } },
    ]);

    // Lưu ý: KHÔNG trừ thu nhập PT khi bỏ lưu
    // Vì user đã xem quảng cáo / dùng premium → PT xứng đáng được tính

    return res.json({ success: true, message: "Đã bỏ lưu!" });
  } catch (error) {
    console.error("[unsavePost]", error.message);
    res.status(500).json({ success: false, message: "Lỗi server!", error: error.message });
  }
};

// ─────────────────────────────────────────────────
// GET /api/saves/my  (danh sách user đã lưu)
// ─────────────────────────────────────────────────
exports.getMySaves = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const saves = await PostSave.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate({
        path: "postId",
        select: "content postType workoutSnapshot dietSnapshot savesCount userId",
        populate: { path: "userId", select: "name avatar isVerified role" },
      });

    const total = await PostSave.countDocuments({ userId });

    return res.json({
      success: true,
      saves,
      pagination: {
        total,
        page: Number(page),
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi server!", error: error.message });
  }
};

// ─────────────────────────────────────────────────
// GET /api/saves/check/:postId  (kiểm tra đã lưu chưa)
// ─────────────────────────────────────────────────
exports.checkSaved = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user._id;
    const saved = await PostSave.exists({ postId, userId });
    return res.json({ success: true, isSaved: !!saved });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi server!" });
  }
};

// ─────────────────────────────────────────────────
// GET /api/saves/pt-earning  (PT xem thu nhập của mình)
// ─────────────────────────────────────────────────
exports.getMyEarning = async (req, res) => {
  try {
    const ptId = req.user._id;

    if (req.user.role !== "trainer") {
      return res.status(403).json({ success: false, message: "Chỉ dành cho PT!" });
    }

    let earning = await PTEarning.findOne({ ptId });
    if (!earning) {
      earning = { totalSaves: 0, totalDollarsEarned: 0, pendingDollars: 0, totalDollarsPaid: 0 };
    }

    const savesToNextDollar =
      earning.totalSaves % SAVES_PER_DOLLAR === 0
        ? SAVES_PER_DOLLAR
        : SAVES_PER_DOLLAR - (earning.totalSaves % SAVES_PER_DOLLAR);

    // Thống kê bài viết
    const postStats = await PostSave.aggregate([
      { $match: { ptId: req.user._id } },
      {
        $group: {
          _id: "$postId",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "posts",
          localField: "_id",
          foreignField: "_id",
          as: "post",
          pipeline: [{ $project: { content: 1, postType: 1, savesCount: 1 } }],
        },
      },
      { $unwind: "$post" },
    ]);

    return res.json({
      success: true,
      earning: {
        totalSaves: earning.totalSaves,
        totalDollarsEarned: earning.totalDollarsEarned,
        pendingDollars: earning.pendingDollars,
        totalDollarsPaid: earning.totalDollarsPaid,
        savesToNextDollar,
        progressPercent: Math.round(
          ((SAVES_PER_DOLLAR - savesToNextDollar) / SAVES_PER_DOLLAR) * 100
        ),
      },
      topPosts: postStats,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi server!", error: error.message });
  }
};
