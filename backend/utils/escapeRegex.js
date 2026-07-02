// 📄 utils/escapeRegex.js
// =============================================
// Escape ký tự đặc biệt trong regex trước khi đưa vào truy vấn Mongo ($regex).
// Nếu KHÔNG escape, user có thể:
//   1. Gây ReDoS (Denial of Service) bằng regex có backtracking thảm họa,
//      ví dụ: search=(a+)+$  làm treo CPU của MongoDB khi quét dữ liệu lớn.
//   2. Gửi regex sai cú pháp (ví dụ dấu "(" lẻ) làm crash request (lỗi 500).
//   3. Lợi dụng ký tự regex để dò/khớp dữ liệu ngoài ý muốn.
// =============================================
const escapeRegex = (string = "") => {
  return String(string).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

// Giới hạn độ dài chuỗi tìm kiếm để tránh input quá dài gây tốn tài nguyên
const safeSearchRegex = (rawInput, maxLength = 100) => {
  const trimmed = String(rawInput || "").trim().slice(0, maxLength);
  return new RegExp(escapeRegex(trimmed), "i");
};

module.exports = { escapeRegex, safeSearchRegex };
