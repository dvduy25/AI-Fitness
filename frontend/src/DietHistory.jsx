import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom'; 
import { 
  ResponsiveContainer, Tooltip as RechartsTooltip,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Legend 
} from 'recharts';
import { ArrowLeft, Activity, Flame, Beef, Wheat, Droplet, Loader2, CalendarDays } from 'lucide-react';

export default function DietHistory() {
  const navigate = useNavigate();
  const [dietHistory, setDietHistory] = useState([]);
  const [dietPeriod, setDietPeriod] = useState('week');
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ avgCal: 0, avgPro: 0, avgCarb: 0, avgFat: 0 });
 const API_BASE_URL = 'https://ai-fitness-w6fd.onrender.com';
  const fetchDietHistory = async (period) => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      const res = await axios.get(`${API_BASE_URL}/api/diet/history?period=${period}`, config);
      
      // Ưu tiên lấy từ pastRecords (theo yêu cầu của bạn) hoặc fallback về data
      const rawData = res.data.pastRecords || res.data.data || [];
      
      let totalCal = 0, totalPro = 0, totalCarb = 0, totalFat = 0;

      const formattedData = rawData.map(item => {
        const d = new Date(item.date);
        // Đảm bảo dữ liệu là số
        const cal = Number(item.calories) || 0;
        const pro = Number(item.protein) || 0;
        const carb = Number(item.carbs) || 0;
        const fat = Number(item.fat) || 0;

        totalCal += cal;
        totalPro += pro;
        totalCarb += carb;
        totalFat += fat;
        
        return { 
          ...item, 
          calories: cal,
          protein: pro,
          carbs: carb,
          fat: fat,
          displayDate: `${d.getDate()}/${d.getMonth() + 1}`,
          fullDate: d.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })
        };
      });

      // Tính trung bình
      if (rawData.length > 0) {
        setStats({
          avgCal: Math.round(totalCal / rawData.length),
          avgPro: Math.round(totalPro / rawData.length),
          avgCarb: Math.round(totalCarb / rawData.length),
          avgFat: Math.round(totalFat / rawData.length),
        });
      } else {
        setStats({ avgCal: 0, avgPro: 0, avgCarb: 0, avgFat: 0 });
      }
      
      setDietHistory(formattedData);
    } catch (err) {
      console.error("Lỗi lấy lịch sử dinh dưỡng:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDietHistory(dietPeriod);
  }, [dietPeriod]);

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8 pb-20">
      {/* 1. THANH ĐIỀU HƯỚNG */}
      <div className="flex items-center justify-between mb-8 sticky top-0 bg-black/80 backdrop-blur-md py-4 z-10">
        <button 
          onClick={() => navigate(-1)} 
          className="p-2 bg-gray-900 border border-gray-800 rounded-xl hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-gray-300" />
        </button>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Activity className="text-orange-500" />
          Lịch sử Dinh dưỡng
        </h1>
        <div className="w-10"></div>
      </div>

      {/* 2. THÔNG SỐ TRUNG BÌNH */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex flex-col items-center justify-center shadow-lg">
          <Flame className="w-6 h-6 text-orange-500 mb-2" />
          <span className="text-sm text-gray-400">Tr.bình Calo</span>
          <span className="text-2xl font-bold text-white">{stats.avgCal} <span className="text-sm font-normal text-gray-500">kcal</span></span>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex flex-col items-center justify-center shadow-lg">
          <Beef className="w-6 h-6 text-blue-500 mb-2" />
          <span className="text-sm text-gray-400">Tr.bình Protein</span>
          <span className="text-2xl font-bold text-white">{stats.avgPro} <span className="text-sm font-normal text-gray-500">g</span></span>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex flex-col items-center justify-center shadow-lg">
          <Wheat className="w-6 h-6 text-green-500 mb-2" />
          <span className="text-sm text-gray-400">Tr.bình Carbs</span>
          <span className="text-2xl font-bold text-white">{stats.avgCarb} <span className="text-sm font-normal text-gray-500">g</span></span>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex flex-col items-center justify-center shadow-lg">
          <Droplet className="w-6 h-6 text-yellow-500 mb-2" />
          <span className="text-sm text-gray-400">Tr.bình Fat</span>
          <span className="text-2xl font-bold text-white">{stats.avgFat} <span className="text-sm font-normal text-gray-500">g</span></span>
        </div>
      </div>

      {/* 3. KHU VỰC BIỂU ĐỒ */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 md:p-8 shadow-lg mb-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-white">Biểu đồ biến thiên</h2>
          <select
            value={dietPeriod}
            onChange={(e) => setDietPeriod(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-lg focus:ring-orange-500 focus:border-orange-500 p-2 outline-none cursor-pointer transition-colors"
          >
            <option value="week">7 ngày qua</option>
            <option value="month">30 ngày qua</option>
          </select>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-72">
            <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
          </div>
        ) : dietHistory.length > 0 ? (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dietHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                <XAxis dataKey="displayDate" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                <YAxis yAxisId="left" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis yAxisId="right" orientation="right" hide={true} />
                
                <RechartsTooltip
                  contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', borderRadius: '12px', color: '#fff' }}
                  itemStyle={{ fontWeight: '600' }}
                  labelStyle={{ color: '#9CA3AF', marginBottom: '4px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} iconType="circle" />
                
                <Line yAxisId="left" type="monotone" dataKey="calories" name="Calories (kcal)" stroke="#F97316" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                <Line yAxisId="right" type="monotone" dataKey="protein" name="Protein (g)" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3 }} />
                <Line yAxisId="right" type="monotone" dataKey="carbs" name="Carbs (g)" stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} />
                <Line yAxisId="right" type="monotone" dataKey="fat" name="Fat (g)" stroke="#EAB308" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-72 text-gray-500 bg-gray-800/20 rounded-xl border border-dashed border-gray-700">
            <Activity className="w-10 h-10 mb-3 opacity-40" />
            <p className="text-base">Chưa có dữ liệu ăn uống trong khoảng thời gian này</p>
          </div>
        )}
      </div>

      {/* 4. KHU VỰC DANH SÁCH CHI TIẾT (LỊCH SỬ PAST RECORDS) */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 md:p-8 shadow-lg">
        <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
          <CalendarDays className="text-orange-500 w-5 h-5" />
          Chi tiết bữa ăn đã nạp
        </h2>

        {isLoading ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="w-6 h-6 text-gray-500 animate-spin" />
          </div>
        ) : dietHistory.length > 0 ? (
          <div className="space-y-4">
            {/* Đảo ngược mảng để ngày mới nhất lên đầu */}
            {[...dietHistory].reverse().map((record, index) => (
              <div 
                key={index} 
                className="bg-black/50 p-4 md:p-5 rounded-xl border border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-gray-700 transition-colors"
              >
                {/* Ngày và Tổng Calo */}
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20 shrink-0">
                    <div className="text-center">
                      <span className="block text-xs text-orange-500/80 font-semibold leading-none">{record.displayDate.split('/')[1]}</span>
                      <span className="block text-lg text-orange-400 font-black leading-tight">{record.displayDate.split('/')[0]}</span>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg">{record.calories} <span className="text-sm font-medium text-gray-500">kcal</span></h3>
                    <p className="text-xs text-gray-400 capitalize">{record.fullDate}</p>
                  </div>
                </div>

                {/* Chi tiết Macros */}
                <div className="flex gap-4 sm:gap-6 bg-gray-900/50 p-3 rounded-xl border border-gray-800/50 justify-between md:justify-end">
                  <div className="flex flex-col items-center min-w-[50px]">
                    <span className="text-gray-500 text-[10px] font-bold uppercase mb-1">Protein</span>
                    <span className="text-blue-400 font-bold">{record.protein}g</span>
                  </div>
                  <div className="w-px bg-gray-800"></div>
                  <div className="flex flex-col items-center min-w-[50px]">
                    <span className="text-gray-500 text-[10px] font-bold uppercase mb-1">Carbs</span>
                    <span className="text-green-400 font-bold">{record.carbs}g</span>
                  </div>
                  <div className="w-px bg-gray-800"></div>
                  <div className="flex flex-col items-center min-w-[50px]">
                    <span className="text-gray-500 text-[10px] font-bold uppercase mb-1">Fat</span>
                    <span className="text-yellow-400 font-bold">{record.fat}g</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 text-gray-500 bg-black/30 rounded-xl border border-dashed border-gray-800">
            <p>Bạn chưa lưu lại nhật ký ăn uống nào.</p>
          </div>
        )}
      </div>
    </div>
  );
}