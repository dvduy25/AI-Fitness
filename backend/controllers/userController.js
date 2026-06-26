const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const WeightLog = require("../models/WeightLog");
const crypto = require('crypto');
const Transaction = require('../models/Transaction');  
require("dotenv").config();

// ==========================================
// HÀM TỰ ĐỘNG TÍNH TOÁN CALO & MACROS
// ==========================================
const calculateMacros = (age, gender, height, weight, goal, fitnessLevel) => {
  let bmr = (10 * weight) + (6.25 * height) - (5 * age);
  bmr = gender === "male" ? bmr + 5 : bmr - 161;

  let tdeeMultiplier = 1.2; 
  if (fitnessLevel === "beginner") tdeeMultiplier = 1.375; 
  if (fitnessLevel === "intermediate") tdeeMultiplier = 1.55; 
  if (fitnessLevel === "advanced") tdeeMultiplier = 1.725; 
  
  let tdee = bmr * tdeeMultiplier;

  let targetCalories = tdee;
  if (goal === "lose_weight") targetCalories -= 500; 
  if (goal === "gain_muscle") targetCalories += 300; 

  targetCalories = Math.round(targetCalories);

  const protein = Math.round((targetCalories * 0.3) / 4);
  const carbs = Math.round((targetCalories * 0.45) / 4);
  const fat = Math.round((targetCalories * 0.25) / 9);

  return { calories: targetCalories, protein, carbs, fat };
};

exports.register = async (req, res) => {
  try {
    const { 
      name, email, password, 
      age, gender, height, weight, 
      goal, fitnessLevel, workoutLocation, availableEquipment,
      medicalConditions
    } = req.body;

    const userExist = await User.findOne({ email });
    if (userExist) return res.status(400).json({ message: "Email này đã được sử dụng!" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const generatedMacros = calculateMacros(age, gender, height, weight, goal, fitnessLevel);

    const newUser = new User({
      name, email, password: hashedPassword,
      age, gender, height, weight,
      goal, fitnessLevel, workoutLocation, availableEquipment,
      medicalConditions: medicalConditions || [], 
      targetMacros: generatedMacros 
    });

    await newUser.save();

    if (weight) {
      const newWeightLog = new WeightLog({ userId: newUser._id, weight: weight, date: new Date() });
      await newWeightLog.save();
    }

    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    const { password: _, ...userWithoutPassword } = newUser._doc;
    res.status(201).json({
      message: "Đăng ký thành công! Hệ thống đã tự lên Macros cho bạn.",
      user: userWithoutPassword,
      token: token
    });

  } catch (error) {
    res.status(500).json({ message: "Lỗi server khi đăng ký", error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Tìm người dùng qua email
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Không tìm thấy tài khoản với email này!" });

    // 🌟 2. CHỐT CHẶN: KIỂM TRA TÀI KHOẢN CÓ BỊ KHÓA KHÔNG
    if (user.isLocked) {
      return res.status(403).json({ 
        success: false, 
        message: "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Quản trị viên!" 
      });
    }

    // 3. Kiểm tra mật khẩu
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ message: "Sai mật khẩu, vui lòng thử lại!" });

    // 4. Cấp Token nếu hợp lệ
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    const { password: _, ...userWithoutPassword } = user._doc;
    res.status(200).json({ message: "Đăng nhập thành công!", user: userWithoutPassword, token: token });

  } catch (error) {
    res.status(500).json({ message: "Lỗi server khi đăng nhập", error: error.message });
  }
};

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
    // 🌟 Chú ý: Ở đây dùng req.params.id thay vì req.user.id
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

exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const updates = req.body;

    delete updates.password;
    delete updates.email; 

    const currentUser = await User.findById(userId);
    if (!currentUser) return res.status(404).json({ message: "Người dùng không tồn tại" });

    const age = updates.age || currentUser.age;
    const gender = updates.gender || currentUser.gender;
    const height = updates.height || currentUser.height;
    const weight = updates.weight || currentUser.weight;
    const goal = updates.goal || currentUser.goal;
    const fitnessLevel = updates.fitnessLevel || currentUser.fitnessLevel;

    const newMacros = calculateMacros(age, gender, height, weight, goal, fitnessLevel);
    updates.targetMacros = newMacros;

    const updatedUser = await User.findByIdAndUpdate(userId, { $set: updates }, { new: true, runValidators: true }).select("-password");
    res.status(200).json({ message: "Cập nhật thành công! Macros đã được tính lại.", user: updatedUser });
  } catch (error) {
    res.status(500).json({ message: "Lỗi cập nhật", error: error.message });
  }
};

// ==========================================
// TÍNH NĂNG MẠNG XÃ HỘI (FOLLOW / UNFOLLOW)
// ==========================================

// 1. Hàm Follow / Unfollow
// 1. Hàm Follow / Unfollow
exports.toggleFollow = async (req, res) => {
  try {
    const targetUserId = req.params.id; // ID người bị follow
    const currentUserId = req.user.id;  // ID người bấm follow

    if (targetUserId === currentUserId) {
      return res.status(400).json({ message: "Bạn không thể tự theo dõi chính mình!" });
    }

    const targetUser = await User.findById(targetUserId);
    const currentUser = await User.findById(currentUserId);

    if (!targetUser || !currentUser) {
        return res.status(404).json({ message: "Người dùng không tồn tại!" });
    }

    // Đảm bảo mảng tồn tại để tránh lỗi undefined với các tài khoản cũ
    const targetFollowers = targetUser.followers || [];
    
    // Kiểm tra xem đã follow chưa
    const isFollowing = targetFollowers.includes(currentUserId);

    if (isFollowing) {
      // Đã follow -> Hủy theo dõi ($pull để xóa khỏi mảng)
      await User.findByIdAndUpdate(targetUserId, { $pull: { followers: currentUserId } });
      await User.findByIdAndUpdate(currentUserId, { $pull: { following: targetUserId } });
      
      res.status(200).json({ success: true, message: "Đã bỏ theo dõi", isFollowing: false });
    } else {
      // Chưa follow -> Theo dõi ($addToSet để thêm vào mảng mà không bị trùng lặp)
      await User.findByIdAndUpdate(targetUserId, { $addToSet: { followers: currentUserId } });
      await User.findByIdAndUpdate(currentUserId, { $addToSet: { following: targetUserId } });
      
      res.status(200).json({ success: true, message: "Đã theo dõi", isFollowing: true });
    }
  } catch (error) {
    console.error("Lỗi khi Follow:", error);
    res.status(500).json({ success: false, message: "Lỗi hệ thống", error: error.message });
  }
};

// 2. Lấy danh sách những người MÌNH ĐANG THEO DÕI (Following)
// 2. Lấy danh sách những người MÌNH ĐANG THEO DÕI (Following)
exports.getFollowing = async (req, res) => {
  try {
    // 🌟 SỬA DÒNG NÀY: Nếu id là 'me' thì lấy id của tài khoản đang đăng nhập
    const userId = req.params.id === 'me' ? req.user.id : req.params.id; 
    
    const user = await User.findById(userId).populate("following", "name avatar isVerified role");
    
    if (!user) return res.status(404).json({ success: false, message: "Người dùng không tồn tại" });

    res.status(200).json({ success: true, following: user.following });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi lấy danh sách theo dõi", error: error.message });
  }
};

// 3. Lấy danh sách những người ĐANG THEO DÕI MÌNH (Followers)
exports.getFollowers = async (req, res) => {
  try {
    // 🌟 SỬA DÒNG NÀY:
    const userId = req.params.id === 'me' ? req.user.id : req.params.id;
    
    const user = await User.findById(userId).populate("followers", "name avatar isVerified role");
    
    if (!user) return res.status(404).json({ success: false, message: "Người dùng không tồn tại" });

    res.status(200).json({ success: true, followers: user.followers });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi lấy danh sách người theo dõi", error: error.message });
  }
};
// ==========================================
// CHỨC NĂNG ĐỔI MẬT KHẨU
// Route gợi ý: PUT /api/users/change-password
// ==========================================
exports.changePassword = async (req, res) => {
  try {
    const userId = req.user.id; // Lấy từ authMiddleware
    const { oldPassword, newPassword } = req.body;

    // 1. Kiểm tra đầu vào
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

    // 2. Tìm người dùng trong database
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "Không tìm thấy người dùng!" });
    }

    // 3. Kiểm tra mật khẩu cũ xem có khớp không
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Mật khẩu cũ không chính xác!" });
    }

    // 4. Mã hóa mật khẩu mới
    const salt = await bcrypt.genSalt(10);
    const hashedNewPassword = await bcrypt.hash(newPassword, salt);

    // 5. Cập nhật mật khẩu mới vào database
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

// ... Các phần code thanh toán Premium và Admob bên dưới giữ nguyên như cũ
// ==========================================
// CẤU HÌNH GÓI PREMIUM VÀ GIÁ TIỀN
// Bạn có thể chỉnh sửa giá và số tháng ở đây
// ==========================================
// const PREMIUM_PACKAGES = {
//   '1_MONTH': { price: 99000, months: 1, name: 'Premium 1 Tháng' },
//   '6_MONTHS': { price: 499000, months: 6, name: 'Premium 6 Tháng' },
//   '12_MONTHS': { price: 899000, months: 12, name: 'Premium 1 Năm' }
// };

// // ==========================================
// // 1. WEBHOOK THANH TOÁN THẬT (MOMO / VNPAY / ZALOPAY)
// // ==========================================
// exports.paymentWebhook = async (req, res) => {
//   try {
//     const { orderId, amount, resultCode, signature, extraData } = req.body; 
//     const userId = extraData; 
//     const mySecretKey = process.env.PAYMENT_SECRET_KEY; 
    
//     // 1. Kiểm tra chữ ký bảo mật
//     const rawSignature = `amount=${amount}&extraData=${extraData}&orderId=${orderId}&resultCode=${resultCode}`;
//     const mySignature = crypto.createHmac('sha256', mySecretKey || "").update(rawSignature).digest('hex');

//     if (mySignature !== signature) {
//       console.warn(`[CẢNH BÁO] Sai chữ ký đơn hàng ${orderId}`);
//       return res.status(400).json({ message: "Chữ ký không hợp lệ!" }); 
//     }

//     // 2. Chống lặp giao dịch (Idempotency)
//     // Rất quan trọng: Cổng thanh toán có thể gọi Webhook 2-3 lần cho 1 đơn hàng
//     const existingTx = await Transaction.findOne({ orderId: orderId });
//     if (existingTx) {
//       return res.status(200).json({ message: "Giao dịch này đã được xử lý trước đó." });
//     }

//     // 3. Kiểm tra trạng thái thanh toán từ ví
//     if (resultCode != 0) {
//       // Lưu lịch sử thất bại
//       await Transaction.create({
//         userId, transactionType: 'PREMIUM_UPGRADE', amount, orderId, status: 'FAILED', packageInfo: "Giao dịch thất bại"
//       });
//       return res.status(200).json({ message: "Giao dịch thất bại." });
//     }

//     // 4. Tìm kiếm gói Premium tương ứng với số tiền nạp vào
//     let selectedPackage = null;
//     for (const key in PREMIUM_PACKAGES) {
//       if (PREMIUM_PACKAGES[key].price == amount) {
//         selectedPackage = PREMIUM_PACKAGES[key];
//         break;
//       }
//     }

//     if (!selectedPackage) {
//       return res.status(400).json({ message: "Số tiền không khớp với bất kỳ gói cước nào!" });
//     }

//     // 5. Tiến hành cộng VIP cho User
//     const user = await User.findById(userId);
//     if (!user) return res.status(404).json({ message: "Không tìm thấy người dùng!" });

//     const now = new Date();
//     let newExpiryDate = new Date();

//     if (user.isPremium && user.premiumUntil && user.premiumUntil > now) {
//       newExpiryDate = new Date(user.premiumUntil);
//     } else {
//       newExpiryDate = now;
//     }

//     newExpiryDate.setMonth(newExpiryDate.getMonth() + selectedPackage.months);
//     user.isPremium = true;
//     user.premiumUntil = newExpiryDate;
//     await user.save();

//     // 6. Lưu Lịch sử giao dịch thành công
//     await Transaction.create({
//       userId,
//       transactionType: 'PREMIUM_UPGRADE',
//       amount: amount,
//       orderId: orderId,
//       status: 'SUCCESS',
//       packageInfo: selectedPackage.name
//     });

//     res.status(200).json({ message: "Xử lý đơn hàng thành công" });

//   } catch (error) {
//     console.error("Lỗi Webhook Thanh toán:", error);
//     res.status(500).json({ message: "Internal Server Error" });
//   }
// };


// // ==========================================
// // 2. WEBHOOK ADMOB (QUẢNG CÁO THẬT)
// // ==========================================
// exports.adMobWebhook = async (req, res) => {
//   try {
//     const { custom_data, reward_amount, transaction_id } = req.query;

//     if (!custom_data || !transaction_id) {
//       return res.status(400).send("Thiếu thông tin bắt buộc");
//     }

//     const userId = custom_data; 
//     const amountToAdd = parseInt(reward_amount) || 1;

//     // Chống lặp giao dịch Admob
//     const existingTx = await Transaction.findOne({ orderId: transaction_id });
//     if (existingTx) return res.status(200).send("OK - Đã xử lý");

//     const user = await User.findById(userId);
//     if (!user) return res.status(404).send("User không tồn tại");

//     // Giới hạn cày vé
//     if (user.aiTickets >= 5) { // Sửa lại thành 5 hoặc tùy ý bạn
//        return res.status(200).send("User đã đạt giới hạn vé tối đa");
//     }

//     user.aiTickets += amountToAdd;
//     await user.save();

//     // Lưu lịch sử xem QC thật
//     await Transaction.create({
//       userId,
//       transactionType: 'AD_REWARD_ADMOB',
//       amount: amountToAdd,
//       orderId: transaction_id,
//       packageInfo: "Nhận vé từ Admob"
//     });

//     res.status(200).send("OK");

//   } catch (error) {
//     console.error("Lỗi Webhook AdMob:", error);
//     res.status(500).send("Internal Server Error");
//   }
// };


// // ==========================================
// // 3. API XEM QUẢNG CÁO ẢO (DÙNG CHO TEST HOẶC FRONTEND TỰ LÀM)
// // Route: POST /api/ads/virtual-view
// // ==========================================
// exports.virtualAdView = async (req, res) => {
//   try {
//     const userId = req.user.id; // Lấy từ Middleware xác thực (Token JWT)
    
//     const user = await User.findById(userId);
//     if (!user) return res.status(404).json({ message: "Không tìm thấy User" });

//     // Giới hạn xem quảng cáo ảo (Ví dụ: Tối đa 3 vé/ngày)
//     if (user.aiTickets >= 3) {
//       return res.status(400).json({ message: "Bạn đã đạt giới hạn xem quảng cáo ảo hôm nay!" });
//     }

//     // Cộng vé
//     user.aiTickets += 1;
//     await user.save();

//     // Tạo mã orderId ảo (Random)
//     const virtualOrderId = `VIRTUAL_AD_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

//     // Lưu lịch sử
//     await Transaction.create({
//       userId,
//       transactionType: 'AD_REWARD_VIRTUAL',
//       amount: 1,
//       orderId: virtualOrderId,
//       packageInfo: "Xem quảng cáo ảo nhận vé AI"
//     });

//     res.status(200).json({ 
//       message: "Xem quảng cáo ảo thành công! Bạn nhận được 1 vé AI.",
//       currentTickets: user.aiTickets
//     });

//   } catch (error) {
//     console.error("Lỗi xem QC ảo:", error);
//     res.status(500).json({ message: "Lỗi hệ thống!" });
//   }
// };


// // ==========================================
// // 4. API XEM LỊCH SỬ GIAO DỊCH CỦA USER
// // Route: GET /api/transactions/my-history
// // ==========================================
// exports.getMyTransactions = async (req, res) => {
//   try {
//     const userId = req.user.id;

//     // Lấy danh sách giao dịch, xếp mới nhất lên đầu
//     const transactions = await Transaction.find({ userId })
//       .sort({ createdAt: -1 })
//       .limit(50); // Lấy 50 GD gần nhất

//     res.status(200).json({ data: transactions });
//   } catch (error) {
//     console.error("Lỗi lấy lịch sử GD:", error);
//     res.status(500).json({ message: "Lỗi lấy lịch sử giao dịch" });
//   }
// };