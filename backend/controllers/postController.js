const Post = require("../models/Post");
const User = require("../models/User");
const WorkoutLog = require("../models/WorkoutLog");
const DailyDietLog = require("../models/DailyDietLog");
const mongoose = require("mongoose");

// ==========================================
// 1. TẠO BÀI VIẾT & CHIA SẺ (CREATE)
// ==========================================
// 📄 controllers/postController.js

exports.createPost = async (req, res) => {
  try {
    const { content, workoutLogId, dietLogId } = req.body;
    const userId = req.user.id;

    let images = [];
    let video = "";

    // Lấy Base URL của server để tạo link ảnh public (VD: http://localhost:5000)
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    // Kiểm tra xem có file nào được upload lên không
    if (req.files) {
      // Nếu có mảng ảnh
      if (req.files.images) {
        images = req.files.images.map(file => `${baseUrl}/uploads/media/${file.filename}`);
      }
      // Nếu có file video (thường giới hạn 1 video/bài)
      if (req.files.video && req.files.video.length > 0) {
        video = `${baseUrl}/uploads/media/${req.files.video[0].filename}`;
      }
    }

    let workoutSnapshot = null;
    let dietSnapshot = null;

    if (workoutLogId) {
      const workout = await WorkoutLog.findById(workoutLogId);
      if (workout) workoutSnapshot = workout.toObject();
    }

    if (dietLogId) {
      const diet = await DailyDietLog.findById(dietLogId);
      if (diet) dietSnapshot = diet.toObject();
    }

    const newPost = new Post({
      userId,
      content,
      images, // Mảng các URL ảnh
      video,  // URL video
      originalWorkoutId: workoutLogId,
      workoutSnapshot,
      originalDietId: dietLogId,
      dietSnapshot
    });

    await newPost.save();
    res.status(201).json({ success: true, message: "Đăng bài thành công!", post: newPost });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// 2. LẤY BẢNG TIN (READ - FEED)
// ==========================================
exports.getFeed = async (req, res) => {
  try {
    const posts = await Post.find()
      .populate("userId", "name avatar role") // Hiện thông tin người đăng
      .sort({ createdAt: -1 }); // Mới nhất hiện trước
    res.status(200).json({ success: true, posts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// 3. CHỈNH SỬA BÀI VIẾT (UPDATE)
// ==========================================
exports.updatePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { content, images, video } = req.body;
    const userId = req.user.id;

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Không thấy bài viết" });

    // Chặn người lạ sửa bài
    if (post.userId.toString() !== userId) {
      return res.status(403).json({ message: "Bạn không có quyền sửa bài này" });
    }

    post.content = content || post.content;
    post.images = images || post.images;
    post.video = video !== undefined ? video : post.video;

    await post.save();
    res.status(200).json({ success: true, message: "Đã cập nhật!", post });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// 4. XÓA BÀI VIẾT (DELETE)
// ==========================================
exports.deletePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Không thấy bài viết" });

    // Chỉ chủ bài viết hoặc Admin mới được xóa
    if (post.userId.toString() !== userId && userRole !== 'admin') {
      return res.status(403).json({ message: "Quyền truy cập bị từ chối" });
    }

    await Post.findByIdAndDelete(postId);
    res.status(200).json({ success: true, message: "Đã xóa bài viết thành công" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// 5. LƯU VỀ KHO (CLONE LỊCH TỪ SNAPSHOT)
// ==========================================
exports.cloneSnapshot = async (req, res) => {
  try {
    const { postId, type } = req.body; 
    const userId = req.user.id;
    const post = await Post.findById(postId);

    if (!post) return res.status(404).json({ message: "Không thấy bài viết" });

    // Clone lịch tập
    if (type === 'workout' && post.workoutSnapshot) {
      const { _id, ...cleanData } = post.workoutSnapshot; // Loại bỏ ID cũ để tránh trùng
      const clonedWorkout = new WorkoutLog({
        ...cleanData,
        userId,
        date: new Date(), // Lưu cho ngày hôm nay
        isCompleted: false 
      });
      await clonedWorkout.save();
      return res.status(201).json({ success: true, message: "Đã lưu lịch tập vào kho!" });
    }

    // Clone lịch ăn
    if (type === 'diet' && post.dietSnapshot) {
      const { _id, ...cleanData } = post.dietSnapshot;
      const clonedDiet = new DailyDietLog({
        ...cleanData,
        userId,
        date: new Date(),
        isDayCompleted: false
      });
      await clonedDiet.save();
      return res.status(201).json({ success: true, message: "Đã lưu lịch ăn vào kho!" });
    }

    res.status(400).json({ message: "Không có dữ liệu phù hợp để lưu" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
// ==========================================
// 6. THẢ TIM / BỎ THẢ TIM (TOGGLE LIKE)
// ==========================================
exports.toggleLike = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Không tìm thấy bài viết" });

    // Kiểm tra user đã like bài này chưa
    const isLiked = post.likes.includes(userId);

    if (isLiked) {
      // Nếu đã like -> Xóa ID khỏi mảng (Bỏ like)
      post.likes = post.likes.filter(id => id.toString() !== userId);
    } else {
      // Nếu chưa like -> Thêm ID vào mảng (Thả tim)
      post.likes.push(userId);
    }

    await post.save();
    
    res.status(200).json({ 
      success: true, 
      message: isLiked ? "Đã bỏ tim" : "Đã thả tim", 
      likeCount: post.likes.length,
      likes: post.likes 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
const Comment = require("../models/Comment");

// ==========================================
// 7. THÊM BÌNH LUẬN (ADD COMMENT)
// ==========================================
exports.addComment = async (req, res) => {
  try {
    const { postId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content) return res.status(400).json({ message: "Nội dung không được để trống" });

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Không tìm thấy bài viết" });

    // 1. Tạo comment mới
    const newComment = new Comment({ postId, userId, content });
    await newComment.save();

    // 2. Tăng bộ đếm commentsCount trong bảng Post lên 1
    post.commentsCount += 1;
    await post.save();

    res.status(201).json({ success: true, message: "Đã bình luận", comment: newComment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
// ==========================================
// 8. LẤY DANH SÁCH BÌNH LUẬN CỦA BÀI VIẾT (GET COMMENTS)
// ==========================================
exports.getComments = async (req, res) => {
  try {
    const { postId } = req.params;

    // Tìm tất cả bình luận có postId tương ứng, lấy thêm thông tin người bình luận
    const comments = await Comment.find({ postId })
      .populate("userId", "name avatar role")
      .sort({ createdAt: -1 }); // Bình luận mới nhất xếp trên (có thể đổi thành 1 nếu muốn xếp dưới)

    res.status(200).json({ success: true, comments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// 9. CHỈNH SỬA BÌNH LUẬN (UPDATE COMMENT)
// ==========================================
exports.updateComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content) return res.status(400).json({ message: "Nội dung không được để trống" });

    const comment = await Comment.findById(commentId);
    if (!comment) return res.status(404).json({ message: "Không tìm thấy bình luận" });

    // KIỂM TRA QUYỀN: Chỉ chủ nhân của bình luận mới được phép sửa
    if (comment.userId.toString() !== userId) {
      return res.status(403).json({ message: "Bạn không có quyền sửa bình luận này" });
    }

    comment.content = content;
    await comment.save();

    res.status(200).json({ success: true, message: "Đã cập nhật bình luận", comment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// 10. XÓA BÌNH LUẬN (DELETE COMMENT)
// ==========================================
exports.deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;

    const comment = await Comment.findById(commentId);
    if (!comment) return res.status(404).json({ message: "Không tìm thấy bình luận" });

    const post = await Post.findById(comment.postId);
    if (!post) return res.status(404).json({ message: "Không tìm thấy bài viết" });

    // KIỂM TRA QUYỀN: Người xóa phải là Chủ bài viết HOẶC Chủ bình luận
    const isPostOwner = post.userId.toString() === userId;
    const isCommentOwner = comment.userId.toString() === userId;

    if (!isPostOwner && !isCommentOwner) {
      return res.status(403).json({ message: "Bạn không có quyền xóa bình luận này" });
    }

    // Xóa bình luận
    await Comment.findByIdAndDelete(commentId);

    // Giảm bộ đếm commentsCount của bài viết xuống 1 (đảm bảo không bị âm)
    post.commentsCount = Math.max(0, post.commentsCount - 1);
    await post.save();

    res.status(200).json({ success: true, message: "Đã xóa bình luận thành công" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};