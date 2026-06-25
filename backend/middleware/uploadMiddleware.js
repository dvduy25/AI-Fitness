// 📄 middleware/uploadMiddleware.js
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// 1. Tạo thư mục lưu trữ chung cho videos
// SỬA Ở ĐÂY: Dùng đường dẫn tuyệt đối (lùi lại 1 cấp từ thư mục middleware ra thư mục gốc)
const dir = path.join(__dirname, '../uploads/media');

if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

// 2. Cấu hình nơi lưu và tên file
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    // Tạo tên file duy nhất tránh trùng lặp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + "_" + uniqueSuffix + path.extname(file.originalname));
  }
});

// 3. Bộ lọc: Cho phép cả Ảnh và Video
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/") || file.mimetype.startsWith("video/")) {
    cb(null, true);
  } else {
    cb(new Error("Định dạng không hợp lệ! Chỉ cho phép tải lên Ảnh và Video."), false);
  }
};

// 4. Khởi tạo middleware Multer
const uploadMediaMiddleware = multer({ 
  storage: storage, 
  fileFilter: fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 } // Giới hạn 50MB
});

module.exports = uploadMediaMiddleware;