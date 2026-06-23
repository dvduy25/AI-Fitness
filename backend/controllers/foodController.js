const Food = require("../models/Food");

// 1. LẤY DANH SÁCH THỰC PHẨM (READ) - Có thể dùng để Frontend làm thanh tìm kiếm
exports.getAllFoods = async (req, res) => {
  try {
    // Có thể thêm tính năng search theo tên (nếu cần)
    const { search } = req.query;
    let query = {};
    if (search) {
      query.name = { $regex: search, $options: "i" }; // Tìm kiếm không phân biệt hoa thường
    }

    const foods = await Food.find(query);
    res.status(200).json(foods);
  } catch (error) {
    res.status(500).json({ message: "Lỗi lấy danh sách món ăn", error: error.message });
  }
};

// 2. THÊM THỰC PHẨM MỚI VÀO THƯ VIỆN (CREATE)
exports.createFood = async (req, res) => {
  try {
    const { name, imageUrl, proteinPer100g, carbsPer100g, fatPer100g, caloriesPer100g } = req.body;

    const newFood = new Food({
      name,
      imageUrl,
      proteinPer100g,
      carbsPer100g,
      fatPer100g,
      caloriesPer100g
    });

    await newFood.save();
    res.status(201).json({ message: "Đã thêm thực phẩm mới!", food: newFood });
  } catch (error) {
    res.status(500).json({ message: "Lỗi tạo món ăn", error: error.message });
  }
};

// 3. SỬA THÔNG TIN THỰC PHẨM (UPDATE) - Dùng khi muốn đổi ảnh hoặc cập nhật lại Calo
exports.updateFood = async (req, res) => {
  try {
    const { id } = req.params;
    
    const updatedFood = await Food.findByIdAndUpdate(
      id,
      { $set: req.body },
      { new: true } // Trả về data mới sau khi update
    );

    if (!updatedFood) return res.status(404).json({ message: "Không tìm thấy món ăn!" });

    res.status(200).json({ message: "Đã cập nhật thực phẩm!", food: updatedFood });
  } catch (error) {
    res.status(500).json({ message: "Lỗi cập nhật", error: error.message });
  }
};

// 4. XÓA THỰC PHẨM KHỎI THƯ VIỆN (DELETE)
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
// Hàm phụ trợ chống lỗi Regex (nếu bạn chưa khai báo ở trên)
const escapeRegex = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// API GỢI Ý MÓN ĂN KHI ĐANG GÕ (Chỉ tìm trong DB, cực nhanh)
exports.suggestFood = async (req, res) => {
  try {
    const { query } = req.query;
    
    // Nếu người dùng chưa gõ gì hoặc gõ chuỗi rỗng thì trả về mảng rỗng
    if (!query || !query.trim()) {
      return res.status(200).json({ success: true, data: [] });
    }

    const cleanQuery = query.trim();
    const safeRegex = new RegExp(escapeRegex(cleanQuery), 'i'); // 'i' để không phân biệt hoa thường

    // Tìm trong Database: Chỉ lấy tối đa 5 kết quả, và chỉ lấy trường name + caloriesPer100g
    const suggestions = await Food.find({ name: safeRegex })
                                  .limit(5)
                                  .select('name caloriesPer100g');

    return res.status(200).json({
      success: true,
      data: suggestions
    });

  } catch (error) {
    console.error("Lỗi khi tải gợi ý món ăn:", error);
    res.status(500).json({ 
      success: false, 
      message: "Đã xảy ra lỗi khi tải gợi ý", 
      error: error.message 
    });
  }
};