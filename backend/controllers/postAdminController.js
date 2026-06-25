// controllers/postAdminController.js
const Post = require("../models/Post");

/**
 * @desc    Lấy danh sách các bài viết có sự cố cần Admin xử lý
 * @route   GET /api/posts/admin/queue
 * @access  Private (Admin/Moderator)
 */
const getAdminReportedPosts = async (req, res) => {
  try {
    const { status } = req.query; // Nhận lọc theo ?status=pending_review hoặc hidden_by_system
    
    // Nếu không truyền status, mặc định lấy cả 2 loại bài viết có vấn đề
    const filter = status 
      ? { status } 
      : { status: { $in: ['pending_review', 'hidden_by_system'] } };

    const posts = await Post.find(filter)
      .populate("userId", "name email")
      .sort({ reportsCount: -1, createdAt: -1 }); // Ưu tiên bài bị report nhiều nhất xếp lên đầu

    return res.status(200).json({ 
      success: true, 
      count: posts.length,
      data: posts 
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
 * @desc    Ra phán quyết xử lý bài viết (Duyệt lại hoặc Khóa vĩnh viễn)
 * @route   PATCH /api/posts/admin/:id/resolve
 * @access  Private (Admin/Moderator)
 */
const resolveModeration = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, note } = req.body; // action nhận: 'allow' hoặc 'ban'

    if (!['allow', 'ban'].includes(action)) {
      return res.status(400).json({ success: false, message: "Hành động xử lý không hợp lệ." });
    }

    // Quy đổi hành động của Admin sang trạng thái của Post Schema
    const statusResult = action === 'allow' ? 'approved' : 'banned';
    
    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ success: false, message: "Bài viết không tồn tại." });
    }

    // Cập nhật phán quyết
    post.status = statusResult;
    post.moderatedBy = req.user.id; // Lấy ID Admin từ middleware giải mã token
    post.moderationNote = note || `Được xử lý bởi Ban Quản Trị. Thao tác: ${action === 'allow' ? 'Khôi phục bài viết' : 'Khóa vĩnh viễn'}`;
    
    // Nếu Admin chọn 'allow' (bài viết hợp lệ), xóa trắng lịch sử report cũ để reset lại từ đầu
    if (action === 'allow') {
      post.reports = [];
      post.reportsCount = 0;
    }

    await post.save();

    return res.status(200).json({ 
      success: true, 
      message: action === 'allow' ? "Đã khôi phục bài viết lên bảng tin công khai!" : "Đã khóa bài viết vi phạm vĩnh viễn!",
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