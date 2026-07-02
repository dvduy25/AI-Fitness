// middleware/contentFilter.js
// =============================================
// KIỂM DUYỆT NỘI DUNG CỘNG ĐỒNG
// Sử dụng kết hợp: danh sách từ cứng + chuẩn hóa ký tự
// =============================================

/**
 * Chuẩn hóa text: xóa khoảng trắng thừa, số leet-speak cơ bản,
 * ký tự đặc biệt chèn giữa từ để lách filter.
 * Ví dụ: "l.ừ.a.đ.ả.o" -> "lừađảo"
 *        "h4ck" -> "hack"
 */
const normalizeText = (text) => {
  return text
    .toLowerCase()
    .normalize("NFC") // Chuẩn hóa Unicode tiếng Việt
    .replace(/[.\-_*|\/\\]/g, "") // Xóa ký tự chèn giữa từ
    .replace(/\s+/g, " ")         // Thu gọn khoảng trắng
    .replace(/4/g, "a")           // Leet-speak cơ bản
    .replace(/3/g, "e")
    .replace(/1/g, "i")
    .replace(/0/g, "o")
    .trim();
};

/**
 * Danh sách từ cấm - có thể mở rộng từ DB sau này
 * Phân loại theo mức độ nghiêm trọng
 */
const BANNED_PATTERNS = [
  // Mức độ cao: vi phạm pháp luật
  "phản động", "chống nhà nước", "lừa đảo", "đánh bạc", "cờ bạc",
  "ma túy", "mại dâm", "cá độ",
  // Mức độ trung bình: vi phạm cộng đồng
  "hack", "crack", "cheat", "spam",
  "mutit", "damtac", "địt", "lồn", "cặc", "đụ",
  // Tiếng Anh phổ biến
  "scam", "fraud", "phishing"
];

/**
 * Kiểm tra nội dung bài viết / bình luận
 */
const checkBannedWords = (req, res, next) => {
  const { content, title } = req.body;

  const textsToCheck = [content, title].filter(Boolean);

  for (const text of textsToCheck) {
    const normalized = normalizeText(String(text));

    const foundWord = BANNED_PATTERNS.find((word) => {
      const normalizedWord = normalizeText(word);
      return normalized.includes(normalizedWord);
    });

    if (foundWord) {
      return res.status(400).json({
        success: false,
        message: "Bài viết chứa từ ngữ vi phạm tiêu chuẩn cộng đồng. Vui lòng chỉnh sửa lại.",
        // Không lộ từ nào bị bắt để tránh giúp user "lách"
      });
    }
  }

  next();
};

module.exports = { checkBannedWords };
