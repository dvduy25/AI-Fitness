import React, { useState } from 'react';
import axios from 'axios';
import { BrainCircuit, AlertTriangle, Info, Sparkles, Target, Activity, Loader2, ListChecks } from 'lucide-react';

export default function DietEvaluation() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
 const API_BASE_URL = 'https://ai-fitness-w6fd.onrender.com';
  const fetchEvaluation = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/api/ai/diet-evaluation`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setData(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Đã xảy ra lỗi khi kết nối với AI.');
    } finally {
      setIsLoading(false);
    }
  };

  // 1. Trạng thái đang tải (Loading)
  if (isLoading) {
    return (
      <div className="bg-purple-900/10 border border-purple-800/30 rounded-2xl p-8 flex flex-col items-center justify-center text-center animate-in fade-in duration-300">
        <Loader2 className="w-10 h-10 text-purple-500 animate-spin mb-3" />
        <p className="text-gray-300 font-medium animate-pulse">AI đang phân tích dữ liệu ăn uống của bạn...</p>
      </div>
    );
  }

  // 2. Trạng thái lỗi
  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl flex flex-col items-center text-center animate-in fade-in duration-300">
        <AlertTriangle className="w-10 h-10 text-red-500 mb-3" />
        <p className="text-red-200 mb-4">{error}</p>
        <button onClick={fetchEvaluation} className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors">
          Thử lại
        </button>
      </div>
    );
  }

  // 3. Trạng thái chưa gọi AI (Hiển thị nút bấm)
  if (!data) {
    return (
      <div className="bg-purple-900/10 border border-purple-800/30 rounded-2xl p-6 text-center animate-in zoom-in-95 duration-500">
        <h3 className="text-lg font-bold text-white mb-2 flex items-center justify-center gap-2">
          <BrainCircuit className="w-5 h-5 text-purple-400" />
          AI Phân tích tổng kết ngày
        </h3>
        <p className="text-sm text-gray-300 mb-5 leading-relaxed px-2">
          Tuyệt vời! Bạn đã hoàn thành tất cả các bữa ăn trong hôm nay. Nhấn vào nút bên dưới để AI tổng hợp dữ liệu, đánh giá độ hiệu quả và đưa ra giải pháp cá nhân hóa cho ngày mai.
        </p>
        <button 
          onClick={fetchEvaluation}
          className="px-6 py-3.5 w-full sm:w-auto bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2 mx-auto hover:scale-[1.02]"
        >
          <Sparkles className="w-4 h-4" /> Bắt đầu đánh giá ngay
        </button>
      </div>
    );
  }

  // 4. Lỗi do không có dữ liệu thực tế
  if (data && !data.hasData) {
    return (
      <div className="bg-gray-800/50 border border-gray-700 p-6 rounded-2xl text-center">
        <Info className="w-10 h-10 text-gray-500 mx-auto mb-3" />
        <p className="text-gray-400">{data.message}</p>
      </div>
    );
  }

  // 5. HIỂN THỊ KẾT QUẢ ĐÁNH GIÁ (Thành công)
  const { evaluation, solutions, metrics } = data.data;

  return (
    <div className="animate-in fade-in zoom-in-95 duration-500">
      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <BrainCircuit className="w-5 h-5 text-purple-400" />
        Báo cáo Dinh dưỡng AI
      </h3>

      {/* Thông số Mục tiêu vs Thực tế */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-5 flex items-center justify-between shadow-inner">
         <div>
            <p className="text-xs text-gray-400 mb-1 flex items-center gap-1"><Target className="w-3.5 h-3.5"/> Mục tiêu</p>
            <p className="text-xl font-black text-white">{metrics.target.calories} <span className="text-xs text-gray-500 font-medium">kcal</span></p>
         </div>
         <div className="h-10 w-[1px] bg-gray-800"></div>
         <div className="text-right">
            <p className="text-xs text-gray-400 mb-1 flex items-center justify-end gap-1"><Activity className="w-3.5 h-3.5"/> Thực tế</p>
            <p className={`text-xl font-black ${metrics.actual.calories > metrics.target.calories ? 'text-orange-400' : 'text-emerald-400'}`}>
              {metrics.actual.calories} <span className="text-xs text-gray-500 font-medium">kcal</span>
            </p>
         </div>
      </div>

      {/* Đánh giá chi tiết */}
      <div className="space-y-3 mb-6">
        <div className="bg-gray-800/40 border border-gray-700/50 p-4 rounded-xl">
          <h4 className="font-bold text-sm text-orange-400 mb-1.5 flex items-center gap-2">🔥 Calo tổng quan</h4>
          <p className="text-gray-300 text-sm leading-relaxed">{evaluation.calories}</p>
        </div>
        <div className="bg-gray-800/40 border border-gray-700/50 p-4 rounded-xl">
          <h4 className="font-bold text-sm text-blue-400 mb-1.5 flex items-center gap-2">🥩 Chất Đạm (Protein)</h4>
          <p className="text-gray-300 text-sm leading-relaxed">{evaluation.protein}</p>
        </div>
        <div className="bg-gray-800/40 border border-gray-700/50 p-4 rounded-xl">
          <h4 className="font-bold text-sm text-yellow-400 mb-1.5 flex items-center gap-2">🍚 Tinh bột (Carbs)</h4>
          <p className="text-gray-300 text-sm leading-relaxed">{evaluation.carbs}</p>
        </div>
        <div className="bg-gray-800/40 border border-gray-700/50 p-4 rounded-xl">
          <h4 className="font-bold text-sm text-red-400 mb-1.5 flex items-center gap-2">🥑 Chất béo (Fat)</h4>
          <p className="text-gray-300 text-sm leading-relaxed">{evaluation.fat}</p>
        </div>
      </div>

      {/* Lời khuyên & Giải pháp */}
      <div className="bg-gradient-to-br from-emerald-900/20 to-gray-900 border border-emerald-500/20 rounded-2xl p-5">
        <h4 className="text-sm font-bold text-emerald-400 flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4" /> Giải pháp cho ngày mai
        </h4>
        <ul className="space-y-3">
          {solutions.map((sol, index) => (
            <li key={index} className="flex gap-2.5 items-start">
              <div className="mt-0.5 bg-emerald-500/20 p-1 rounded-full shrink-0">
                <ListChecks className="w-3 h-3 text-emerald-400" />
              </div>
              <p className="text-gray-300 text-sm leading-relaxed">{sol}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}