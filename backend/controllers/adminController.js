const User = require("../models/User");
const Food = require("../models/Food");
const Exercise = require("../models/Exercise");

// ==========================================
// 1. LẤY THỐNG KÊ TỔNG QUAN CHO TRANG CHỦ ADMIN (DASHBOARD)
// ==========================================
exports.getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: "user" });
    const premiumUsers = await User.countDocuments({ isPremium: true });
    const totalFoods = await Food.countDocuments();
    const totalExercises = await Exercise.countDocuments();

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        premiumUsers,
        totalFoods,
        totalExercises
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi lấy thống kê Dashboard", error: error.message });
  }
};

// ==========================================
// 2. QUẢN LÝ NGƯỜI DÙNG (USER MANAGEMENT)
// ==========================================

// Lấy danh sách toàn bộ người dùng
exports.getAllUsers = async (req, res) => {
  try {
    const { search, role, isPremium } = req.query;
    let query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } }
      ];
    }
    
    if (role) query.role = role;
    if (isPremium !== undefined) query.isPremium = isPremium === 'true';

    // Không trả về password của user
    const users = await User.find(query).select("-password").sort({ createdAt: -1 });
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: "Lỗi lấy danh sách người dùng", error: error.message });
  }
};

// Lấy chi tiết 1 người dùng
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ message: "Không tìm thấy người dùng này!" });
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: "Lỗi lấy thông tin người dùng", error: error.message });
  }
};

// Thêm User mới từ trang Admin (Ví dụ: Cấp tài khoản PT/Trainer)
exports.createUser = async (req, res) => {
    try {
        const newUser = new User(req.body);
        // Lưu ý: Nhớ hash password ở đây nếu bạn muốn tạo pass cho họ, 
        // hoặc gửi email yêu cầu họ tự đổi pass.
        await newUser.save();
        
        const { password, ...userWithoutPass } = newUser._doc;
        res.status(201).json({ message: "Tạo người dùng thành công", user: userWithoutPass });
    } catch (error) {
        res.status(400).json({ message: "Lỗi tạo người dùng", error: error.message });
    }
};

// Cập nhật thông tin / Phân quyền / Cộng VIP thủ công
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    delete updates.password; // Không đổi pass qua API này

    if (updates.premiumUntil) {
      const now = new Date();
      updates.isPremium = new Date(updates.premiumUntil) > now;
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select("-password");

    if (!updatedUser) return res.status(404).json({ message: "Không tìm thấy người dùng!" });

    res.status(200).json({ message: "Cập nhật tài khoản thành công!", user: updatedUser });
  } catch (error) {
    res.status(500).json({ message: "Lỗi cập nhật người dùng", error: error.message });
  }
};

// Xóa tài khoản người dùng
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (id === req.user.id) {
      return res.status(400).json({ message: "Bạn không thể tự xóa tài khoản Admin của chính mình!" });
    }

    const deletedUser = await User.findByIdAndDelete(id);
    if (!deletedUser) return res.status(404).json({ message: "Không tìm thấy người dùng để xóa!" });

    res.status(200).json({ message: `Đã xóa tài khoản ${deletedUser.email} khỏi hệ thống.` });
  } catch (error) {
    res.status(500).json({ message: "Lỗi xóa người dùng", error: error.message });
  }
};