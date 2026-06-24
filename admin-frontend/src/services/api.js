// 📄 Đường dẫn file: src/services/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api', // ⚠️ Đổi lại đúng Port Backend của bạn nếu khác
  timeout: 10000, // Ngắt kết nối nếu server không phản hồi sau 10 giây
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

// Cấu hình Interceptor xử lý lỗi phản hồi toàn cục (Tùy chọn thêm)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Nếu hệ thống báo lỗi bảo trì (503) mà KHÔNG phải trang Admin đang gọi, có thể chuyển hướng user thường
    if (error.response && error.response.status === 503) {
      console.warn("Hệ thống hiện đang bảo trì.");
    }
    return Promise.reject(error);
  }
);

export default api;