const Post = require("../models/Post");
const SavedLibrary = require("../models/SavedLibrary");
const MasterWorkoutPlan = require("../models/WorkoutPlan");
const MealPlan = require("../models/MealPlan");

// ==========================================
// 1. LƯU BÀI VIẾT (TỪ BẢNG TIN) VỀ KHO LƯU TRỮ
// ==========================================
exports.saveToLibrary = async (req, res) => {
  try {
    const { postId, type } = req.body;
    const userId = req.user.id;

    const post = await Post.findById(postId).populate('userId', 'name');
    if (!post) return res.status(404).json({ message: "Không tìm thấy bài viết" });

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
      return res.status(400).json({ message: "Bài viết không có dữ liệu phù hợp" });
    }

    const newSavedItem = new SavedLibrary({ userId, originalPostId: postId, type, title, workoutData, dietData });
    await newSavedItem.save();

    post.savesCount = (post.savesCount || 0) + 1;
    await post.save();

    res.status(201).json({ success: true, message: "Đã lưu vào kho thư viện của bạn!" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// 2. LƯU LỊCH MASTER HIỆN TẠI CỦA MÌNH VÀO KHO (MỚI)
// ==========================================
exports.saveMasterToLibrary = async (req, res) => {
  try {
    const { type } = req.body; // 'workout' hoặc 'diet'
    const userId = req.user.id;
    let title = "";
    let workoutData = null;
    let dietData = null;

    if (type === 'workout') {
      const plan = await MasterWorkoutPlan.findOne({ userId });
      if (!plan || !plan.weeklySchedule || plan.weeklySchedule.length === 0) {
        return res.status(404).json({ message: "Bạn chưa có lịch tập nào để lưu!" });
      }
      title = `Lịch tập cá nhân - ${new Date().toLocaleDateString('vi-VN')}`;
      workoutData = plan.toObject();
    } else if (type === 'diet') {
      const plan = await MealPlan.findOne({ userId });
      if (!plan || !plan.meals || plan.meals.length === 0) {
        return res.status(404).json({ message: "Bạn chưa có thực đơn nào để lưu!" });
      }
      title = `Thực đơn cá nhân - ${new Date().toLocaleDateString('vi-VN')}`;
      dietData = plan.toObject();
    } else {
      return res.status(400).json({ message: "Loại dữ liệu không hợp lệ" });
    }

    const newSavedItem = new SavedLibrary({ userId, type, title, workoutData, dietData });
    await newSavedItem.save();

    res.status(201).json({ success: true, message: "Đã lưu lịch hiện tại vào kho!" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// 3. LẤY DANH SÁCH KHO LƯU TRỮ CỦA USER
// ==========================================
exports.getMyLibrary = async (req, res) => {
  try {
    const userId = req.user.id;
    const filter = { userId };
    if (req.query.type) filter.type = req.query.type;

    const library = await SavedLibrary.find(filter).sort({ createdAt: -1 });
    res.status(200).json({ success: true, library });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// 4. XÓA KHỎI KHO LƯU TRỮ
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
// 5. ÁP DỤNG LỊCH TỪ KHO VÀO LỊCH CÁ NHÂN (ĐÃ NÂNG CẤP)
// ==========================================
exports.applyFromLibrary = async (req, res) => {
  try {
    // Hỗ trợ lấy ID từ cả URL param (req.params) hoặc Body (req.body)
    const libraryId = req.params.libraryId || req.body.libraryId;
    const userId = req.user.id;

    if (!libraryId) return res.status(400).json({ message: "Thiếu ID của lịch trong kho" });

    const savedItem = await SavedLibrary.findOne({ _id: libraryId, userId });
    if (!savedItem) return res.status(404).json({ message: "Không tìm thấy dữ liệu trong kho" });

    if (savedItem.type === 'workout' && savedItem.workoutData) {
      const cleanWeeklySchedule = savedItem.workoutData.weeklySchedule.map(day => ({
        ...day,
        _id: undefined, 
        exercises: day.exercises.map(ex => ({ ...ex, _id: undefined }))
      }));

      const newPlan = await MasterWorkoutPlan.findOneAndUpdate(
        { userId },
        { $set: { weeklySchedule: cleanWeeklySchedule } },
        { upsert: true, new: true }
      );

      return res.status(200).json({ success: true, message: "Đã áp dụng lịch tập thành công!", plan: newPlan });
    } 
    
    if (savedItem.type === 'diet' && savedItem.dietData) {
      const cleanMeals = savedItem.dietData.meals.map(meal => ({
        ...meal,
        _id: undefined,
        items: meal.items.map(item => ({ ...item, _id: undefined }))
      }));

      const newPlan = await MealPlan.findOneAndUpdate(
        { userId },
        { 
          $set: { 
            meals: cleanMeals,
            dailyTotal: savedItem.dietData.dailyTotal 
          } 
        },
        { upsert: true, new: true }
      );

      return res.status(200).json({ success: true, message: "Đã áp dụng thực đơn thành công!", plan: newPlan });
    }

    res.status(400).json({ message: "Lịch trong kho bị lỗi hoặc không có dữ liệu" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};