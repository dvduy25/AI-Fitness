const User = require("../models/User");
const Food = require("../models/Food");
const Exercise = require("../models/Exercise");

// ==========================================
// 1. LẤY THỐNG KÊ TỔNG QUAN (DASHBOARD)
// ==========================================
exports.getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: "user" });
    const premiumUsers = await User.countDocuments({ isPremium: true });
    const totalFoods = await Food.countDocuments();
    const totalExercises = await Exercise.countDocuments();

    res.status(200).json({
      success: true,
      data: { totalUsers, premiumUsers, totalFoods, totalExercises }
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi lấy thống kê Dashboard", error: error.message });
  }
};

// ==========================================
// 2. QUẢN LÝ NGƯỜI DÙNG (USER MANAGEMENT)
// ==========================================
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

    const users = await User.find(query).select("-password").sort({ createdAt: -1 });
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: "Lỗi lấy danh sách người dùng", error: error.message });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ message: "Không tìm thấy người dùng này!" });
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: "Lỗi lấy thông tin người dùng", error: error.message });
  }
};

exports.createUser = async (req, res) => {
    try {
        const newUser = new User(req.body);
        await newUser.save();
        
        const { password, ...userWithoutPass } = newUser._doc;
        res.status(201).json({ message: "Tạo người dùng thành công", user: userWithoutPass });
    } catch (error) {
        res.status(400).json({ message: "Lỗi tạo người dùng", error: error.message });
    }
};

// CẬP NHẬT & PHÂN QUYỀN (TÍCH HỢP BẪY ADMIN & KIỂM TRA TRAINER)
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    delete updates.password; // Không đổi pass qua API này

    const targetUser = await User.findById(id);
    if (!targetUser) return res.status(404).json({ message: "Không tìm thấy người dùng!" });

    // 🛑 BẢO MẬT: BẪY ADMIN THỨ 2
    if (updates.role === 'admin') {
      await User.findByIdAndUpdate(id, { isLocked: true });
      return res.status(403).json({ 
        success: false,
        message: "Cảnh báo bảo mật: Hệ thống chỉ cho phép 1 Admin. Tài khoản mục tiêu đã bị khóa tự động!" 
      });
    }

    // 🛑 NGHIỆP VỤ: ĐIỀU KIỆN LÊN TRAINER
    if (updates.role === 'trainer' && targetUser.role !== 'trainer') {
      const finalPhone = updates.phone || targetUser.phone;
      const finalAddress = updates.address || targetUser.address;
      const finalCccd = updates.cccd || targetUser.cccd;

      if (!finalPhone || !finalAddress || !finalCccd) {
        return res.status(400).json({ 
          success: false,
          message: "Phân quyền thất bại: Bắt buộc phải có Số điện thoại, Địa chỉ và CCCD để lên Trainer." 
        });
      }
    }

    // Xử lý gói Premium
    if (updates.premiumUntil) {
      const now = new Date();
      updates.isPremium = new Date(updates.premiumUntil) > now;
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select("-password");

    res.status(200).json({ message: "Cập nhật tài khoản thành công!", user: updatedUser });
  } catch (error) {
    res.status(500).json({ message: "Lỗi cập nhật người dùng", error: error.message });
  }
};

// ==========================================
// 3. TÍNH NĂNG KHÓA / MỞ KHÓA / XÓA
// ==========================================

// Bật / Tắt trạng thái khóa tài khoản
exports.toggleLockUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (id === req.user.id) {
      return res.status(400).json({ message: "Bạn không thể tự khóa tài khoản Admin của chính mình!" });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "Không tìm thấy người dùng!" });

    user.isLocked = !user.isLocked;
    await user.save();

    const statusMessage = user.isLocked ? "Đã KHÓA tài khoản" : "Đã MỞ KHÓA tài khoản";
    res.status(200).json({ message: `${statusMessage} thành công!`, isLocked: user.isLocked });
  } catch (error) {
    res.status(500).json({ message: "Lỗi xử lý khóa tài khoản", error: error.message });
  }
};

// Xóa tài khoản
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