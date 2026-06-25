const Exercise = require("../models/Exercise");

// 🌟 KHAI BÁO THƯ VIỆN AI Ở ĐÂY (ĐẦU FILE)
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 1. THÊM BÀI TẬP MỚI (Đã cải tiến kiểm tra trùng lặp)
exports.createExercise = async (req, res) => {
  try {
    const { 
      name, 
      muscleGroup, 
      level, 
      equipmentRequired, 
      videoUrl, 
      description, 
      effectiveness 
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Tên bài tập không được để trống!" });
    }

    // 🔍 KIỂM TRA TRÙNG TÊN (Không phân biệt hoa thường và khoảng trắng thừa)
    const duplicateExercise = await Exercise.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, "i") }
    });

    if (duplicateExercise) {
      return res.status(400).json({ 
        message: `Bài tập "${name.trim()}" đã tồn tại trong thư viện thuộc nhóm cơ [${duplicateExercise.muscleGroup}]!` 
      });
    }

    // Nếu chưa có thì tiến hành tạo mới
    const newExercise = new Exercise({ 
      name: name.trim(), 
      muscleGroup, 
      level, 
      equipmentRequired, 
      videoUrl, 
      description,
      effectiveness 
    });

    await newExercise.save();
    res.status(201).json({ message: "Đã thêm bài tập thành công!", exercise: newExercise });
  } catch (error) {
    res.status(500).json({ message: "Lỗi tạo bài tập", error: error.message });
  }
};

// 2. LẤY DANH SÁCH (Hỗ trợ bộ lọc nâng cao)
exports.getExercises = async (req, res) => {
  try {
    const { muscleGroup, level, equipmentRequired, search } = req.query;
    let filter = {};
    if (muscleGroup) filter.muscleGroup = muscleGroup;
    if (level) filter.level = level;
    if (equipmentRequired) filter.equipmentRequired = equipmentRequired;
    if (search) filter.name = { $regex: search, $options: "i" };

    const exercises = await Exercise.find(filter).sort({ createdAt: -1 });
    res.status(200).json(exercises);
  } catch (error) {
    res.status(500).json({ message: "Lỗi lấy danh sách bài tập", error: error.message });
  }
};

// 3. LẤY CHI TIẾT BÀI TẬP
exports.getExerciseById = async (req, res) => {
  try {
    const exercise = await Exercise.findById(req.params.id);
    if (!exercise) return res.status(404).json({ message: "Không tìm thấy bài tập này!" });
    res.status(200).json(exercise);
  } catch (error) {
    res.status(500).json({ message: "Lỗi lấy chi tiết bài tập", error: error.message });
  }
};

// 4. CẬP NHẬT BÀI TẬP
exports.updateExercise = async (req, res) => {
  try {
    const { name } = req.body;

    // Nếu Admin sửa cả tên, kiểm tra xem tên mới có trùng với bài tập KHÁC không
    if (name) {
      const duplicateExercise = await Exercise.findOne({
        name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
        _id: { $ne: req.params.id } // Loại trừ chính bài tập đang sửa ra
      });

      if (duplicateExercise) {
        return res.status(400).json({ 
          message: `Không thể đổi tên thành "${name.trim()}" vì tên này đã được dùng cho bài tập khác!` 
        });
      }
    }

    const updatedExercise = await Exercise.findByIdAndUpdate(
      req.params.id,
      { $set: req.body }, 
      { new: true, runValidators: true } 
    );
    if (!updatedExercise) return res.status(404).json({ message: "Không tìm thấy bài tập để sửa!" });
    res.status(200).json({ message: "Đã cập nhật bài tập!", exercise: updatedExercise });
  } catch (error) {
    res.status(500).json({ message: "Lỗi cập nhật", error: error.message });
  }
};

// 5. XÓA BÀI TẬP KHỎI THƯ VIỆN
exports.deleteExercise = async (req, res) => {
  try {
    const deletedExercise = await Exercise.findByIdAndDelete(req.params.id);
    if (!deletedExercise) return res.status(404).json({ message: "Không tìm thấy bài tập để xóa!" });
    res.status(200).json({ message: "Đã xóa bài tập khỏi thư viện!" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi xóa bài tập", error: error.message });
  }
};

// 6. UPLOAD VIDEO HƯỚNG DẪN BÀI TẬP
exports.uploadExerciseVideo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Vui lòng chọn một file video để tải lên!" });
    }
    const videoUrl = `/uploads/media/${req.file.filename}`;
    res.status(200).json({ message: "Tải video lên thành công!", videoUrl });
  } catch (error) {
    res.status(500).json({ message: "Lỗi upload video", error: error.message });
  }
};

// 7. AI KIỂM TRA TRÙNG LẶP & TỰ ĐỘNG GỢI Ý BÀI TẬP CHƯA CÓ
exports.checkAndSuggestExercise = async (req, res) => {
  try {
    const { prompt } = req.body; 

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ success: false, message: "Vui lòng nhập tên bài tập hoặc nhóm cơ!" });
    }

    const existingExercises = await Exercise.find({}, "name muscleGroup");
    const existingTitles = existingExercises.map(e => e.name).join(", ");

    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" } 
    });

    const aiPrompt = `
      Bạn là một Trợ lý Huấn luyện viên Hình thể AI. 
      Admin đang muốn thêm bài tập và nhập từ khóa sau: "${prompt}".
      đây là danh sách tất cả các bài tập ĐÃ CÓ SẴN trong hệ thống database: [${existingTitles}].

      Nhiệm vụ của bạn là phân tích từ khóa "${prompt}":
      
      TRƯỜNG HỢP 1: Nếu từ khóa là một TÊN BÀI TẬP cụ thể (Ví dụ: Hít đất, Bench Press, Squat...):
      - Hãy kiểm tra xem tên bài tập này đã xuất hiện trong danh sách ĐÃ CÓ SẴN ở trên chưa (kiểm tra cả tiếng Anh lẫn tiếng Việt tương đồng).
      - Nếu ĐÃ CÓ SẴN: Trả về JSON có "exists": true và "message": "Bài tập này đã tồn tại trong hệ thống!".
      - Nếu CHƯA CÓ: Trả về JSON có "exists": false và TỰ ĐỘNG SOẠN THẢO dữ liệu chi tiết cho bài tập đó vào mục "exerciseData".

      TRƯỜNG HỢP 2: Nếu từ khóa là một NHÓM CƠ (Ví dụ: Ngực, Lưng, Vai, Chân, Tay, Bụng...):
      - Hãy GỢI Ý MỘT BÀI TẬP MỚI TOÀN DIỆN VÀ PHỔ BIẾN NHẤT thuộc nhóm cơ này nhưng BẮT BUỘC CHƯA CÓ trong danh sách ĐÃ CÓ SẴN ở trên.
      - Trả về JSON có "exists": false, "message": "Gợi ý bài tập mới cho nhóm cơ này" và TỰ ĐỘNG SOẠN THẢO dữ liệu chi tiết bài tập đó vào mục "exerciseData".

      Cấu trúc JSON phản hồi bắt buộc phải tuân thủ nghiêm ngặt:
      {
        "exists": true hoặc false,
        "message": "Chuỗi thông báo giải thích lý do bằng tiếng Việt",
        "exerciseData": {
          "name": "Tên bài tập bằng tiếng Việt (Kèm tên gốc tiếng Anh nếu có)",
          "muscleGroup": "Ghi đúng 1 trong các nhóm cơ sau: Ngực, Lưng xô, Vai, Tay trước, Tay sau, Đùi trước, Đùi sau/Mông, Bắp chân, Bụng/Cơ lõi",
          "level": "Chỉ chọn: 'beginner' hoặc 'intermediate' hoặc 'advanced'",
          "equipmentRequired": "Tên dụng cụ (Ví dụ: Tạ đơn, Thảm tập, Máy cáp...) hoặc 'Không cần dụng cụ'",
          "description": "Hướng dẫn các bước tập 1, 2, 3 ngắn gọn và lưu ý thực hiện",
          "effectiveness": "Điền một số từ 1 đến 5 đánh giá độ hiệu quả"
        }
      }

      Lưu ý: Nếu "exists" là true, phần "exerciseData" hãy để là null.
    `;

    const result = await model.generateContent(aiPrompt);
    const responseData = JSON.parse(result.response.text());

    return res.status(200).json({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error("Lỗi AI gợi ý bài tập:", error);
    return res.status(500).json({ 
      success: false, 
      message: "AI gặp sự cố khi phân tích dữ liệu", 
      error: error.message 
    });
  }
};