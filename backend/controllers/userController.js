const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const WeightLog = require("../models/WeightLog");
const crypto = require('crypto');
const Transaction = require('../models/Transaction');  
const fs = require("fs");
const path = require("path");
const QRCode = require("qrcode"); // <-- Thêm thư viện QRCode
require("dotenv").config();

// ==========================================
// 1. HÀM TÍNH TOÁN CHỈ SỐ CƠ THỂ (BODY STATS)
// ==========================================
const calculateBodyStats = (age, gender, height, weight, neck, waist, hip) => {
  if (!height || !weight || !age) return {};

  let bmi = null;
  let bodyFat = null;
  let leanBodyMass = null;
  let muscleMass = null;

  // 1. Tính BMI
  const heightInMeters = height / 100;
  bmi = parseFloat((weight / (heightInMeters * heightInMeters)).toFixed(1));

  // 2. Tính Tỷ lệ Mỡ (Body Fat %) - US Navy Method
  if (neck && waist) {
    if (gender === "male") {
      const diff = waist - neck;
      if (diff > 0) {
        const bf = 495 / (1.0324 - 0.19077 * Math.log10(diff) + 0.15456 * Math.log10(height)) - 450;
        bodyFat = parseFloat(Math.max(3, Math.min(60, bf)).toFixed(1));
      }
    } else if (gender === "female" && hip) {
      const sum = waist + hip - neck;
      if (sum > 0) {
        const bf = 495 / (1.29579 - 0.35004 * Math.log10(sum) + 0.22100 * Math.log10(height)) - 450;
        bodyFat = parseFloat(Math.max(8, Math.min(60, bf)).toFixed(1));
      }
    }
  }

  // Fallback: Nếu chưa có số đo vòng, tính mỡ ước tính theo BMI
  if (!bodyFat && bmi) {
    const genderVal = gender === "male" ? 1 : 0;
    const bf = (1.20 * bmi) + (0.23 * age) - (10.8 * genderVal) - 5.4;
    bodyFat = parseFloat(Math.max(3, Math.min(60, bf)).toFixed(1));
  }

  // 3. Tính Khối lượng phi mỡ LBM (Boer Formula) & Tỷ lệ Cơ bắp %
  if (gender === "male") {
    leanBodyMass = parseFloat(((0.407 * weight) + (0.267 * height) - 19.2).toFixed(1));
  } else {
    leanBodyMass = parseFloat(((0.252 * weight) + (0.473 * height) - 48.3).toFixed(1));
  }

  if (leanBodyMass > 0) {
    const smm = leanBodyMass * 0.55; // Skeletal Muscle Mass ~ 55% LBM
    muscleMass = parseFloat(((smm / weight) * 100).toFixed(1));
  }

  return { bmi, bodyFat, leanBodyMass, muscleMass };
};

// ==========================================
// 2. HÀM TÍNH TOÁN CALO & MACROS (ĐÃ XỬ LÝ BÉO PHÌ)
// ==========================================
const calculateMacros = (age, gender, height, weight, goal, fitnessLevel, leanBodyMass = null) => {
  if (!age || !gender || !height || !weight) return null;

  let bmr = 0;

  if (leanBodyMass && leanBodyMass > 0) {
    bmr = 370 + (21.6 * leanBodyMass);
  } else {
    bmr = (10 * weight) + (6.25 * height) - (5 * age);
    bmr = gender === "male" ? bmr + 5 : bmr - 161;
  }

  let tdeeMultiplier = 1.2; 
  if (fitnessLevel === "beginner") tdeeMultiplier = 1.375; 
  if (fitnessLevel === "intermediate") tdeeMultiplier = 1.55; 
  if (fitnessLevel === "advanced") tdeeMultiplier = 1.725; 
  
  let tdee = bmr * tdeeMultiplier;
  let targetCalories = tdee;

  if (goal === "lose_weight") {
    const heightInMeters = height / 100;
    const bmi = weight / (heightInMeters * heightInMeters);

    if (bmi >= 30) {
      targetCalories = tdee * 0.8;
      const maxAllowedCalories = gender === "male" ? 2400 : 1900;
      if (targetCalories > maxAllowedCalories) {
        targetCalories = maxAllowedCalories;
      }
    } else {
      targetCalories -= 500;
    }
  } else if (goal === "gain_muscle") {
    targetCalories += 300; 
  }

  targetCalories = Math.round(targetCalories);

  const protein = Math.round((targetCalories * 0.3) / 4);
  const carbs = Math.round((targetCalories * 0.45) / 4);
  const fat = Math.round((targetCalories * 0.25) / 9);

  return { calories: targetCalories, protein, carbs, fat };
};

// ==========================================
// ĐĂNG KÝ TÀI KHOẢN
// ==========================================
exports.register = async (req, res) => {
  try {
    const { 
      name, email, password, 
      age, gender, height, weight, 
      neck, waist, hip,
      goal, fitnessLevel, workoutLocation, availableEquipment,
      medicalConditions
    } = req.body;

    const userExist = await User.findOne({ email });
    if (userExist) return res.status(400).json({ message: "Email này đã được sử dụng!" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const bodyStats = calculateBodyStats(age, gender, height, weight, neck, waist, hip);
    const generatedMacros = calculateMacros(age, gender, height, weight, goal, fitnessLevel, bodyStats.leanBodyMass);

    const newUser = new User({
      name, email, password: hashedPassword,
      age, gender, height, weight,
      neck, waist, hip,
      goal, fitnessLevel, workoutLocation, availableEquipment,
      medicalConditions: medicalConditions || [], 
      targetMacros: generatedMacros,
      ...bodyStats
    });

    await newUser.save();

    if (weight) {
      const newWeightLog = new WeightLog({ userId: newUser._id, weight: weight, date: new Date() });
      await newWeightLog.save();
    }

    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    const { password: _, ...userWithoutPassword } = newUser._doc;
    res.status(201).json({
      message: "Đăng ký thành công! Hệ thống đã tính toán chỉ số cơ thể & Macros cho bạn.",
      user: userWithoutPassword,
      token: token
    });

  } catch (error) {
    res.status(500).json({ message: "Lỗi server khi đăng ký", error: error.message });
  }
};

// ==========================================
// ĐĂNG NHẬP
// ==========================================
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Không tìm thấy tài khoản với email này!" });

    if (user.isLocked) {
      return res.status(403).json({ 
        success: false, 
        message: "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Quản trị viên!" 
      });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ message: "Sai mật khẩu, vui lòng thử lại!" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    const { password: _, ...userWithoutPassword } = user._doc;
    res.status(200).json({ message: "Đăng nhập thành công!", user: userWithoutPassword, token: token });

  } catch (error) {
    res.status(500).json({ message: "Lỗi server khi đăng nhập", error: error.message });
  }
};

// ==========================================
// LẤY THÔNG TIN CÁ NHÂN
// ==========================================
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "Người dùng không tồn tại" });
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: "Lỗi lấy thông tin", error: error.message });
  }
};

exports.getUserProfileById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select("-password") 
      .lean(); 

    if (!user) {
      return res.status(404).json({ success: false, message: "Không tìm thấy người dùng!" });
    }

    res.status(200).json({ success: true, user });
  } catch (error) {
    console.error("Lỗi khi lấy Profile theo ID:", error);
    res.status(500).json({ success: false, message: "Lỗi Server!" });
  }
};

// ==========================================
// CẬP NHẬT PROFILE & TÍNH LẠI CHỈ SỐ CƠ THỂ
// ==========================================
const ALLOWED_PROFILE_FIELDS = [
  "name", "avatar", "phone", "address",
  "age", "gender", "height", "weight",
  "neck", "waist", "hip",
  "goal", "fitnessLevel", "workoutLocation",
  "availableEquipment", "medicalConditions"
];

exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const currentUser = await User.findById(userId);
    if (!currentUser) return res.status(404).json({ message: "Người dùng không tồn tại" });

    const updates = {};
    for (const field of ALLOWED_PROFILE_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updates[field] = req.body[field];
      }
    }

    const age = updates.age ?? currentUser.age;
    const gender = updates.gender ?? currentUser.gender;
    const height = updates.height ?? currentUser.height;
    const weight = updates.weight ?? currentUser.weight;
    const neck = updates.neck ?? currentUser.neck;
    const waist = updates.waist ?? currentUser.waist;
    const hip = updates.hip ?? currentUser.hip;
    const goal = updates.goal ?? currentUser.goal;
    const fitnessLevel = updates.fitnessLevel ?? currentUser.fitnessLevel;

    const bodyStats = calculateBodyStats(age, gender, height, weight, neck, waist, hip);
    const newMacros = calculateMacros(age, gender, height, weight, goal, fitnessLevel, bodyStats.leanBodyMass);

    updates.targetMacros = newMacros;
    Object.assign(updates, bodyStats);

    const updatedUser = await User.findByIdAndUpdate(
      userId, 
      { $set: updates }, 
      { new: true, runValidators: true }
    ).select("-password");

    res.status(200).json({ 
      message: "Cập nhật thành công! Chỉ số cơ thể & Macros đã được tự động tính toán lại.", 
      user: updatedUser 
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi cập nhật", error: error.message });
  }
};

// ==========================================
// TẢI LÊN / CẬP NHẬT ẢNH ĐẠI DIỆN
// ==========================================
exports.uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Vui lòng chọn 1 ảnh để tải lên!" });
    }

    const userId = req.user.id;
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      return res.status(404).json({ success: false, message: "Người dùng không tồn tại!" });
    }

    const oldAvatar = currentUser.avatar;
    if (oldAvatar && oldAvatar.includes("/uploads/media/")) {
      const oldFilename = oldAvatar.split("/uploads/media/")[1];
      const oldFilePath = path.join(__dirname, "../uploads/media", oldFilename || "");
      fs.unlink(oldFilePath, (err) => {
        if (err && err.code !== "ENOENT") {
          console.error("Không xóa được avatar cũ:", err.message);
        }
      });
    }

    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const avatarUrl = `${baseUrl}/uploads/media/${req.file.filename}`;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: { avatar: avatarUrl } },
      { new: true }
    ).select("-password");

    res.status(200).json({
      success: true,
      message: "Cập nhật ảnh đại diện thành công!",
      avatarUrl: avatarUrl,
      user: updatedUser
    });
  } catch (error) {
    console.error("Lỗi khi tải avatar:", error);
    res.status(500).json({ success: false, message: "Lỗi server khi tải ảnh đại diện", error: error.message });
  }
};

// ==========================================
// TÍNH NĂNG MẠNG XÃ HỘI (FOLLOW / UNFOLLOW)
// ==========================================
exports.toggleFollow = async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const currentUserId = req.user.id;

    if (targetUserId === currentUserId) {
      return res.status(400).json({ message: "Bạn không thể tự theo dõi chính mình!" });
    }

    const targetUser = await User.findById(targetUserId);
    const currentUser = await User.findById(currentUserId);

    if (!targetUser || !currentUser) {
      return res.status(404).json({ message: "Người dùng không tồn tại!" });
    }

    const targetFollowers = targetUser.followers || [];
    const isFollowing = targetFollowers.includes(currentUserId);

    if (isFollowing) {
      await User.findByIdAndUpdate(targetUserId, { $pull: { followers: currentUserId } });
      await User.findByIdAndUpdate(currentUserId, { $pull: { following: targetUserId } });
      
      res.status(200).json({ success: true, message: "Đã bỏ theo dõi", isFollowing: false });
    } else {
      await User.findByIdAndUpdate(targetUserId, { $addToSet: { followers: currentUserId } });
      await User.findByIdAndUpdate(currentUserId, { $addToSet: { following: targetUserId } });
      
      res.status(200).json({ success: true, message: "Đã theo dõi", isFollowing: true });
    }
  } catch (error) {
    console.error("Lỗi khi Follow:", error);
    res.status(500).json({ success: false, message: "Lỗi hệ thống", error: error.message });
  }
};

exports.getFollowing = async (req, res) => {
  try {
    const userId = req.params.id === 'me' ? req.user.id : req.params.id; 
    
    const user = await User.findById(userId).populate("following", "name avatar isVerified role");
    
    if (!user) return res.status(404).json({ success: false, message: "Người dùng không tồn tại" });

    res.status(200).json({ success: true, following: user.following });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi lấy danh sách theo dõi", error: error.message });
  }
};

exports.getFollowers = async (req, res) => {
  try {
    const userId = req.params.id === 'me' ? req.user.id : req.params.id;
    
    const user = await User.findById(userId).populate("followers", "name avatar isVerified role");
    
    if (!user) return res.status(404).json({ success: false, message: "Người dùng không tồn tại" });

    res.status(200).json({ success: true, followers: user.followers });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi lấy danh sách người theo dõi", error: error.message });
  }
};

// ==========================================
// 🌟 TÌM KIẾM USER THEO TÊN
// ==========================================
// Dùng cho ô tìm kiếm trong widget "Gợi ý theo dõi" ở Community — tìm mọi user
// (trừ chính mình) theo tên, không phân biệt hoa/thường, kèm cờ isFollowing để
// FE biết hiện nút "Theo dõi" hay "Đang theo dõi".
exports.searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    const currentUserId = req.user.id;

    if (!q || !q.trim()) {
      return res.status(200).json({ success: true, users: [] });
    }

    const currentUser = await User.findById(currentUserId).select("following");
    if (!currentUser) {
      return res.status(404).json({ success: false, message: "Người dùng không tồn tại" });
    }

    const followingSet = new Set((currentUser.following || []).map(id => id.toString()));

    const users = await User.find({
      _id: { $ne: currentUserId },
      name: { $regex: q.trim(), $options: "i" }
    })
      .select("name avatar role isVerified followers bio")
      .limit(20)
      .lean();

    const result = users.map(u => ({
      _id: u._id,
      name: u.name,
      avatar: u.avatar,
      role: u.role,
      isVerified: u.isVerified,
      bio: u.bio,
      followersCount: u.followers?.length || 0,
      isFollowing: followingSet.has(u._id.toString())
    }));

    res.status(200).json({ success: true, users: result });
  } catch (error) {
    console.error("Lỗi khi tìm kiếm user:", error);
    res.status(500).json({ success: false, message: "Lỗi server khi tìm kiếm người dùng", error: error.message });
  }
};

// ==========================================
// 🌟 DANH SÁCH NGƯỜI ĐANG FOLLOW MÌNH MÀ MÌNH CHƯA FOLLOW LẠI
// ==========================================
// Lấy currentUser.followers, loại bỏ những ai đã có mặt trong currentUser.following
// -> phần còn lại chính là danh sách "theo dõi lại" hiển thị trong FollowSuggestions.
exports.getNotFollowingBack = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const currentUser = await User.findById(currentUserId).select("following followers");

    if (!currentUser) {
      return res.status(404).json({ success: false, message: "Người dùng không tồn tại" });
    }

    const followingSet = new Set((currentUser.following || []).map(id => id.toString()));
    const notFollowedBackIds = (currentUser.followers || [])
      .filter(id => !followingSet.has(id.toString()));

    const users = await User.find({ _id: { $in: notFollowedBackIds } })
      .select("name avatar role isVerified followers bio")
      .limit(50)
      .lean();

    const result = users.map(u => ({
      _id: u._id,
      name: u.name,
      avatar: u.avatar,
      role: u.role,
      isVerified: u.isVerified,
      bio: u.bio,
      followersCount: u.followers?.length || 0,
      isFollowing: false
    }));

    res.status(200).json({ success: true, users: result });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách chưa theo dõi lại:", error);
    res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
  }
};

// ==========================================
// CHỨC NĂNG ĐỔI MẬT KHẨU
// ==========================================
exports.changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: "Vui lòng nhập đầy đủ mật khẩu cũ và mật khẩu mới!" 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: "Mật khẩu mới phải có ít nhất 6 ký tự!" 
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "Không tìm thấy người dùng!" });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Mật khẩu cũ không chính xác!" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedNewPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedNewPassword;
    await user.save();

    res.status(200).json({ 
      success: true, 
      message: "Đổi mật khẩu thành công! Vui lòng sử dụng mật khẩu mới cho lần đăng nhập sau." 
    });

  } catch (error) {
    console.error("Lỗi khi đổi mật khẩu:", error);
    res.status(500).json({ 
      success: false, 
      message: "Lỗi server khi đổi mật khẩu", 
      error: error.message 
    });
  }
};

// ==========================================
// CHỨC NĂNG MÃ QR CÁ NHÂN
// ==========================================
// [GET] /api/users/qr-code
exports.getPersonalQRCode = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select("name email avatar role");

    if (!user) {
      return res.status(404).json({ success: false, message: "Không tìm thấy người dùng!" });
    }

    // 🛠️ FIX: Mã QR phải là 1 URL DUY NHẤT trỏ thẳng tới trang cá nhân mạng xã hội,
    // KHÔNG được đóng gói dạng JSON như trước.
    //
    // Lý do: JSON payload trước đây chứa cả link avatar (dạng https://...). Camera mặc định
    // của điện thoại (Google Camera/Lens, camera iOS...) không hiểu JSON — nó chỉ tự dò tìm
    // xem trong chuỗi quét được có URL nào không, thấy URL avatar là mở luôn URL đó, khiến
    // người dùng bị đưa thẳng tới ảnh đại diện thay vì trang cá nhân trong app.
    //
    // Dùng 1 URL duy nhất thì bất kỳ ứng dụng quét QR nào (kể cả không phải app của mình)
    // cũng sẽ mở đúng trang, vì lúc này toàn bộ nội dung QR CHÍNH LÀ đường link cần mở.
    //
    // Domain frontend được lấy trực tiếp từ ALLOWED_ORIGINS đã có sẵn trong .env (không cần
    // thêm biến môi trường mới) — ưu tiên domain thật (không phải localhost), vì QR tạo ra
    // luôn cần trỏ tới domain người dùng thật sự truy cập được, không phải máy dev cục bộ.
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean);
    const frontendBaseUrl = (
      allowedOrigins.find((o) => !o.includes("localhost")) ||
      allowedOrigins[0] ||
      "http://localhost:5173"
    ).replace(/\/$/, "");
    const qrTargetUrl = `${frontendBaseUrl}/community?viewUser=${user._id}`;

    // Tạo mã QR dạng Base64 Image String (Data URL) — encode thẳng URL, không phải JSON
    const qrCodeDataUrl = await QRCode.toDataURL(qrTargetUrl, {
      errorCorrectionLevel: "H",
      type: "image/png",
      margin: 2,
      width: 300,
      color: {
        dark: "#000000",
        light: "#FFFFFF"
      }
    });

    res.status(200).json({
      success: true,
      message: "Tạo mã QR cá nhân thành công!",
      qrCode: qrCodeDataUrl,
      qrTargetUrl, // trả kèm link gốc, hữu ích để debug hoặc hiển thị nút "Sao chép liên kết"
      user: user
    });

  } catch (error) {
    console.error("Lỗi khi tạo mã QR cá nhân:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi tạo mã QR cá nhân",
      error: error.message
    });
  }
};