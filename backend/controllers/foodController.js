const Food = require("../models/Food");

// 🌟 KHAI BÁO THƯ VIỆN AI
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 1. LẤY DANH SÁCH THỰC PHẨM (READ)
exports.getAllFoods = async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};
    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    const foods = await Food.find(query).sort({ createdAt: -1 });
    res.status(200).json(foods);
  } catch (error) {
    res.status(500).json({ message: "Lỗi lấy danh sách món ăn", error: error.message });
  }
};

// 2. THÊM THỰC PHẨM MỚI VÀO THƯ VIỆN (Đã thêm kiểm tra trùng lặp & trường mới)
exports.createFood = async (req, res) => {
  try {
    const { name, imageUrl, proteinPer100g, carbsPer100g, fatPer100g, caloriesPer100g, rating, healthStatus } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Tên thực phẩm không được để trống!" });
    }

    // Kiểm tra trùng lặp
    const duplicateFood = await Food.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, "i") }
    });

    if (duplicateFood) {
      return res.status(400).json({ message: `Thực phẩm "${name.trim()}" đã tồn tại trong thư viện!` });
    }

    const newFood = new Food({
      name: name.trim(),
      imageUrl,
      proteinPer100g,
      carbsPer100g,
      fatPer100g,
      caloriesPer100g,
      rating,
      healthStatus
    });

    await newFood.save();
    res.status(201).json({ message: "Đã thêm thực phẩm mới!", food: newFood });
  } catch (error) {
    res.status(500).json({ message: "Lỗi tạo món ăn", error: error.message });
  }
};

// 3. SỬA THÔNG TIN THỰC PHẨM (Đã thêm kiểm tra trùng lặp)
exports.updateFood = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    
    // Nếu đổi tên, kiểm tra xem tên mới có trùng với món khác không
    if (name) {
      const duplicateFood = await Food.findOne({
        name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
        _id: { $ne: id }
      });

      if (duplicateFood) {
        return res.status(400).json({ message: `Không thể đổi tên vì "${name.trim()}" đã được dùng cho thực phẩm khác!` });
      }
    }

    const updatedFood = await Food.findByIdAndUpdate(
      id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!updatedFood) return res.status(404).json({ message: "Không tìm thấy món ăn!" });

    res.status(200).json({ message: "Đã cập nhật thực phẩm!", food: updatedFood });
  } catch (error) {
    res.status(500).json({ message: "Lỗi cập nhật", error: error.message });
  }
};

// 4. XÓA THỰC PHẨM KHỎI THƯ VIỆN
exports.deleteFood = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedFood = await Food.findByIdAndDelete(id);
    if (!deletedFood) return res.status(404).json({ message: "Không tìm thấy món ăn!" });

    res.status(200).json({ message: "Đã xóa thực phẩm khỏi hệ thống!" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi xóa món ăn", error: error.message });
  }
};

const escapeRegex = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// 5. API GỢI Ý MÓN ĂN (Tìm kiếm Regex)
exports.suggestFood = async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query || !query.trim()) {
      return res.status(200).json({ success: true, data: [] });
    }

    const cleanQuery = query.trim();
    const words = cleanQuery.split(/\s+/).filter(word => word.length > 0);
    const regexPattern = words.map(word => `(?=.*${escapeRegex(word)})`).join('');
    const advancedRegex = new RegExp(regexPattern, 'i'); 

    const searchQuery = {
      $or: [
        { name: advancedRegex },
        { category: advancedRegex },
        { tags: advancedRegex }
      ]
    };

    const suggestions = await Food.find(searchQuery)
      .limit(5)
      .select('name caloriesPer100g category'); // Đã sửa lỗi đánh máy caloriesPer105g

    return res.status(200).json({ success: true, data: suggestions });
  } catch (error) {
    console.error("Lỗi khi tải gợi ý món ăn nâng cấp:", error);
    res.status(500).json({ success: false, message: "Đã xảy ra lỗi khi xử lý gợi ý", error: error.message });
  }
};

// 6. UPLOAD ẢNH THỰC PHẨM
exports.uploadFoodImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Vui lòng chọn một file ảnh để tải lên!" });
    }
    const imageUrl = `/uploads/images/${req.file.filename}`;
    return res.status(200).json({ message: "Tải ảnh lên thành công!", imageUrl });
  } catch (error) {
    return res.status(500).json({ message: "Lỗi upload ảnh", error: error.message });
  }
};

// 7. AI KIỂM TRA TRÙNG LẶP & TỰ ĐỘNG GỢI Ý THỰC PHẨM CHƯA CÓ
exports.checkAndSuggestFood = async (req, res) => {
  try {
    const { prompt } = req.body; 

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ success: false, message: "Vui lòng nhập tên thực phẩm hoặc nhóm thức ăn!" });
    }

    const existingFoods = await Food.find({}, "name");
    const existingTitles = existingFoods.map(f => f.name).join(", ");

    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" } 
    });

    const aiPrompt = `
      Bạn là một Chuyên gia Dinh dưỡng AI. 
      Admin đang muốn thêm thực phẩm vào cơ sở dữ liệu và nhập từ khóa: "${prompt}".
      Đây là danh sách thực phẩm ĐÃ CÓ SẴN trong hệ thống: [${existingTitles}].

      Nhiệm vụ của bạn là phân tích từ khóa "${prompt}":
      
      TRƯỜNG HỢP 1: Nếu từ khóa là một TÊN THỰC PHẨM cụ thể (Ví dụ: Ức gà, Trứng luộc, Cơm trắng...):
      - Hãy kiểm tra xem thực phẩm này đã xuất hiện trong danh sách ĐÃ CÓ SẴN chưa (kiểm tra cả tiếng Anh/Việt tương đồng).
      - Nếu ĐÃ CÓ SẴN: Trả về JSON có "exists": true và "message": "Thực phẩm này đã tồn tại trong hệ thống!".
      - Nếu CHƯA CÓ: Trả về JSON có "exists": false và TỰ ĐỘNG TÍNH TOÁN hàm lượng dinh dưỡng cho 100g thực phẩm đó vào mục "foodData".

      TRƯỜNG HỢP 2: Nếu từ khóa là một NHU CẦU/NHÓM THỰC PHẨM (Ví dụ: Đồ ăn giàu protein, Ăn vặt ít calo, Tinh bột chậm...):
      - Hãy GỢI Ý MỘT THỰC PHẨM PHỔ BIẾN NHẤT thuộc nhóm này nhưng BẮT BUỘC CHƯA CÓ trong danh sách ĐÃ CÓ SẴN ở trên.
      - Trả về JSON có "exists": false, "message": "Gợi ý thực phẩm phù hợp cho nhu cầu này" và TỰ ĐỘNG TÍNH TOÁN dữ liệu dinh dưỡng cho 100g thực phẩm đó.

      Cấu trúc JSON phản hồi bắt buộc phải tuân thủ nghiêm ngặt (Lưu ý: số liệu calo, protein, carbs, fat là kiểu Number tính trên 100g):
      {
        "exists": true hoặc false,
        "message": "Thông báo lý do bằng tiếng Việt",
        "foodData": {
          "name": "Tên thực phẩm bằng tiếng Việt (Kèm tiếng Anh nếu có)",
          "caloriesPer100g": 165,
          "proteinPer100g": 31,
          "carbsPer100g": 0,
          "fatPer100g": 3.6,
          "rating": 5, 
          "healthStatus": "healthy" 
        }
      }

      *Lưu ý đối với foodData:
      - "rating": Đánh giá chất lượng thực phẩm từ 1 đến 5 (kiểu Number).
      - "healthStatus": Bắt buộc chọn 1 trong 3 chuỗi: "healthy", "normal", hoặc "restricted".
      - Nếu "exists" là true, phần "foodData" hãy để là null.
    `;

    const result = await model.generateContent(aiPrompt);
    const responseData = JSON.parse(result.response.text());

    return res.status(200).json({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error("Lỗi AI gợi ý thực phẩm:", error);
    return res.status(500).json({ 
      success: false, 
      message: "AI gặp sự cố khi phân tích dữ liệu dinh dưỡng", 
      error: error.message 
    });
  }
};