const User = require("../models/User");
const Food = require("../models/Food");
const Exercise = require("../models/Exercise");


const Post = require("../models/Post");
const Comment = require("../models/Comment");
const Transaction = require("../models/Transaction"); // Sử dụng model này để lấy doanh thu

// ==========================================
// 1. LẤY THỐNG KÊ TỔNG QUAN (DASHBOARD)
// ==========================================
exports.getDashboardStats = async (req, res) => {
  try {
    // 1. Lấy thống kê con số cơ bản (Đếm tất cả user để tính tỷ lệ VIP chính xác ở FE)
    const totalUsers = await User.countDocuments();
    const premiumUsers = await User.countDocuments({ isPremium: true });
    const totalFoods = await Food.countDocuments();
    const totalExercises = await Exercise.countDocuments();

    // Lấy mốc thời gian 7 ngày trước để lọc dữ liệu biểu đồ
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // 2. Tính toán biểu đồ Tăng trưởng tài khoản (userGrowth) trong 7 ngày qua
    const userGrowthAggr = await User.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%d/%m", date: "$createdAt", timezone: "+07:00" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    const userGrowth = userGrowthAggr.map(item => ({
      date: item._id,
      count: item.count
    }));

    // 3. ĐỒNG BỘ DOANH THU: Tính toán dựa trên bảng Transaction thực tế
    // Tính tổng doanh thu toàn thời gian (Từ các đơn PREMIUM_UPGRADE thành công)
    const totalRevenueData = await Transaction.aggregate([
      { 
        $match: { 
          transactionType: "PREMIUM_UPGRADE", 
          status: "SUCCESS" 
        } 
      },
      { 
        $group: { 
          _id: null, 
          total: { $sum: "$amount" } 
        } 
      }
    ]);
    const totalRevenue = totalRevenueData.length > 0 ? totalRevenueData[0].total : 0;

    // Tính doanh thu biến động 7 ngày qua cho biểu đồ
    const revenueAggr = await Transaction.aggregate([
      { 
        $match: { 
          transactionType: "PREMIUM_UPGRADE", 
          status: "SUCCESS", 
          createdAt: { $gte: sevenDaysAgo } 
        } 
      },
      {
        $group: {
          _id: { $dateToString: { format: "%d/%m", date: "$createdAt", timezone: "+07:00" } },
          revenue: { $sum: "$amount" }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    const revenueHistory = revenueAggr.map(item => ({
      date: item._id,
      revenue: item.revenue
    }));

    // 4. Gửi toàn bộ dữ liệu hợp nhất trả về Frontend
    return res.status(200).json({
      success: true,
      data: { 
        totalUsers, 
        premiumUsers, 
        totalFoods, 
        totalExercises,
        totalRevenue,   
        revenueHistory, // Sóng biểu đồ doanh thu thật từ Database
        userGrowth      
      }
    });
  } catch (error) {
    return res.status(500).json({ message: "Lỗi lấy thống kê Dashboard", error: error.message });
  }
};

// ==========================================
// 2. QUẢN LÝ NGƯỜI DÙNG (USER MANAGEMENT) - GIỮ NGUYÊN HOÀN TOÀN LOGIC CỦA BẠN
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

exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    delete updates.password; 

    const targetUser = await User.findById(id);
    if (!targetUser) return res.status(404).json({ message: "Không tìm thấy người dùng!" });

    if (updates.role === 'admin') {
      await User.findByIdAndUpdate(id, { isLocked: true });
      return res.status(403).json({ 
        success: false,
        message: "Cảnh báo bảo mật: Hệ thống chỉ cho phép 1 Admin. Tài khoản mục tiêu đã bị khóa tự động!" 
      });
    }

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
 // Tùy chọn: dùng nếu bạn muốn ẩn cả comment

exports.toggleLockUser = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Chặn Admin tự khóa mình
    if (id === req.user.id) {
      return res.status(400).json({ 
        success: false, 
        message: "Bạn không thể tự khóa tài khoản Admin của chính mình!" 
      });
    }

    // 2. Kiểm tra User tồn tại
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "Không tìm thấy người dùng!" 
      });
    }

    // 3. Đảo ngược trạng thái khóa
    user.isLocked = !user.isLocked;
    await user.save();

    // 🌟 4. ĐỒNG BỘ NỘI DUNG (TỐI ƯU HIỆU NĂNG CHO BẢNG TIN)
    if (user.isLocked) {
      // Ẩn bài viết
      await Post.updateMany({ userId: id }, { $set: { status: 'banned' } });
      // Ẩn bình luận (Nếu schema Comment của bạn có trường status)
      // await Comment.updateMany({ userId: id }, { $set: { status: 'locked' } }); 
    } else {
      // Mở lại bài viết
      await Post.updateMany({ userId: id, status: 'banned' }, { $set: { status: 'approved' } });
      // Mở lại bình luận
      // await Comment.updateMany({ userId: id, status: 'locked' }, { $set: { status: 'approved' } });
    }

    const statusMessage = user.isLocked ? "Đã KHÓA tài khoản và ẩn nội dung" : "Đã MỞ KHÓA tài khoản";
    
    // 5. Trả về kết quả cho Frontend
    res.status(200).json({ 
      success: true, 
      message: `${statusMessage} thành công!`, 
      isLocked: user.isLocked 
    });
    
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: "Lỗi xử lý khóa tài khoản", 
      error: error.message 
    });
  }
};

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