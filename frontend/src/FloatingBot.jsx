import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from "./services/api"; // Chỉnh lại đường dẫn import api cho khớp với cấu trúc thư mục của bạn
import { 
  Bot, Flame, Trophy, AlertTriangle, X, ChevronUp, 
  RefreshCw, Shield, MessageSquare, CheckCircle, PowerOff, Crown,
  Lock, Sparkles, CheckCircle2 
} from 'lucide-react';

// ==========================================
// SUB-COMPONENT: MODAL YÊU CẦU PREMIUM
// ==========================================
function PremiumRequireModal({ isOpen, onClose, onUpgrade }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center px-4">
      {/* Overlay đen mờ */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      {/* Nội dung Modal */}
      <div className="relative bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl transform transition-all animate-in fade-in zoom-in-95 duration-200">
        {/* Nút Tắt (X) */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Tiêu đề & Icon */}
        <div className="text-center mb-6">
          <div className="relative inline-flex items-center justify-center w-20 h-20 bg-gradient-to-tr from-amber-100 to-yellow-50 rounded-full mb-4 shadow-inner">
            <Lock className="w-10 h-10 text-amber-600 absolute" />
            <Sparkles className="w-5 h-5 text-amber-400 absolute top-2 right-2 animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Tính năng Đặc Quyền!</h2>
          <p className="text-gray-500 text-sm px-2 leading-relaxed">
            Tính năng Trợ lý HLV AI chỉ dành riêng cho tài khoản <span className="font-bold text-amber-600">Premium</span>. Hãy nâng cấp ngay để trải nghiệm trọn vẹn và không giới hạn!
          </p>
        </div>

        {/* Quyền lợi Premium */}
        <div className="bg-amber-50/60 rounded-2xl p-4 mb-6 space-y-2 border border-amber-100">
          <div className="flex items-center text-xs text-amber-900 font-medium">
            <CheckCircle2 className="w-4 h-4 text-amber-500 mr-2 shrink-0" />
            <span>Sử dụng Trợ lý HLV AI nhắc nhở 24/7</span>
          </div>
          <div className="flex items-center text-xs text-amber-900 font-medium">
            <CheckCircle2 className="w-4 h-4 text-amber-500 mr-2 shrink-0" />
            <span>Tự do điều chỉnh Tính cách & Kỷ luật của AI</span>
          </div>
          <div className="flex items-center text-xs text-amber-900 font-medium">
            <CheckCircle2 className="w-4 h-4 text-amber-500 mr-2 shrink-0" />
            <span>Mở khóa toàn bộ kế hoạch tập luyện & dinh dưỡng</span>
          </div>
        </div>

        {/* Nút Hành động */}
        <div className="space-y-3">
          <button 
            onClick={onUpgrade}
            className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white rounded-2xl p-4 flex items-center justify-between shadow-lg shadow-amber-500/25 transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <div className="flex items-center">
              <div className="bg-white/20 p-2 rounded-xl mr-3">
                <Crown className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <p className="font-bold text-white text-base">Nâng cấp Premium</p>
                <p className="text-xs text-amber-100">Mở khóa ngay lập tức</p>
              </div>
            </div>
            <span className="bg-white text-amber-600 text-xs font-bold px-3 py-1.5 rounded-full shadow-sm">
              Nâng cấp
            </span>
          </button>

          <button
            onClick={onClose}
            className="w-full py-3 text-sm font-medium text-gray-400 hover:text-gray-600 transition-colors"
          >
            Để sau
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// MAIN COMPONENT: FLOATING BOT
// ==========================================
export default function FloatingBot() {
  const navigate = useNavigate(); // Hook chuyển hướng không reload trang

  const [isOpen, setIsOpen] = useState(false);
  const [stats, setStats] = useState(null);
  const [periodStats, setPeriodStats] = useState(null); 
  
  // State quản lý hiển thị Modal Premium
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  // Trạng thái ngày hôm nay
  const [todayStatus, setTodayStatus] = useState({
    canCloseDay: false,
    workout: { hasLog: false, didWorkout: false, isOverdue: false, isUpcoming: false, isRestDay: false },
    diet: { hasPlan: false, didEatRight: false, isCaloriesMet: false, isMealOverdue: false, isMealUpcoming: false, overdueMealName: null, upcomingMealName: null, calorieStatus: 'PERFECT', calorieDiff: 0 }
  });
  
  const [todayLogs, setTodayLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [closing, setClosing] = useState(false);
  const [updatingConfig, setUpdatingConfig] = useState(false);
  const [resolving, setResolving] = useState(false);
  
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const draggingRef = useRef(false);

  // State điều khiển việc chớp nháy bong bóng hội thoại
  const [showBubble, setShowBubble] = useState(false);

  // Chuyển hướng đến trang Nâng cấp Premium (Single Page Application - Không reload)
  const handleUpgradeRedirect = () => {
    setShowPremiumModal(false);
    navigate('/premium'); 
  };

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
        
        // Đồng bộ trạng thái mới
        if (response.data.todayStatus) {
          setTodayStatus(response.data.todayStatus);
        }

        if (response.data.notifications) {
          setTodayLogs(response.data.notifications);
        } else {
          setTodayLogs([]);
        }
      }
    } catch (error) {
      if (error.response?.status === 403) {
        setShowPremiumModal(true);
      } else {
        console.error("Lỗi khi lấy dữ liệu Bot:", error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleConfigChange = async (updates) => {
    setUpdatingConfig(true);
    try {
      const token = localStorage.getItem('token');
      const response = await api.put('/gamification/coaching-style', updates, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setStats(prev => ({ 
          ...prev, 
          coachingStyle: response.data.coachingStyle ?? prev.coachingStyle,
          isCoachingEnabled: response.data.isCoachingEnabled ?? prev.isCoachingEnabled
        }));
        fetchGamificationStats(); 
      }
    } catch (error) {
      if (error.response?.status === 403) {
        setShowPremiumModal(true);
      } else {
        alert(error.response?.data?.message || "Lỗi khi cập nhật cấu hình AI.");
      }
    } finally {
      setUpdatingConfig(false);
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
      if (error.response?.status === 403) {
        setShowPremiumModal(true);
      } else {
        alert(error.response?.data?.message || "Không thể xử lý vi phạm lúc này.");
      }
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
      if (error.response?.status === 403) {
        setShowPremiumModal(true);
      } else {
        alert(error.response?.data?.message || "Không thể chốt sổ lúc này.");
      }
    } finally {
      setClosing(false);
    }
  };

  useEffect(() => {
    fetchGamificationStats();
  }, []);

  // Effect điều khiển Bong Bóng: 1 phút hiện 1 lần, mỗi lần hiện 5 giây
  useEffect(() => {
    const triggerBubble = () => {
      setShowBubble(true);
      setTimeout(() => {
        setShowBubble(false);
      }, 5000);
    };

    const initialTimeout = setTimeout(triggerBubble, 2000);
    const interval = setInterval(triggerBubble, 60000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, []);

  const toggleBot = () => {
    if (draggingRef.current) return;
    setIsOpen(!isOpen);
    if (!isOpen) fetchGamificationStats();
  };

  // Logic Kéo Thả (Mouse & Touch)
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
    isCoachingEnabled: false,
    activeViolation: { isViolating: false }
  };
  
  const { coachingStyle, isCoachingEnabled, activeViolation } = displayStats;
  const { eatWrong, noWorkout, bothFail } = displayStats.currentWeekTrackers || { eatWrong: 0, noWorkout: 0, bothFail: 0 };

  // Kiểm tra xem đã chốt sổ trong hôm nay chưa
  const isAlreadyClosed = stats?.lastEvaluatedDate && new Date(stats.lastEvaluatedDate) >= new Date(new Date().setHours(0,0,0,0)); 
  const showCloseButton = todayStatus?.canCloseDay && !isAlreadyClosed;

  // Tuỳ chỉnh màu sắc bong bóng tuỳ trạng thái
  let bubbleMessage = isCoachingEnabled && todayLogs.length > 0 ? todayLogs[0].text : null;
  let bubbleStyle = "bg-gray-800 border-gray-700 text-gray-200"; 
  
  if (activeViolation?.isViolating || todayStatus?.workout?.isOverdue || todayStatus?.diet?.isMealOverdue) {
    bubbleStyle = "bg-red-950 border-red-500 text-red-200";
  } else if (showCloseButton) {
    bubbleStyle = "bg-emerald-950 border-emerald-500 text-emerald-200";
  } else if (todayStatus?.diet?.calorieStatus !== 'PERFECT' || todayStatus?.workout?.isUpcoming || todayStatus?.diet?.isMealUpcoming) {
    bubbleStyle = "bg-orange-950 border-orange-500 text-orange-200";
  } else if (coachingStyle === 'STRICT') {
    bubbleStyle = "bg-gray-900 border-gray-600 text-gray-200";
  }

  // Điều kiện kích hoạt dấu chấm đỏ nhấp nháy trên icon bot
  const hasAlert = isCoachingEnabled && (
    eatWrong > 0 || noWorkout > 1 || bothFail > 0 || 
    activeViolation?.isViolating || 
    todayStatus?.workout?.isOverdue || 
    todayStatus?.diet?.isMealOverdue || 
    todayStatus?.workout?.isUpcoming || 
    todayStatus?.diet?.isMealUpcoming || 
    (todayStatus?.diet?.hasPlan && todayStatus?.diet?.calorieStatus !== 'PERFECT')
  );

  return (
    <>
      <div 
        className="fixed bottom-20 md:bottom-6 right-6 z-50 flex flex-col items-end touch-none select-none"
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
            <div className="p-4 space-y-3 text-sm max-h-[70vh] overflow-y-auto custom-scrollbar">
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

              {/* Điều khiển Cấu hình AI */}
              <div className="bg-gray-800/30 p-2.5 rounded-xl border border-gray-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400 font-semibold flex items-center gap-1.5">
                    <Bot className={`w-4 h-4 ${isCoachingEnabled ? 'text-emerald-400' : 'text-gray-500'}`}/> Bật trợ lý AI:
                    <span className="bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 ml-1">
                      <Crown className="w-3 h-3 text-amber-400" /> PRO
                    </span>
                  </span>
                  <button
                    onClick={() => handleConfigChange({ isEnabled: !isCoachingEnabled })}
                    disabled={updatingConfig}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${isCoachingEnabled ? 'bg-emerald-500' : 'bg-gray-600'}`}
                  >
                    <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${isCoachingEnabled ? 'translate-x-5' : 'translate-x-1'}`} />
                  </button>
                </div>

                {isCoachingEnabled && (
                  <div className="flex items-center justify-between pt-2 border-t border-gray-700/50">
                    <span className="text-xs text-gray-400 font-semibold flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-blue-400"/> Tính cách AI:
                    </span>
                    <select
                      value={coachingStyle}
                      onChange={(e) => handleConfigChange({ style: e.target.value })}
                      disabled={updatingConfig}
                      className="bg-gray-900 text-xs text-emerald-400 font-semibold border border-gray-700 rounded-md p-1.5 outline-none cursor-pointer"
                    >
                      <option value="EASY">😊 Dễ dãi</option>
                      <option value="SERIOUS">🧐 Nghiêm túc</option>
                      <option value="STRICT">🔥 Kỷ luật thép</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Chỉ số Rank & Chuỗi */}
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

              {/* BẢNG CHAT / THÔNG BÁO TỪ AI */}
              <div className="mt-4 border-t border-gray-800 pt-3">
                <h4 className="text-xs font-bold text-gray-400 mb-2 flex items-center gap-1.5 uppercase">
                  <MessageSquare className="w-3.5 h-3.5" /> Lời nhắn từ HLV
                </h4>
                
                <div className="bg-gray-950/50 border border-gray-800 rounded-xl p-2.5 space-y-2.5 max-h-48 overflow-y-auto custom-scrollbar">
                  {!isCoachingEnabled ? (
                    <div className="flex flex-col items-center justify-center py-4 text-gray-500 text-center">
                      <PowerOff className="w-6 h-6 mb-2 opacity-50" />
                      <p className="text-xs font-medium text-gray-400">Trợ lý AI đang tắt.</p>
                      <p className="text-[11px] text-gray-500 mt-1">Yêu cầu tài khoản Premium để bật tính năng HLV AI.</p>
                    </div>
                  ) : todayLogs.length > 0 ? (
                    todayLogs.map((log, index) => (
                      <div key={log.id || index} className="flex gap-2 items-start">
                        <div className="bg-gray-800 rounded-full p-1 mt-0.5 shrink-0">
                          <Bot className="w-3.5 h-3.5 text-emerald-500" />
                        </div>
                        <div className={`text-xs p-2.5 rounded-lg rounded-tl-none w-full border ${
                          log.type === 'error' ? 'bg-red-950/40 border-red-500/30 text-red-200' :
                          log.type === 'warning' ? 'bg-orange-950/40 border-orange-500/30 text-orange-200' :
                          log.type === 'success' ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200' :
                          'bg-gray-800 border-gray-700/50 text-gray-300'
                        }`}>
                          <p className="mb-1 leading-relaxed">{log.text}</p>
                          <span className="text-[10px] opacity-70 block text-right mt-1">{log.time}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-xs text-gray-500 py-2">Chưa có thông báo nào.</p>
                  )}
                </div>
              </div>

              {/* NÚT CHỐT SỔ */}
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
          {!isOpen && showBubble && bubbleMessage && !isAlreadyClosed && (
            <div className={`absolute bottom-[115%] right-0 mb-2 w-52 p-3 text-xs font-medium rounded-2xl rounded-br-none shadow-lg border animate-in fade-in zoom-in-95 duration-300 ${bubbleStyle}`}>
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
            className={`relative flex items-center justify-center w-14 h-14 bg-gray-900 border-2 rounded-full shadow-lg hover:scale-105 transition-transform duration-200 cursor-grab active:cursor-grabbing ${isCoachingEnabled ? 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'border-gray-600 opacity-80'}`}
          >
            {isOpen ? (
              <ChevronUp className={`w-6 h-6 pointer-events-none ${isCoachingEnabled ? 'text-emerald-400' : 'text-gray-400'}`} />
            ) : (
              <Bot className={`w-7 h-7 pointer-events-none ${isCoachingEnabled ? 'text-emerald-400' : 'text-gray-400'}`} />
            )}
            
            {/* Chấm đỏ cảnh báo */}
            {!isOpen && hasAlert && (
              <span className="absolute top-0 right-0 flex h-3 w-3 pointer-events-none">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border border-gray-900"></span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* MODAL YÊU CẦU PREMIUM */}
      <PremiumRequireModal 
        isOpen={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
        onUpgrade={handleUpgradeRedirect}
      />
    </>
  );
}