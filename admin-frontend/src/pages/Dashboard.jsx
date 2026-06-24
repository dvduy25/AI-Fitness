import React, { useEffect, useState } from 'react';
import { 
  Users, Crown, Dumbbell, Apple, Activity, 
  ShieldAlert, ShieldX, ShieldCheck, AlertTriangle, Lock, UserMinus, UserX,
  TrendingUp, UserPlus
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';
import api from '../services/api';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    premiumUsers: 0,
    totalExercises: 0,
    totalFoods: 0,
    totalRevenue: 0, 
    revenueHistory: [], // Nhận mảng thật từ backend: [ { date: "24/06", revenue: 500000 } ]
    userGrowth: []      // Nhận mảng thật từ backend: [ { date: "24/06", count: 12 } ]
  });
  
  const [loading, setLoading] = useState(true);

  // State hệ thống an ninh radar
  const [auditResult, setAuditResult] = useState(null);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      await Promise.all([fetchDashboardData(), runAutomaticSecurityAudit()]);
      setLoading(false);
    };
    initData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const statsResponse = await api.get('/admin/dashboard'); 
      if (statsResponse.data.success) {
        setStats(statsResponse.data.data);
      }
    } catch (error) {
      console.error('Lỗi khi tải dữ liệu Dashboard từ API:', error);
    }
  };

  const runAutomaticSecurityAudit = async () => {
    setIsScanning(true);
    try {
      const res = await api.get('/admin/security-audit');
      if (res.data.success) {
        setAuditResult(res.data);
      }
    } catch (error) {
      console.error("Hệ thống tự động quét an ninh thất bại:", error);
    } finally {
      setIsScanning(false);
    }
  };

  // --- CÁC HÀM XỬ LÝ AN NINH CORE LOGIC (GIỮ NGUYÊN) ---
  const handleQuickLock = async (userId, userEmail) => {
    if (window.confirm(`Xác nhận thay đổi trạng thái khóa của tài khoản: ${userEmail}?`)) {
      try {
        const res = await api.put(`/admin/security/lock/${userId}`);
        if (res.data.success) {
          alert(res.data.message);
          runAutomaticSecurityAudit(); 
        }
      } catch (error) {
        alert(error.response?.data?.message || "Không thể thực thi lệnh khóa.");
      }
    }
  };

  const handleQuickRevokeVIP = async (userId, userEmail) => {
    if (window.confirm(`HÀNH ĐỘNG KHẨN CẤP: Bạn chắc chắn muốn tước quyền VIP Premium của tài khoản lậu [${userEmail}]?`)) {
      try {
        const res = await api.put(`/admin/security/revoke-vip/${userId}`);
        if (res.data.success) {
          alert(res.data.message);
          runAutomaticSecurityAudit(); 
          fetchDashboardData(); 
        }
      } catch (error) {
        alert(error.response?.data?.message || "Không thể thực thi tước VIP.");
      }
    }
  };

  const handleQuickRevokeAdmin = async (userId, userEmail) => {
    if (window.confirm(`NGUY HIỂM TỘT ĐỘ: Tước quyền Admin của kẻ xâm nhập [${userEmail}] và hạ cấp về tài khoản thường?`)) {
      try {
        const res = await api.put(`/admin/security/revoke-admin/${userId}`);
        if (res.data.success) {
          alert(res.data.message);
          runAutomaticSecurityAudit(); 
        }
      } catch (error) {
        alert(error.response?.data?.message || "Không thể thực thi tước quyền Admin.");
      }
    }
  };

  const handleQuickRevokeTrainer = async (userId, userEmail) => {
    if (window.confirm(`XÁC NHẬN HỦY QUYỀN: Bạn chắc chắn muốn tước quyền Trainer của tài khoản thiếu thông tin [${userEmail}] và đưa họ về User thường?`)) {
      try {
        const res = await api.put(`/admin/security/revoke-trainer/${userId}`);
        if (res.data.success) {
          alert(res.data.message);
          runAutomaticSecurityAudit(); 
          fetchDashboardData(); 
        }
      } catch (error) {
        alert(error.response?.data?.message || "Không thể thực thi hủy quyền Trainer.");
      }
    }
  };

  // --- XỬ LÝ DỮ LIỆU ĐỒ THỊ THẬT ---
  // Sử dụng dữ liệu mảng trực tiếp từ backend truyền xuống. Nếu rỗng, đồ thị hiển thị trạng thái trống.
  const activeRevenueData = stats.revenueHistory || [];
  const activeGrowthData = stats.userGrowth || [];

  // Tính toán cấu trúc biểu đồ hình tròn Tỉ lệ VIP dựa trên Real Data
  const totalUsersCount = stats.totalUsers || 0;
  const vipPercentage = totalUsersCount > 0 ? ((stats.premiumUsers / totalUsersCount) * 100).toFixed(1) : 0;
  
  const pieData = [
    { name: 'Tài Khoản VIP', value: stats.premiumUsers },
    { name: 'Người dùng thường', value: Math.max(0, stats.totalUsers - stats.premiumUsers) }
  ];
  const PIE_COLORS = ['#fbbf24', '#e5e7eb']; // Vàng cho VIP, Xám cho Thường

  // Định dạng hiển thị tiền Việt Nam
  const formatVND = (value) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);

  const statCards = [
    { title: 'Tổng Người Dùng', value: stats.totalUsers, icon: Users, color: 'bg-blue-500', bgColor: 'bg-blue-50', textColor: 'text-blue-600' },
    { title: 'Tài Khoản VIP', value: stats.premiumUsers, icon: Crown, color: 'bg-yellow-500', bgColor: 'bg-yellow-50', textColor: 'text-yellow-600' },
    { title: 'Tổng Bài Tập', value: stats.totalExercises, icon: Dumbbell, color: 'bg-purple-500', bgColor: 'bg-purple-50', textColor: 'text-purple-600' },
    { title: 'Tổng Thực Phẩm', value: stats.totalFoods, icon: Apple, color: 'bg-green-500', bgColor: 'bg-green-50', textColor: 'text-green-600' },
  ];

  if (loading) return (
    <div className="flex justify-center items-center h-full min-h-[60vh]">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
    </div>
  );

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      <div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Tổng quan hệ thống</h1>
        <p className="text-gray-500 mt-1">Dữ liệu thực tế và phân tích trực quan từ Database MongoDB</p>
      </div>

      {/* 🛑 THÔNG BÁO CẢNH BÁO BẪY ADMIN */}
      {auditResult?.secondaryAdminDetected && (
        <div className="bg-red-50 border-2 border-red-500 rounded-3xl p-6 flex flex-col md:flex-row items-start md:items-center gap-5 animate-bounce shadow-xl">
          <div className="p-4 bg-red-500 text-white rounded-2xl shadow-md">
            <ShieldX className="w-8 h-8" />
          </div>
          <div className="flex-1 space-y-1">
            <h2 className="text-lg font-black text-red-900 uppercase tracking-wide">Cảnh báo xâm nhập mức độ cao nhất (Hacker cấp Admin)!</h2>
            <p className="text-sm text-red-700 font-medium">
              Hệ thống phát hiện có nhiều hơn 1 tài khoản nắm giữ vai trò <span className="font-black underline">Admin</span>. Cơ chế bảo mật tự động đã kích hoạt và thực hiện <span className="font-bold underline">Khóa toàn bộ tài khoản Admin giả mạo</span> nhằm bảo vệ lõi cơ sở dữ liệu.
            </p>
          </div>
          <div className="px-4 py-2 bg-red-600 text-white rounded-xl font-bold text-xs shadow-sm">
            ĐÃ PHONG TỎA TỰ ĐỘNG
          </div>
        </div>
      )}

      {/* Grid thống kê 4 ô cơ bản */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div key={index} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="flex justify-between items-start z-10 relative">
                <div>
                  <p className="text-gray-500 text-sm font-medium">{card.title}</p>
                  <h3 className="text-3xl font-black text-gray-900 mt-2">{card.value}</h3>
                </div>
                <div className={`p-3 rounded-2xl ${card.bgColor} ${card.textColor}`}>
                  <Icon size={24} />
                </div>
              </div>
              <div className={`absolute -bottom-4 -right-4 w-24 h-24 rounded-full opacity-10 blur-2xl group-hover:scale-150 transition-transform duration-500 ${card.color}`}></div>
            </div>
          );
        })}
      </div>

      {/* 📊 KHU VỰC BIỂU ĐỒ 1: DOANH THU & TỶ LỆ VIP */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Khối Biểu đồ Doanh thu */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                <TrendingUp size={22} />
              </div>
              <div>
                <h4 className="text-lg font-bold text-gray-900">Biến Động Doanh Thu</h4>
                <p className="text-gray-500 text-sm">Theo dõi xu hướng dòng tiền lên xuống trong tháng</p>
              </div>
            </div>
            <div className="text-right bg-emerald-50/50 px-4 py-2 rounded-2xl border border-emerald-100">
              <p className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">Tổng doanh thu</p>
              <p className="text-xl font-black text-emerald-600">{formatVND(stats.totalRevenue)}</p>
            </div>
          </div>

          <div className="h-[280px] w-full">
            {activeRevenueData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activeRevenueData} margin={{ top: 10, right: 10, left: 15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 11}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 11}} tickFormatter={(val) => `${val.toLocaleString('vi-VN')}đ`} />
                  <Tooltip 
                    formatter={(value) => [formatVND(value), "Doanh thu"]}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)' }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm font-medium">Chưa có dữ liệu biến động doanh thu.</div>
            )}
          </div>
        </div>

        {/* Khối Biểu đồ hình tròn Tỉ lệ VIP */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between relative">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-lg font-bold text-gray-900">Tỉ Lệ VIP Premium</h4>
            <Crown size={20} className="text-yellow-500" />
          </div>
          
          <div className="h-[200px] w-full relative my-auto">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData} cx="50%" cy="50%" innerRadius={65} outerRadius={85}
                  paddingAngle={5} dataKey="value" stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }} />
              </PieChart>
            </ResponsiveContainer>
            
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-black text-gray-900">{vipPercentage}%</span>
              <span className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Tỷ lệ VIP</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 border-t border-gray-50 pt-4 text-center">
            <div>
              <p className="text-xs text-gray-400 font-medium flex items-center justify-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 inline-block"></span> Hội viên VIP
              </p>
              <p className="text-lg font-black text-gray-800 mt-0.5">{stats.premiumUsers}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium flex items-center justify-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-gray-300 inline-block"></span> Thường
              </p>
              <p className="text-lg font-black text-gray-800 mt-0.5">{Math.max(0, stats.totalUsers - stats.premiumUsers)}</p>
            </div>
          </div>
        </div>

      </div>

      {/* 📊 KHU VỰC BIỂU ĐỒ 2 & TRẠNG THÁI CORE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Biểu đồ Cột số lượng tài khoản tạo mới từng ngày */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
              <UserPlus size={22} />
            </div>
            <div>
              <h4 className="text-lg font-bold text-gray-900">Tăng Trưởng Tài Khoản Mới</h4>
              <p className="text-gray-500 text-sm">Số lượng user đăng ký mới của các ngày trong tháng</p>
            </div>
          </div>

          <div className="h-[250px] w-full">
            {activeGrowthData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activeGrowthData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }} barSize={16}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 11}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 11}} allowDecimals={false} />
                  <Tooltip 
                    cursor={{ fill: '#f9fafb' }}
                    formatter={(value) => [value, "Tài khoản mới"]}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)' }}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm font-medium">Chưa có dữ liệu đăng ký mới ngày hôm nay.</div>
            )}
          </div>
        </div>

        {/* Khối Trạng thái API và DB */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col justify-center">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-green-50 text-green-600 rounded-2xl shadow-sm">
              <Activity size={32} />
            </div>
            <div>
              <h4 className="text-xl font-bold text-gray-900">Trạng thái API & Database</h4>
              <p className="text-gray-500 mt-1.5 text-sm leading-relaxed">
                Hệ thống cốt lõi đang kết nối an toàn với Cluster MongoDB. Đồng bộ hóa dữ liệu thời gian thực được xử lý trực tiếp qua giao thức RESTful API.
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* 🛡️ KHU VỰC: RADAR AN NINH (GIỮ NGUYÊN 100% GIAO DIỆN & LOGIC) */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 flex flex-col h-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Radar Quét Bảo Mật Cốt Lõi</h2>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-ping"></span>
            <span className="text-[10px] text-green-600 font-bold uppercase tracking-wider">Live scanning</span>
          </div>
        </div>
        
        <div className="flex-1 flex flex-col p-4 border border-gray-100 bg-gray-50/50 rounded-2xl overflow-hidden min-h-[350px]">
          {isScanning ? (
            <div className="flex flex-col items-center justify-center h-full space-y-3">
              <Activity className="w-10 h-10 text-blue-600 animate-spin mx-auto" />
              <p className="text-xs font-bold text-gray-500">Đang kiểm tra toàn diện Database...</p>
            </div>
          ) : !auditResult ? (
            <div className="flex flex-col items-center justify-center h-full">
              <ShieldCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400 text-xs font-medium">Chưa có thông tin cập nhật an ninh.</p>
            </div>
          ) : auditResult.isSystemSafe ? (
            <div className="flex flex-col items-center justify-center h-full animate-in fade-in">
              <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3 border border-emerald-200">
                <ShieldCheck className="w-7 h-7 text-emerald-600" />
              </div>
              <h3 className="text-sm font-bold text-emerald-800 mb-1">Hệ Thống Tuyệt Đối An Toàn</h3>
              <p className="text-xs text-emerald-600/90 text-center leading-relaxed">
                Không phát hiện lỗi dữ liệu VIP, Admin giả mạo hay Trainer thiếu thông tin.
              </p>
            </div>
          ) : (
            <div className="animate-in zoom-in h-full flex flex-col">
              <div className="text-center mb-3 flex-shrink-0">
                <div className="w-12 h-12 bg-red-100 border border-red-200 rounded-full flex items-center justify-center mx-auto mb-2 relative">
                  <div className="absolute inset-0 border-4 border-red-500 rounded-full animate-ping opacity-10"></div>
                  <ShieldAlert className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-sm font-black text-red-800 uppercase tracking-wide">Phát Hiện Tài Khoản Nghi Vấn!</h3>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar max-h-[300px]">
                
                {/* PHẦN 1: ADMIN LẬU */}
                {auditResult.adminHackers?.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[11px] font-black text-red-600 bg-red-50 border border-red-200 py-1 px-2 rounded-lg inline-flex items-center gap-1 w-full justify-center">
                      <AlertTriangle size={14}/> NGUY HIỂM: PHÁT HIỆN {auditResult.adminHackers.length} ADMIN GIẢ MẠO
                    </div>
                    {auditResult.adminHackers.map((hacker) => (
                      <div key={hacker._id} className="flex flex-col p-3 bg-red-50 border border-red-200 rounded-xl space-y-2.5 shadow-sm">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-red-100 text-red-700 rounded-lg"><ShieldX className="w-4 h-4"/></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-black text-red-900 truncate">{hacker.name || 'Vô Danh'}</p>
                            <p className="text-[10px] text-red-600 font-medium truncate">{hacker.email}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-red-100">
                          <button type="button" onClick={() => handleQuickLock(hacker._id, hacker.email)} className={`py-1.5 px-2 rounded-lg text-[11px] font-bold ${hacker.isLocked ? 'bg-gray-200 text-gray-500' : 'bg-red-600 text-white'}`}>
                            <Lock size={12} className="inline mr-1"/> {hacker.isLocked ? "Mở Khóa" : "Khóa Lập Tức"}
                          </button>
                          <button type="button" onClick={() => handleQuickRevokeAdmin(hacker._id, hacker.email)} className="py-1.5 px-2 bg-gray-900 text-white rounded-lg text-[11px] font-bold">
                            <UserX size={12} className="inline mr-1"/> Tước Admin
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* PHẦN 2: TRAINER THIẾU THÔNG TIN */}
                {auditResult.incompleteTrainers?.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[11px] font-black text-purple-600 bg-purple-50 border border-purple-200 py-1 px-2 rounded-lg inline-flex items-center gap-1 w-full justify-center">
                      <AlertTriangle size={14}/> THIẾU HỒ SƠ: TỰ ĐỘNG PHONG TỎA {auditResult.incompleteTrainers.length} TRAINER
                    </div>
                    {auditResult.incompleteTrainers.map((trainer) => (
                      <div key={trainer._id} className="flex flex-col p-3 bg-purple-50/50 border border-purple-100 rounded-xl space-y-2.5 shadow-sm">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-purple-100 text-purple-700 rounded-lg"><Dumbbell className="w-4 h-4"/></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-black text-purple-900 truncate">{trainer.name || 'Chưa Điền Tên'}</p>
                            <p className="text-[10px] text-purple-600 truncate">{trainer.email}</p>
                          </div>
                          <span className="text-[9px] bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full">ĐANG KHÓA</span>
                        </div>
                        <div className="grid grid-cols-1 pt-1 border-t border-purple-100">
                          <button 
                            type="button" 
                            onClick={() => handleQuickRevokeTrainer(trainer._id, trainer.email)} 
                            className="w-full py-1.5 px-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                          >
                            <UserX size={12}/> Hủy Tư Cách Trainer (Hạ Về User Thường)
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* PHẦN 3: VIP LẬU */}
                {auditResult.hackers?.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[11px] font-black text-amber-600 bg-amber-50 border border-amber-200 py-1 px-2 rounded-lg inline-flex items-center gap-1 w-full justify-center">
                      <UserMinus size={14}/> PHÁT HIỆN {auditResult.hackers.length} VIP LẬU KHÔNG HÓA ĐƠN
                    </div>
                    {auditResult.hackers.map((hacker) => (
                      <div key={hacker._id} className="flex flex-col p-3 bg-white border border-amber-100 rounded-xl space-y-2.5 shadow-sm">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg"><Crown className="w-4 h-4"/></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-gray-800 truncate">{hacker.name || 'Hacker Ẩn Danh'}</p>
                            <p className="text-[10px] text-gray-400 truncate">{hacker.email}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-50">
                          <button type="button" onClick={() => handleQuickLock(hacker._id, hacker.email)} className={`py-1.5 px-2 rounded-lg text-[11px] font-bold ${hacker.isLocked ? 'bg-gray-200 text-gray-500' : 'bg-red-50 text-red-600'}`}>
                            <Lock size={12} className="inline mr-1"/> {hacker.isLocked ? "Mở Khóa" : "Khóa Acc"}
                          </button>
                          <button type="button" onClick={() => handleQuickRevokeVIP(hacker._id, hacker.email)} className="py-1.5 px-2 bg-amber-50 text-amber-700 rounded-lg text-[11px] font-bold">
                            <UserMinus size={12} className="inline mr-1"/> Hạ Cấp VIP
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

              </div>
            </div>
          )}
        </div>
        
        <button 
          onClick={runAutomaticSecurityAudit}
          disabled={isScanning}
          className="mt-4 w-full py-2.5 bg-gray-900 text-white rounded-xl font-bold text-xs hover:bg-gray-800 transition active:scale-[0.99] disabled:bg-gray-300 shadow-md"
        >
          {isScanning ? "Đang truy quét cốt lõi..." : "Yêu cầu tái rà soát an ninh"}
        </button>
      </div>

    </div>
  );
};

export default Dashboard;