// 📄 src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import AdminLayout from './components/AdminLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Exercises from './pages/Exercises';
import Foods from './pages/Foods';         
import Users from './pages/Users';         
import RevenueDashboard from './pages/RevenueDashboard'; 
import AdminPremiumManager from './pages/AdminPremiumManager'; 
import SystemNotificationManager from './pages/SystemNotificationManager'; 
import AdminContactManager from './pages/AdminContactManager';

// 👇 ĐÃ THÊM: Import trang Quản lý Báo cáo vi phạm
import AdminReportManager from './pages/AdminReportManager'; 

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route path="/" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="exercises" element={<Exercises />} />
          <Route path="foods" element={<Foods />} />
          <Route path="users" element={<Users />} />
          
          {/* 👇 ĐÃ THÊM: Route xử lý báo cáo bài viết */}
          <Route path="reports" element={<AdminReportManager />} />
          <Route path="contacts" element={<AdminContactManager />} />
          <Route path="premium" element={<AdminPremiumManager />} />
          <Route path="premium-history" element={<RevenueDashboard />} />
          <Route path="system-settings" element={<SystemNotificationManager />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;