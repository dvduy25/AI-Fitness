import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, NavLink, Navigate, Link } from "react-router-dom";
import { LogOut, Home, User, Utensils, Dumbbell, Activity, History, Crown } from 'lucide-react'; 

// Import các trang (Components)
import AuthPage from "./AuthPage"; 
import TodayDashboard from "./DailyDashboard"; 
import Profile from "./Profile";
import MealPlanManager from "./MealPlanManager"; 
import WorkoutPlanManager from "./WorkoutPlanManager"; 
import DietHistory from "./DietHistory";
import WorkoutTracker from "./WorkoutTracker";
import PremiumUpgrade from "./PremiumUpgrade"; 

// ==========================================
// ĐÃ THÊM: Import Component FloatingBot
// (Nhớ đổi đường dẫn nếu bạn lưu file này ở thư mục khác, VD: "./components/FloatingBot")
// ==========================================
import FloatingBot from "./FloatingBot"; 

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

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
  };

  // Màn hình chờ khi đang kiểm tra trạng thái đăng nhập
  if (isCheckingAuth) return <div className="bg-gray-950 min-h-screen"></div>;

  // Nếu chưa đăng nhập, chuyển hướng đến trang Login
  if (!isLoggedIn) {
    return (
      <div className="bg-gray-950 min-h-screen w-full flex items-center justify-center overflow-hidden">
        <AuthPage onLoginSuccess={() => setIsLoggedIn(true)} />
      </div>
    );
  }

  const navItems = [
    { path: "/", icon: <Home className="w-5 h-5 mb-1 md:mb-0 md:mr-2" />, label: "Hôm Nay" },
    { path: "/meal-plan", icon: <Utensils className="w-5 h-5 mb-1 md:mb-0 md:mr-2" />, label: "Lịch Ăn" },
    { path: "/workout-plan", icon: <Dumbbell className="w-5 h-5 mb-1 md:mb-0 md:mr-2" />, label: "Lịch Tập" },
    { path: "/diet-history", icon: <History className="w-5 h-5 mb-1 md:mb-0 md:mr-2" />, label: "Lịch Sử" },
    { path: "/profile", icon: <User className="w-5 h-5 mb-1 md:mb-0 md:mr-2" />, label: "Hồ Sơ" },
  ];

  return (
    <BrowserRouter>
      <div className="bg-gray-950 min-h-screen w-full flex flex-col font-sans text-gray-200 selection:bg-emerald-500/30">
        
        {/* ========================================== */}
        {/* NAVBAR DESKTOP (Top Bar) */}
        {/* ========================================== */}
        <nav className="hidden md:flex bg-gray-900/80 backdrop-blur-xl border-b border-gray-800 sticky top-0 z-50 w-full shadow-lg h-16 items-center px-8 justify-between">
          
          {/* Logo */}
          <div className="flex items-center gap-2 text-xl font-black text-white tracking-tight shrink-0">
            <Activity className="w-6 h-6 text-emerald-500" />
            <span>AI Fitness</span>
          </div>
          
          {/* Menu Desktop */}
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

          {/* Group Nút bên phải (Premium + Đăng Xuất) */}
          <div className="flex items-center gap-3">
            <Link 
              to="/premium"
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-yellow-500/20"
            >
              <Crown className="w-4 h-4" /> Nâng Cấp VIP
            </Link>

            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 px-5 py-2 bg-gray-800 hover:bg-red-500/10 border border-gray-700 hover:border-red-500/30 text-gray-300 hover:text-red-400 font-bold rounded-xl transition-all"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </nav>

        {/* ========================================== */}
        {/* HEADER MOBILE (Chứa Logo, VIP và Logout) */}
        {/* ========================================== */}
        <header className="md:hidden flex items-center justify-between px-4 h-14 bg-gray-900/80 backdrop-blur-xl border-b border-gray-800 sticky top-0 z-40">
          <div className="flex items-center gap-2 text-lg font-black text-white tracking-tight">
            <Activity className="w-5 h-5 text-emerald-500" />
            <span>AI Fitness</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Link 
              to="/premium"
              className="p-2 text-yellow-400 hover:text-yellow-300 bg-yellow-500/10 hover:bg-yellow-500/20 rounded-lg flex items-center gap-1 font-bold text-sm"
            >
              <Crown className="w-5 h-5" />
            </Link>

            <button 
              onClick={handleLogout}
              className="p-2 text-gray-400 hover:text-red-400 bg-gray-800 rounded-lg"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* ========================================== */}
        {/* NỘI DUNG CHÍNH (MAIN ROUTES) */}
        {/* ========================================== */}
        <main className="flex-1 w-full pb-20 md:pb-0 relative">
          <Routes>
            <Route path="/" element={<TodayDashboard />} />
            <Route path="/diet-history" element={<DietHistory />} /> 
            <Route path="/meal-plan" element={<MealPlanManager />} />
            <Route path="/workout-plan" element={<WorkoutPlanManager />} />
            <Route path="/profile" element={<Profile onLogout={handleLogout} />} />
            <Route path="/workout-tracker" element={<WorkoutTracker />} />
            <Route path="/premium" element={<PremiumUpgrade />} />
            
            {/* Fallback route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        {/* ========================================== */}
        {/* ĐÃ THÊM: COMPONENT CON BOT NỔI */}
        {/* Đặt ngoài vùng <main> và trên Navigation Bar của Mobile để nó luôn đè lên các trang */}
        {/* ========================================== */}
        <FloatingBot />

        {/* ========================================== */}
        {/* BOTTOM NAVIGATION MOBILE */}
        {/* ========================================== */}
        <nav className="md:hidden fixed bottom-0 left-0 w-full bg-gray-900/95 backdrop-blur-xl border-t border-gray-800 z-50 pb-safe">
          <div className="flex justify-around items-center h-16 px-1">
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
                <span className="text-[9px] font-bold uppercase tracking-tighter">{item.label}</span>
              </NavLink>
            ))}
          </div>
        </nav>

      </div>
    </BrowserRouter>
  );
};

export default App;