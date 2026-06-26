import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, NavLink, Navigate, Link } from "react-router-dom";
import {
  LogOut, Home, User, Utensils, Dumbbell, Activity, History,
  Crown, Globe, Bookmark, Menu, X, Calculator, Settings, Bell, Lock,
  MessageSquare, Send, CheckCircle2
} from 'lucide-react';
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
      localStorage.removeItem("token");
      localStorage.removeItem("adminToken");
      localStorage.removeItem("role");
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

  // State quản lý Modals
  const [isLockedModalOpen, setIsLockedModalOpen] = useState(false);

  // State Hệ thống
  const [systemConfig, setSystemConfig] = useState({ isActive: false, type: "NORMAL", message: "" });
  const [isNotificationClosed, setIsNotificationClosed] = useState(false);

  // =========================================================
  // STATE & HÀM XỬ LÝ CHO CHỨC NĂNG LIÊN HỆ ADMIN
  // =========================================================
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [contactForm, setContactForm] = useState({ type: 'help', title: '', content: '' });
  const [isSubmittingContact, setIsSubmittingContact] = useState(false);
  const [contactSuccess, setContactSuccess] = useState(false);
  
  // 🌟 ĐÃ THÊM: State quản lý Tab và Lịch sử
  const [contactTab, setContactTab] = useState('send'); // 'send' | 'history'
  const [contactHistoryList, setContactHistoryList] = useState([]);

  // 🌟 ĐÃ THÊM: Hàm gọi API lấy lịch sử
  const fetchContactHistory = async () => {
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("adminToken");
      const res = await axios.get("https://ai-fitness-w6fd.onrender.com/api/contact/my-history", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if(res.data.success) {
        setContactHistoryList(res.data.data);
      }
    } catch (error) {
      console.error("Lỗi lấy lịch sử:", error);
    }
  };

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    if (!contactForm.title.trim() || !contactForm.content.trim()) return;

    setIsSubmittingContact(true);
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("adminToken");

      // 🌟 ĐÃ MỞ KHÓA: Gọi API thật lên Backend
      await axios.post("https://ai-fitness-w6fd.onrender.com/api/contact", contactForm, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setContactSuccess(true);
      setTimeout(() => {
        setIsContactModalOpen(false);
        setContactSuccess(false);
        setContactForm({ type: 'help', title: '', content: '' }); // Reset form
      }, 2000); // Tự động đóng sau 2s khi hiện success
    } catch (error) {
      console.error("Lỗi gửi liên hệ:", error);
      alert("Có lỗi xảy ra khi gửi. Vui lòng thử lại sau!");
    } finally {
      setIsSubmittingContact(false);
    }
  };

  useEffect(() => {
    const handleAccountLocked = () => {
      setIsLockedModalOpen(true);
    };
    window.addEventListener("accountLocked", handleAccountLocked);

    const token = localStorage.getItem("token") || localStorage.getItem("adminToken");
    const role = localStorage.getItem("role");

    if (token) {
      setIsLoggedIn(true);
      if (role === "admin" || localStorage.getItem("adminToken")) {
        setIsAdmin(true);
      }
    }

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

  const handleAcknowledgeLock = () => {
    window.location.href = "/";
  };

  if (isCheckingAuth) {
    return (
      <div className="bg-gray-950 min-h-screen flex items-center justify-center">
        <Activity className="w-10 h-10 text-emerald-500 animate-spin" />
      </div>
    );
  }

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
        </div>
      </div>
    );
  }

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
        {/* 📬 MODAL LIÊN HỆ ADMIN (CÓ TAB LỊCH SỬ) */}
        {/* ========================================================= */}
        {isContactModalOpen && (
          <div className="fixed inset-0 z-[150] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 relative flex flex-col max-h-[90vh]">
              
              <div className="flex justify-between items-center mb-4 shrink-0">
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <MessageSquare className="w-6 h-6 text-blue-500" />
                  Hỗ Trợ & Phản Hồi
                </h2>
                <button 
                  onClick={() => setIsContactModalOpen(false)}
                  className="p-2 text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* TABS CHUYỂN ĐỔI: GỬI / LỊCH SỬ */}
              <div className="flex gap-2 bg-gray-950 p-1.5 rounded-xl mb-6 shrink-0 border border-gray-800">
                <button 
                  onClick={() => setContactTab('send')}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${contactTab === 'send' ? 'bg-gray-800 text-white shadow-md' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  Gửi Yêu Cầu
                </button>
                <button 
                  onClick={() => {
                    setContactTab('history');
                    fetchContactHistory(); // Gọi API khi chuyển sang tab lịch sử
                  }}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${contactTab === 'history' ? 'bg-gray-800 text-white shadow-md' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  Lịch Sử Của Tôi
                </button>
              </div>

              <div className="overflow-y-auto pr-1 flex-1 custom-scrollbar">
                {/* TAB 1: FORM GỬI YÊU CẦU */}
                {contactTab === 'send' && (
                  contactSuccess ? (
                    <div className="flex flex-col items-center text-center py-8 animate-in fade-in zoom-in">
                      <div className="w-16 h-16 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mb-4">
                        <CheckCircle2 className="w-8 h-8" />
                      </div>
                      <h3 className="text-lg font-bold text-white mb-2">Đã gửi thành công!</h3>
                      <p className="text-gray-400 text-sm">Cảm ơn bạn. Admin sẽ ghi nhận và phản hồi sớm nhất.</p>
                    </div>
                  ) : (
                    <form onSubmit={handleContactSubmit} className="space-y-4">
                      {/* Chọn loại liên hệ */}
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-gray-300 ml-1">Chủ đề <span className="text-red-500">*</span></label>
                        <div className="grid grid-cols-3 gap-2">
                          <button type="button" onClick={() => setContactForm({ ...contactForm, type: 'help' })}
                            className={`p-2 rounded-xl text-sm font-bold border transition-all flex flex-col items-center justify-center gap-1 ${contactForm.type === 'help' ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' : 'bg-gray-800 border-transparent text-gray-400 hover:bg-gray-700'}`}>
                            🛟 Trợ giúp
                          </button>
                          <button type="button" onClick={() => setContactForm({ ...contactForm, type: 'bug' })}
                            className={`p-2 rounded-xl text-sm font-bold border transition-all flex flex-col items-center justify-center gap-1 ${contactForm.type === 'bug' ? 'bg-red-500/20 border-red-500/50 text-red-400' : 'bg-gray-800 border-transparent text-gray-400 hover:bg-gray-700'}`}>
                            🐞 Báo lỗi
                          </button>
                          <button type="button" onClick={() => setContactForm({ ...contactForm, type: 'feedback' })}
                            className={`p-2 rounded-xl text-sm font-bold border transition-all flex flex-col items-center justify-center gap-1 ${contactForm.type === 'feedback' ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400' : 'bg-gray-800 border-transparent text-gray-400 hover:bg-gray-700'}`}>
                            💡 Góp ý
                          </button>
                        </div>
                      </div>

                      {/* Tiêu đề */}
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-gray-300 ml-1">Tiêu đề <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          required
                          placeholder="Tóm tắt vấn đề của bạn..."
                          className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                          value={contactForm.title}
                          onChange={(e) => setContactForm({ ...contactForm, title: e.target.value })}
                        />
                      </div>

                      {/* Nội dung chi tiết */}
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-gray-300 ml-1">Nội dung chi tiết <span className="text-red-500">*</span></label>
                        <textarea
                          required
                          rows={4}
                          placeholder="Mô tả chi tiết để Admin có thể giúp bạn tốt nhất nhé..."
                          className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-none"
                          value={contactForm.content}
                          onChange={(e) => setContactForm({ ...contactForm, content: e.target.value })}
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmittingContact || !contactForm.title.trim() || !contactForm.content.trim()}
                        className="w-full mt-2 py-3.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-500 text-white rounded-xl font-bold flex justify-center items-center gap-2 transition-all active:scale-95 shadow-lg shadow-blue-500/20"
                      >
                        {isSubmittingContact ? <Activity className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                        {isSubmittingContact ? "Đang gửi..." : "Gửi Cho Admin"}
                      </button>
                    </form>
                  )
                )}

                {/* TAB 2: LỊCH SỬ XEM PHẢN HỒI */}
                {contactTab === 'history' && (
                  <div className="space-y-4">
                    {contactHistoryList.length === 0 ? (
                      <p className="text-center text-gray-500 py-6 text-sm">Bạn chưa gửi yêu cầu nào.</p>
                    ) : (
                      contactHistoryList.map((item, idx) => (
                        <div key={idx} className="bg-gray-950 border border-gray-800 rounded-xl p-4">
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-bold text-white">{item.title}</span>
                            <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-md ${item.status === 'resolved' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                              {item.status === 'resolved' ? 'Đã giải quyết' : 'Đang xử lý'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-400 mb-3">{item.content}</p>
                          
                          {/* Khung hiển thị câu trả lời của Admin */}
                          {item.adminReply && (
                            <div className="bg-emerald-950/30 border-l-4 border-emerald-500 p-3 rounded-r-lg mt-3">
                              <p className="text-xs font-bold text-emerald-400 mb-1">Admin phản hồi:</p>
                              <p className="text-sm text-gray-300">{item.adminReply}</p>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 🚨 MODAL KHÓA TÀI KHOẢN */}
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

        {/* THÔNG BÁO TỪ HỆ THỐNG */}
        {isLoggedIn && systemConfig.isActive && systemConfig.type === "NORMAL" && !isNotificationClosed && (
          <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-300 relative">
              <button
                onClick={() => setIsNotificationClosed(true)}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-full transition-colors"
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

        {systemConfig.isActive && systemConfig.type === "MAINTENANCE" && isAdmin && (
          <div className="bg-red-950/80 text-red-400 border-b border-red-900/50 px-4 py-1 text-center text-[11px] font-bold tracking-wider uppercase sticky top-0 z-50">
            ⚠️ Chế độ bảo trì đang bật. Bạn đang truy cập bằng quyền Quản Trị Viên!
          </div>
        )}

        {/* NAVBAR DESKTOP */}
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

        {/* HEADER MOBILE */}
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

        {/* SIDEBAR MENU TRƯỢT */}
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
                  <Dumbbell className="w-5 h-5" /> Quản lý Lịch Tập
                </Link>

                <Link to="/meal-plan" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-800 border border-transparent hover:border-gray-700 text-gray-300 hover:text-emerald-400 transition-all font-semibold">
                  <Utensils className="w-5 h-5" /> Quản lý Lịch Ăn
                </Link>

                <Link to="/library" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-800 border border-transparent hover:border-gray-700 text-gray-300 hover:text-purple-400 transition-all font-semibold">
                  <Bookmark className="w-5 h-5" /> Kho Lưu Trữ
                </Link>

                <div className="h-px bg-gray-800 my-4 mx-2"></div>

                {/* 🌟 NÚT LIÊN HỆ ĐƯỢC THÊM VÀO ĐÂY */}
                <button
                  onClick={() => {
                    setContactTab('send'); // Đặt mặc định là tab gửi khi mở
                    setIsContactModalOpen(true);
                    setIsMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-800 border border-transparent hover:border-gray-700 text-gray-300 hover:text-blue-400 transition-all font-semibold"
                >
                  <MessageSquare className="w-5 h-5" /> Liên Hệ Hỗ Trợ
                </button>

                <Link to="/premium" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-yellow-500/10 to-yellow-600/10 border border-yellow-500/30 text-yellow-500 font-bold hover:bg-yellow-500/20 transition-colors shadow-inner mt-2">
                  <Crown className="w-5 h-5" /> Nâng Cấp VIP
                </Link>
              </div>

              <div className="p-4 border-t border-gray-800 bg-gray-950">
                <button
                  onClick={handleLogout}
                  className="flex items-center justify-center gap-2 w-full p-3 rounded-xl bg-red-500/10 text-red-500 font-bold hover:bg-red-500 hover:text-white transition-colors border border-red-500/20"
                >
                  <LogOut className="w-5 h-5" /> Đăng Xuất
                </button>
              </div>
            </div>
          </div>
        )}

        {/* NỘI DUNG CHÍNH */}
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

        {/* BOTTOM NAVIGATION MOBILE */}
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