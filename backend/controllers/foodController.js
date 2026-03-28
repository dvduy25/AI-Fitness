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