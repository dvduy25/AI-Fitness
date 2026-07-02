import api from "./services/api";
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BrainCircuit, AlertTriangle, Info, Sparkles, Target, Activity, Loader2, ListChecks, X } from 'lucide-react';

export default function DietEvaluation({ onClose }) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const fetchEvaluation = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      const response = await api.get(`/ai/diet-evaluation`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setData(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Đã xảy ra lỗi khi kết nối với AI.');
    } finally {
      setIsLoading(false);
    }
  };

  // Nội dung bên trong Modal
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-12 animate-in fade-in duration-300">
          <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
          <p className="text-gray-300 font-medium animate-pulse text-lg">AI đang phân tích dữ liệu ăn uống...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl flex flex-col items-center text-center animate-in fade-in duration-300">
          <AlertTriangle className="w-12 h-12 text-red-500 mb-3" />
          <p className="text-red-200 mb-5">{error}</p>
          <button onClick={fetchEvaluation} className="px-6 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-colors">
            Thử lại
          </button>
        </div>
      );
    }

    if (!data) {
      return (
        <div className="text-center animate-in zoom-in-95 duration-500 py-6">
          <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <BrainCircuit className="w-8 h-8 text-emerald-400" />
          </div>
          <h3 className="text-xl font-bold text-white mb-3">AI Phân tích tổng kết ngày</h3>
          <p className="text-gray-300 mb-8 leading-relaxed">
            Tuyệt vời! Bạn đã hoàn thành tất cả các bữa ăn. Nhấn vào nút bên dưới để AI tổng hợp dữ liệu, đánh giá độ hiệu quả và đưa ra giải pháp cá nhân hóa cho ngày mai.
          </p>
          <button 
            onClick={fetchEvaluation}
            className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold rounded-2xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 mx-auto hover:scale-[1.02]"
          >
            <Sparkles className="w-5 h-5" /> Bắt đầu đánh giá ngay
          </button>
        </div>
      );
    }

    if (data && !data.hasData) {
      return (
        <div className="bg-gray-800/50 border border-gray-700 p-8 rounded-2xl text-center">
          <Info className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <p className="text-gray-300 text-lg">{data.message}</p>
        </div>
      );
    }

    const { evaluation, solutions, metrics } = data.data;

    return (
      <div className="animate-in fade-in zoom-in-95 duration-500">
        <h3 className="text-xl font-bold text-white mb-5 flex items-center gap-2">
          <BrainCircuit className="w-6 h-6 text-emerald-400" />
          Báo cáo Dinh dưỡng AI
        </h3>

        <div className="bg-gray-950 border border-gray-800 rounded-2xl p-5 mb-6 flex items-center justify-between shadow-inner">
           <div>
              <p className="text-sm text-gray-400 mb-1 flex items-center gap-1.5"><Target className="w-4 h-4"/> Mục tiêu</p>
              <p className="text-2xl font-black text-white">{metrics.target.calories} <span className="text-sm text-gray-500 font-medium">kcal</span></p>
           </div>
           <div className="h-12 w-[1px] bg-gray-800"></div>
           <div className="text-right">
              <p className="text-sm text-gray-400 mb-1 flex items-center justify-end gap-1.5"><Activity className="w-4 h-4"/> Thực tế</p>
              <p className={`text-2xl font-black ${metrics.actual.calories > metrics.target.calories ? 'text-orange-400' : 'text-emerald-400'}`}>
                {metrics.actual.calories} <span className="text-sm text-gray-500 font-medium">kcal</span>
              </p>
           </div>
        </div>

        <div className="space-y-3 mb-6">
          <div className="bg-gray-800/50 border border-gray-700/50 p-4 rounded-xl">
            <h4 className="font-bold text-orange-400 mb-1.5 flex items-center gap-2">🔥 Calo tổng quan</h4>
            <p className="text-gray-300 text-sm leading-relaxed">{evaluation.calories}</p>
          </div>
          <div className="bg-gray-800/50 border border-gray-700/50 p-4 rounded-xl">
            <h4 className="font-bold text-blue-400 mb-1.5 flex items-center gap-2">🥩 Chất Đạm (Protein)</h4>
            <p className="text-gray-300 text-sm leading-relaxed">{evaluation.protein}</p>
          </div>
          <div className="bg-gray-800/50 border border-gray-700/50 p-4 rounded-xl">
            <h4 className="font-bold text-yellow-400 mb-1.5 flex items-center gap-2">🍚 Tinh bột (Carbs)</h4>
            <p className="text-gray-300 text-sm leading-relaxed">{evaluation.carbs}</p>
          </div>
          <div className="bg-gray-800/50 border border-gray-700/50 p-4 rounded-xl">
            <h4 className="font-bold text-red-400 mb-1.5 flex items-center gap-2">🥑 Chất béo (Fat)</h4>
            <p className="text-gray-300 text-sm leading-relaxed">{evaluation.fat}</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-900/20 to-gray-900 border border-emerald-500/30 rounded-2xl p-5">
          <h4 className="font-bold text-emerald-400 flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5" /> Giải pháp cho ngày mai
          </h4>
          <ul className="space-y-3">
            {solutions.map((sol, index) => (
              <li key={index} className="flex gap-3 items-start">
                <div className="mt-0.5 bg-emerald-500/20 p-1.5 rounded-full shrink-0">
                  <ListChecks className="w-4 h-4 text-emerald-400" />
                </div>
                <p className="text-gray-300 text-sm leading-relaxed">{sol}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div 
        className="bg-gray-900 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-gray-800 shadow-2xl relative custom-scrollbar" 
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-full transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>
        
        <div className="p-6 md:p-8">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}