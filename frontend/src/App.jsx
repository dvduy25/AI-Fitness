import api from "./services/api";
import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, NavLink, Navigate, Link, useNavigate } from "react-router-dom";
import {
  LogOut, Home, User, Utensils, Dumbbell, Activity, History,
  Crown, Globe, Bookmark, Menu, X, Calculator, Settings, Bell, Lock,
  MessageSquare, Send, CheckCircle2, ScanLine, QrCode, Download
} from 'lucide-react';
import axios from 'axios';
import QRScannerModal from "./QRScannerModal";

// Import các trang (Components)
// 🚀 HIỆU NĂNG: Lazy-load các trang theo route để giảm kích thước bundle đầu vào.
// Trước đây toàn bộ 24 trang được bundle chung vào 1 file JS ~1MB, khiến người
// dùng phải tải toàn bộ ứng dụng (kể cả các trang họ chưa dùng tới) ngay khi mở
// trang đầu tiên. Với React.lazy, mỗi trang chỉ được tải khi người dùng thực sự
// điều hướng tới route đó.
import { Suspense, lazy } from "react";
import AuthPage from "./AuthPage";
const TodayDashboard = lazy(() => import("./DailyDashboard"));
const Profile = lazy(() => import("./Profile"));
const MealPlanManager = lazy(() => import("./MealPlanManager"));
const WorkoutPlanManager = lazy(() => import("./WorkoutPlanManager"));
const DietHistory = lazy(() => import("./DietHistory"));
const WorkoutTracker = lazy(() => import("./WorkoutTracker"));
const PremiumUpgrade = lazy(() => import("./PremiumUpgrade"));
const Community = lazy(() => import("./Community"));
const PostDetail = lazy(() => import("./PostDetail"));
const MyLibrary = lazy(() => import("./MyLibrary"));
const CalorieCalculator = lazy(() => import("./CalorieCalculator"));
import FloatingBot from "./FloatingBot";

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

// =========================================================
// 📷🖼️ TÍNH NĂNG MÃ QR (Quét mã người khác + Hiện mã của mình)
// =========================================================
// QRScannerLauncher là 1 component riêng vì cần dùng useNavigate() để điều hướng sau khi
// quét xong — useNavigate() chỉ hoạt động được bên trong <BrowserRouter>. App là nơi TẠO
// RA BrowserRouter nên bản thân App không được coi là "con" của Router khi hook chạy.
//
// ⚠️ QUAN TRỌNG: state điều khiển việc HIỂN THỊ 2 modal này (showQRScanner, showQRDisplay,
// qrData...) đều đặt Ở CẤP APP (không đặt trong component nút bấm), và cả 2 modal đều
// được render Ở NGOÀI khối Sidebar Menu (`{isMenuOpen && (...)}`).
//
// Lý do: bản trước đặt state ngay trong nút bấm nằm bên trong Sidebar Menu. Khi bấm nút,
// code vừa gọi setShowScanner(true) (mở modal) vừa gọi onAfterClick() → setIsMenuOpen(false)
// (đóng sidebar) trong CÙNG 1 lần render. React unmount toàn bộ khối Sidebar Menu ngay lập
// tức — cuốn theo luôn component chứa modal vừa được bật, nên bấm nút mà không thấy gì cả.
function QRScannerLauncher({ onClose }) {
  const navigate = useNavigate();

  const handleScanSuccess = (scannedUserId) => {
    onClose();
    // Đưa thẳng tới trang Cộng đồng kèm query ?viewUser=<id> — Community.jsx đã có sẵn
    // useEffect đọc query này để tự mở đúng profile card, y hệt khi bấm vào 1 người
    // trong danh sách đang theo dõi.
    navigate(`/community?viewUser=${scannedUserId}`);
  };

  return <QRScannerModal onClose={onClose} onScanSuccess={handleScanSuccess} />;
}

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
      const res = await api.get("/contact/my-history", {
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
      await api.post("/contact", contactForm, {
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
        const res = await api.get("/system/maintenance");
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

  // =========================================================
  // STATE CHO TÍNH NĂNG MÃ QR (đặt ở cấp App — xem giải thích tại component
  // QRScannerLauncher phía trên để hiểu vì sao KHÔNG được đặt state này bên trong
  // nút bấm nằm trong Sidebar Menu)
  // =========================================================
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showQRDisplay, setShowQRDisplay] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [isLoadingQR, setIsLoadingQR] = useState(false);
  const [qrError, setQrError] = useState(null);

  const handleOpenQRScanner = () => {
    setIsMenuOpen(false);
    setShowQRScanner(true);
  };

  const handleOpenQRDisplay = async () => {
    setIsMenuOpen(false);
    setShowQRDisplay(true);

    if (qrData) return; // đã tải sẵn từ lần mở trước, không cần gọi lại API

    setIsLoadingQR(true);
    setQrError(null);
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("adminToken");
      const res = await api.get("/users/qr-code", {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data?.success && res.data?.qrCode) {
        setQrData(res.data.qrCode);
      } else {
        throw new Error("Không nhận được dữ liệu mã QR.");
      }
    } catch (err) {
      setQrError("Không thể tạo mã QR. Vui lòng thử lại sau.");
    } finally {
      setIsLoadingQR(false);
    }
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

                {/* 📷 NÚT QUÉT MÃ QR */}
                <button
                  onClick={handleOpenQRScanner}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-800 border border-transparent hover:border-gray-700 text-gray-300 hover:text-blue-400 transition-all font-semibold"
                >
                  <ScanLine className="w-5 h-5" /> Quét Mã QR
                </button>

                {/* 🖼️ NÚT HIỆN MÃ QR CỦA CHÍNH MÌNH */}
                <button
                  onClick={handleOpenQRDisplay}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-800 border border-transparent hover:border-gray-700 text-gray-300 hover:text-emerald-400 transition-all font-semibold"
                >
                  <QrCode className="w-5 h-5" /> Mã QR Của Tôi
                </button>

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

        {/* 📷 MODAL QUÉT MÃ QR — render ở NGOÀI khối Sidebar Menu, không bị unmount khi Sidebar đóng */}
        {showQRScanner && (
          <QRScannerLauncher onClose={() => setShowQRScanner(false)} />
        )}

        {/* 🖼️ MODAL HIỆN MÃ QR CỦA CHÍNH MÌNH — cũng render ở NGOÀI khối Sidebar Menu */}
        {showQRDisplay && (
          <div
            className="fixed inset-0 z-[160] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => setShowQRDisplay(false)}
          >
            <div
              className="bg-gray-900 border border-gray-800 rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-emerald-400" /> Mã QR Của Tôi
                </h3>
                <button
                  onClick={() => setShowQRDisplay(false)}
                  className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {isLoadingQR ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Activity className="w-8 h-8 text-emerald-500 animate-spin mb-3" />
                  <p className="text-sm text-gray-400">Đang tạo mã QR...</p>
                </div>
              ) : qrData ? (
                <>
                  <div className="bg-white p-4 rounded-xl inline-block">
                    <img src={qrData} alt="Mã QR cá nhân" className="w-56 h-56 object-contain" />
                  </div>
                  <p className="text-xs text-gray-400 mt-4 leading-relaxed">
                    Bạn bè quét mã này để vào thẳng trang cá nhân của bạn trên Cộng đồng.
                  </p>
                  <a
                    href={qrData}
                    download="qr-code-ai-fitness.png"
                    className="mt-4 w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" /> Tải mã QR
                  </a>
                </>
              ) : (
                <p className="text-sm text-gray-500 py-12">{qrError || "Không thể tải mã QR."}</p>
              )}
            </div>
          </div>
        )}

        {/* NỘI DUNG CHÍNH */}
        <main className="flex-1 w-full pb-20 md:pb-0 relative">
          <Suspense fallback={
            <div className="w-full h-[60vh] flex items-center justify-center">
              <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
            </div>
          }>
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
          </Suspense>
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