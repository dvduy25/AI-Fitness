// 📄 src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Import các Layout và Pages
import AdminLayout from './components/AdminLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Exercises from './pages/Exercises';
import Foods from './pages/Foods';         
import Users from './pages/Users';         

// ĐÃ THÊM: Import file quản lý Premium mà bạn vừa tạo
// (Lưu ý: Chỉnh lại đường dẫn './components/...' hay './pages/...' cho đúng với thư mục bạn lưu file nhé)
import AdminPremiumManager from './pages/AdminPremiumManager'; 

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Route Public (Không cần đăng nhập) */}
        <Route path="/login" element={<Login />} />

        {/* Routes Protected (Bắt buộc phải đăng nhập, nằm trong khung AdminLayout) */}
        <Route path="/" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="exercises" element={<Exercises />} />
          <Route path="foods" element={<Foods />} />
          <Route path="users" element={<Users />} />
          
          {/* ĐÃ THÊM: Route cho trang quản lý gói Premium */}
          <Route path="premium" element={<AdminPremiumManager />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;