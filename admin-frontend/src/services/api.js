// 📄 Đường dẫn file: src/services/api.js
import axios from 'axios';

// Lấy URL từ biến môi trường Vite nếu có, mặc định về localhost khi phát triển
// Tạo file .env.local với VITE_API_URL=https://your-backend.com để đổi khi deploy
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  timeout: 15000, // Ngắt kết nối nếu server không phản hồi sau 15 giây
});

// Cấu hình Interceptor: Tự động chạy trước khi gửi bất kỳ request nào lên server
api.interceptors.request.use(
  (config) => {
    // 1. Ưu tiên lấy adminToken trước, nếu không có thì lấy token thường
    const token = localStorage.getItem('adminToken') || localStorage.getItem('token');

    // 2. Nếu tìm thấy token, nhét vào Header Authorization
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Cấu hình Interceptor xử lý lỗi phản hồi toàn cục
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;

    // 401 - Token hết hạn hoặc không hợp lệ: tự động đăng xuất khỏi trang Admin
    if (status === 401) {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminInfo');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }

    // 403 - Không đủ quyền (vd. tài khoản không phải admin, hoặc bị khoá)
    if (status === 403) {
      console.warn('Không đủ quyền truy cập hoặc tài khoản đã bị khoá.');
    }

    // 503 - Hệ thống báo lỗi bảo trì
    if (status === 503) {
      console.warn('Hệ thống hiện đang bảo trì.');
    }

    return Promise.reject(error);
  }
);

export default api;
