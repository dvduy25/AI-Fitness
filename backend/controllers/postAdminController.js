// controllers/postAdminController.js
const Post = require("../models/Post");

/**
 * @desc    Lấy danh sách các bài viết bị báo cáo hoặc bị hệ thống ẩn ngầm
 * @route   GET /api/posts/admin/queue
 * @access  Private (Admin/Moderator)
 */
const getAdminReportedPosts = async (req, res) => {
  try {
    const { status } = req.query; 
    
    const filter = status 
      ? { status } 
      : { status: { $in: ['pending_review', 'hidden_by_system'] } };

    // BƯỚC 1: Tìm bài viết và CHỈ kết nối với những User KHÔNG bị khóa
    const posts = await Post.find(filter)
      .populate({
        path: "userId",
        select: "name email isLocked",
        match: { isLocked: { $ne: true } } // 💡 Kỹ thuật cốt lõi: Chỉ lấy user có isLocked khác true
      })
      .sort({ reportsCount: -1, createdAt: -1 });

    // BƯỚC 2: Lọc bỏ các bài viết mà userId trả về null 
    // (nghĩa là user đó đã bị khóa, nên Mongoose không populate được)
    const validPosts = posts.filter(post => post.userId !== null);

    return res.status(200).json({ 
      success: true, 
      count: validPosts.length,
      data: validPosts // Trả về danh sách đã được lọc sạch
    });
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: "Lỗi hệ thống khi tải dữ liệu kiểm duyệt.",
      error: error.message 
    });
  }
};

/**
 * @desc    Ra phán quyết xử lý bài viết (Khôi phục hoặc XÓA VĨNH VIỄN)
 * @route   PATCH /api/posts/admin/:id/resolve
 * @access  Private (Admin/Moderator)
 */
const resolveModeration = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, note } = req.body; 

    if (!['allow', 'delete'].includes(action)) {
      return res.status(400).json({ success: false, message: "Hành động xử lý không hợp lệ. Chỉ nhận 'allow' hoặc 'delete'." });
    }

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ success: false, message: "Bài viết không tồn tại hoặc đã bị xóa trước đó." });
    }

    // -------------------------------------------------------------
    // TRƯỜNG HỢP 1: ADMIN PHẠT XÓA BÀI VIẾT (DELETE)
    // -------------------------------------------------------------
    if (action === 'delete') {
      await post.deleteOne(); 
      
      return res.status(200).json({ 
        success: true, 
        message: "Đã xóa vĩnh viễn bài viết vi phạm khỏi hệ thống!" 
      });
    }

    // -------------------------------------------------------------
    // TRƯỜNG HỢP 2: ADMIN DUYỆT HỢP LỆ, CHO HIỂN THỊ LẠI (ALLOW)
    // -------------------------------------------------------------
    post.status = 'approved'; 
    post.moderatedBy = req.user.id; 
    post.moderationNote = note || "Được phê duyệt bởi Ban Quản Trị. Thao tác: Khôi phục bài viết";
    
    post.reports = [];
    post.reportsCount = 0;

    await post.save();

    return res.status(200).json({ 
      success: true, 
      message: "Đã khôi phục bài viết lên bảng tin công khai!",
      data: post 
    });

  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: "Lỗi hệ thống khi thực thi phán quyết.",
      error: error.message 
    });
  }
};

module.exports = {
  getAdminReportedPosts,
  resolveModeration
};