import React, { useState, useEffect } from 'react';
import { Bot, Flame, Trophy, AlertTriangle, X, ChevronUp, RefreshCw, Activity, Star } from 'lucide-react';
import axios from 'axios';

export default function FloatingBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  // Hàm gọi API lấy dữ liệu Gamification
  const fetchGamificationStats = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token'); 
      
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await axios.get('https://ai-fitness-w6fd.onrender.com/api/gamification/stats', {
        headers: {
          Authorization: `Bearer ${token}` 
        }
      });

      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (error) {
      // Ẩn bớt lỗi 401 (Chưa đăng nhập) để tránh làm rối console
      if (error.response && error.response.status === 401) {
         console.warn("Bot: Chưa đăng nhập hoặc phiên đã hết hạn.");
      } else {
         console.error("Lỗi khi lấy dữ liệu Bot:", error);
      }
    } finally {
      setLoading(false);
    }
  };

  // Tự động lấy dữ liệu lần đầu khi web load
  useEffect(() => {
    fetchGamificationStats();
  }, []);

  // Lấy lại dữ liệu mỗi khi người dùng bấm mở Bot
  const toggleBot = () => {
    const willOpen = !isOpen;
    setIsOpen(willOpen);
    if (willOpen) {
      fetchGamificationStats();
    }
  };

  // ==========================================
  // XỬ LÝ DỮ LIỆU MẶC ĐỊNH (KHỚP BACKEND MỚI)
  // ==========================================
  const displayStats = stats || {
    rankPoints: 0,
    streak: 0,
    totalWorkoutSessions: 0,
    totalPerfectDietDays: 0,
    currentWeekTrackers: { eatWrong: 0, noWorkout: 0, bothFail: 0 }
  };

  // Bóc tách dữ liệu chuẩn xác
  const { totalWorkoutSessions, totalPerfectDietDays } = displayStats;
  const { eatWrong, noWorkout, bothFail } = displayStats.currentWeekTrackers;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      
      {/* KHUNG THÔNG TIN CỦA BOT */}
      {isOpen && (
        <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl p-4 mb-4 w-[320px] animate-in slide-in-from-bottom-5">
          <div className="flex justify-between items-center border-b border-gray-800 pb-2 mb-3">
            <h3 className="text-emerald-400 font-bold flex items-center gap-2">
              <Bot className="w-5 h-5" /> Trợ lý Kỷ Luật
            </h3>
            <div className="flex items-center gap-2">
              <button onClick={fetchGamificationStats} className="text-gray-500 hover:text-emerald-400 transition-colors">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
              </button>
              <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-red-400 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {/* Hàng Điểm & Chuỗi */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-gray-800/50 p-3 rounded-xl border border-gray-700/50 flex flex-col items-center">
                <Trophy className="w-5 h-5 text-yellow-400 mb-1" />
                <span className="text-xs text-gray-400">Điểm Rank</span>
                <span className="font-bold text-yellow-400 text-lg">
                  {loading ? '...' : displayStats.rankPoints}
                </span>
              </div>
              <div className="bg-gray-800/50 p-3 rounded-xl border border-gray-700/50 flex flex-col items-center">
                <Flame className={`w-5 h-5 mb-1 ${displayStats.streak > 0 ? 'text-orange-500' : 'text-gray-600'}`} />
                <span className="text-xs text-gray-400">Chuỗi ngày</span>
                <span className="font-bold text-orange-500 text-lg">
                  {loading ? '...' : displayStats.streak}
                </span>
              </div>
            </div>

            {/* Hàng Thành tích trọn đời */}
            <div className="flex justify-between bg-gray-800/30 p-2 rounded-lg border border-gray-800">
               <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-400" />
                  <span className="text-xs text-gray-300">Tổng buổi tập: <strong className="text-blue-400">{totalWorkoutSessions}</strong></span>
               </div>
               <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-purple-400" />
                  <span className="text-xs text-gray-300">Ăn chuẩn: <strong className="text-purple-400">{totalPerfectDietDays}</strong></span>
               </div>
            </div>

            {/* Khung Cảnh báo vi phạm tuần */}
            <div className="mt-2 bg-gray-950 p-3 rounded-xl border border-red-500/20">
              <p className="font-bold text-red-400 text-xs mb-2 flex items-center gap-1 uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4" /> Hạn mức tuần này
              </p>
              
              <div className="space-y-2 text-xs">
                {/* Ăn sai */}
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Ăn sai:</span>
                  <span className={`font-bold ${eatWrong > 1 ? "text-red-500" : "text-emerald-400"}`}>
                    {eatWrong} / 1 ngày
                  </span>
                </div>
                {/* Không tập */}
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Không tập:</span>
                  <span className={`font-bold ${noWorkout > 3 ? "text-red-500" : "text-emerald-400"}`}>
                    {noWorkout} / 3 ngày
                  </span>
                </div>
                {/* Vi phạm nặng (Lười cả 2) */}
                <div className="flex justify-between items-center pt-1 border-t border-gray-800">
                  <span className="text-gray-300">Lười cả ăn & tập:</span>
                  <span className={`font-bold ${bothFail > 1 ? "text-red-500" : "text-emerald-400"}`}>
                    {bothFail} / 1 ngày
                  </span>
                </div>
              </div>

              <p className="text-[10px] text-gray-500 mt-3 text-center italic">
                *Quá hạn mức sẽ bị trừ 50-100 điểm Rank và mất toàn bộ chuỗi.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* NÚT BẤM CỦA BOT */}
      <button 
        onClick={toggleBot}
        className="relative flex items-center justify-center w-14 h-14 bg-gray-900 border-2 border-emerald-500 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:scale-110 transition-transform duration-300 z-50"
      >
        {isOpen ? (
          <ChevronUp className="w-6 h-6 text-emerald-400" />
        ) : (
          <Bot className="w-7 h-7 text-emerald-400" />
        )}
        
        {/* Bóng đỏ cảnh báo (Ping) */}
        {!isOpen && (eatWrong > 0 || noWorkout > 1 || bothFail > 0) && (
          <span className="absolute top-0 right-0 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border border-gray-900"></span>
          </span>
        )}
      </button>

    </div>
  );
}