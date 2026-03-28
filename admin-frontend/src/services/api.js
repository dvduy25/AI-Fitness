// 📄 src/services/api.js
import axios from 'axios';

// Thay đổi PORT nếu backend của bạn chạy ở port khác (ví dụ: 5000)
const API_URL = 'http://localhost:5000/api'; 

const api = axios.create({
  baseURL: API_URL,
});

// Tự động nhét Token vào Header trước khi gửi request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

export default api;