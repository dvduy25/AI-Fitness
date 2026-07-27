/**
 * services/api.js
 * =====================================================
 * AXIOS INSTANCE TẬP TRUNG - Thay thế 20+ chỗ khai báo API_BASE_URL rải rác
 *
 * Cách dùng trong component:
 *   import api from "./services/api";
 *   const res = await api.get("/users/me");
 *   const res = await api.post("/workout-plan", data);
 *
 * KHÔNG cần:
 *   - Khai báo API_BASE_URL trong từng file
 *   - Tự thêm Authorization header thủ công
 *   - Tự redirect khi token hết hạn
 * =====================================================
 */
import axios from "axios";

// Lấy URL từ biến môi trường Vite (xem .env.local hoặc .env)
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  timeout: 30000, // 30 giây timeout (AI response có thể chậm)
  headers: {
    "Content-Type": "application/json"
  }
});

// =====================================================
// REQUEST INTERCEPTOR - Tự động gắn token vào mọi request
// =====================================================
api.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem("token") || localStorage.getItem("adminToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// =====================================================
// RESPONSE INTERCEPTOR - Xử lý lỗi tập trung
// =====================================================
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const resData = error.response?.data; // Lấy thêm data từ Backend trả về

    // 401 - Token hết hạn: tự động logout
    if (status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("adminToken");
      localStorage.removeItem("role");
      // Redirect về trang đăng nhập nếu không phải đang ở trang auth
      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/";
      }
    }

    // 403 - XỬ LÝ PHÂN LOẠI (Khóa tài khoản vs Tính năng Premium)
    if (status === 403) {
      // CHỈ xóa token và đá văng NẾU đó thực sự là lỗi khóa tài khoản
      if (resData?.code === "ACCOUNT_LOCKED" || resData?.isLocked === true) {
        localStorage.removeItem("token");
        localStorage.removeItem("adminToken");
        localStorage.removeItem("role");
        window.dispatchEvent(new Event("accountLocked"));
      }
      // TRƯỜNG HỢP CÒN LẠI (như yêu cầu Premium): Không làm gì cả!
      // Lỗi sẽ tự động chạy tiếp xuống component FloatingBot để bật Modal.
    }

    // 503 - Hệ thống bảo trì
    if (status === 503) {
      window.dispatchEvent(new CustomEvent("systemMaintenance", {
        detail: error.response?.data
      }));
    }

    return Promise.reject(error);
  }
);
export default api;
