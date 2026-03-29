import React, { useState } from 'react';
import axios from 'axios';
import { BrainCircuit, AlertTriangle, Sparkles, Loader2, X, Dumbbell, ShieldCheck, Activity, CheckCircle2 } from 'lucide-react';

export default function MasterWorkoutEvaluation({ onClose }) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
 const API_BASE_URL = 'https://ai-fitness-w6fd.onrender.com';
  const fetchEvaluation = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/api/ai/evaluate-workout-plan`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setData(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Đã xảy ra lỗi khi kết nối với AI.');
    } finally {
      setIsLoading(false);
    }
  };

  // Hàm render nội dung (giữ nguyên logic của bạn nhưng thêm style)
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
          <p className="text-gray-300 font-medium animate-pulse">AI đang rà soát an toàn...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl flex flex-col items-center text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mb-3" />
          <p className="text-red-200 mb-5">{error}</p>
          <button onClick={fetchEvaluation} className="px-6 py-2.5 bg-red-500 text-white rounded-xl font-bold">Thử lại</button>
        </div>
      );
    }

    if (!data) {
      return (
        <div className="text-center py-6">
          <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Dumbbell className="w-8 h-8 text-blue-400" />
          </div>
          <h3 className="text-xl font-bold text-white mb-3">Đánh giá An Toàn Lịch Tập</h3>
          <p className="text-gray-400 mb-8">Chuyên gia AI sẽ kiểm tra rủi ro dựa trên bệnh lý của bạn.</p>
          <button 
            onClick={fetchEvaluation}
            className="w-full px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
          >
            <Sparkles className="w-5 h-5" /> Phân Tích Ngay
          </button>
        </div>
      );
    }

    const { safetyScore, effectivenessScore, overview, medicalWarnings, strengths, adjustments } = data.data;

    return (
      <div className="animate-in fade-in duration-500">
        <h3 className="text-xl font-bold text-white mb-5 flex items-center gap-2">
          <BrainCircuit className="w-6 h-6 text-blue-400" /> Báo Cáo Y Học Thể Thao
        </h3>
        
        <div className="grid grid-cols-2 gap-4 mb-5">
           <div className="bg-gray-950 border border-gray-800 rounded-2xl p-4">
              <p className="text-xs text-gray-400 mb-1 flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-green-400"/> An Toàn</p>
              <p className={`text-2xl font-black ${safetyScore < 6 ? 'text-red-400' : 'text-green-400'}`}>{safetyScore}/10</p>
           </div>
           <div className="bg-gray-950 border border-gray-800 rounded-2xl p-4">
              <p className="text-xs text-gray-400 mb-1 flex items-center gap-1.5"><Activity className="w-4 h-4 text-blue-400"/> Hiệu Quả</p>
              <p className="text-2xl font-black text-blue-400">{effectivenessScore}/10</p>
           </div>
        </div>

        <p className="text-gray-300 leading-relaxed italic bg-gray-800/30 p-4 rounded-xl border border-gray-700 mb-5 text-sm">"{overview}"</p>

        {medicalWarnings?.length > 0 && (
          <div className="bg-red-900/20 border border-red-500/30 rounded-2xl p-4 mb-5">
            <h4 className="font-bold text-red-400 flex items-center gap-2 mb-2 text-sm"><AlertTriangle className="w-4 h-4" /> Cảnh Báo Nguy Cơ</h4>
            <ul className="space-y-1 text-xs text-red-200">
              {medicalWarnings.map((warn, i) => <li key={i}>• {warn}</li>)}
            </ul>
          </div>
        )}

        <div className="space-y-3">
          <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700/50">
            <h4 className="font-bold text-green-400 mb-2 text-sm">✅ Điểm Tốt</h4>
            <ul className="space-y-1 text-xs text-gray-300">{strengths.map((str, i) => <li key={i}>- {str}</li>)}</ul>
          </div>
          <button 
            onClick={onClose}
            className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-bold mt-4 transition-colors"
          >
            Đóng báo cáo
          </button>
        </div>
      </div>
    );
  };

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose} // Click ra ngoài là đóng
    >
      <div 
        className="bg-gray-900 w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-3xl border border-gray-800 shadow-2xl relative flex flex-col"
        onClick={(e) => e.stopPropagation()} // Click vào trong không bị đóng
      >
        {/* Nút X - Đảm bảo Z-index cao nhất */}
        <button 
          onClick={(e) => {
            e.stopPropagation(); // Ngăn chặn nổi bọt
            onClose();           // Gọi hàm đóng
          }}
          className="absolute top-5 right-5 p-2 text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-full transition-all z-[110]"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}