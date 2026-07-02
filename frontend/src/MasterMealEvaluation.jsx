import api from "./services/api";
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BrainCircuit, AlertTriangle, Info, Sparkles, Activity, Loader2, ListChecks, X, HeartPulse, CheckCircle } from 'lucide-react';

export default function MasterMealEvaluation({ onClose }) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const fetchEvaluation = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      const response = await api.get(`/ai/evaluate-meal-plan`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setData(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Đã xảy ra lỗi khi kết nối với AI.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-12 animate-in fade-in duration-300">
          <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
          <p className="text-gray-300 font-medium animate-pulse text-lg">AI đang phân tích độ phù hợp của Lịch ăn...</p>
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
            <HeartPulse className="w-8 h-8 text-emerald-400" />
          </div>
          <h3 className="text-xl font-bold text-white mb-3">Đánh giá Lịch Ăn Cố Định & Bệnh Lý</h3>
          <p className="text-gray-300 mb-8 leading-relaxed">
            Nhấn nút bên dưới để Bác sĩ AI phân tích xem lịch ăn hiện tại có thực sự an toàn và phù hợp với cơ địa cũng như bệnh lý của bạn hay không.
          </p>
          <button 
            onClick={fetchEvaluation}
            className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold rounded-2xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 mx-auto hover:scale-[1.02]"
          >
            <Sparkles className="w-5 h-5" /> Khám Dinh Dưỡng Bằng AI
          </button>
        </div>
      );
    }

    const { score, overview, medicalWarnings, strengths, improvements } = data.data;

    return (
      <div className="animate-in fade-in zoom-in-95 duration-500">
        <h3 className="text-xl font-bold text-white mb-5 flex items-center gap-2">
          <BrainCircuit className="w-6 h-6 text-emerald-400" />
          Báo Cáo Phân Tích Lịch Ăn
        </h3>

        <div className="bg-gray-950 border border-gray-800 rounded-2xl p-5 mb-6 flex items-center justify-between shadow-inner">
           <div>
              <p className="text-sm text-gray-400 mb-1 flex items-center gap-1.5"><Activity className="w-4 h-4"/> Tổng điểm</p>
              <p className="text-3xl font-black text-emerald-400">{score} <span className="text-sm text-gray-500 font-medium">/ 10</span></p>
           </div>
           <div className="text-right flex-1 pl-6">
              <p className="text-sm text-gray-300 leading-relaxed italic">"{overview}"</p>
           </div>
        </div>

        {/* Cảnh báo bệnh lý (Nếu có) */}
        {medicalWarnings && medicalWarnings.length > 0 && (
          <div className="bg-red-900/20 border border-red-500/30 rounded-2xl p-5 mb-5">
            <h4 className="font-bold text-red-400 flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5" /> Cảnh báo Y tế
            </h4>
            <ul className="space-y-2 text-sm text-red-200">
              {medicalWarnings.map((warn, i) => (
                <li key={i} className="flex gap-2 items-start leading-relaxed">
                  <span className="shrink-0 mt-0.5">•</span> {warn}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
          <div className="bg-gray-800/50 border border-gray-700/50 p-5 rounded-xl">
            <h4 className="font-bold text-emerald-400 mb-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> Ưu điểm
            </h4>
            <ul className="space-y-2 text-sm text-gray-300">
              {strengths.map((str, i) => <li key={i} className="leading-relaxed">- {str}</li>)}
            </ul>
          </div>
          <div className="bg-gray-800/50 border border-gray-700/50 p-5 rounded-xl">
            <h4 className="font-bold text-orange-400 mb-3 flex items-center gap-2">
              <Info className="w-4 h-4" /> Cần cải thiện
            </h4>
            <ul className="space-y-2 text-sm text-gray-300">
              {improvements.map((imp, i) => <li key={i} className="leading-relaxed">- {imp}</li>)}
            </ul>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-gray-900 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-gray-800 shadow-2xl relative custom-scrollbar" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-full transition-colors z-10"><X className="w-5 h-5" /></button>
        <div className="p-6 md:p-8">{renderContent()}</div>
      </div>
    </div>
  );
}