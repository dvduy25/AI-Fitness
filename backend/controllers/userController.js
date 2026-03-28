const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require('crypto');
const Transaction = require('../models/Transaction');  // Thư viện có sẵn của Node.js, không cần cài đặt
require("dotenv").config();

// ==========================================
// HÀM TỰ ĐỘNG TÍNH TOÁN CALO & MACROS
// ==========================================
const calculateMacros = (age, gender, height, weight, goal, fitnessLevel) => {
  // 1. Tính BMR (Tỷ lệ trao đổi chất cơ bản) theo công thức Mifflin-St Jeor
  let bmr = (10 * weight) + (6.25 * height) - (5 * age);
  bmr = gender === "male" ? bmr + 5 : bmr - 161;

  // 2. Tính TDEE (Tổng năng lượng tiêu hao) dựa trên mức độ vận động
  let tdeeMultiplier = 1.2; // Mặc định
  if (fitnessLevel === "beginner") tdeeMultiplier = 1.375; // Vận động nhẹ
  if (fitnessLevel === "intermediate") tdeeMultiplier = 1.55; // Vận động vừa
  if (fitnessLevel === "advanced") tdeeMultiplier = 1.725; // Vận động nhiều
  
  let tdee = bmr * tdeeMultiplier;

  // 3. Tính Calo mục tiêu (Dựa vào Goal)
  let targetCalories = tdee;
  if (goal === "lose_weight") targetCalories -= 500; // Giảm cân: Thâm hụt 500 calo
  if (goal === "gain_muscle") targetCalories += 300; // Tăng cơ: Dư thừa 300 calo

  targetCalories = Math.round(targetCalories);

  // 4. Chia tỷ lệ Macros (Tỉ lệ chuẩn: 30% Protein, 45% Carbs, 25% Fat)
  // Lưu ý: 1g Protein = 4 kcal, 1g Carb = 4 kcal, 1g Fat = 9 kcal
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
      medicalConditions // <--- 1. HỨNG THÊM TRƯỜNG NÀY TỪ FRONTEND
    } = req.body;

    // 1. Kiểm tra email
    const userExist = await User.findOne({ email });
    if (userExist) {
      return res.status(400).json({ message: "Email này đã được sử dụng!" });
    }

    // 2. Mã hóa mật khẩu
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 3. HỆ THỐNG TỰ TÍNH MACROS
    const generatedMacros = calculateMacros(age, gender, height, weight, goal, fitnessLevel);

    // 4. Lưu User mới vào Database
    const newUser = new User({
      name, email, password: hashedPassword,
      age, gender, height, weight,
      goal, fitnessLevel, workoutLocation, availableEquipment,
      medicalConditions: medicalConditions || [], // <--- 2. LƯU VÀO DATABASE (mặc định mảng rỗng nếu không gửi)
      targetMacros: generatedMacros 
    });

    await newUser.save();

    // 5. Tạo Token
    const token = jwt.sign(
      { id: newUser._id }, process.env.JWT_SECRET, { expiresIn: "7d" }
    );

    // 6. Trả về kết quả
    const { password: _, ...userWithoutPassword } = newUser._doc;
    res.status(201).json({
      message: "Đăng ký thành công! Hệ thống đã tự lên Macros cho bạn.",
      user: userWithoutPassword,
      token: token
    });

  } catch (error) {
    console.error("Lỗi Register:", error);
    res.status(500).json({ message: "Lỗi server khi đăng ký", error: error.message });
  }
};

// ... (Giữ nguyên phần API LOGIN ở dưới nhé)
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Tìm user theo email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Không tìm thấy tài khoản với email này!" });
    }

    // 2. So sánh mật khẩu
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ message: "Sai mật khẩu, vui lòng thử lại!" });
    }

    // 3. Tạo Token
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // 4. Loại bỏ password trước khi trả về
    const { password: _, ...userWithoutPassword } = user._doc;

    // 5. Trả về kết quả
    res.status(200).json({
      message: "Đăng nhập thành công!",
      user: userWithoutPassword,
      token: token
    });

  } catch (error) {
    console.error("Lỗi Login:", error);
    res.status(500).json({ message: "Lỗi server khi đăng nhập", error: error.message });
  }
};


// 1. LẤY THÔNG TIN CÁ NHÂN (READ)
exports.getProfile = async (req, res) => {
  try {
    // Tìm user theo ID từ Token và loại bỏ trường password khỏi kết quả trả về
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "Người dùng không tồn tại" });

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: "Lỗi lấy thông tin", error: error.message });
  }
};

// 2. CẬP NHẬT THÔNG TIN (UPDATE)

exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const updates = req.body;

    // Ngăn chặn cập nhật các trường nhạy cảm
    delete updates.password;
    delete updates.email; 

    // 1. Tìm User hiện tại để lấy các chỉ số gốc (tuổi, chiều cao, giới tính...)
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      return res.status(404).json({ message: "Người dùng không tồn tại" });
    }

    // 2. Lấy dữ liệu mới (nếu có gửi lên) hoặc dùng dữ liệu cũ
    const age = updates.age || currentUser.age;
    const gender = updates.gender || currentUser.gender;
    const height = updates.height || currentUser.height;
    const weight = updates.weight || currentUser.weight;
    const goal = updates.goal || currentUser.goal;
    const fitnessLevel = updates.fitnessLevel || currentUser.fitnessLevel;

    // 3. TỰ ĐỘNG TÍNH TOÁN LẠI MACROS MỚI TẠI ĐÂY!
    const newMacros = calculateMacros(age, gender, height, weight, goal, fitnessLevel);
    
    // Gán cục Macros mới vào dữ liệu chuẩn bị Update
    updates.targetMacros = newMacros;

    // 4. Lưu vào Database
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true, runValidators: true }
    ).select("-password");

    res.status(200).json({ message: "Cập nhật thành công! Macros đã được tính lại.", user: updatedUser });
  } catch (error) {
    console.error("Lỗi cập nhật profile:", error);
    res.status(500).json({ message: "Lỗi cập nhật", error: error.message });
  }
};


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