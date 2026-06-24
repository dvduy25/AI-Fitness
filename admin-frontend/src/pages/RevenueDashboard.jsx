
import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, Calendar, DollarSign, ShieldAlert, ShieldCheck, 
  Activity, AlertTriangle, Users, Clock, CheckCircle2 ,Search
} from 'lucide-react';
import api from '../services/api'; // Đảm bảo đường dẫn này đúng với project của bạn

const RevenueDashboard = () => {
  const [stats, setStats] = useState({
    today: { revenue: 0, orders: 0 },
    thisMonth: { revenue: 0, orders: 0 },
    thisYear: { revenue: 0, orders: 0 },
    recentHistory: []
  });
  const [loadingStats, setLoadingStats] = useState(true);
  
  // State cho phần Quét bảo mật
  const [auditResult, setAuditResult] = useState(null);
  const [isScanning, setIsScanning] = useState(false);

  // Format tiền VNĐ
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  // Format ngày tháng
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('vi-VN', {
      hour: '2-digit', minute: '2-digit',
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
  };

  // 1. Gọi API lấy thống kê khi vừa vào trang
  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoadingStats(true);
      // Đảm bảo bạn đã gắn Authorization Header trong file api.js
      const res = await api.get('/admin/revenue-report'); 
      if (res.data.success) {
        setStats(res.data.data);
      }
    } catch (error) {
      console.error("Lỗi tải thống kê:", error);
    } finally {
      setLoadingStats(false);
    }
  };

  // 2. Hàm gọi API Quét bảo mật (Tìm Hacker)
  const handleSecurityAudit = async () => {
    setIsScanning(true);
    setAuditResult(null);
    try {
      const res = await api.get('/admin/security-audit');
      if (res.data.success) {
        setAuditResult(res.data);
      }
    } catch (error) {
      console.error("Lỗi quét bảo mật:", error);
      alert("Lỗi khi kết nối đến hệ thống quét!");
    } finally {
      setIsScanning(false);
    }
  };

  if (loadingStats) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Activity className="w-10 h-10 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Tổng Quan Doanh Thu</h1>
          <p className="text-gray-500 mt-2">Theo dõi dòng tiền và kiểm soát bảo mật hệ thống VIP.</p>
        </div>

        {/* ========================================== */}
        {/* KHỐI 1: THẺ THỐNG KÊ DOANH THU */}
        {/* ========================================== */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card Hôm Nay */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -mr-10 -mt-10 transition-all group-hover:bg-blue-500/10"></div>
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl"><Clock className="w-6 h-6" /></div>
              <h3 className="text-lg font-bold text-gray-700">Hôm Nay</h3>
            </div>
            <p className="text-3xl font-black text-gray-900 mb-1">{formatCurrency(stats.today.revenue)}</p>
            <p className="text-sm font-medium text-gray-500">{stats.today.orders} lượt nâng cấp</p>
          </div>

          {/* Card Tháng Này */}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-3xl shadow-lg shadow-blue-200 flex flex-col relative overflow-hidden text-white group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10 transition-all group-hover:bg-white/20"></div>
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-white/20 rounded-2xl"><Calendar className="w-6 h-6 text-white" /></div>
              <h3 className="text-lg font-bold text-blue-50">Tháng Này</h3>
            </div>
            <p className="text-3xl font-black mb-1">{formatCurrency(stats.thisMonth.revenue)}</p>
            <p className="text-sm font-medium text-blue-200">{stats.thisMonth.orders} lượt nâng cấp</p>
          </div>

          {/* Card Năm Nay */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -mr-10 -mt-10 transition-all group-hover:bg-emerald-500/10"></div>
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl"><TrendingUp className="w-6 h-6" /></div>
              <h3 className="text-lg font-bold text-gray-700">Năm Nay</h3>
            </div>
            <p className="text-3xl font-black text-gray-900 mb-1">{formatCurrency(stats.thisYear.revenue)}</p>
            <p className="text-sm font-medium text-gray-500">{stats.thisYear.orders} lượt nâng cấp</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* ========================================== */}
          {/* KHỐI 2: LỊCH SỬ GIAO DỊCH (Bên Trái - Rộng hơn) */}
          {/* ========================================== */}
          <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Giao Dịch Gần Đây</h2>
              <button onClick={fetchStats} className="text-sm text-blue-600 font-semibold hover:underline">Làm mới</button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-gray-400 text-sm border-b border-gray-100">
                    <th className="pb-3 font-semibold">Người Dùng</th>
                    <th className="pb-3 font-semibold">Gói</th>
                    <th className="pb-3 font-semibold">Số Tiền</th>
                    <th className="pb-3 font-semibold">Thời Gian</th>
                    <th className="pb-3 font-semibold">Trạng Thái</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {stats.recentHistory.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-8 text-center text-gray-500">Chưa có giao dịch nào gần đây.</td>
                    </tr>
                  ) : (
                    stats.recentHistory.map((tx) => (
                      <tr key={tx._id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="py-4 font-medium text-gray-900 flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                            {tx.userId?.name?.charAt(0) || 'U'}
                          </div>
                          {tx.userId?.email || 'Người dùng ẩn'}
                        </td>
                        <td className="py-4 text-gray-600">{tx.packageInfo || 'VIP Premium'}</td>
                        <td className="py-4 font-bold text-emerald-600">{formatCurrency(tx.amount)}</td>
                        <td className="py-4 text-gray-500">{formatDate(tx.createdAt)}</td>
                        <td className="py-4">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-bold">
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

          {/* ========================================== */}
          {/* KHỐI 3: RADAR QUÉT BẢO MẬT (Bên Phải) */}
          {/* ========================================== */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 flex flex-col">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Hệ Thống An Ninh</h2>
            <p className="text-sm text-gray-500 mb-6">Quét đối chiếu dữ liệu VIP thực tế và hóa đơn thanh toán để tìm tài khoản lách luật.</p>
            
            <div className="flex-1 flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50 mb-6">
              {!auditResult ? (
                <div className="text-center">
                  <ShieldCheck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-sm font-medium">Hệ thống đang ở trạng thái chờ lệnh quét.</p>
                </div>
              ) : auditResult.isSystemSafe ? (
                <div className="text-center animate-in zoom-in">
                  <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ShieldCheck className="w-10 h-10 text-emerald-600" />
                  </div>
                  <h3 className="text-lg font-bold text-emerald-700 mb-1">Hệ Thống An Toàn</h3>
                  <p className="text-xs text-emerald-600/80 font-medium">Doanh thu và số lượng tài khoản VIP khớp 100%.</p>
                </div>
              ) : (
                <div className="text-center animate-in zoom-in w-full">
                  <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 relative">
                    <div className="absolute inset-0 border-4 border-red-500 rounded-full animate-ping opacity-20"></div>
                    <ShieldAlert className="w-10 h-10 text-red-600" />
                  </div>
                  <h3 className="text-lg font-bold text-red-700 mb-1">CẢNH BÁO BẢO MẬT</h3>
                  <p className="text-xs font-bold text-red-600 mb-4 bg-red-50 py-1.5 px-3 rounded-lg">
                    Phát hiện {auditResult.hackers.length} tài khoản VIP lậu!
                  </p>
                  
                  {/* Danh sách Hacker */}
                  <div className="text-left w-full max-h-40 overflow-y-auto pr-2 space-y-2">
                    {auditResult.hackers.map((hacker, index) => (
                      <div key={hacker._id || index} className="flex items-center gap-3 bg-white p-2 rounded-xl border border-red-100">
                        <div className="p-2 bg-red-50 text-red-500 rounded-lg"><AlertTriangle className="w-4 h-4"/></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-900 truncate">{hacker.name || 'Unknown'}</p>
                          <p className="text-[10px] text-gray-500 truncate">{hacker.email}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button 
              onClick={handleSecurityAudit}
              disabled={isScanning}
              className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                isScanning 
                  ? 'bg-blue-100 text-blue-400 cursor-not-allowed'
                  : 'bg-gray-900 text-white hover:bg-gray-800 hover:shadow-lg hover:shadow-gray-900/20 active:scale-[0.98]'
              }`}
            >
              {isScanning ? (
                <><Activity className="w-5 h-5 animate-spin" /> Đang quét toàn bộ DB...</>
              ) : (
                <><Search className="w-5 h-5" /> Bắt Đầu Quét Bảo Mật</>
              )}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default RevenueDashboard;