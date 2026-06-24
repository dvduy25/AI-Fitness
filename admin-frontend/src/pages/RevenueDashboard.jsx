import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, Calendar, ShieldAlert, ShieldCheck, 
  Activity, AlertTriangle, Clock, CheckCircle2,
  Lock, UserMinus, RefreshCw
} from 'lucide-react';
import api from '../services/api';

const RevenueDashboard = () => {
  const [stats, setStats] = useState({
    today: { revenue: 0, orders: 0 },
    thisMonth: { revenue: 0, orders: 0 },
    thisYear: { revenue: 0, orders: 0 },
    recentHistory: []
  });
  const [loadingStats, setLoadingStats] = useState(true);
  
  // State cho phần An ninh quét tự động
  const [auditResult, setAuditResult] = useState(null);
  const [isScanning, setIsScanning] = useState(false);

  // Định dạng hiển thị tiền tệ
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  // Định dạng ngày hiển thị
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('vi-VN', {
      hour: '2-digit', minute: '2-digit',
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
  };

  // TỰ ĐỘNG CHẠY KHI VÀO TRANG (QUÉT TỰ ĐỘNG TRÊN HỆ THỐNG)
  useEffect(() => {
    const initDashboard = async () => {
      setLoadingStats(true);
      await Promise.all([fetchStats(), runAutomaticSecurityAudit()]);
      setLoadingStats(false);
    };
    initDashboard();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await api.get('/admin/revenue-report'); 
      if (res.data.success) {
        setStats(res.data.data);
      }
    } catch (error) {
      console.error("Lỗi tải thống kê doanh thu:", error);
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

  // XỬ LÝ NHANH: Khóa tài khoản đối tượng vi phạm
  const handleQuickLock = async (userId, userEmail) => {
    if (window.confirm(`Xác nhận thay đổi trạng thái khóa của tài khoản: ${userEmail}?`)) {
      try {
        const res = await api.put(`/admin/security/lock/${userId}`);
        if (res.data.success) {
          alert(res.data.message);
          // Làm mới lại radar tự động sau khi trừng phạt thành công
          runAutomaticSecurityAudit();
        }
      } catch (error) {
        alert(error.response?.data?.message || "Không thể thực thi lệnh khóa.");
      }
    }
  };

  // XỬ LÝ NHANH: Hạ cấp tước VIP lập tức
  const handleQuickRevokeVIP = async (userId, userEmail) => {
    if (window.confirm(`HÀNH ĐỘNG KHẨN CẤP: Bạn chắc chắn muốn tước quyền VIP Premium của tài khoản lậu [${userEmail}]?`)) {
      try {
        const res = await api.put(`/admin/security/revoke-vip/${userId}`);
        if (res.data.success) {
          alert(res.data.message);
          runAutomaticSecurityAudit();
        }
      } catch (error) {
        alert(error.response?.data?.message || "Không thể thực thi tước VIP.");
      }
    }
  };

  if (loadingStats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 gap-3">
        <Activity className="w-12 h-12 text-gray-900 animate-spin" />
        <p className="text-sm font-bold text-gray-500 animate-pulse">Đang đồng bộ hóa dữ liệu tài chính & an ninh hệ thống...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Tổng Quan Doanh Thu</h1>
            <p className="text-gray-500 mt-1 text-sm">Hệ thống giám sát dòng tiền kết hợp tường lửa rà soát VIP lậu tự động.</p>
          </div>
          <button 
            onClick={() => { fetchStats(); runAutomaticSecurityAudit(); }} 
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl font-bold text-sm text-gray-700 hover:bg-gray-100 transition shadow-sm"
          >
            <RefreshCw size={16} className={isScanning ? "animate-spin" : ""} /> Đồng bộ lại
          </button>
        </div>

        {/* KHỐI 1: THẺ THỐNG KÊ DOANH THU */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -mr-10 -mt-10 transition-all"></div>
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><Clock className="w-6 h-6" /></div>
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Hôm Nay</h3>
            </div>
            <p className="text-3xl font-black text-gray-900 mb-1">{formatCurrency(stats.today.revenue)}</p>
            <p className="text-xs font-semibold text-blue-600 bg-blue-50 py-1 px-2.5 rounded-md w-max">{stats.today.orders} lượt nâng cấp mới</p>
          </div>

          <div className="bg-gray-900 p-6 rounded-3xl shadow-xl flex flex-col relative overflow-hidden text-white group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10 transition-all"></div>
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-white/10 rounded-2xl"><Calendar className="w-6 h-6 text-white" /></div>
              <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider">Tháng Này</h3>
            </div>
            <p className="text-3xl font-black mb-1">{formatCurrency(stats.thisMonth.revenue)}</p>
            <p className="text-xs font-semibold text-amber-400 bg-white/10 py-1 px-2.5 rounded-md w-max">{stats.thisMonth.orders} lượt nâng cấp</p>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -mr-10 -mt-10 transition-all"></div>
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl"><TrendingUp className="w-6 h-6" /></div>
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Năm Nay</h3>
            </div>
            <p className="text-3xl font-black text-gray-900 mb-1">{formatCurrency(stats.thisYear.revenue)}</p>
            <p className="text-xs font-semibold text-emerald-600 bg-emerald-50 py-1 px-2.5 rounded-md w-max">{stats.thisYear.orders} tổng lượt nâng cấp</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* KHỐI 2: LỊCH SỬ GIAO DỊCH */}
          <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Nhật Ký Dòng Tiền Thật</h2>
              <span className="text-xs text-gray-400 font-medium">Hiển thị tối đa 10 giao dịch gần nhất</span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-gray-400 text-xs uppercase tracking-wider border-b border-gray-100">
                    <th className="pb-3 font-bold">Người Dùng</th>
                    <th className="pb-3 font-bold">Gói dịch vụ</th>
                    <th className="pb-3 font-bold">Số Tiền</th>
                    <th className="pb-3 font-bold">Thời Gian</th>
                    <th className="pb-3 font-bold">Trạng Thái</th>
                  </tr>
                </thead>
                <tbody className="text-sm font-medium">
                  {stats.recentHistory.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-8 text-center text-gray-400">Chưa ghi nhận giao dịch nâng cấp nào từ cổng thanh toán.</td>
                    </tr>
                  ) : (
                    stats.recentHistory.map((tx) => (
                      <tr key={tx._id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="py-4 text-gray-900 flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center font-bold text-xs uppercase">
                            {tx.userId?.name?.charAt(0) || 'U'}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-gray-800 text-xs font-bold">{tx.userId?.name || 'Khách hàng'}</p>
                            <p className="text-[10px] text-gray-400 truncate font-normal">{tx.userId?.email || 'Ẩn danh'}</p>
                          </div>
                        </td>
                        <td className="py-4 text-gray-600 text-xs">{tx.packageInfo || 'VIP Premium'}</td>
                        <td className="py-4 font-bold text-emerald-600 text-sm">{formatCurrency(tx.amount)}</td>
                        <td className="py-4 text-gray-400 text-xs">{formatDate(tx.createdAt)}</td>
                        <td className="py-4">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md text-[11px] font-bold">
                            <CheckCircle2 className="w-3 h-3" /> Thành công
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ========================================================= */}
          {/* KHỐI 3: RADAR LIÊN TỤC QUÉT TỰ ĐỘNG - HỆ THỐNG AN NINH LÕI */}
          {/* ========================================================= */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-bold text-gray-900">Radar Quét Tự Động</h2>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-ping"></span>
                <span className="text-[10px] text-green-600 font-bold uppercase tracking-wider">Live scanning</span>
              </div>
            </div>
            <p className="text-xs text-gray-400 mb-6">Hệ thống liên tục kiểm tra chéo cơ sở dữ liệu VIP và hóa đơn thanh toán mà không cần tác vụ thủ công.</p>
            
            <div className="flex-1 flex flex-col items-center justify-center p-5 border border-gray-100 bg-gray-50/50 rounded-2xl mb-4 min-h-[300px]">
              {isScanning ? (
                <div className="text-center space-y-3">
                  <Activity className="w-12 h-12 text-blue-600 animate-spin mx-auto" />
                  <p className="text-xs font-bold text-gray-500">Đang thực thi rà soát dữ liệu chéo...</p>
                </div>
              ) : !auditResult ? (
                <div className="text-center">
                  <ShieldCheck className="w-14 h-14 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-400 text-xs font-medium">Chưa có thông tin cập nhật an ninh.</p>
                </div>
              ) : auditResult.isSystemSafe ? (
                <div className="text-center animate-in fade-in">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3 border border-emerald-200">
                    <ShieldCheck className="w-8 h-8 text-emerald-600" />
                  </div>
                  <h3 className="text-md font-bold text-emerald-800 mb-1">Cơ Sở Dữ Liệu An Toàn</h3>
                  <p className="text-xs text-emerald-600/90 max-w-[200px] mx-auto leading-relaxed">
                    100% tài khoản VIP trên hệ thống đều khớp chính xác lịch sử hóa đơn giao dịch thực tế.
                  </p>
                </div>
              ) : (
                <div className="text-center animate-in zoom-in w-full h-full flex flex-col justify-between">
                  <div>
                    <div className="w-14 h-14 bg-red-100 border border-red-200 rounded-full flex items-center justify-center mx-auto mb-3 relative">
                      <div className="absolute inset-0 border-4 border-red-500 rounded-full animate-ping opacity-10"></div>
                      <ShieldAlert className="w-7 h-7 text-red-600" />
                    </div>
                    <h3 className="text-sm font-black text-red-800 uppercase tracking-wide">Phát Hiện Vi Phạm Hoạt Động!</h3>
                    <p className="text-[11px] font-bold text-red-600 bg-red-50 py-1 px-3 rounded-lg w-max mx-auto mt-1 mb-4">
                      Tìm thấy {auditResult.hackers?.length || 0} tài khoản VIP lậu (bị tiêm dữ liệu bypass)
                    </p>
                  </div>
                  
                  {/* DANH SÁCH USER LẬU & BẢNG ĐIỀU KHIỂN TRỪNG PHẠT */}
                  <div className="text-left w-full max-h-[220px] overflow-y-auto space-y-2 pr-1 custom-scrollbar flex-1">
                    {auditResult.hackers?.map((hacker) => (
                      <div key={hacker._id} className="flex flex-col p-3 bg-white border border-red-100 rounded-xl space-y-2.5 shadow-sm">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-red-50 text-red-600 rounded-lg"><AlertTriangle className="w-4 h-4"/></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-gray-800 truncate">{hacker.name || 'Hacker Ẩn Danh'}</p>
                            <p className="text-[10px] text-gray-400 truncate">{hacker.email}</p>
                          </div>
                        </div>
                        
                        {/* HÀNH ĐỘNG XỬ LÝ KHẨN CẤP CHO ADMIN */}
                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-50">
                          <button 
                            type="button"
                            onClick={() => handleQuickLock(hacker._id, hacker.email)}
                            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-colors ${
                              hacker.isLocked 
                                ? 'bg-gray-100 text-gray-500 hover:bg-gray-200' 
                                : 'bg-red-50 text-red-600 hover:bg-red-100'
                            }`}
                          >
                            <Lock size={12} /> {hacker.isLocked ? "Mở Khóa" : "Khóa Acc"}
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleQuickRevokeVIP(hacker._id, hacker.email)}
                            className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg text-[11px] font-bold transition-colors"
                          >
                            <UserMinus size={12} /> Hạ Cấp/Tước VIP
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* NÚT KIỂM TRA THỦ CÔNG KHI CẦN THIẾT */}
            <button 
              onClick={runAutomaticSecurityAudit}
              disabled={isScanning}
              className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold text-xs hover:bg-gray-800 transition active:scale-[0.99] disabled:bg-gray-300"
            >
              {isScanning ? "Đang quét cốt lõi..." : "Yêu cầu tái rà soát lập tức"}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default RevenueDashboard;