import api from "./services/api";
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { 
  X, BrainCircuit, History, AlertTriangle, 
  Loader2, CheckCircle2, TrendingUp 
} from 'lucide-react';

export default function ExerciseEvaluation({ isOpen, onClose, exerciseId, exerciseName, currentLogId }) {
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    if (isOpen && exerciseId && currentLogId) {
      fetchEvaluation();
    }
  }, [isOpen, exerciseId, currentLogId]);

  const fetchEvaluation = async () => {
    setIsLoading(true);
    setError(null);
    setData(null);

    try {
      const token = localStorage.getItem('token');
      const res = await api.post(`/ai/evaluate-exercise`, {
        currentLogId: currentLogId,
        exerciseId: exerciseId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Không thể kết nối với PT AI lúc này. Vui lòng thử lại sau.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onMouseDown={(e) => {
        // Chỉ đóng khi click ra ngoài vùng xám đen
        if (e.target === e.currentTarget && typeof onClose === 'function') onClose();
      }} 
    >
      <div className="bg-gray-900 w-full max-w-2xl rounded-3xl border border-gray-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header chuẩn form hệ thống */}
        <div className="p-5 border-b border-gray-800 flex justify-between items-start bg-gray-900/50">
          <div>
            <h3 className="font-bold text-white text-lg flex items-center gap-2">
              <BrainCircuit className="w-5 h-5 text-blue-500" /> Báo Cáo Y Học Thể Thao
            </h3>
            <p className="text-gray-400 text-sm flex items-center gap-1.5 mt-1 font-medium">
              <TrendingUp className="w-4 h-4 text-emerald-500"/>
              Bài tập: <strong className="text-gray-200">{exerciseName}</strong>
            </p>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 p-2 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Vùng nội dung cuộn */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-gray-950/20">
          
          {/* TRẠNG THÁI LOADING */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
              <p className="text-gray-400 font-medium animate-pulse">PT AI đang phân tích tiến độ...</p>
            </div>
          )}

          {/* TRẠNG THÁI LỖI */}
          {!isLoading && error && (
            <div className="bg-red-900/20 border border-red-500/30 p-6 rounded-2xl flex flex-col items-center text-center">
              <AlertTriangle className="w-10 h-10 text-red-500 mb-3" />
              <p className="text-red-300 mb-5 text-sm">{error}</p>
              <button 
                type="button" 
                onClick={fetchEvaluation} 
                className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-colors"
              >
                Thử lại
              </button>
            </div>
          )}

          {/* TRẠNG THÁI HOÀN THÀNH - RENDER MARKDOWN */}
          {!isLoading && !error && data && (
            <div className="space-y-5 animate-in fade-in duration-300">
              
              {/* Box so sánh với quá khứ */}
              {data.previousDate && (
                <div className="flex items-center gap-3 p-4 bg-gray-950 border border-gray-800 rounded-2xl">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <History className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-medium">Dữ liệu tham chiếu từ lần tập gần nhất</p>
                    <p className="text-sm font-bold text-gray-200 mt-0.5">
                      Kỷ lục ngày: <span className="text-blue-400">{data.previousDate}</span>
                    </p>
                  </div>
                </div>
              )}

              {/* Box Content Markdown */}
              <div className="bg-gray-800/30 rounded-2xl p-5 border border-gray-700/50">
                <div className="prose prose-sm sm:prose-base prose-invert max-w-none 
                  prose-p:text-gray-300 prose-p:leading-relaxed 
                  prose-headings:text-blue-400 prose-headings:font-bold prose-headings:mt-4 prose-headings:mb-2
                  prose-strong:text-gray-100 prose-strong:font-bold
                  prose-li:text-gray-300 prose-ul:list-disc prose-ul:pl-4
                  prose-blockquote:border-l-blue-500 prose-blockquote:bg-blue-500/10 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r-lg prose-blockquote:text-gray-300 prose-blockquote:not-italic
                  marker:text-blue-500">
                  <ReactMarkdown>{data.evaluation}</ReactMarkdown>
                </div>
              </div>

              {/* Nút đóng */}
              <button 
                type="button"
                onClick={onClose}
                className="w-full py-3.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-bold mt-2 transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5" />
                Đã hiểu, tiếp tục tập!
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}