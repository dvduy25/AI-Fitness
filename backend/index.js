require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");
const connectDB = require("./config/db");

// ==========================================
// 1. IMPORT ROUTES & CONTROLLERS
// ==========================================
const userRoutes = require("./routes/userRoutes");
const adminRoutes = require("./routes/adminRoutes");
const exerciseRoutes = require("./routes/exerciseRoutes");
const foodRoutes = require("./routes/foodRoutes");
const workoutPlanRoutes = require("./routes/workoutPlanRoutes");
const mealPlanRoutes = require("./routes/mealPlanRoutes");
const aiRoutes = require("./routes/aiRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const weightRoutes = require("./routes/weightRoutes");
const workoutLogRoutes = require("./routes/workoutLogRoutes");
const dietRoutes = require("./routes/dietRoutes");
const gamificationRoutes = require("./routes/gamificationRoutes");
const postRoutes = require("./routes/postRoutes");
const libraryRoutes = require("./routes/libraryRoutes");
const saveRoutes = require("./routes/saveRoutes");
const ptRoutes  = require("./routes/ptRoutes");
const contactRoutes = require("./routes/contactRoutes");
const systemController = require("./controllers/systemController");
const systemRoutes = require("./routes/systemRoutes");
const { startDailyClosingJob } = require("./services/cronService");

// ==========================================
// 2. IMPORT MIDDLEWARE BẢO MẬT
// ==========================================
const { generalLimiter } = require("./middleware/rateLimiter");

const app = express();

// ==========================================
// 3. SECURITY MIDDLEWARE (ĐẶT TRƯỚC MỌI THỨ)
// ==========================================

// Helmet: thêm các HTTP security headers quan trọng
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" } // Cho phép ảnh từ /uploads
}));

// CORS: chỉ cho phép đúng domain frontend, không wildcard
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Cho phép request không có origin (mobile app, Postman, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS bị chặn từ origin: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// Morgan: logging mọi request (dev: màu, prod: compact)
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// Body parser
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Rate limiting tổng: 200 req/phút/IP
app.use(generalLimiter);

// ==========================================
// 4. KẾT NỐI DATABASE
// ==========================================
connectDB();

// Static files cho uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ==========================================
// 5. ROUTES KHÔNG BỊ BẢO TRÌ (PUBLIC ZONE)
// ==========================================
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "🚀 AI Fitness Coach API is running!" });
});

app.use("/api/system", systemRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/exercises", exerciseRoutes);
app.use("/api/foods", foodRoutes);

// ==========================================
// 6. MIDDLEWARE BẢO TRÌ
// ==========================================
app.use(systemController.checkMaintenance);

// ==========================================
// 7. ROUTES USER (BỊ KHÓA KHI BẢO TRÌ)
// ==========================================
app.use("/api/users", userRoutes);
app.use("/api/workout-plan", workoutPlanRoutes);
app.use("/api/meal-plan", mealPlanRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/weight", weightRoutes);
app.use("/api/diet", dietRoutes);
app.use("/api/workout-logs", workoutLogRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/gamification", gamificationRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/library", libraryRoutes);
app.use("/api/saves", saveRoutes);
app.use("/api/pt",    ptRoutes);
app.use("/api/contact", contactRoutes);

// ==========================================
// 8. GLOBAL ERROR HANDLER
// ==========================================
// 404 handler
app.use((req, res, next) => {
  res.status(404).json({ success: false, message: "Đường dẫn này không tồn tại!" });
});

// Error handler tập trung (thay vì try/catch lẻ tẻ)
app.use((err, req, res, next) => {
  // Log chi tiết ở server, KHÔNG lộ stack trace ra client
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);
  if (process.env.NODE_ENV !== "production") {
    console.error(err.stack);
  }

  // CORS error
  if (err.message && err.message.startsWith("CORS")) {
    return res.status(403).json({ success: false, message: err.message });
  }

  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json({
    success: false,
    message: process.env.NODE_ENV === "production"
      ? "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau."
      : err.message
  });
});

// ==========================================
// 9. KHỞI CHẠY
// ==========================================
startDailyClosingJob();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🔥 Server running on port ${PORT} [${process.env.NODE_ENV || "development"}]`);
});
