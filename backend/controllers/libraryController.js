// 📄 controllers/libraryController.js
const Post = require("../models/Post");
const SavedLibrary = require("../models/SavedLibrary");
const MasterWorkoutPlan = require("../models/WorkoutPlan");
const MealPlan = require("../models/MealPlan");

// ==========================================
// 1. LƯU BÀI VIẾT (CHỨA LỊCH) VỀ KHO LƯU TRỮ
// ==========================================
exports.saveToLibrary = async (req, res) => {
  try {
    const { postId, type } = req.body; // type: 'workout' hoặc 'diet'
    const userId = req.user.id;

    const post = await Post.findById(postId).populate('userId', 'name');
    if (!post) return res.status(404).json({ message: "Không tìm thấy bài viết" });

    // Kiểm tra xem đã lưu chưa để tránh trùng lặp
    const existingSave = await SavedLibrary.findOne({ userId, originalPostId: postId, type });
    if (existingSave) return res.status(400).json({ message: "Bạn đã lưu lịch này vào kho rồi!" });

    let title = "";
    let workoutData = null;
    let dietData = null;

    if (type === 'workout' && post.workoutSnapshot) {
      title = `Lịch tập từ ${post.userId.name}`;
      workoutData = post.workoutSnapshot;
    } else if (type === 'diet' && post.dietSnapshot) {
      title = `Lịch ăn từ ${post.userId.name}`;
      dietData = post.dietSnapshot;
    } else {
      return res.status(400).json({ message: "Bài viết này không có dữ liệu phù hợp để lưu" });
    }

    const newSavedItem = new SavedLibrary({
      userId,
      originalPostId: postId,
      type,
      title,
      workoutData,
      dietData
    });

    await newSavedItem.save();

    // Tăng biến đếm savesCount trong Post
    post.savesCount = (post.savesCount || 0) + 1;
    await post.save();

    res.status(201).json({ success: true, message: "Đã lưu vào kho thư viện của bạn!" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// 2. LẤY DANH SÁCH KHO LƯU TRỮ CỦA USER
// ==========================================
exports.getMyLibrary = async (req, res) => {
  try {
    const userId = req.user.id;
    // Lấy danh sách, có thể filter theo type (workout/diet) từ req.query nếu cần
    const filter = { userId };
    if (req.query.type) filter.type = req.query.type;

    const library = await SavedLibrary.find(filter).sort({ createdAt: -1 });
    res.status(200).json({ success: true, library });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// 3. XÓA KHỎI KHO LƯU TRỮ
// ==========================================
exports.removeFromLibrary = async (req, res) => {
  try {
    const { libraryId } = req.params;
    const userId = req.user.id;

    const deletedItem = await SavedLibrary.findOneAndDelete({ _id: libraryId, userId });
    if (!deletedItem) return res.status(404).json({ message: "Không tìm thấy mục trong kho" });

    res.status(200).json({ success: true, message: "Đã xóa khỏi kho lưu trữ" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// 4. ÁP DỤNG LỊCH TỪ KHO VÀO LỊCH CÁ NHÂN
// ==========================================
exports.applyFromLibrary = async (req, res) => {
  try {
    const { libraryId } = req.params;
    const userId = req.user.id;

    const savedItem = await SavedLibrary.findOne({ _id: libraryId, userId });
    if (!savedItem) return res.status(404).json({ message: "Không tìm thấy dữ liệu trong kho" });

    if (savedItem.type === 'workout') {
      // Dọn dẹp dữ liệu rác trước khi đè (loại bỏ _id cũ)
      const cleanWeeklySchedule = savedItem.workoutData.weeklySchedule.map(day => ({
        ...day,
        _id: undefined, 
        exercises: day.exercises.map(ex => ({ ...ex, _id: undefined }))
      }));

      // Tìm và cập nhật đè (upsert: true nghĩa là chưa có thì tạo mới)
      await MasterWorkoutPlan.findOneAndUpdate(
        { userId },
        { $set: { weeklySchedule: cleanWeeklySchedule } },
        { upsert: true, new: true }
      );

      return res.status(200).json({ success: true, message: "Đã áp dụng lịch tập thành công!" });
    } 
    
    if (savedItem.type === 'diet') {
      // Ghi đè vào MealPlan
      const cleanMeals = savedItem.dietData.meals.map(meal => ({
        ...meal,
        _id: undefined,
        items: meal.items.map(item => ({ ...item, _id: undefined }))
      }));

      await MealPlan.findOneAndUpdate(
        { userId },
        { 
          $set: { 
            meals: cleanMeals,
            dailyTotal: savedItem.dietData.dailyTotal 
          } 
        },
        { upsert: true, new: true }
      );

      return res.status(200).json({ success: true, message: "Đã áp dụng thực đơn thành công!" });
    }

    res.status(400).json({ message: "Loại dữ liệu không hợp lệ" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};