// 📄 src/components/AdminLayout.jsx
import React from 'react';
import { Outlet, NavLink, useNavigate, useLocation, Navigate } from 'react-router-dom';
// 👇 ĐÃ THÊM: Import thêm icon Settings (Cài đặt)
import { LayoutDashboard, Dumbbell, Apple, Users, LogOut, UserCircle, ShieldCheck, Receipt, Settings } from 'lucide-react';

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // 1. LẤY DỮ LIỆU TỪ LOCAL STORAGE
  const token = localStorage.getItem('adminToken');
  const adminInfo = JSON.parse(localStorage.getItem('adminInfo') || '{}');

  // 2. CHỐT CHẶN BẢO MẬT KÉP
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminInfo');
    navigate('/login');
  };

  // 3. CẤU HÌNH MENU
  const navItems = [
    { path: '/', name: 'Dashboard', icon: LayoutDashboard },
    { path: '/exercises', name: 'Quản lý Bài tập', icon: Dumbbell },
    { path: '/foods', name: 'Quản lý Thực phẩm', icon: Apple },
    { path: '/users', name: 'Quản lý Users', icon: Users },
    { path: '/premium', name: 'Gói Premium', icon: ShieldCheck },
    { path: '/premium-history', name: 'Lịch sử mua Premium', icon: Receipt },
    // 👇 NÚT MỚI THÊM: Cài đặt hệ thống
    { path: '/system-settings', name: 'Cài đặt Hệ thống', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-100 flex flex-col shadow-sm z-10">
        <div className="p-6 flex items-center gap-3 border-b border-gray-50">
          <div className="bg-blue-600 text-white p-2 rounded-xl">
            <Dumbbell size={24} />
          </div>
          <span className="text-xl font-black text-gray-900 tracking-tight">FitAdmin</span>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${
                  isActive 
                    ? 'bg-blue-50 text-blue-700' 
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon size={20} className={isActive ? 'text-blue-600' : 'text-gray-400'} />
                {item.name}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-red-600 hover:bg-red-50 transition-colors font-medium"
          >
            <LogOut size={20} />
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-8 z-0">
          <div className="text-gray-400 font-medium">Hệ thống quản trị trung tâm</div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm font-bold text-gray-900">{adminInfo.name || 'Admin Manager'}</div>
              <div className="text-xs text-gray-500">{adminInfo.email || 'admin@system.com'}</div>
            </div>
            <UserCircle size={36} className="text-gray-300" />
          </div>
        </header>

        {/* Chỗ này sẽ "đổ" nội dung các trang vào */}
        <main className="flex-1 overflow-y-auto p-8 bg-gray-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;