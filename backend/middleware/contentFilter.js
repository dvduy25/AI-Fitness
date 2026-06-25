// middleware/contentFilter.js
const BANNED_KEYWORDS = ["phản động", "lừa đảo", "đánh bạc", "mutit", "damtac", "hack"];

const checkBannedWords = (req, res, next) => {
  const { content } = req.body;

  if (content) {
    const textToScan = String(content).toLowerCase();
    const hasBannedWord = BANNED_KEYWORDS.some(word => textToScan.includes(word));

    if (hasBannedWord) {
      // Chặn đứng hành vi tạo/sửa bài và phản hồi lỗi 400 lập tức về Frontend
      return res.status(400).json({
        success: false,
        message: "Bài viết chứa từ khóa vi phạm tiêu chuẩn cộng đồng. Vui lòng chỉnh sửa lại."
      });
    }
  }

  // Nếu nội dung sạch, cho phép đi tiếp vào Controller
  next();
};

module.exports = { checkBannedWords };