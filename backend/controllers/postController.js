const Post = require("../models/Post");
const User = require("../models/User");
const WorkoutLog = require("../models/WorkoutLog");
const DailyDietLog = require("../models/DailyDietLog");
const MasterWorkoutPlan = require("../models/WorkoutPlan");
const MealPlan = require("../models/MealPlan");
const SavedLibrary = require("../models/SavedLibrary");
const Comment = require("../models/Comment");
const mongoose = require("mongoose");

// Helper: Xử lý đường dẫn Media (Ảnh/Video)
const handleMediaFiles = (req) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  let images = [];
  let video = "";

  if (req.files) {
    if (req.files.images) {
      images = req.files.images.map(file => `${baseUrl}/uploads/media/${file.filename}`);
    }
    if (req.files.video && req.files.video.length > 0) {
      video = `${baseUrl}/uploads/media/${req.files.video[0].filename}`;
    }
  }
  return { images, video };
};

// ==========================================
// 1. TẠO BÀI VIẾT TỪ NHẬT KÝ (WORKOUT/DIET LOG)
// ==========================================
exports.createPost = async (req, res) => {
  try {
    const { content, workoutLogId, dietLogId } = req.body;
    const userId = req.user.id;
    const { images, video } = handleMediaFiles(req);

    let workoutSnapshot = null;
    let dietSnapshot = null;
    let postType = 'text';

    if (workoutLogId) {
      // Đã thêm populate cho nhật ký tập luyện (áp dụng cho cả 2 kiểu cấu trúc phổ biến)
      const workout = await WorkoutLog.findById(workoutLogId)
        .populate('exercises.exerciseId', 'name')
        .populate('weeklySchedule.exercises.exerciseId', 'name'); 
        
      if (workout) {
        workoutSnapshot = workout.toObject();
        postType = 'workout_log';
      }
    }

    if (dietLogId) {
      const diet = await DailyDietLog.findById(dietLogId);
      if (diet) {
        dietSnapshot = diet.toObject();
        postType = 'diet_log';
      }
    }

    const newPost = new Post({
      userId,
      content,
      images,
      video,
      postType,
      originalReferenceId: workoutLogId || dietLogId || null,
      workoutSnapshot,
      dietSnapshot
    });

    await newPost.save();
    res.status(201).json({ success: true, message: "Đăng bài thành công!", post: newPost });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// 2. CHIA SẺ LỊCH MẪU (MASTER PLAN)
// ==========================================
exports.shareMasterPlan = async (req, res) => {
  try {
    const { content, shareType } = req.body; // 'workout' hoặc 'diet'
    const userId = req.user.id;
    const { images, video } = handleMediaFiles(req);

    let workoutSnapshot = null;
    let dietSnapshot = null;
    let postType = shareType === 'workout' ? 'master_workout' : 'master_diet';

    if (shareType === 'workout') {
      // Đã thêm populate lấy tên bài tập
      const plan = await MasterWorkoutPlan.findOne({ userId })
        .populate('weeklySchedule.exercises.exerciseId', 'name');
        
      if (!plan) return res.status(404).json({ message: "Bạn chưa thiết lập lịch tập mẫu!" });
      workoutSnapshot = plan.toObject();
    } else {
      const plan = await MealPlan.findOne({ userId });
      if (!plan) return res.status(404).json({ message: "Bạn chưa thiết lập thực đơn mẫu!" });
      dietSnapshot = plan.toObject();
    }

    const newPost = new Post({
      userId,
      content: content || `Lịch ${shareType === 'workout' ? 'tập' : 'ăn'} tâm đắc của tôi!`,
      images,
      video,
      postType,
      workoutSnapshot,
      dietSnapshot
    });

    await newPost.save();
    res.status(201).json({ success: true, message: "Chia sẻ lịch mẫu thành công!", post: newPost });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// 3. CHIA SẺ TỪ KHO LƯU TRỮ (SAVED LIBRARY)
// ==========================================
exports.shareFromLibrary = async (req, res) => {
  try {
    const { libraryId, content } = req.body;
    const userId = req.user.id;
    const { images, video } = handleMediaFiles(req);

    // Đã thêm populate lấy tên bài tập từ kho lưu trữ
    const savedItem = await SavedLibrary.findOne({ _id: libraryId, userId })
      .populate('workoutData.weeklySchedule.exercises.exerciseId', 'name');
      
    if (!savedItem) return res.status(404).json({ message: "Mục này không có trong kho của bạn" });

    const newPost = new Post({
      userId,
      content: content || `Gợi ý cho mọi người lịch ${savedItem.type === 'workout' ? 'tập' : 'ăn'} này!`,
      images,
      video,
      postType: savedItem.type === 'workout' ? 'master_workout' : 'master_diet',
      workoutSnapshot: savedItem.workoutData || null,
      dietSnapshot: savedItem.dietData || null,
      originalReferenceId: libraryId
    });

    await newPost.save();
    res.status(201).json({ success: true, message: "Đăng từ kho thành công!", post: newPost });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// 4. LẤY BẢNG TIN & CHI TIẾT
// ==========================================
exports.getFeed = async (req, res) => {
  try {
    const posts = await Post.find()
      .populate("userId", "name avatar role")
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, posts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getPostById = async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId).populate("userId", "name avatar role");
    if (!post) return res.status(404).json({ message: "Bài viết không tồn tại" });
    res.status(200).json({ success: true, post });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// 5. TƯƠNG TÁC (LIKE / COMMENT)
// ==========================================
exports.toggleLike = async (req, res) => {
  try {
    const userId = req.user.id;
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: "Không tìm thấy bài viết" });

    const isLiked = post.likes.includes(userId);
    isLiked ? post.likes.pull(userId) : post.likes.push(userId);

    await post.save();
    res.status(200).json({ success: true, isLiked: !isLiked, likeCount: post.likes.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.addComment = async (req, res) => {
  try {
    const { content } = req.body;
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: "Không thấy bài viết" });

    const newComment = new Comment({ 
      postId: post._id, 
      userId: req.user.id, 
      content 
    });
    await newComment.save();

    post.commentsCount += 1;
    await post.save();

    // POPULATE THÔNG TIN USER Ở ĐÂY ĐỂ TRẢ VỀ FRONTEND
    const populatedComment = await Comment.findById(newComment._id).populate("userId", "name avatar");

    res.status(201).json({ success: true, comment: populatedComment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// 6. CLONE (LƯU LỊCH VỀ CÁ NHÂN)
// ==========================================
exports.cloneSnapshot = async (req, res) => {
  try {
    const { postId, type } = req.body;
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Bài viết không còn tồn tại" });

    if (type === 'workout' && post.workoutSnapshot) {
      const { _id, ...cleanData } = post.workoutSnapshot;
      await new WorkoutLog({ ...cleanData, userId: req.user.id, date: new Date(), isCompleted: false }).save();
      return res.status(201).json({ success: true, message: "Đã lưu lịch tập vào nhật ký hôm nay!" });
    }

    if (type === 'diet' && post.dietSnapshot) {
      const { _id, ...cleanData } = post.dietSnapshot;
      await new DailyDietLog({ ...cleanData, userId: req.user.id, date: new Date(), isDayCompleted: false }).save();
      return res.status(201).json({ success: true, message: "Đã lưu thực đơn vào nhật ký hôm nay!" });
    }

    res.status(400).json({ message: "Không có dữ liệu để lưu" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// 7. CẬP NHẬT & XÓA BÀI VIẾT
// ==========================================
exports.updatePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: "Không thấy bài viết" });
    if (post.userId.toString() !== req.user.id) return res.status(403).json({ message: "Không có quyền" });

    const { content } = req.body;
    post.content = content || post.content;
    
    await post.save();
    res.status(200).json({ success: true, post });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: "Không thấy bài viết" });

    if (post.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: "Quyền truy cập bị từ chối" });
    }

    await Post.findByIdAndDelete(req.params.postId);
    await Comment.deleteMany({ postId: req.params.postId }); // Dọn sạch comment

    res.status(200).json({ success: true, message: "Đã xóa bài viết và dữ liệu liên quan" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Gộp các hàm quản lý comment lẻ (CRUD Comment)
exports.getComments = async (req, res) => {
  try {
    const comments = await Comment.find({ postId: req.params.postId }).populate("userId", "name avatar role").sort({ createdAt: -1 });
    res.status(200).json({ success: true, comments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment || comment.userId.toString() !== req.user.id) return res.status(403).json({ message: "Không có quyền" });
    comment.content = req.body.content;
    await comment.save();
    res.status(200).json({ success: true, comment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ message: "Không thấy bình luận" });
    
    const post = await Post.findById(comment.postId);
    if (comment.userId.toString() !== req.user.id && post.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Không có quyền xóa" });
    }

    await Comment.findByIdAndDelete(req.params.commentId);
    if (post) {
      post.commentsCount = Math.max(0, post.commentsCount - 1);
      await post.save();
    }
    res.status(200).json({ success: true, message: "Đã xóa bình luận" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};