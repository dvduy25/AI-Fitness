require("dotenv").config();

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");


// 1. Xác thực & Người dùng
const userRoutes = require("./routes/userRoutes");

// 2. Thư viện gốc (Master Data)
const exerciseRoutes = require("./routes/exerciseRoutes");
const foodRoutes = require("./routes/foodRoutes");

// 3. Lịch trình cá nhân (User Plans)
const workoutPlanRoutes = require("./routes/workoutPlanRoutes");
const mealPlanRoutes = require("./routes/mealPlanRoutes"); // Route quản lý lịch ăn

// 4. Các tính năng mở rộng
const aiRoutes = require("./routes/aiRoutes");
// const statsRoutes = require("./routes/statsRoutes");
// const planRoutes = require("./routes/planRoutes"); // (Mở ra nếu bạn có file này)
const transactionRoutes = require('./routes/transactionRoutes');
const weightRoutes = require('./routes/weightRoutes');
const workoutLogRoutes = require("./routes/workoutLogRoutes");
// 👇 THÊM DÒNG NÀY: Khai báo file route cho lịch sử ăn uống
const dietRoutes = require('./routes/dietRoutes'); 
const adminRoutes = require("./routes/adminRoutes");
const { startDailyClosingJob } = require('./services/cronService');
const gamificationRoutes = require('./routes/gamificationRoutes');
const postRoutes = require('./routes/postRoutes');
const libraryRoutes = require('./routes/libraryRoutes');
const systemController = require("./controllers/systemController");
const systemRoutes = require("./routes/systemRoutes");
const app = express();
const path = require('path'); // Nhớ import thư viện path ở trên cùng file

// THÊM DÒNG NÀY ĐỂ MỞ KHÓA THƯ MỤC UPLOADS

app.use(cors());
app.use(express.json()); // Bắt buộc có để đọc được req.body dạng JSON

// Kết nối Database
connectDB();
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// Auth & Users
// Xử lý Login, Registe
app.use(systemController.checkMaintenance);

// Khai báo các Route hệ thống
app.use("/api/system", systemRoutes);
app.use("/api/users", userRoutes);    // Xử lý Cập nhật chỉ số cá nhân

// Thư viện (Ai cũng xem được)
app.use("/api/exercises", exerciseRoutes); // Thư viện bài tập (có link YouTube)
app.use("/api/foods", foodRoutes);         // Thư viện thực phẩm (có thông số Calo)

// Lịch trình (Cần verifyToken)
app.use("/api/workout-plan", workoutPlanRoutes); // CRUD Lịch tập
app.use("/api/meal-plan", mealPlanRoutes);       // CRUD Lịch ăn

// Mở rộng
app.use("/api/ai", aiRoutes);
// app.use("/api/stats", statsRoutes);

app.use('/api/weight', weightRoutes);

// 👇 THÊM DÒNG NÀY: Kích hoạt đường dẫn API (endpoint)
app.use('/api/diet', dietRoutes);
app.use("/api/workout-logs", workoutLogRoutes);
// Import file router vừa tạo


// Gắn prefix cho các API này là /api/transactions
app.use('/api/transactions', transactionRoutes);
// Màn hình chào mừng khi truy cập vào domain gốc
app.get("/", (req, res) => {
  res.send(" AI Fitness Coach API is running smoothly!");
});
app.use("/api/admin", adminRoutes);
// BƯỚC 2: KHAI BÁO ROUTER API
app.use('/api/gamification', gamificationRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/library', libraryRoutes);
// BƯỚC 3: KÍCH HOẠT CRONJOB NGAY TRƯỚC KHI APP LISTEN
startDailyClosingJob();
// Bắt lỗi 404 cho các đường dẫn không tồn tại
app.use((req, res, next) => {
  res.status(404).json({ message: "Đường dẫn (Route) này không tồn tại!" });
});


const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(` Server is running on port ${PORT}`);
});