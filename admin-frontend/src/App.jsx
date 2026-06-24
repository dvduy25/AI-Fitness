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
import RevenueDashboard from './pages/RevenueDashboard'; 
import AdminPremiumManager from './pages/AdminPremiumManager'; 

// 👇 ĐÃ THÊM: Import trang Quản lý Hệ thống (Bảo trì/Thông báo)
import SystemNotificationManager from './pages/SystemNotificationManager'; 

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
          
          <Route path="premium" element={<AdminPremiumManager />} />
          <Route path="premium-history" element={<RevenueDashboard />} />

          {/* 👇 ĐÃ THÊM: Route cho trang Cài đặt hệ thống */}
          <Route path="system-settings" element={<SystemNotificationManager />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;