// 📄 src/pages/Dashboard.jsx
import React, { useEffect, useState } from 'react';
import { Users, Crown, Dumbbell, Apple, Activity, Settings, Power, ShieldAlert } from 'lucide-react';
import api from '../services/api';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    premiumUsers: 0,
    totalExercises: 0,
    totalFoods: 0
  });
  
  // State quản lý bảo trì
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [isUpdatingMaintenance, setIsUpdatingMaintenance] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // 1. Lấy thống kê
      const statsResponse = await api.get('/admin/dashboard'); 
      if (statsResponse.data.success) {
        setStats(statsResponse.data.data);
      }

      // 2. Lấy trạng thái bảo trì hiện tại
      // Lưu ý: Đổi URL này thành URL thực tế của bạn nếu không dùng biến api
      const maintenanceResponse = await fetch("http://localhost:5000/api/system/maintenance");
      const maintenanceData = await maintenanceResponse.json();
      if (maintenanceData.success) {
        setIsMaintenance(maintenanceData.isMaintenance);
      }
    } catch (error) {
      console.error('Lỗi khi tải dữ liệu Dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  // Hàm xử lý bật/tắt bảo trì
  const handleToggleMaintenance = async () => {
    const confirmMsg = isMaintenance 
      ? "Bạn có chắc chắn muốn TẮT bảo trì? Người dùng sẽ truy cập lại bình thường." 
      : "NGUY HIỂM: Bạn có chắc chắn BẬT bảo trì? Mọi người dùng sẽ bị chặn thao tác ngay lập tức!";
      
    if (!window.confirm(confirmMsg)) return;

    setIsUpdatingMaintenance(true);
    try {
      const res = await fetch("http://localhost:5000/api/system/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: !isMaintenance })
      });
      
      const data = await res.json();
      if (data.success) {
        setIsMaintenance(data.isMaintenance);
        alert(data.message);
      } else {
        alert("Lỗi: " + data.message);
      }
    } catch (error) {
      alert("Không thể kết nối đến server để đổi trạng thái!");
      console.error(error);
    } finally {
      setIsUpdatingMaintenance(false);
    }
  };

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
        <p className="text-gray-500 mt-1">Dữ liệu được cập nhật trực tiếp từ Database MongoDB</p>
      </div>

      {/* Grid thống kê 4 cột */}
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
              {/* Hiệu ứng mờ ảo góc dưới */}
              <div className={`absolute -bottom-4 -right-4 w-24 h-24 rounded-full opacity-10 blur-2xl group-hover:scale-150 transition-transform duration-500 ${card.color}`}></div>
            </div>
          );
        })}
      </div>

      {/* Grid chứa phần Trạng thái và Nút Bảo Trì */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Thẻ trạng thái API */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col justify-center gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-50 text-green-600 rounded-2xl">
              <Activity size={28} />
            </div>
            <div>
              <h4 className="text-lg font-bold text-gray-900">Trạng thái API</h4>
              <p className="text-gray-500 mt-1 text-sm">Hệ thống đang hoạt động ổn định. Đã kết nối thành công tới Cluster Database.</p>
            </div>
          </div>
        </div>

        {/* ========================================== */}
        {/* THẺ QUẢN LÝ BẢO TRÌ HỆ THỐNG */}
        {/* ========================================== */}
        <div className={`rounded-3xl p-6 shadow-sm border transition-colors relative overflow-hidden ${isMaintenance ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100'}`}>
          {isMaintenance && (
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
          )}

          <div className="flex items-start justify-between relative z-10">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl ${isMaintenance ? 'bg-red-100 text-red-600' : 'bg-gray-50 text-gray-600'}`}>
                {isMaintenance ? <ShieldAlert size={28} /> : <Settings size={28} />}
              </div>
              <div>
                <h4 className="text-lg font-bold text-gray-900">Chế độ bảo trì</h4>
                <p className={`text-sm mt-1 font-medium ${isMaintenance ? 'text-red-500' : 'text-gray-500'}`}>
                  {isMaintenance ? "Đang khóa người dùng (Bảo trì)" : "Hệ thống đang mở công khai"}
                </p>
              </div>
            </div>

            {/* Nút Toggle */}
            <button
              onClick={handleToggleMaintenance}
              disabled={isUpdatingMaintenance}
              className={`
                relative inline-flex h-8 w-14 shrink-0 items-center rounded-full transition-all duration-300 focus:outline-none shadow-inner
                ${isUpdatingMaintenance ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                ${isMaintenance ? 'bg-red-500' : 'bg-gray-200'}
              `}
            >
              <span
                className={`
                  inline-flex items-center justify-center h-6 w-6 transform rounded-full bg-white transition-all duration-300 shadow-md
                  ${isMaintenance ? 'translate-x-7' : 'translate-x-1'}
                `}
              >
                <Power className={`w-3.5 h-3.5 ${isMaintenance ? 'text-red-500' : 'text-gray-400'}`} />
              </span>
            </button>
          </div>
          
          <p className="text-xs text-gray-500 mt-4 leading-relaxed relative z-10">
            <strong>Lưu ý:</strong> Khi bật tính năng này, màn hình của mọi người dùng (trừ Admin) sẽ bị khóa lại bằng thông báo bảo trì, chặn hoàn toàn các thao tác gửi lên Server.
          </p>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;