const Post = require("../models/Post");
const User = require("../models/User");
const WorkoutLog = require("../models/WorkoutLog");
const DailyDietLog = require("../models/DailyDietLog");
const MasterWorkoutPlan = require("../models/WorkoutPlan");
const MealPlan = require("../models/MealPlan");
const SavedLibrary = require("../models/SavedLibrary");
const Comment = require("../models/Comment");
const Notification = require("../models/Notification");

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
    const userId = req.user.id || req.user._id;
    const { images, video } = handleMediaFiles(req);

    let workoutSnapshot = null;
    let dietSnapshot = null;
    let postType = 'text';

    if (workoutLogId) {
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

    // Bắn thông báo cho những người đang Follow khi có bài mới
    const usersFollowingMe = await User.find({ following: userId });
    const notifications = usersFollowingMe.map(u => ({
      userId: u._id,
      senderId: userId,
      type: 'new_post',
      postId: newPost._id,
      isRead: false
    }));
    
    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }

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
    const { content, shareType } = req.body;
    const userId = req.user.id;
    const { images, video } = handleMediaFiles(req);

    let workoutSnapshot = null;
    let dietSnapshot = null;
    let postType = shareType === 'workout' ? 'master_workout' : 'master_diet';

    if (shareType === 'workout') {
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
    const currentUserId = req.user.id || req.user._id;

    const currentUser = await User.findById(currentUserId);
    if (!currentUser) {
      return res.status(404).json({ success: false, message: "Không tìm thấy người dùng" });
    }

    const followingListObj = (currentUser.following || []).map(id => new mongoose.Types.ObjectId(id));
    const currentUserIdObj = new mongoose.Types.ObjectId(currentUserId);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const posts = await Post.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $lookup: {
          from: "comments", 
          localField: "_id",
          foreignField: "postId",
          pipeline: [{ $project: { userId: 1 } }],
          as: "commentsData"
        }
      },
      {
        $addFields: {
          commenterIds: { $map: { input: "$commentsData", as: "c", in: "$$c.userId" } },
          totalLikes: { $size: { $ifNull: ["$likes", []] } }
        }
      },
      {
        $addFields: {
          isAuthorFollowed: { $in: ["$userId", followingListObj] },
          isLikedByFollowed: { 
            $gt: [{ $size: { $setIntersection: [{ $ifNull: ["$likes", []] }, followingListObj] } }, 0] 
          },
          isCommentedByFollowed: { 
            $gt: [{ $size: { $setIntersection: ["$commenterIds", followingListObj] } }, 0] 
          },
          isLikedByMe: { $in: [currentUserIdObj, { $ifNull: ["$likes", []] }] },
          isCommentedByMe: { $in: [currentUserIdObj, "$commenterIds"] }
        }
      },
      {
        $addFields: {
          feedScore: {
            $add: [
              { $cond: ["$isAuthorFollowed", 50, 0] },
              { $cond: ["$isLikedByFollowed", 20, 0] },
              { $cond: ["$isCommentedByFollowed", 20, 0] },
              { $cond: ["$isLikedByMe", -500, 0] },
              { $cond: ["$isCommentedByMe", -500, 0] },
              { $multiply: ["$totalLikes", 2] }
            ]
          }
        }
      },
      { $sort: { feedScore: -1, createdAt: -1 } },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          pipeline: [
            { $project: { name: 1, avatar: 1, role: 1, isVerified: 1 } }
          ],
          as: "userId"
        }
      },
      { $unwind: { path: "$userId", preserveNullAndEmptyArrays: true } },
      { 
        $project: { 
          commentsData: 0, commenterIds: 0, isAuthorFollowed: 0, 
          isLikedByFollowed: 0, isCommentedByFollowed: 0, 
          isLikedByMe: 0, isCommentedByMe: 0, totalLikes: 0, feedScore: 0 
        } 
      }
    ]);

    res.status(200).json({ success: true, posts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getPostById = async (req, res) => {
  try {
    const post = await Post.findByIdAndUpdate(
      req.params.postId, 
      { $inc: { viewsCount: 1 } },
      { new: true }
    ).populate("userId", "name avatar role");

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
    if (isLiked) {
      post.likes.pull(userId);
    } else {
      post.likes.push(userId);
      // Bắn thông báo Like
      if (post.userId.toString() !== userId.toString()) {
        await Notification.create({ userId: post.userId, senderId: userId, type: 'like', postId: post._id, isRead: false });
      }
    }

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

    // Bắn thông báo Comment
    if (post.userId.toString() !== req.user.id.toString()) {
      await Notification.create({ userId: post.userId, senderId: req.user.id, type: 'comment', postId: post._id, isRead: false });
    }

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
      
      post.savesCount = (post.savesCount || 0) + 1;
      await post.save();

      // Bắn thông báo Lưu lịch
      if (post.userId.toString() !== req.user.id.toString()) {
        await Notification.create({ userId: post.userId, senderId: req.user.id, type: 'save_plan', postId: post._id, isRead: false });
      }

      return res.status(201).json({ success: true, message: "Đã lưu lịch tập vào nhật ký hôm nay!" });
    }

    if (type === 'diet' && post.dietSnapshot) {
      const { _id, ...cleanData } = post.dietSnapshot;
      await new DailyDietLog({ ...cleanData, userId: req.user.id, date: new Date(), isDayCompleted: false }).save();
      
      post.savesCount = (post.savesCount || 0) + 1;
      await post.save();

      // Bắn thông báo Lưu lịch
      if (post.userId.toString() !== req.user.id.toString()) {
        await Notification.create({ userId: post.userId, senderId: req.user.id, type: 'save_plan', postId: post._id, isRead: false });
      }

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
    await Comment.deleteMany({ postId: req.params.postId });

    res.status(200).json({ success: true, message: "Đã xóa bài viết và dữ liệu liên quan" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// CRUD Comment
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

// ==========================================
// 8. TĂNG LƯỢT CHIA SẺ (SHARE)
// ==========================================
exports.incrementShare = async (req, res) => {
  try {
    const post = await Post.findByIdAndUpdate(
      req.params.postId, 
      { $inc: { sharesCount: 1 } }, 
      { new: true }
    );
    
    if (!post) return res.status(404).json({ message: "Không tìm thấy bài viết" });
    
    res.status(200).json({ success: true, sharesCount: post.sharesCount });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// 9. LẤY BÀI VIẾT CỦA NGƯỜI MÌNH ĐANG FOLLOW
// ==========================================
exports.getFollowingPosts = async (req, res) => {
  try {
    const currentUserId = req.user.id || req.user._id;
    const currentUser = await User.findById(currentUserId);
    if (!currentUser) return res.status(404).json({ success: false, message: "Không tìm thấy user" });

    const followingList = currentUser.following || [];

    const posts = await Post.aggregate([
      { $match: { userId: { $in: followingList } } },
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          pipeline: [{ $project: { name: 1, avatar: 1, role: 1, isVerified: 1 } }],
          as: "userId"
        }
      },
      { $unwind: { path: "$userId", preserveNullAndEmptyArrays: true } }
    ]);

    res.status(200).json({ success: true, posts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// 10. LẤY CÁC BÀI VIẾT MÌNH ĐÃ THẢ TIM (LIKE)
// ==========================================
exports.getLikedPosts = async (req, res) => {
  try {
    const currentUserId = req.user.id || req.user._id;
    const posts = await Post.aggregate([
      { $match: { likes: new mongoose.Types.ObjectId(currentUserId) } }, 
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          pipeline: [{ $project: { name: 1, avatar: 1, role: 1, isVerified: 1 } }],
          as: "userId"
        }
      },
      { $unwind: { path: "$userId", preserveNullAndEmptyArrays: true } }
    ]);

    res.status(200).json({ success: true, posts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// 11. LẤY BÀI VIẾT MỚI NHẤT TOÀN HỆ THỐNG
// ==========================================
exports.getLatestPosts = async (req, res) => {
  try {
    const posts = await Post.aggregate([
      { $sort: { createdAt: -1 } }, 
      { $limit: 100 }, 
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          pipeline: [
            { $project: { name: 1, avatar: 1, role: 1, isVerified: 1 } }
          ],
          as: "userId"
        }
      },
      { $unwind: { path: "$userId", preserveNullAndEmptyArrays: true } }
    ]);

    res.status(200).json({ success: true, posts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// 12. QUẢN LÝ THÔNG BÁO (LẤY, CHẤM XANH, XÓA)
// ==========================================

// 12.1. Lấy danh sách thông báo
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id || req.user._id })
      .populate('senderId', 'name avatar isVerified')
      .sort({ createdAt: -1 })
      .limit(30); 
      
    res.status(200).json({ success: true, notifications });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 🌟 ĐÃ THÊM: 12.2. Đếm số lượng thông báo chưa đọc (Dùng để hiện chấm xanh ở UI)
exports.getUnreadNotificationCount = async (req, res) => {
  try {
    const unreadCount = await Notification.countDocuments({ 
      userId: req.user.id || req.user._id, 
      isRead: false 
    });
    
    res.status(200).json({ success: true, unreadCount });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 🌟 ĐÃ THÊM: 12.3. Đánh dấu 1 thông báo là đã đọc (Khi user click vào thông báo)
exports.markNotificationAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.notiId, userId: req.user.id || req.user._id },
      { isRead: true },
      { new: true }
    );
    
    if (!notification) return res.status(404).json({ message: "Không tìm thấy thông báo" });
    
    res.status(200).json({ success: true, notification });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 🌟 ĐÃ THÊM: 12.4. Đánh dấu TẤT CẢ thông báo là đã đọc (Nút "Mark all as read")
exports.markAllNotificationsAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user.id || req.user._id, isRead: false },
      { isRead: true }
    );
    
    res.status(200).json({ success: true, message: "Đã đánh dấu tất cả là đã đọc" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 12.5. Xóa thông báo thủ công
exports.deleteNotification = async (req, res) => {
  try {
    const deleted = await Notification.findOneAndDelete({ 
      _id: req.params.notiId, 
      userId: req.user.id || req.user._id // Bảo mật: Chỉ xóa được thông báo của chính mình
    });

    if (!deleted) return res.status(404).json({ message: "Thông báo không tồn tại hoặc không có quyền xóa" });

    res.status(200).json({ success: true, message: "Đã xóa thông báo" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// 13. CHIA SẺ BÀI VIẾT TỚI USER ĐANG FOLLOW
// ==========================================
exports.sharePostToUser = async (req, res) => {
  try {
    const { targetUserId } = req.body;
    
    await Notification.create({
      userId: targetUserId,
      senderId: req.user.id || req.user._id,
      type: 'share_post',
      postId: req.params.postId,
      isRead: false
    });

    res.status(200).json({ success: true, message: "Đã gửi bài viết tới người dùng!" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};