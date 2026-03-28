// 📄 src/pages/Dashboard.jsx
import React, { useEffect, useState } from 'react';
import { Users, Crown, Dumbbell, Apple, Activity } from 'lucide-react';
import api from '../services/api';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    premiumUsers: 0,
    totalExercises: 0,
    totalFoods: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Gọi API Dashboard từ backend (Cần khớp với route bạn định nghĩa ở server)
      const response = await api.get('/admin/dashboard'); 
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Lỗi khi tải thống kê:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { title: 'Tổng Người Dùng', value: stats.totalUsers, icon: Users, color: 'bg-blue-500', bgColor: 'bg-blue-50', textColor: 'text-blue-600' },
    { title: 'Tài Khoản VIP', value: stats.premiumUsers, icon: Crown, color: 'bg-yellow-500', bgColor: 'bg-yellow-50', textColor: 'text-yellow-600' },
    { title: 'Tổng Bài Tập', value: stats.totalExercises, icon: Dumbbell, color: 'bg-purple-500', bgColor: 'bg-purple-50', textColor: 'text-purple-600' },
    { title: 'Tổng Thực Phẩm', value: stats.totalFoods, icon: Apple, color: 'bg-green-500', bgColor: 'bg-green-50', textColor: 'text-green-600' },
  ];

  if (loading) return (
    <div className="flex justify-center items-center h-full">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
    </div>
  );

  return (
    <div className="space-y-8 animate-fade-in">
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

      {/* Thẻ trạng thái */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex items-start gap-4">
        <div className="p-3 bg-green-50 text-green-600 rounded-2xl">
          <Activity size={24} />
        </div>
        <div>
          <h4 className="text-lg font-bold text-gray-900">Trạng thái API</h4>
          <p className="text-gray-500 mt-1">Hệ thống đang hoạt động ổn định. Đã kết nối thành công tới Cluster.</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;