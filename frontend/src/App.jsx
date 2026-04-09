import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, NavLink, Navigate, Link } from "react-router-dom";
// ĐÃ THÊM icon Menu và X cho nút 3 gạch
import { LogOut, Home, User, Utensils, Dumbbell, Activity, History, Crown, Globe, Bookmark, Menu, X } from 'lucide-react'; 

// Import các trang (Components)
import AuthPage from "./AuthPage"; 
import TodayDashboard from "./DailyDashboard"; 
import Profile from "./Profile";
import MealPlanManager from "./MealPlanManager"; 
import WorkoutPlanManager from "./WorkoutPlanManager"; 
import DietHistory from "./DietHistory";
import WorkoutTracker from "./WorkoutTracker";
import PremiumUpgrade from "./PremiumUpgrade"; 
import Community from "./Community";
import PostDetail from "./PostDetail"; 
import MyLibrary from "./MyLibrary";
import FloatingBot from "./FloatingBot"; 

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  
  // ĐÃ THÊM: State quản lý việc đóng/mở Menu 3 gạch
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      setIsLoggedIn(true);
    }
    setIsCheckingAuth(false);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsLoggedIn(false);
    setIsMenuOpen(false); // Đóng menu khi đăng xuất
  };

  if (isCheckingAuth) return <div className="bg-gray-950 min-h-screen"></div>;

  if (!isLoggedIn) {
    return (
      <div className="bg-gray-950 min-h-screen w-full flex items-center justify-center overflow-hidden">
        <AuthPage onLoginSuccess={() => setIsLoggedIn(true)} />
      </div>
    );
  }

  // ĐÃ SỬA: Lược bỏ bớt để Navbar gọn gàng (Chỉ giữ lại 4 nút chính)
  const navItems = [
    { path: "/", icon: <Home className="w-5 h-5 mb-1 md:mb-0 md:mr-2" />, label: "Hôm Nay" },
    { path: "/community", icon: <Globe className="w-5 h-5 mb-1 md:mb-0 md:mr-2" />, label: "Cộng Đồng" },
    { path: "/diet-history", icon: <History className="w-5 h-5 mb-1 md:mb-0 md:mr-2" />, label: "Lịch Sử" },
    { path: "/profile", icon: <User className="w-5 h-5 mb-1 md:mb-0 md:mr-2" />, label: "Hồ Sơ" },
  ];

  return (
    <BrowserRouter>
      <div className="bg-gray-950 min-h-screen w-full flex flex-col font-sans text-gray-200 selection:bg-emerald-500/30">
        
        {/* ========================================== */}
        {/* NAVBAR DESKTOP (Top Bar) */}
        {/* ========================================== */}
        <nav className="hidden md:flex bg-gray-900/80 backdrop-blur-xl border-b border-gray-800 sticky top-0 z-40 w-full shadow-lg h-16 items-center px-8 justify-between">
          <div className="flex items-center gap-2 text-xl font-black text-white tracking-tight shrink-0">
            <Activity className="w-6 h-6 text-emerald-500" />
            <span>AI Fitness</span>
          </div>
          
          <div className="flex items-center gap-1 lg:gap-2">
            {navItems.map((item) => (
              <NavLink 
                key={item.path} 
                to={item.path}
                className={({ isActive }) => `
                  flex items-center px-3 lg:px-4 py-2 rounded-xl font-bold text-sm transition-all
                  ${isActive 
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-inner" 
                    : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
                  }
                `}
              >
                {item.icon} {item.label}
              </NavLink>
            ))}
          </div>

          {/* ĐÃ SỬA: Thay các nút VIP, Đăng xuất bằng Nút 3 gạch */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsMenuOpen(true)}
              className="flex items-center gap-2 p-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 rounded-xl transition-all"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </nav>

        {/* ========================================== */}
        {/* HEADER MOBILE (Chứa Logo và Dấu 3 gạch) */}
        {/* ========================================== */}
        <header className="md:hidden flex items-center justify-between px-4 h-14 bg-gray-900/80 backdrop-blur-xl border-b border-gray-800 sticky top-0 z-40">
          <div className="flex items-center gap-2 text-lg font-black text-white tracking-tight">
            <Activity className="w-5 h-5 text-emerald-500" />
            <span>AI Fitness</span>
          </div>
          
          {/* ĐÃ SỬA: Nút 3 gạch trên Mobile */}
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsMenuOpen(true)}
              className="p-2 text-gray-400 hover:text-white bg-gray-800 rounded-lg transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* ========================================== */}
        {/* SIDEBAR MENU (MENU 3 GẠCH TRƯỢT TỪ PHẢI SANG) */}
        {/* ========================================== */}
        {isMenuOpen && (
          <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex justify-end" onClick={() => setIsMenuOpen(false)}>
            <div 
              className="w-64 sm:w-72 bg-gray-900 h-full shadow-2xl border-l border-gray-800 flex flex-col animate-in slide-in-from-right duration-300" 
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-950">
                <span className="font-bold text-white text-lg">Menu Ứng Dụng</span>
                <button onClick={() => setIsMenuOpen(false)} className="text-gray-400 hover:text-white p-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* Danh sách các nút bên trong Menu */}
              <div className="flex-1 p-4 space-y-2 overflow-y-auto">
                <Link to="/workout-plan" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-800 border border-transparent hover:border-gray-700 text-gray-300 hover:text-blue-400 transition-all font-semibold">
                  <Dumbbell className="w-5 h-5"/> Quản lý Lịch Tập
                </Link>
                
                <Link to="/meal-plan" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-800 border border-transparent hover:border-gray-700 text-gray-300 hover:text-emerald-400 transition-all font-semibold">
                  <Utensils className="w-5 h-5"/> Quản lý Lịch Ăn
                </Link>
                
                <Link to="/library" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-800 border border-transparent hover:border-gray-700 text-gray-300 hover:text-purple-400 transition-all font-semibold">
                  <Bookmark className="w-5 h-5"/> Kho Lưu Trữ
                </Link>
                
                <div className="h-px bg-gray-800 my-4 mx-2"></div>
                
                <Link to="/premium" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-yellow-500/10 to-yellow-600/10 border border-yellow-500/30 text-yellow-500 font-bold hover:bg-yellow-500/20 transition-colors shadow-inner">
                  <Crown className="w-5 h-5"/> Nâng Cấp VIP
                </Link>
              </div>

              {/* Nút Đăng Xuất ở dưới cùng */}
              <div className="p-4 border-t border-gray-800 bg-gray-950">
                <button 
                  onClick={handleLogout} 
                  className="flex items-center justify-center gap-2 w-full p-3 rounded-xl bg-red-500/10 text-red-500 font-bold hover:bg-red-500 hover:text-white transition-colors border border-red-500/20"
                >
                  <LogOut className="w-5 h-5"/> Đăng Xuất
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* NỘI DUNG CHÍNH (MAIN ROUTES) */}
        {/* ========================================== */}
        <main className="flex-1 w-full pb-20 md:pb-0 relative">
          <Routes>
            <Route path="/" element={<TodayDashboard />} />
            <Route path="/community" element={<Community />} />
            <Route path="/post/:postId" element={<PostDetail />} />
            <Route path="/library" element={<MyLibrary />} />
            <Route path="/diet-history" element={<DietHistory />} /> 
            <Route path="/meal-plan" element={<MealPlanManager />} />
            <Route path="/workout-plan" element={<WorkoutPlanManager />} />
            <Route path="/profile" element={<Profile onLogout={handleLogout} />} />
            <Route path="/workout-tracker" element={<WorkoutTracker />} />
            <Route path="/premium" element={<PremiumUpgrade />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        <FloatingBot />

        {/* ========================================== */}
        {/* BOTTOM NAVIGATION MOBILE */}
        {/* ========================================== */}
        <nav className="md:hidden fixed bottom-0 left-0 w-full bg-gray-900/95 backdrop-blur-xl border-t border-gray-800 z-30 pb-safe overflow-x-auto">
          <div className="flex justify-around items-center h-16 px-2 w-full">
            {navItems.map((item) => (
              <NavLink 
                key={item.path} 
                to={item.path}
                className={({ isActive }) => `
                  flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors
                  ${isActive ? "text-emerald-400" : "text-gray-500"}
                `}
              >
                {item.icon}
                <span className="text-[10px] font-bold uppercase tracking-tighter text-center">{item.label}</span>
              </NavLink>
            ))}
          </div>
        </nav>

      </div>
    </BrowserRouter>
  );
};

export default App;