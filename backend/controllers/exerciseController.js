const Exercise = require("../models/Exercise");

// ==========================================
// 1. THÊM BÀI TẬP MỚI (CREATE)
// ==========================================
exports.createExercise = async (req, res) => {
  try {
    const { name, muscleGroup, level, equipmentRequired, videoUrl, description } = req.body;

    const newExercise = new Exercise({
      name,
      muscleGroup,
      level,
      equipmentRequired,
      videoUrl,
      description
    });

    await newExercise.save();
    res.status(201).json({ message: "Đã thêm bài tập thành công!", exercise: newExercise });
  } catch (error) {
    res.status(500).json({ message: "Lỗi tạo bài tập", error: error.message });
  }
};

// ==========================================
// 2. LẤY DANH SÁCH BÀI TẬP (READ ALL & FILTER)
// ==========================================
// App của bạn có thể gọi API này kèm query để lọc. 
// Ví dụ: /api/exercises?muscleGroup=Chest&level=beginner
exports.getExercises = async (req, res) => {
  try {
    const { muscleGroup, level, equipmentRequired, search } = req.query;
    let filter = {};

    if (muscleGroup) filter.muscleGroup = muscleGroup;
    if (level) filter.level = level;
    if (equipmentRequired) filter.equipmentRequired = equipmentRequired;
    
    // Tìm kiếm theo tên bài tập (không phân biệt hoa thường)
    if (search) {
      filter.name = { $regex: search, $options: "i" };
    }

    const exercises = await Exercise.find(filter);
    res.status(200).json(exercises);
  } catch (error) {
    res.status(500).json({ message: "Lỗi lấy danh sách bài tập", error: error.message });
  }
};

// ==========================================
// 3. LẤY CHI TIẾT 1 BÀI TẬP THEO ID (READ ONE)
// ==========================================
exports.getExerciseById = async (req, res) => {
  try {
    const { id } = req.params;
    const exercise = await Exercise.findById(id);

    if (!exercise) return res.status(404).json({ message: "Không tìm thấy bài tập này!" });

    res.status(200).json(exercise);
  } catch (error) {
    res.status(500).json({ message: "Lỗi lấy chi tiết bài tập", error: error.message });
  }
};

// ==========================================
// 4. SỬA THÔNG TIN BÀI TẬP (UPDATE)
// ==========================================
exports.updateExercise = async (req, res) => {
  try {
    const { id } = req.params;
    
    const updatedExercise = await Exercise.findByIdAndUpdate(
      id,
      { $set: req.body },
      { new: true, runValidators: true } // runValidators đảm bảo enum (VD: beginner, advanced) không bị nhập sai
    );

    if (!updatedExercise) return res.status(404).json({ message: "Không tìm thấy bài tập để sửa!" });

    res.status(200).json({ message: "Đã cập nhật bài tập!", exercise: updatedExercise });
  } catch (error) {
    res.status(500).json({ message: "Lỗi cập nhật", error: error.message });
  }
};

// ==========================================
// 5. XÓA BÀI TẬP (DELETE)
// ==========================================
exports.deleteExercise = async (req, res) => {
  try {
    const { id } = req.params;
    
    const deletedExercise = await Exercise.findByIdAndDelete(id);
    if (!deletedExercise) return res.status(404).json({ message: "Không tìm thấy bài tập để xóa!" });

    res.status(200).json({ message: "Đã xóa bài tập khỏi thư viện!" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi xóa bài tập", error: error.message });
  }
};
// ==========================================
// 6. UPLOAD VIDEO BÀI TẬP (ADMIN)
// ==========================================
exports.uploadExerciseVideo = async (req, res) => {
  try {
    // Multer đã xử lý file và gắn vào req.file
    if (!req.file) {
      return res.status(400).json({ message: "Vui lòng chọn một file video để tải lên!" });
    }

    // Tạo đường dẫn URL để lưu vào Database
    // Trùng khớp với thư mục tĩnh (static folder) mình sẽ cấu hình ở server.js
    const videoUrl = `/uploads/videos/${req.file.filename}`;

    res.status(200).json({ 
      message: "Tải video lên thành công!", 
      videoUrl: videoUrl 
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi upload video", error: error.message });
  }
};