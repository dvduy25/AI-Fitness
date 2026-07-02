// 📄 utils/verifyAdmobSignature.js
// =============================================
// XÁC THỰC CHỮ KÝ SSV (Server-Side Verification) CỦA GOOGLE ADMOB
// Tài liệu: https://developers.google.com/admob/android/rewarded-video-ssv
//
// LÝ DO CẦN FILE NÀY:
// Route GET /api/transactions/webhook/admob trước đây tin tưởng thẳng
// custom_data (userId) và reward_amount từ query string mà KHÔNG kiểm tra
// bất kỳ chữ ký nào -> ai cũng có thể tự gọi URL này để cộng khống vé AI
// cho chính mình (gian lận, không cần thật sự xem quảng cáo).
//
// Google AdMob đính kèm 2 tham số "signature" và "key_id" vào mỗi callback.
// Ta phải:
//   1. Tải bộ public key hiện hành của Google (có cache + tự làm mới).
//   2. Dựng lại đúng chuỗi dữ liệu gốc (toàn bộ query string TRƯỚC tham số
//      "signature", giữ nguyên thứ tự Google gửi).
//   3. Verify chữ ký ECDSA (thuật toán ES256) trên chuỗi đó bằng public key
//      tương ứng với key_id.
// =============================================
const axios = require("axios");
const crypto = require("crypto");

const KEYS_URL = "https://www.gstatic.com/admob/reward/verifier-keys.json";
const CACHE_TTL_MS = 60 * 60 * 1000; // cache 1 giờ

let cachedKeys = null;
let cachedAt = 0;

async function getVerifierKeys() {
  const now = Date.now();
  if (cachedKeys && now - cachedAt < CACHE_TTL_MS) return cachedKeys;

  const res = await axios.get(KEYS_URL, { timeout: 5000 });
  cachedKeys = res.data.keys || [];
  cachedAt = now;
  return cachedKeys;
}

// Chuyển public key (x, y theo base64url, đường cong P-256) sang định dạng PEM để crypto.verify dùng
function jwkToPem(keyEntry) {
  const jwk = {
    kty: "EC",
    crv: "P-256",
    x: keyEntry.x,
    y: keyEntry.y,
  };
  return crypto.createPublicKey({ key: jwk, format: "jwk" });
}

/**
 * Xác thực request webhook AdMob.
 * @param {import('express').Request} req
 * @returns {Promise<{valid: boolean, reason?: string}>}
 */
async function verifyAdmobRequest(req) {
  try {
    const { signature, key_id } = req.query;
    if (!signature || !key_id) {
      return { valid: false, reason: "Thiếu signature hoặc key_id" };
    }

    // Dựng lại chuỗi gốc: toàn bộ query string TRƯỚC tham số "signature",
    // đúng theo tài liệu SSV của Google (KHÔNG bao gồm chính "signature" và "key_id").
    const originalUrl = req.originalUrl || req.url;
    const queryStartIndex = originalUrl.indexOf("?");
    const rawQuery = queryStartIndex >= 0 ? originalUrl.slice(queryStartIndex + 1) : "";
    const sigIndex = rawQuery.indexOf("signature=");
    if (sigIndex === -1) return { valid: false, reason: "Không tìm thấy signature trong query gốc" };

    // Bỏ dấu "&" thừa ở cuối nếu có
    const contentToVerify = rawQuery.slice(0, sigIndex).replace(/&$/, "");

    const keys = await getVerifierKeys();
    const matchedKey = keys.find((k) => String(k.keyId) === String(key_id));
    if (!matchedKey) return { valid: false, reason: "Không tìm thấy public key phù hợp với key_id" };

    const publicKey = jwkToPem(matchedKey);

    // Chữ ký AdMob gửi ở dạng base64url, cần chuyển thành base64 chuẩn
    const sigBase64 = String(signature).replace(/-/g, "+").replace(/_/g, "/");
    const sigBuffer = Buffer.from(sigBase64, "base64");

    const isValid = crypto.verify(
      "sha256",
      Buffer.from(contentToVerify),
      { key: publicKey, dsaEncoding: "ieee-p1363" },
      sigBuffer
    );

    return isValid ? { valid: true } : { valid: false, reason: "Chữ ký không khớp" };
  } catch (error) {
    console.error("[AdMob SSV] Lỗi xác thực chữ ký:", error.message);
    return { valid: false, reason: "Lỗi hệ thống khi xác thực" };
  }
}

module.exports = { verifyAdmobRequest };
