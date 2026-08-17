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

// ==========================================
// HELPERS CƠ BẢN
// ==========================================

// 1. Xử lý đường dẫn Media (Ảnh/Video)
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
      status: 'approved', // Mặc định là approved (nếu schema đã có default thì bỏ qua)
      originalReferenceId: workoutLogId || dietLogId || null,
      workoutSnapshot,
      dietSnapshot
    });

    await newPost.save();

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
    // CHI PT MOI DUOC CHIA SE LICH TAP / LICH AN
    if (req.user.role !== "trainer") {
      return res.status(403).json({
        success: false,
        message: "Chi co Personal Trainer (PT) moi duoc chia se lich tap va lich an!",
        requiresPTRole: true,
      });
    }
    const userId = req.user._id;
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
      status: 'approved',
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
      status: 'approved',
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
    const now = new Date();

    const posts = await Post.aggregate([
      // 1. Lấy tất cả bài viết approved (Không chặn cứng mốc 30 ngày)
      { 
        $match: { status: 'approved' } 
      },

      // 2. Lookup comments để lấy danh sách người dùng đã bình luận
      {
        $lookup: {
          from: "comments",
          localField: "_id",
          foreignField: "postId",
          pipeline: [{ $project: { userId: 1 } }],
          as: "commentsData"
        }
      },

      // 3. Chuẩn hóa dữ liệu tương tác
      {
        $addFields: {
          commenterIds: { $map: { input: "$commentsData", as: "c", in: "$$c.userId" } },
          totalLikes: { $size: { $ifNull: ["$likes", []] } }
        }
      },

      // 4. Kiểm tra trạng thái tương tác của User hiện tại
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
          isCommentedByMe: { $in: [currentUserIdObj, "$commenterIds"] },
          isViewedByMe: { $in: [currentUserIdObj, { $ifNull: ["$viewedBy", []] }] }
        }
      },

      // 5. LOẠI BỎ BÀI VIẾT: Ẩn bài viết nếu dính bất kỳ 1 trong 3 trạng thái
      {
        $match: {
          $nor: [
            { isLikedByMe: true },
            { isCommentedByMe: true },
            { isViewedByMe: true }
          ]
        }
      },

      // 6. TÍNH SỐ NGÀY BÀI VIẾT ĐÃ TỒN TẠI
      {
        $addFields: {
          ageInDays: {
            $divide: [
              { $subtract: [now, "$createdAt"] },
              1000 * 60 * 60 * 24 // Quy đổi ms ra số ngày
            ]
          }
        }
      },
      {
        $addFields: {
          // Tính số ngày vượt quá mốc 30 ngày (nếu <= 30 ngày thì = 0)
          daysOver30: {
            $max: [0, { $subtract: ["$ageInDays", 30] }]
          }
        }
      },

      // 7. TÍNH ĐIỂM BẢNG TIN (FEED SCORE) & TRỪ ĐIỂM SAU 30 NGÀY
      {
        $addFields: {
          feedScore: {
            $subtract: [
              // Điểm cộng từ độ tương tác & theo dõi
              {
                $add: [
                  { $cond: ["$isAuthorFollowed", 50, 0] },
                  { $cond: ["$isLikedByFollowed", 20, 0] },
                  { $cond: ["$isCommentedByFollowed", 20, 0] },
                  { $multiply: ["$totalLikes", 2] }
                ]
              },
              // Điểm trừ: Mỗi ngày vượt quá 30 ngày sẽ bị trừ 2 điểm
              { $multiply: ["$daysOver30", 2] }
            ]
          }
        }
      },

      // 8. SẮP XẾP THEO ĐIỂM CAO NHẤT ĐẾN THẤP NHẤT
      { $sort: { feedScore: -1, createdAt: -1 } },

      // 9. POPULATE THÔNG TIN TÁC GIẢ
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          pipeline: [
            { $project: { name: 1, avatar: 1, role: 1, isVerified: 1, isLocked: 1 } }
          ],
          as: "userId"
        }
      },
      { $unwind: { path: "$userId", preserveNullAndEmptyArrays: true } },

      // 10. LOẠI BỎ CÁC TRƯỜNG DỮ LIỆU TẠM
      { 
        $project: { 
          commentsData: 0, commenterIds: 0, isAuthorFollowed: 0, 
          isLikedByFollowed: 0, isCommentedByFollowed: 0, 
          isLikedByMe: 0, isCommentedByMe: 0, isViewedByMe: 0, 
          totalLikes: 0, ageInDays: 0, daysOver30: 0, feedScore: 0 
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
    const userId = req.user ? (req.user.id || req.user._id) : null;

    const updateQuery = { $inc: { viewsCount: 1 } };
    if (userId) {
      updateQuery.$addToSet = { viewedBy: userId }; // Thêm userId vào viewedBy nếu chưa có
    }

    const post = await Post.findByIdAndUpdate(
      req.params.postId, 
      updateQuery,
      { new: true }
    ).populate("userId", "name avatar role isLocked");

    if (!post) return res.status(404).json({ message: "Bài viết không tồn tại" });
    
    if (post.status !== 'approved') {
      return res.status(403).json({ success: false, message: "Bài viết này hiện không khả dụng." });
    }

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
    
    // 🌟 Tối ưu: Chỉ cần kiểm tra status
    if (post.status !== 'approved') {
      return res.status(403).json({ message: "Không thể thả tim, bài viết hiện không khả dụng." });
    }

    const isLiked = post.likes.includes(userId);
    if (isLiked) {
      post.likes.pull(userId);
    } else {
      post.likes.push(userId);
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

// ==========================================
// 5b. BÌNH LUẬN (TẠO / TRẢ LỜI)
// ==========================================
// req.body có thể chứa:
//   - content: nội dung bình luận
//   - parentCommentId: ID của comment/reply đang được bấm nút "Trả lời"
//     (không nhất thiết là comment gốc — nếu là 1 reply khác, hệ thống
//      sẽ tự truy ngược về đúng bình luận gốc để giữ cấu trúc phẳng 1 tầng)
exports.addComment = async (req, res) => {
  try {
    const { content, parentCommentId } = req.body;
    const post = await Post.findById(req.params.postId);
    const senderId = req.user.id;

    if (!post) return res.status(404).json({ message: "Không thấy bài viết" });

    if (post.status !== 'approved') {
      return res.status(403).json({ message: "Không thể bình luận, bài viết hiện không khả dụng." });
    }

    let rootParentId = null;      // ID của bình luận gốc (cấp cao nhất), lưu vào parentCommentId
    let replyToUserId = null;
    let replyToUserName = null;
    let notifyTargetUserId = null;

    if (parentCommentId) {
      const targetComment = await Comment.findById(parentCommentId).populate('userId', 'name');
      if (!targetComment) return res.status(404).json({ message: "Bình luận không tồn tại" });

      // Nếu target đã là 1 reply (đã có parentCommentId) -> gốc chính là parentCommentId của nó
      // Nếu target là comment gốc -> gốc chính là nó
      rootParentId = targetComment.parentCommentId || targetComment._id;

      replyToUserId = targetComment.userId._id;
      replyToUserName = targetComment.userId.name;
      notifyTargetUserId = targetComment.userId._id;
    }

    const newComment = new Comment({ 
      postId: post._id, 
      userId: senderId, 
      content,
      parentCommentId: rootParentId,
      replyToUserId,
      replyToUserName
    });
    await newComment.save();

    post.commentsCount += 1;
    await post.save();

    // Gửi thông báo tương ứng
    if (notifyTargetUserId) {
      if (notifyTargetUserId.toString() !== senderId.toString()) {
        await Notification.create({
          userId: notifyTargetUserId,
          senderId,
          type: 'reply_comment',
          postId: post._id,
          commentId: newComment._id,
          isRead: false
        });
      }
    } else if (post.userId.toString() !== senderId.toString()) {
      await Notification.create({ userId: post.userId, senderId, type: 'comment', postId: post._id, isRead: false });
    }

    const populatedComment = await Comment.findById(newComment._id).populate("userId", "name avatar role isVerified");

    res.status(201).json({ success: true, comment: populatedComment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// 5c. LIKE BÌNH LUẬN (áp dụng cho cả comment gốc và reply)
// ==========================================
exports.toggleLikeComment = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ message: "Không tìm thấy bình luận" });

    const isLiked = comment.likes.includes(userId);
    if (isLiked) {
      comment.likes.pull(userId);
    } else {
      comment.likes.push(userId);
      if (comment.userId.toString() !== userId.toString()) {
        await Notification.create({
          userId: comment.userId,
          senderId: userId,
          type: 'like_comment',
          postId: comment.postId,
          commentId: comment._id,
          isRead: false
        });
      }
    }

    await comment.save();
    res.status(200).json({ success: true, isLiked: !isLiked, likeCount: comment.likes.length });
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
    
    if (post.status !== 'approved') {
      return res.status(403).json({ message: "Không thể lưu lịch, bài viết hiện không khả dụng." });
    }

    if (type === 'workout' && post.workoutSnapshot) {
      const { _id, ...cleanData } = post.workoutSnapshot;
      await new WorkoutLog({ ...cleanData, userId: req.user.id, date: new Date(), isCompleted: false }).save();
      
      post.savesCount = (post.savesCount || 0) + 1;
      await post.save();

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
// getComments: trả về danh sách bình luận GỐC, mỗi bình luận gốc kèm mảng
// "replies" (đã gom phẳng 1 tầng, bao gồm cả reply-của-reply) để FE dễ render.
exports.getComments = async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: "Bài viết không tồn tại" });
    
    if (post.status !== 'approved') {
      return res.status(403).json({ message: "Bài viết hiện không khả dụng, không thể xem bình luận." });
    }

    const allComments = await Comment.find({ postId: req.params.postId })
      .populate("userId", "name avatar role isVerified")
      .sort({ createdAt: 1 });

    const topLevel = allComments.filter(c => !c.parentCommentId);

    const repliesMap = {};
    allComments.filter(c => c.parentCommentId).forEach(r => {
      const key = r.parentCommentId.toString();
      if (!repliesMap[key]) repliesMap[key] = [];
      repliesMap[key].push(r);
    });

    const comments = topLevel
      .map(c => ({
        ...c.toObject(),
        replies: (repliesMap[c._id.toString()] || []).sort(
          (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
        )
      }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

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

    // Xóa comment và toàn bộ reply gắn với nó (nếu đây là comment gốc)
    const repliesToDelete = await Comment.find({ parentCommentId: comment._id });
    const totalRemoved = 1 + repliesToDelete.length;

    await Comment.deleteMany({ $or: [{ _id: comment._id }, { parentCommentId: comment._id }] });

    if (post) {
      post.commentsCount = Math.max(0, post.commentsCount - totalRemoved);
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
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: "Không tìm thấy bài viết" });

    if (post.status !== 'approved') {
      return res.status(403).json({ message: "Không thể chia sẻ, bài viết hiện không khả dụng." });
    }

    post.sharesCount += 1;
    await post.save();
    
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
      { $match: { 
          userId: { $in: followingList },
          status: 'approved' 
      }},
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          pipeline: [{ $project: { name: 1, avatar: 1, role: 1, isVerified: 1, isLocked: 1 } }],
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
// 9b. LẤY BÀI VIẾT CỦA MỘT USER CỤ THỂ (TRANG CÁ NHÂN)
// ==========================================
exports.getUserPosts = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: "userId không hợp lệ" });
    }

    const posts = await Post.aggregate([
      { $match: {
          userId: new mongoose.Types.ObjectId(userId),
          status: 'approved'
      }},
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          pipeline: [{ $project: { name: 1, avatar: 1, role: 1, isVerified: 1, isLocked: 1 } }],
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
      { $match: { 
          likes: new mongoose.Types.ObjectId(currentUserId),
          status: 'approved'
      }}, 
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          pipeline: [{ $project: { name: 1, avatar: 1, role: 1, isVerified: 1, isLocked: 1 } }],
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
      { $match: { status: 'approved' } },
      { $sort: { createdAt: -1 } }, 
      { $limit: 100 }, 
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          pipeline: [
            { $project: { name: 1, avatar: 1, role: 1, isVerified: 1, isLocked: 1 } }
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

exports.deleteNotification = async (req, res) => {
  try {
    const deleted = await Notification.findOneAndDelete({ 
      _id: req.params.notiId, 
      userId: req.user.id || req.user._id 
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
    const postId = req.params.postId;
    
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Không tìm thấy bài viết." });

    if (post.status !== 'approved') {
      return res.status(403).json({ message: "Không thể chia sẻ, bài viết hiện không khả dụng." });
    }

    await Promise.all([
      Notification.create({
        userId: targetUserId,
        senderId: req.user.id || req.user._id,
        type: 'share_post',
        postId: postId,
        isRead: false
      }),
      Post.findByIdAndUpdate(postId, { $inc: { sharesCount: 1 } })
    ]);

    res.status(200).json({ success: true, message: "Đã gửi bài viết tới người dùng!" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// 14. BÁO CÁO BÀI VIẾT
// ==========================================
exports.reportPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { reason } = req.body;
    const reporterId = req.user.id || req.user._id;

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ success: false, message: "Không tìm thấy bài viết." });

    if (post.status !== 'approved') {
      return res.status(403).json({ message: "Bài viết này đã bị ẩn hoặc không khả dụng." });
    }

    const hasReported = post.reports.some(
      (report) => report.reporterId.toString() === reporterId.toString()
    );
    if (hasReported) {
      return res.status(400).json({ success: false, message: "Bạn đã báo cáo bài viết này rồi." });
    }

    post.reports.push({ reporterId, reason });
    post.reportsCount += 1;

    if (post.reportsCount >= 3 && post.status === 'approved') {
      post.status = 'pending_review';
    }

    await post.save();
    res.status(200).json({ success: true, message: "Cảm ơn bạn đã báo cáo. Chúng tôi sẽ xem xét nội dung này." });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// 15. GỢI Ý FOLLOW NGƯỜI DÙNG
// ==========================================
exports.getSuggestedUsers = async (req, res) => {
  try {
    const currentUserId = req.user.id || req.user._id;
    const currentUser = await User.findById(currentUserId);
    if (!currentUser) return res.status(404).json({ success: false, message: "Không tìm thấy user" });

    const excludeIds = [...(currentUser.following || []), currentUserId]
      .map(id => new mongoose.Types.ObjectId(id));

    // Ưu tiên Personal Trainer, sau đó xếp theo lượng người theo dõi
    const suggestions = await User.aggregate([
      { $match: { _id: { $nin: excludeIds } } },
      { $addFields: {
          followersCount: { $size: { $ifNull: ["$followers", []] } },
          priority: { $cond: [{ $eq: ["$role", "trainer"] }, 1, 0] }
        }
      },
      { $sort: { priority: -1, followersCount: -1 } },
      { $limit: 10 },
      { $project: { name: 1, avatar: 1, role: 1, isVerified: 1, followersCount: 1, bio: 1 } }
    ]);

    res.status(200).json({ success: true, users: suggestions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};