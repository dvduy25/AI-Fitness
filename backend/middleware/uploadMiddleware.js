// 📄 middleware/uploadMiddleware.js
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// 1. Kiểm tra và tạo thư mục nếu chưa tồn tại
const dir = './uploads/videos';
if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
}

// 2. Cấu hình nơi lưu và tên file
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, dir); // Lưu vào thư mục uploads/videos
  },
  filename: (req, file, cb) => {
    // Tạo tên file duy nhất: timestamp_tenFileGoc.mp4
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, "exercise_" + uniqueSuffix + path.extname(file.originalname));
  }
});

// 3. Bộ lọc: Chỉ cho phép upload Video
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("video/")) {
    cb(null, true);
  } else {
    cb(new Error("Định dạng không hợp lệ! Chỉ cho phép tải lên Video."), false);
  }
};

// 4. Khởi tạo middleware Multer (Giới hạn dung lượng 50MB)
const uploadVideoMiddleware = multer({ 
  storage: storage, 
  fileFilter: fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

module.exports = uploadVideoMiddleware;
