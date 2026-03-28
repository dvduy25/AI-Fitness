const crypto = require('crypto');
const User = require('../models/User');
const Transaction = require('../models/Transaction'); // Import model lịch sử giao dịch
const PremiumPackage = require('../models/PremiumPackage'); // ĐÃ THÊM: Import model Gói Premium động
const axios = require('axios'); 
// ==========================================
// 1. WEBHOOK THANH TOÁN THẬT (MOMO / VNPAY / ZALOPAY)
// ==========================================
exports.paymentWebhook = async (req, res) => {
  try {
    const { orderId, amount, resultCode, signature, extraData } = req.body; 
    const userId = extraData; 
    const mySecretKey = process.env.PAYMENT_SECRET_KEY; 
    
    // 1. Kiểm tra chữ ký bảo mật
    const rawSignature = `amount=${amount}&extraData=${extraData}&orderId=${orderId}&resultCode=${resultCode}`;
    const mySignature = crypto.createHmac('sha256', mySecretKey || "").update(rawSignature).digest('hex');

    if (mySignature !== signature) {
      console.warn(`[CẢNH BÁO] Sai chữ ký đơn hàng ${orderId}`);
      return res.status(400).json({ message: "Chữ ký không hợp lệ!" }); 
    }

    // 2. Chống lặp giao dịch (Idempotency)
    // Rất quan trọng: Cổng thanh toán có thể gọi Webhook 2-3 lần cho 1 đơn hàng
    const existingTx = await Transaction.findOne({ orderId: orderId });
    if (existingTx) {
      return res.status(200).json({ message: "Giao dịch này đã được xử lý trước đó." });
    }

    // 3. Kiểm tra trạng thái thanh toán từ ví
    if (resultCode != 0) {
      // Lưu lịch sử thất bại
      await Transaction.create({
        userId, transactionType: 'PREMIUM_UPGRADE', amount, orderId, status: 'FAILED', packageInfo: "Giao dịch bị hủy/thất bại"
      });
      return res.status(200).json({ message: "Giao dịch thất bại." });
    }

    // 4. Tìm kiếm gói Premium tương ứng với số tiền nạp vào TỪ DATABASE
    // Đã thay thế mảng code cứng bằng query từ MongoDB
    const selectedPackage = await PremiumPackage.findOne({ price: amount, isActive: true });

    if (!selectedPackage) {
      // Lưu lịch sử lỗi (vd: User thanh toán đúng lúc Admin đổi giá)
      await Transaction.create({
        userId, transactionType: 'PREMIUM_UPGRADE', amount, orderId, status: 'FAILED', packageInfo: "Số tiền không khớp gói cước"
      });
      return res.status(400).json({ message: "Số tiền không khớp với bất kỳ gói cước nào đang mở bán!" });
    }

    // 5. Tiến hành cộng VIP cho User
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "Không tìm thấy người dùng!" });

    const now = new Date();
    let newExpiryDate = new Date();

    if (user.isPremium && user.premiumUntil && user.premiumUntil > now) {
      newExpiryDate = new Date(user.premiumUntil);
    } else {
      newExpiryDate = now;
    }

    // Cộng số tháng dựa trên cấu hình lấy từ DB
    newExpiryDate.setMonth(newExpiryDate.getMonth() + selectedPackage.months);
    user.isPremium = true;
    user.premiumUntil = newExpiryDate;
    await user.save();

    // 6. Lưu Lịch sử giao dịch thành công
    await Transaction.create({
      userId,
      transactionType: 'PREMIUM_UPGRADE',
      amount: amount,
      orderId: orderId,
      status: 'SUCCESS',
      packageInfo: selectedPackage.name // Lấy tên gói từ DB (vd: "Premium 1 Tháng")
    });

    res.status(200).json({ message: "Xử lý đơn hàng thành công" });

  } catch (error) {
    console.error("Lỗi Webhook Thanh toán:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ==========================================
// 2. WEBHOOK ADMOB (QUẢNG CÁO THẬT)
// ==========================================
exports.adMobWebhook = async (req, res) => {
  try {
    const { custom_data, reward_amount, transaction_id } = req.query;

    if (!custom_data || !transaction_id) {
      return res.status(400).send("Thiếu thông tin bắt buộc");
    }

    const userId = custom_data; 
    const amountToAdd = parseInt(reward_amount) || 1;

    // Chống lặp giao dịch Admob
    const existingTx = await Transaction.findOne({ orderId: transaction_id });
    if (existingTx) return res.status(200).send("OK - Đã xử lý");

    const user = await User.findById(userId);
    if (!user) return res.status(404).send("User không tồn tại");

    // Giới hạn cày vé (Ví dụ: Tối đa 5 vé quảng cáo)
    if (user.aiTickets >= 5) { 
       return res.status(200).send("User đã đạt giới hạn vé tối đa");
    }

    user.aiTickets += amountToAdd;
    await user.save();

    // Lưu lịch sử xem QC thật
    await Transaction.create({
      userId,
      transactionType: 'AD_REWARD_ADMOB',
      amount: amountToAdd,
      orderId: transaction_id,
      packageInfo: "Nhận vé từ xem quảng cáo Admob"
    });

    res.status(200).send("OK");

  } catch (error) {
    console.error("Lỗi Webhook AdMob:", error);
    res.status(500).send("Internal Server Error");
  }
};

// ==========================================
// 3. API XEM QUẢNG CÁO ẢO (DÙNG CHO TEST HOẶC FRONTEND TỰ LÀM)
// Route: POST /api/transactions/virtual-ad
// ==========================================
exports.virtualAdView = async (req, res) => {
  try {
    const userId = req.user.id; 
    
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "Không tìm thấy User" });

    // Giới hạn xem quảng cáo ảo (Ví dụ: Tối đa 3 vé/ngày đối với QC Ảo)
    if (user.aiTickets >= 3) {
      return res.status(400).json({ message: "Bạn đã đạt giới hạn xem quảng cáo ảo! Hãy tiêu thụ bớt vé." });
    }

    // Cộng vé
    user.aiTickets += 1;
    await user.save();

    // Tạo mã orderId ảo (Random)
    const virtualOrderId = `VIRTUAL_AD_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    // Lưu lịch sử
    await Transaction.create({
      userId,
      transactionType: 'AD_REWARD_VIRTUAL',
      amount: 1,
      orderId: virtualOrderId,
      packageInfo: "Nhận vé AI (Quảng cáo ảo)"
    });

    res.status(200).json({ 
      message: "Xem quảng cáo ảo thành công! Bạn nhận được 1 vé AI.",
      currentTickets: user.aiTickets
    });

  } catch (error) {
    console.error("Lỗi xem QC ảo:", error);
    res.status(500).json({ message: "Lỗi hệ thống!" });
  }
};

// ==========================================
// 4. API XEM LỊCH SỬ GIAO DỊCH CỦA USER
// Route: GET /api/transactions/my-history
// ==========================================
exports.getMyTransactions = async (req, res) => {
  try {
    const userId = req.user.id;

    // Lấy danh sách giao dịch, xếp mới nhất lên đầu
    const transactions = await Transaction.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50); // Giới hạn lấy 50 GD gần nhất để nhẹ server

    res.status(200).json({ data: transactions });
  } catch (error) {
    console.error("Lỗi lấy lịch sử GD:", error);
    res.status(500).json({ message: "Lỗi lấy lịch sử giao dịch" });
  }
};
// ==========================================
// 5. API TẠO LINK THANH TOÁN (MOMO)
// Route: POST /api/payment/create-url
// ==========================================
// Nhớ khai báo ở đầu file nếu chưa có

exports.createPaymentUrl = async (req, res) => {
  try {
    const { packageId } = req.body;
    const userId = req.user.id; // Lấy từ token của user

    // 1. Tìm gói Premium User muốn mua
    const selectedPackage = await PremiumPackage.findById(packageId);
    if (!selectedPackage || !selectedPackage.isActive) {
      return res.status(400).json({ message: "Gói cước không tồn tại hoặc đã ngừng bán!" });
    }

    // 2. Cấu hình thông tin MoMo (Thay bằng Key Test của bạn)
    const partnerCode = process.env.MOMO_PARTNER_CODE || "MOMO"; 
    const accessKey = process.env.MOMO_ACCESS_KEY || "TEST_ACCESS_KEY";
    const secretKey = process.env.MOMO_SECRET_KEY || "TEST_SECRET_KEY";
    
    const amount = selectedPackage.price;
    const orderId = `VIP_${Date.now()}_${userId.substring(0, 4)}`;
    const orderInfo = `Nang cap ${selectedPackage.name}`;
    
    // Link trả về Frontend sau khi thanh toán xong
    const redirectUrl = "http://localhost:5173/profile"; 
    // Link gọi về Webhook của bạn (Phải là public HTTPS, dùng Ngrok nếu test local)
    const ipnUrl = "https://your-ngrok-domain.com/api/payment/webhook"; 
    
    const extraData = userId; // Nhét userId vào để Webhook biết ai mua (khớp với logic Webhook của bạn)
    const requestId = orderId;

    // 3. Tạo chữ ký (Signature)
    const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=captureWallet`;
    const signature = crypto.createHmac('sha256', secretKey).update(rawSignature).digest('hex');

    // 4. Gửi Request sang MoMo
    const requestBody = {
      partnerCode, accessKey, requestId, amount, orderId, orderInfo, redirectUrl, ipnUrl, extraData,
      requestType: "captureWallet",
      signature,
      lang: "vi"
    };

    // Dùng link test của MoMo
    const response = await axios.post('https://test-payment.momo.vn/v2/gateway/api/create', requestBody);

    if (response.data && response.data.payUrl) {
      return res.status(200).json({ payUrl: response.data.payUrl });
    } else {
      console.error("MoMo response lỗi:", response.data);
      return res.status(400).json({ message: "Lỗi tạo thanh toán MoMo", details: response.data });
    }

  } catch (error) {
    console.error("Lỗi tạo link thanh toán:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
};
// ==========================================
// 6. API THANH TOÁN ẢO (MOCK PAYMENT)
// Dành cho lúc test app, không cần qua MoMo
// ==========================================
exports.virtualPayment = async (req, res) => {
  try {
    const { packageId } = req.body;
    const userId = req.user.id;

    // 1. Tìm gói cước
    let selectedPackage = await PremiumPackage.findOne({ packageId: packageId });
    if (!selectedPackage && packageId.length === 24) {
      selectedPackage = await PremiumPackage.findById(packageId);
    }

    if (!selectedPackage || !selectedPackage.isActive) {
      return res.status(400).json({ message: "Gói cước không hợp lệ!" });
    }

    // 2. Tiến hành cộng VIP cho User ngay lập tức
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "Không tìm thấy người dùng!" });

    const now = new Date();
    let newExpiryDate = new Date();

    if (user.isPremium && user.premiumUntil && user.premiumUntil > now) {
      newExpiryDate = new Date(user.premiumUntil);
    } else {
      newExpiryDate = now;
    }

    newExpiryDate.setMonth(newExpiryDate.getMonth() + selectedPackage.months);
    user.isPremium = true;
    user.premiumUntil = newExpiryDate;
    await user.save();

    // 3. Lưu Lịch sử giao dịch thành công
    const virtualOrderId = `VIRTUAL_VIP_${Date.now()}_${userId.substring(0, 4)}`;
    await Transaction.create({
      userId,
      transactionType: 'PREMIUM_UPGRADE',
      amount: selectedPackage.price,
      orderId: virtualOrderId,
      status: 'SUCCESS',
      packageInfo: selectedPackage.name + " (Thanh toán ảo)"
    });

    // 4. Báo thành công về Frontend
    res.status(200).json({ 
      message: "🎉 Nạp VIP ảo thành công!", 
      isSuccess: true 
    });

  } catch (error) {
    console.error("Lỗi thanh toán ảo:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
};