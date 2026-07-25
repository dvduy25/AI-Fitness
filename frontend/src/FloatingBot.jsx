// components/FloatingBot.jsx

import React, { useState, useEffect, useRef } from 'react';
import api from "./services/api";
import { Bot, Flame, Trophy, AlertTriangle, X, ChevronUp, RefreshCw, Shield, MessageSquare, CheckCircle } from 'lucide-react';

export default function FloatingBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [stats, setStats] = useState(null);
  const [periodStats, setPeriodStats] = useState(null); 
  
  const [todayStatus, setTodayStatus] = useState({
    workout: { didWorkout: false, isOverdue: false },
    diet: { didEatRight: false, isCaloriesMet: false, isMealOverdue: false, overdueMealName: null }
  });
  
  const [todayLogs, setTodayLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [closing, setClosing] = useState(false);
  const [updatingStyle, setUpdatingStyle] = useState(false);
  const [resolving, setResolving] = useState(false);
  
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const draggingRef = useRef(false);

  // Lấy dữ liệu từ Backend
  const fetchGamificationStats = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token'); 
      if (!token) return;

      const response = await api.get('/gamification/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setStats(response.data.stats);
        if (response.data.periodStats) setPeriodStats(response.data.periodStats); 
        
        const status = response.data.todayStatus || {
          workout: { didWorkout: false, isOverdue: false },
          diet: { didEatRight: false, isCaloriesMet: false, isMealOverdue: false }
        };
        setTodayStatus(status);

        // Nhận trực tiếp danh sách chỉ trích/thông báo từ Backend
        if (response.data.notifications) {
          setTodayLogs(response.data.notifications);
        }
      }
    } catch (error) {
      console.error("Lỗi khi lấy dữ liệu Bot:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStyleChange = async (style) => {
    setUpdatingStyle(true);
    try {
      const token = localStorage.getItem('token');
      const response = await api.put('/gamification/coaching-style', { style }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setStats(prev => ({ ...prev, coachingStyle: style }));
        fetchGamificationStats(); 
      }
    } catch (error) {
      alert(error.response?.data?.message || "Lỗi khi cập nhật tính cách.");
    } finally {
      setUpdatingStyle(false);
    }
  };

  const handleResolveViolation = async () => {
    setResolving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await api.post('/gamification/resolve-violation', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        alert(response.data.message);
        fetchGamificationStats(); 
      }
    } catch (error) {
      alert(error.response?.data?.message || "Không thể xử lý vi phạm lúc này.");
    } finally {
      setResolving(false);
    }
  };

  const handleManualClose = async () => {
    if (!window.confirm("Bấm xác nhận để chốt sổ hoàn thành ngày!")) return;
    setClosing(true);
    try {
      const token = localStorage.getItem('token');
      const response = await api.post('/gamification/manual-close', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert(response.data.message);
      fetchGamificationStats();
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
    if (draggingRef.current) return;
    setIsOpen(!isOpen);
    if (!isOpen) fetchGamificationStats();
  };

  // Logic Kéo thả Bot
  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    const startX = e.clientX - position.x;
    const startY = e.clientY - position.y;

    const handleMouseMove = (moveEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      if (Math.abs(dx - position.x) > 4 || Math.abs(dy - position.y) > 4) {
        draggingRef.current = true;
      }
      setPosition({ x: dx, y: dy });
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      setTimeout(() => { draggingRef.current = false; }, 50);
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    const startX = touch.clientX - position.x;
    const startY = touch.clientY - position.y;

    const handleTouchMove = (moveEvent) => {
      draggingRef.current = true;
      setPosition({ x: moveEvent.touches[0].clientX - startX, y: moveEvent.touches[0].clientY - startY });
    };

    const handleTouchEnd = () => {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      setTimeout(() => { draggingRef.current = false; }, 50);
    };
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
  };

  const displayStats = stats || {
    rankPoints: 0, streak: 0,
    currentWeekTrackers: { eatWrong: 0, noWorkout: 0, bothFail: 0 },
    coachingStyle: 'SERIOUS',
    activeViolation: { isViolating: false }
  };
  
  const { coachingStyle, activeViolation } = displayStats;
  const { eatWrong, noWorkout, bothFail } = displayStats.currentWeekTrackers;

  const isFullyCompleted = todayStatus?.workout?.didWorkout && (todayStatus?.diet?.didEatRight || todayStatus?.diet?.isCaloriesMet); 
  const isAlreadyClosed = stats?.lastEvaluatedDate && new Date(stats.lastEvaluatedDate) >= new Date(new Date().setHours(0,0,0,0)); 
  const showCloseButton = isFullyCompleted && !isAlreadyClosed;

  // Cấu hình Nội dung & Style Bong Bóng Hội thoại ngoài
  let bubbleMessage = todayLogs.length > 0 ? todayLogs[0].text : null;
  let bubbleStyle = "bg-gray-800 border-gray-700 text-gray-200"; 
  
  if (activeViolation?.isViolating) {
    bubbleStyle = "bg-red-950 border-red-500 text-red-200";
  } else if (showCloseButton) {
    bubbleStyle = "bg-emerald-950 border-emerald-500 text-emerald-200";
  } else if (todayStatus?.workout?.isOverdue || todayStatus?.diet?.isMealOverdue) {
    bubbleStyle = "bg-orange-950 border-orange-500 text-orange-200";
  } else if (coachingStyle === 'STRICT') {
    bubbleStyle = "bg-orange-950 border-orange-500 text-orange-200";
  }

  return (
    <div 
      className="fixed bottom-6 right-6 z-50 flex flex-col items-end touch-none select-none"
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
        transition: draggingRef.current ? 'none' : 'transform 0.15s ease-out'
      }}
    >
      {isOpen && (
        <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl mb-4 w-[330px] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex justify-between items-center border-b border-gray-800 p-4 bg-gray-950/50">
            <h3 className="text-emerald-400 font-bold flex items-center gap-2">
              <Bot className="w-5 h-5" /> Trợ lý HLV AI
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
          <div className="p-4 space-y-3 text-sm max-h-[70vh] overflow-y-auto">
            {activeViolation?.isViolating && (
              <div className="bg-red-950/80 border border-red-500 p-3 rounded-xl mb-3 text-center animate-pulse">
                <AlertTriangle className="w-6 h-6 text-red-500 mx-auto mb-1" />
                <p className="text-red-400 font-bold text-sm mb-1 uppercase">CẢNH BÁO KỶ LUẬT!</p>
                <p className="text-red-300 text-xs mb-3">Bạn đang lười biếng hoặc ăn sai chế độ liên tục!</p>
                <button
                  onClick={handleResolveViolation}
                  disabled={resolving}
                  className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-3 rounded-lg text-xs transition-all active:scale-95"
                >
                  {resolving ? "Đang ghi nhận..." : "Tôi cam kết sửa sai ngay!"}
                </button>
              </div>
            )}

            {/* Đổi Tính Cách AI */}
            <div className="bg-gray-800/30 p-2.5 rounded-xl border border-gray-800 flex items-center justify-between">
              <span className="text-xs text-gray-400 font-semibold flex items-center gap-1.5">
                 <Shield className="w-4 h-4 text-blue-400"/> Tính cách AI:
              </span>
              <select
                value={coachingStyle}
                onChange={(e) => handleStyleChange(e.target.value)}
                disabled={updatingStyle}
                className="bg-gray-900 text-xs text-emerald-400 font-semibold border border-gray-700 rounded-md p-1.5 outline-none cursor-pointer"
              >
                <option value="EASY">😊 Dễ dãi</option>
                <option value="SERIOUS">🧐 Nghiêm túc</option>
                <option value="STRICT">🔥 Kỷ luật thép</option>
              </select>
            </div>

            {/* Chỉ số */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-gray-800/50 p-3 rounded-xl border border-gray-700/50 flex flex-col items-center">
                <Trophy className="w-5 h-5 text-yellow-400 mb-1" />
                <span className="text-xs text-gray-400">Điểm Rank</span>
                <span className="font-bold text-yellow-400 text-lg">{displayStats.rankPoints}</span>
              </div>
              <div className="bg-gray-800/50 p-3 rounded-xl border border-gray-700/50 flex flex-col items-center">
                <Flame className={`w-5 h-5 mb-1 ${displayStats.streak > 0 ? 'text-orange-500' : 'text-gray-600'}`} />
                <span className="text-xs text-gray-400">Chuỗi Ngày</span>
                <span className="font-bold text-orange-500 text-lg">{displayStats.streak}</span>
              </div>
            </div>

            {/* BẢNG CHÁT / CHỈ TRÍCH TỪ AI */}
            <div className="mt-4 border-t border-gray-800 pt-3">
              <h4 className="text-xs font-bold text-gray-400 mb-2 flex items-center gap-1.5 uppercase">
                <MessageSquare className="w-3.5 h-3.5" /> Thông báo hôm nay
              </h4>
              <div className="bg-gray-950/50 border border-gray-800 rounded-xl p-2.5 space-y-2.5 max-h-48 overflow-y-auto custom-scrollbar">
                {todayLogs.length > 0 ? (
                  todayLogs.map(log => (
                    <div key={log.id} className="flex gap-2 items-start">
                      <div className="bg-gray-800 rounded-full p-1 mt-0.5 shrink-0">
                        <Bot className="w-3.5 h-3.5 text-emerald-500" />
                      </div>
                      <div className={`text-xs p-2 rounded-lg rounded-tl-none w-full ${
                        log.type === 'error' ? 'bg-red-950/40 border border-red-500/30 text-red-200' :
                        log.type === 'warning' ? 'bg-orange-950/40 border border-orange-500/30 text-orange-200' :
                        log.type === 'success' ? 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-200' :
                        'bg-gray-800 text-gray-300'
                      }`}>
                        <p className="mb-0.5 leading-relaxed">{log.text}</p>
                        <span className="text-[9px] text-gray-500 opacity-80">{log.time}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-xs text-gray-500 py-2">Chưa có thông báo nào.</p>
                )}
              </div>
            </div>

            {/* Nút Chốt Sổ */}
            {showCloseButton && (
              <button 
                onClick={handleManualClose}
                disabled={closing}
                className="w-full mt-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-[0_0_15px_rgba(16,185,129,0.4)] active:scale-95 duration-150 animate-bounce"
              >
                <CheckCircle className="w-4 h-4" />
                {closing ? "Đang xử lý..." : "Chốt Sổ Hoàn Thành Ngày!"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* BONG BÓNG HỘI THOẠI NGOÀI */}
      <div className="relative flex flex-col items-end">
        {!isOpen && bubbleMessage && (
          <div className={`absolute bottom-[115%] right-0 mb-2 w-52 p-3 text-xs font-medium rounded-2xl rounded-br-none shadow-lg border animate-bounce ${bubbleStyle}`}>
            {bubbleMessage}
            <div className={`absolute -bottom-[5px] right-4 w-2.5 h-2.5 border-b border-r transform rotate-45 ${bubbleStyle.split(' ')[0]} ${bubbleStyle.split(' ')[1]}`}></div>
          </div>
        )}

        <div 
          onClick={toggleBot}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          role="button"
          tabIndex={0}
          className="relative flex items-center justify-center w-14 h-14 bg-gray-900 border-2 border-emerald-500 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:scale-105 transition-transform duration-200 cursor-grab active:cursor-grabbing"
        >
          {isOpen ? <ChevronUp className="w-6 h-6 text-emerald-400 pointer-events-none" /> : <Bot className="w-7 h-7 text-emerald-400 pointer-events-none" />}
          
          {!isOpen && (eatWrong > 0 || noWorkout > 1 || bothFail > 0 || activeViolation?.isViolating || todayStatus?.workout?.isOverdue || todayStatus?.diet?.isMealOverdue) && (
            <span className="absolute top-0 right-0 flex h-3 w-3 pointer-events-none">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border border-gray-900"></span>
            </span>
          )}
        </div>
      </div>
      
    </div>
  );
}