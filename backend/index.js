require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require('path'); 
const connectDB = require("./config/db");

// ==========================================
// 1. IMPORT CÁC ĐƯỜNG DẪN (ROUTES) & CONTROLLERS
// ==========================================
const userRoutes = require("./routes/userRoutes");
const adminRoutes = require("./routes/adminRoutes");

// Thư viện gốc (Master Data)
const exerciseRoutes = require("./routes/exerciseRoutes");
const foodRoutes = require("./routes/foodRoutes");

// Lịch trình cá nhân (User Plans)
const workoutPlanRoutes = require("./routes/workoutPlanRoutes");
const mealPlanRoutes = require("./routes/mealPlanRoutes"); 

// Các tính năng mở rộng
const aiRoutes = require("./routes/aiRoutes");
const transactionRoutes = require('./routes/transactionRoutes');
const weightRoutes = require('./routes/weightRoutes');
const workoutLogRoutes = require("./routes/workoutLogRoutes");
const dietRoutes = require('./routes/dietRoutes'); 
const gamificationRoutes = require('./routes/gamificationRoutes');
const postRoutes = require('./routes/postRoutes');
const libraryRoutes = require('./routes/libraryRoutes');

// Hệ thống & Quản lý bảo trì
const systemController = require("./controllers/systemController");
const systemRoutes = require("./routes/systemRoutes");
const { startDailyClosingJob } = require('./services/cronService');

const app = express();

// ==========================================
// 2. CẤU HÌNH CÁC MIDDLEWARE CƠ BẢN & DATABASE
// ==========================================
app.use(cors());
app.use(express.json()); // Bắt buộc để đọc dữ liệu JSON gửi lên từ Frontend

// Kết nối Cơ sở dữ liệu
connectDB();

// Mở khóa thư mục uploads công khai để hiển thị hình ảnh/avatar
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ==========================================
// 3. VÙNG MIỄN NHIỄM BẢO TRÌ (ĐẶT TRÊN CÙNG)
// ==========================================
// Màn hình chào mừng khi truy cập vào domain gốc
app.get("/", (req, res) => {
  res.send("🚀 AI Fitness Coach API is running smoothly!");
});

// BẮT BUỘC ĐỂ TRÊN: API kiểm tra trạng thái bảo trì (Frontend cần gọi công khai để check)
app.use("/api/system", systemRoutes);

// BẮT BUỘC ĐỂ TRÊN: Tuyến đường Admin (Để Admin luôn có thể đăng nhập vào tắt bảo trì khi hệ thống khóa)
app.use("/api/admin", adminRoutes);
app.use("/api/exercises", exerciseRoutes); 
app.use("/api/foods", foodRoutes); 
// ==========================================
// 4. KÍCH HOẠT MIDDLEWARE KIỂM TRA BẢO TRÌ (MAINTENANCE)
// ==========================================
// Kể từ dòng này trở xuống, mọi API sẽ bị chặn đứng hoàn toàn nếu isMaintenance = true
app.use(systemController.checkMaintenance);

// ==========================================
// 5. VÙNG API DÀNH CHO USER (SẼ BỊ KHÓA KHI BẢO TRÌ)
// ==========================================
app.use("/api/users", userRoutes);    
        
app.use("/api/workout-plan", workoutPlanRoutes); 
app.use("/api/meal-plan", mealPlanRoutes);       
app.use("/api/ai", aiRoutes);
app.use('/api/weight', weightRoutes);
app.use('/api/diet', dietRoutes);
app.use("/api/workout-logs", workoutLogRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/library', libraryRoutes);

// ==========================================
// 6. KHỞI CHẠY HỆ THỐNG & XỬ LÝ LỖI CORNER CASES
// ==========================================
// Kích hoạt tiến trình Cronjob chạy ngầm tự động khóa sổ hàng ngày
startDailyClosingJob();

// Bắt lỗi 404 cho tất cả các đường dẫn không tồn tại trên hệ thống
app.use((req, res, next) => {
  res.status(404).json({ message: "Đường dẫn (Route) này không tồn tại!" });
});

// Khởi chạy cổng Server lắng nghe kết nối
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🔥 Server is running beautifully on port ${PORT}`);
});