import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, NavLink, Navigate, Link } from "react-router-dom";
import { LogOut, Home, User, Utensils, Dumbbell, Activity, History, Crown, Globe, Bookmark, Menu, X, Calculator, Settings, Bell, Lock } from 'lucide-react'; // ĐÃ THÊM: Lock icon
import axios from 'axios'; 

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
import CalorieCalculator from "./CalorieCalculator";

// =========================================================
// 🛡️ LƯỚI BẢO VỆ TOÀN CẦU
// =========================================================
axios.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 403) {
      // 1. Xóa toàn bộ dữ liệu phiên đăng nhập
      localStorage.removeItem("token");
      localStorage.removeItem("adminToken");
      localStorage.removeItem("role");
      
      // 2. Thay vì alert(), chúng ta phát ra một sự kiện để App.jsx bắt lấy
      window.dispatchEvent(new Event("accountLocked"));
    }
    return Promise.reject(error);
  }
);

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false); 
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // State quản lý hiển thị Modal khi bị khóa
  const [isLockedModalOpen, setIsLockedModalOpen] = useState(false);
  
  // Lưu cấu hình hệ thống từ Database trả về
  const [systemConfig, setSystemConfig] = useState({ isActive: false, type: "NORMAL", message: "" });
  const [isNotificationClosed, setIsNotificationClosed] = useState(false);

  useEffect(() => {
    // 0. Lắng nghe sự kiện tài khoản bị khóa từ Axios
    const handleAccountLocked = () => {
      setIsLockedModalOpen(true);
    };
    window.addEventListener("accountLocked", handleAccountLocked);

    // 1. Kiểm tra trạng thái đăng nhập
    const token = localStorage.getItem("token") || localStorage.getItem("adminToken");
    const role = localStorage.getItem("role"); 
    
    if (token) {
      setIsLoggedIn(true);
      if (role === "admin" || localStorage.getItem("adminToken")) {
        setIsAdmin(true);
      }
    }

    // 2. Gọi API lấy cấu hình bằng AXIOS
    const checkSystemStatus = async () => {
      try {
        const res = await axios.get("https://ai-fitness-w6fd.onrender.com/api/system/maintenance");
        const result = res.data; 
        
        if (result && result.success && result.data) {
          setSystemConfig(result.data);
        }
      } catch (error) {
        console.error("Lỗi kết nối đến hệ thống kiểm tra bảo trì:", error);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkSystemStatus();

    // Cleanup listener khi unmount
    return () => {
      window.removeEventListener("accountLocked", handleAccountLocked);
    };
  }, []);

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
    const role = localStorage.getItem("role");
    if (role === "admin" || localStorage.getItem("adminToken")) {
      setIsAdmin(true);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("adminToken");
    localStorage.removeItem("role");
    setIsLoggedIn(false);
    setIsAdmin(false);
    setIsMenuOpen(false);
  };

  // Hàm xử lý khi người dùng bấm OK trên bảng thông báo khóa
  const handleAcknowledgeLock = () => {
    window.location.href = "/"; // Đẩy văng ra trang đăng nhập
  };

  // =========================================================
  // 1. MÀN HÌNH CHỜ TRONG LÚC QUÉT HỆ THỐNG
  // =========================================================
  if (isCheckingAuth) {
    return (
      <div className="bg-gray-950 min-h-screen flex items-center justify-center">
        <Activity className="w-10 h-10 text-emerald-500 animate-spin" />
      </div>
    );
  }

  // =========================================================
  // 2. BẢO TRÌ (MAINTENANCE) -> KHÓA CỨNG (TRỪ ADMIN)
  // =========================================================
  if (systemConfig.isActive && systemConfig.type === "MAINTENANCE" && !isAdmin) {
    return (
      <div className="bg-gray-950 min-h-screen w-full flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="bg-gray-900 p-8 rounded-3xl border border-gray-800 shadow-2xl max-w-md w-full flex flex-col items-center animate-in fade-in zoom-in duration-300">
          <div className="p-4 bg-amber-500/10 rounded-2xl border border-amber-500/20 mb-6">
            <Settings className="w-12 h-12 text-amber-500 animate-spin" style={{ animationDuration: '4s' }} />
          </div>
          <h1 className="text-2xl font-black text-white mb-3 tracking-tight">Hệ Thống Đang Bảo Trì</h1>
          <p className="text-gray-400 text-sm mb-6 leading-relaxed">
            {systemConfig.message || "Chúng tôi đang tiến hành nâng cấp định kỳ để tối ưu hóa trải nghiệm. Vui lòng quay lại sau ít phút!"}
          </p>
          <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-amber-500 h-full animate-pulse w-full"></div>
          </div>
          <span className="text-gray-600 text-[11px] mt-6 font-medium">Đội ngũ AI Fitness xin lỗi vì sự bất tiện này</span>
        </div>
      </div>
    );
  }

  // =========================================================
  // 3. CHƯA ĐĂNG NHẬP -> CHUYỂN VÀO TRANG LOGIN
  // =========================================================
  if (!isLoggedIn && !isLockedModalOpen) {
    return (
      <div className="bg-gray-950 min-h-screen w-full flex items-center justify-center overflow-hidden">
        <AuthPage onLoginSuccess={handleLoginSuccess} />
      </div>
    );
  }

  const navItems = [
    { path: "/", icon: <Home className="w-5 h-5 mb-1 md:mb-0 md:mr-2" />, label: "Hôm Nay" },
    { path: "/community", icon: <Globe className="w-5 h-5 mb-1 md:mb-0 md:mr-2" />, label: "Cộng Đồng" },
    { path: "/calorie-calculator", icon: <Calculator className="w-5 h-5 mb-1 md:mb-0 md:mr-2" />, label: "Tính Calo" },
    { path: "/diet-history", icon: <History className="w-5 h-5 mb-1 md:mb-0 md:mr-2" />, label: "Lịch Sử" },
    { path: "/profile", icon: <User className="w-5 h-5 mb-1 md:mb-0 md:mr-2" />, label: "Hồ Sơ" },
  ];

  return (
    <BrowserRouter>
      <div className="bg-gray-950 min-h-screen w-full flex flex-col font-sans text-gray-200 selection:bg-emerald-500/30 relative">
        
        {/* ========================================================= */}
        {/* 🚨 MODAL THÔNG BÁO TÀI KHOẢN BỊ KHÓA (CHẶN TOÀN MÀN HÌNH) */}
        {/* ========================================================= */}
        {isLockedModalOpen && (
          <div className="fixed inset-0 z-[999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-red-900/50 rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-300 relative">
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mb-5 border border-red-500/20">
                  <Lock className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-black text-white mb-2 uppercase tracking-tight">Tài Khoản Bị Khóa</h3>
                <p className="text-gray-400 mb-8 leading-relaxed text-sm">
                  Phiên đăng nhập của bạn đã hết hạn hoặc tài khoản đã bị khóa bởi Quản trị viên.
                </p>
                <button 
                  onClick={handleAcknowledgeLock}
                  className="w-full py-3.5 px-4 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-red-500/25 active:scale-95 flex justify-center items-center gap-2"
                >
                  <LogOut className="w-5 h-5" /> Quay Lại Đăng Nhập
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 4. THÔNG BÁO THƯỜNG (NORMAL) TỪ SYSTEM */}
        {/* ========================================================= */}
        {isLoggedIn && systemConfig.isActive && systemConfig.type === "NORMAL" && !isNotificationClosed && (
          <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-300 relative">
              <button 
                onClick={() => setIsNotificationClosed(true)}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-full transition-colors"
                title="Đóng thông báo"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex flex-col items-center text-center mt-2">
                <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mb-5 border border-emerald-500/20">
                  <Bell className="w-8 h-8 animate-bounce" />
                </div>
                <h3 className="text-xl font-black text-white mb-3">Thông báo hệ thống</h3>
                <p className="text-gray-300 mb-8 leading-relaxed">
                  {systemConfig.message || "Hệ thống có thông báo mới dành cho bạn!"}
                </p>
                <button 
                  onClick={() => setIsNotificationClosed(true)}
                  className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-emerald-500/25 active:scale-95"
                >
                  Đã hiểu & Đóng
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TRẠNG THÁI CẢNH BÁO CHO ADMIN KHI ĐANG TEST TRONG LÚC BẢO TRÌ */}
        {systemConfig.isActive && systemConfig.type === "MAINTENANCE" && isAdmin && (
          <div className="bg-red-950/80 text-red-400 border-b border-red-900/50 px-4 py-1 text-center text-[11px] font-bold tracking-wider uppercase sticky top-0 z-50">
            ⚠️ Chế độ bảo trì đang bật. Bạn đang truy cập bằng quyền Quản Trị Viên!
          </div>
        )}

        {/* ========================================== */}
        {/* NAVBAR DESKTOP */}
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
        {/* HEADER MOBILE */}
        {/* ========================================== */}
        <header className="md:hidden flex items-center justify-between px-4 h-14 bg-gray-900/80 backdrop-blur-xl border-b border-gray-800 sticky top-0 z-40">
          <div className="flex items-center gap-2 text-lg font-black text-white tracking-tight">
            <Activity className="w-5 h-5 text-emerald-500" />
            <span>AI Fitness</span>
          </div>
          
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
        {/* SIDEBAR MENU TRƯỢT */}
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
        {/* NỘI DUNG CHÍNH */}
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
            <Route path="/calorie-calculator" element={<CalorieCalculator />} />
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