import api from "./services/api";
import React, { useState, useEffect, useRef } from 'react';
import { Bot, Flame, Trophy, AlertTriangle, X, ChevronUp, RefreshCw, Activity, Star, CheckCircle } from 'lucide-react';
import axios from 'axios';

export default function FloatingBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [stats, setStats] = useState(null);
  const [periodStats, setPeriodStats] = useState(null); 
  const [todayStatus, setTodayStatus] = useState({ didWorkout: false, didEatRight: false }); // Trạng thái hôm nay
  const [loading, setLoading] = useState(false);
  const [closing, setClosing] = useState(false);
  
  // Quản lý tọa độ kéo thả bằng chuột/tay
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const draggingRef = useRef(false);

  const fetchGamificationStats = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token'); 
      if (!token) return;

      const response = await axios.get('/api/gamification/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setStats(response.data.stats);
        setPeriodStats(response.data.periodStats); 
        setTodayStatus(response.data.todayStatus || { didWorkout: false, didEatRight: false }); // Nhận dữ liệu trạng thái từ API
      }
    } catch (error) {
      console.error("Lỗi khi lấy dữ liệu Bot:", error);
    } finally {
      setLoading(false);
    }
  };

  // Hàm kích hoạt Chốt sổ ngay lập tức
  const handleManualClose = async () => {
    if (!window.confirm("Chúc mừng bạn đã hoàn thành ngày xuất sắc! Bấm xác nhận để chốt sổ nhận 10 điểm Rank và tăng chuỗi ngày nhé!")) return;
    setClosing(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/gamification/manual-close', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert(response.data.message);
      fetchGamificationStats(); // Tải lại số liệu mới sau khi chốt
    } catch (error) {
      alert(error.response?.data?.message || "Không thể chốt sổ lúc này.");
    } finally {
      setClosing(false);
    }
  };

  useEffect(() => {
    fetchGamificationStats();
  }, []);

  const toggleBot = () => {
    if (draggingRef.current) return; // Nếu đang kéo chuột di chuyển thì không mở bảng
    const willOpen = !isOpen;
    setIsOpen(willOpen);
    if (willOpen) fetchGamificationStats();
  };

  // --- LOGIC DI CHUYỂN CHUỘT (DESKTOP) ---
  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    const startX = e.clientX - position.x;
    const startY = e.clientY - position.y;
    let hasMoved = false;

    const handleMouseMove = (moveEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      if (Math.abs(dx - position.x) > 4 || Math.abs(dy - position.y) > 4) {
        hasMoved = true;
        draggingRef.current = true;
      }
      setPosition({ x: dx, y: dy });
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      if (hasMoved) {
        setTimeout(() => { draggingRef.current = false; }, 50);
      } else {
        draggingRef.current = false;
      }
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // --- LOGIC DI CHUYỂN CẢM ỨNG (MOBILE) ---
  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    const startX = touch.clientX - position.x;
    const startY = touch.clientY - position.y;
    let hasMoved = false;

    const handleTouchMove = (moveEvent) => {
      const t = moveEvent.touches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      hasMoved = true;
      draggingRef.current = true;
      setPosition({ x: dx, y: dy });
    };

    const handleTouchEnd = () => {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      if (hasMoved) {
        setTimeout(() => { draggingRef.current = false; }, 50);
      } else {
        draggingRef.current = false;
      }
    };
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
  };

  const displayStats = stats || {
    rankPoints: 0, streak: 0, totalWorkoutSessions: 0,
    currentWeekTrackers: { eatWrong: 0, noWorkout: 0, bothFail: 0 }
  };
  const { totalWorkoutSessions } = displayStats;
  const { eatWrong, noWorkout, bothFail } = displayStats.currentWeekTrackers;

  const displayPeriod = periodStats || { workoutsThisWeek: 0, workoutsThisMonth: 0, dietThisWeek: 0, dietThisMonth: 0 };

  // ĐIỀU KIỆN ẨN/HIỆN NÚT CHỐT SỔ
  const isFullyCompleted = todayStatus.didWorkout && todayStatus.didEatRight; // Đã xong cả tập + ăn
  const isAlreadyClosed = stats?.lastEvaluatedDate && new Date(stats.lastEvaluatedDate) >= new Date(new Date().setHours(0,0,0,0)); // Đã chốt hôm nay rồi
  const showCloseButton = isFullyCompleted && !isAlreadyClosed;

  return (
    <div 
      className="fixed bottom-6 right-6 z-50 flex flex-col items-end touch-none select-none"
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
        transition: draggingRef.current ? 'none' : 'transform 0.15s ease-out'
      }}
    >
      {isOpen && (
        <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl mb-4 w-[320px] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex justify-between items-center border-b border-gray-800 p-4 bg-gray-950/50">
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

          {/* Body */}
          <div className="p-4 space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-gray-800/50 p-3 rounded-xl border border-gray-700/50 flex flex-col items-center">
                <Trophy className="w-5 h-5 text-yellow-400 mb-1" />
                <span className="text-xs text-gray-400">Điểm Rank</span>
                <span className="font-bold text-yellow-400 text-lg">{loading ? '...' : displayStats.rankPoints}</span>
              </div>
              <div className="bg-gray-800/50 p-3 rounded-xl border border-gray-700/50 flex flex-col items-center">
                <Flame className={`w-5 h-5 mb-1 ${displayStats.streak > 0 ? 'text-orange-500' : 'text-gray-600'}`} />
                <span className="text-xs text-gray-400">Chuỗi ngày</span>
                <span className="font-bold text-orange-500 text-lg">{loading ? '...' : displayStats.streak}</span>
              </div>
            </div>

            {/* Bảng Tiến độ hôm nay (Giúp trực quan lý do ẩn/hiện nút) */}
            <div className="bg-gray-950 p-2.5 rounded-lg border border-gray-800 text-xs flex justify-around text-center">
              <div>
                <span className="text-gray-400 block mb-0.5">Tập luyện</span>
                <span className={`font-bold ${todayStatus.didWorkout ? "text-emerald-400" : "text-gray-500"}`}>
                  {todayStatus.didWorkout ? "✓ Đã xong" : "○ Chưa xong"}
                </span>
              </div>
              <div className="border-r border-gray-800"></div>
              <div>
                <span className="text-gray-400 block mb-0.5">Ăn uống</span>
                <span className={`font-bold ${todayStatus.didEatRight ? "text-emerald-400" : "text-gray-500"}`}>
                  {todayStatus.didEatRight ? "✓ Đã xong" : "○ Chưa xong"}
                </span>
              </div>
            </div>

            {/* Thống kê hiệu suất */}
            <div className="bg-gray-800/30 p-3 rounded-lg border border-gray-800 space-y-2 text-xs">
               <div className="flex justify-between items-center pb-2 border-b border-gray-700/50">
                  <span className="text-emerald-400 font-semibold">Tập trọn đời:</span>
                  <span className="text-gray-200 font-bold">{loading ? '-' : totalWorkoutSessions} buổi</span>
               </div>
               <div className="flex justify-between items-center">
                  <span className="text-gray-400 font-semibold">Tuần này:</span>
                  <div className="flex gap-3">
                     <span className="flex items-center gap-0.5 text-blue-400"><Activity className="w-3 h-3"/> {displayPeriod.workoutsThisWeek}</span>
                     <span className="flex items-center gap-0.5 text-purple-400"><Star className="w-3 h-3"/> {displayPeriod.dietThisWeek}</span>
                  </div>
               </div>
               <div className="flex justify-between items-center pt-2 border-t border-gray-700/50">
                  <span className="text-gray-400 font-semibold">Tháng này:</span>
                  <div className="flex gap-3">
                     <span className="flex items-center gap-0.5 text-blue-400"><Activity className="w-3 h-3"/> {displayPeriod.workoutsThisMonth}</span>
                     <span className="flex items-center gap-0.5 text-purple-400"><Star className="w-3 h-3"/> {displayPeriod.dietThisMonth}</span>
                  </div>
               </div>
            </div>

            {/* Hạn mức vi phạm */}
            <div className="bg-gray-950 p-3 rounded-xl border border-red-500/20 text-xs">
              <p className="font-bold text-red-400 mb-1.5 flex items-center gap-1 uppercase tracking-wider text-[11px]">
                <AlertTriangle className="w-3.5 h-3.5" /> Hạn mức tuần này
              </p>
              <div className="space-y-1.5">
                <div className="flex justify-between"><span className="text-gray-400">Ăn sai:</span><span className={eatWrong > 1 ? "text-red-500 font-bold" : "text-emerald-400"}>{eatWrong} / 1 ngày</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Không tập:</span><span className={noWorkout > 3 ? "text-red-500 font-bold" : "text-emerald-400"}>{noWorkout} / 3 ngày</span></div>
                <div className="flex justify-between pt-1 border-t border-gray-800"><span className="text-gray-400">Lười cả ăn & tập:</span><span className={bothFail > 1 ? "text-red-500 font-bold" : "text-emerald-400"}>{bothFail} / 1 ngày</span></div>
              </div>
            </div>

            {/* NÚT CHỐT SỔ (CHỈ XUẤT HIỆN KHI ĐỦ 100% ĐIỀU KIỆN KỶ LUẬT) */}
            {showCloseButton && (
              <button 
                onClick={handleManualClose}
                disabled={closing}
                className="w-full mt-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-[0_0_15px_rgba(16,185,129,0.4)] active:scale-95 duration-150 animate-bounce"
              >
                <CheckCircle className="w-4 h-4" />
                {closing ? "Đang xử lý..." : "Chốt Sổ Hoàn Thành Ngày!"}
              </button>
            )}

            {/* Trạng thái thông báo nếu đã được chốt sổ (bằng tay hoặc qua ngày do cron tự quét) */}
            {isAlreadyClosed && (
              <div className="text-center py-2 bg-gray-950 text-gray-500 font-semibold rounded-xl border border-gray-800 text-xs">
                🔒 Ngày hôm nay đã được chốt sổ
              </div>
            )}
          </div>
        </div>
      )}

      {/* ICON TRÒN ĐỂ DI CHUYỂN */}
      <div 
        onClick={toggleBot}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        role="button"
        tabIndex={0}
        className="relative flex items-center justify-center w-14 h-14 bg-gray-900 border-2 border-emerald-500 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:scale-105 transition-transform duration-200 z-50 cursor-grab active:cursor-grabbing"
      >
        {isOpen ? <ChevronUp className="w-6 h-6 text-emerald-400 pointer-events-none" /> : <Bot className="w-7 h-7 text-emerald-400 pointer-events-none" />}
        {!isOpen && (eatWrong > 0 || noWorkout > 1 || bothFail > 0) && (
          <span className="absolute top-0 right-0 flex h-3 w-3 pointer-events-none">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border border-gray-900"></span>
          </span>
        )}
      </div>
    </div>
  );
}