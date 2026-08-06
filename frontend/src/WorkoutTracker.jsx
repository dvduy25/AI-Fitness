import api from "./services/api";
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  X, Dumbbell, Clock, CheckCircle, History, 
  Play, Trophy, ArrowLeft, Video, Info, 
  BrainCircuit, Loader2
} from 'lucide-react';

// IMPORT CÁC COMPONENT TÙY CHỈNH
import ExerciseEvaluation from './ExerciseEvaluation';
import PremiumRequireModal from './PremiumRequireModal'; 

// ==========================================
// COMPONENT ĐỒNG HỒ
// ==========================================
const WorkoutTimer = ({ startTime }) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [startTime]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return <span className="text-emerald-400 font-mono tracking-wider">{formatTime(elapsed)}</span>;
};

export default function WorkoutTracker() {
  const navigate = useNavigate();
  const location = useLocation();
  const todayPlan = location.state?.todayPlan; 

  const [workoutData, setWorkoutData] = useState({});
  const [prevRecords, setPrevRecords] = useState({});
  const [startTime] = useState(Date.now());
  const [currentLogId, setCurrentLogId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false); // Trạng thái đang lưu hoàn thành
  const [infoModal, setInfoModal] = useState({ isOpen: false, exercise: null });
  
  // State gọi AI Modal
  const [aiModal, setAiModal] = useState({ 
    isOpen: false, 
    exerciseId: null, 
    exerciseName: '' 
  });

  // ==========================================
  // STATE & LOGIC CHO PREMIUM / QUẢNG CÁO
  // ==========================================
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [isLoadingAd, setIsLoadingAd] = useState(false);
  
  const [userTickets, setUserTickets] = useState(0); 
  const [isPremium, setIsPremium] = useState(false); 

  // ==========================================
  // TÍCH HỢP GOOGLE ADSENSE SCRIPT
  // ==========================================
  useEffect(() => {
    const script = document.createElement("script");
    script.async = true;
    script.crossOrigin = "anonymous";
    script.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6560645036430945"; 
    
    document.head.appendChild(script);

    window.adsbygoogle = window.adsbygoogle || [];
    window.adConfig = function(o) { window.adsbygoogle.push(o); };
    window.adConfig({
      preloadAdBreaks: 'on',
      onReady: () => {
        console.log("Google AdSense Rewarded API đã sẵn sàng!");
      }
    });

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  useEffect(() => {
    if (!todayPlan) {
      alert("Không tìm thấy dữ liệu buổi tập hôm nay!");
      navigate('/', { replace: true });
    }
  }, [todayPlan, navigate]);

  useEffect(() => {
    if (!todayPlan || !todayPlan.exercises) return;

    const initializeWorkoutData = async () => {
      const initialData = {};
      
      todayPlan.exercises.forEach(ex => {
        initialData[ex.exerciseId._id] = [{
          setNumber: 1,
          weight: '', 
          reps: ex.reps || '', 
          isDone: false
        }];
        
        fetchPrevRecord(ex.exerciseId._id); 
      });

      try {
        const token = localStorage.getItem('token');
        const res = await api.get(`/workout-logs/today`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.data.log) {
          setCurrentLogId(res.data.log._id);
          
          if (res.data.log.exerciseMaxes && Array.isArray(res.data.log.exerciseMaxes)) {
            res.data.log.exerciseMaxes.forEach(loggedEx => {
              const exId = loggedEx.exerciseId?._id || loggedEx.exerciseId;
              if (initialData[exId]) {
                initialData[exId][0].weight = loggedEx.maxWeight || '';
                initialData[exId][0].reps = loggedEx.maxReps || '';
                initialData[exId][0].isDone = true; 
              }
            });
          }
        }
      } catch (error) {
        console.error("Lỗi lấy dữ liệu tập dở hôm nay:", error);
      }
      setWorkoutData(initialData);
    };

    initializeWorkoutData();
  }, [todayPlan]);

  const fetchPrevRecord = async (exerciseId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await api.get(`/workout-logs/previous/${exerciseId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.hasHistory) {
        setPrevRecords(prev => ({ ...prev, [exerciseId]: res.data.previousSets }));
      }
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log(`Chưa có lịch sử cho bài tập: ${exerciseId}`);
      } else {
        console.error("Lỗi lấy lịch sử cũ:", error);
      }
    }
  };

  const openExerciseInfo = async (exerciseId) => {
    try {
      const token = localStorage.getItem('token');
      const id = typeof exerciseId === 'object' ? exerciseId._id : exerciseId;

      const res = await api.get(`/exercises/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const fullExerciseData = res.data.exercise || res.data;
      setInfoModal({ isOpen: true, exercise: fullExerciseData });
    } catch (error) {
      console.error("Lỗi lấy thông tin:", error);
      alert("Không thể tải thông tin bài tập lúc này!");
    }
  };

  const handleSetChange = (exerciseId, setIndex, field, value) => {
    if (value !== '' && Number(value) < 0) return;

    setWorkoutData(prev => {
      const updatedExercise = [...prev[exerciseId]];
      updatedExercise[setIndex] = { ...updatedExercise[setIndex], [field]: value };
      return { ...prev, [exerciseId]: updatedExercise };
    });
  };

  const toggleSetDone = async (exerciseId, setIndex) => {
    const previousWorkoutData = { ...workoutData };
    const currentExercises = [...workoutData[exerciseId]];
    
    currentExercises[setIndex] = {
      ...currentExercises[setIndex],
      isDone: !currentExercises[setIndex].isDone
    };

    const nextWorkoutData = { ...workoutData, [exerciseId]: currentExercises };
    setWorkoutData(nextWorkoutData);

    try {
      const exercisesPayload = Object.keys(nextWorkoutData).map(exId => {
        const completedSets = nextWorkoutData[exId].filter(set => set.isDone === true);
        
        if (completedSets.length === 0) return null;

        const maxSet = completedSets[0];
        const rawReps = String(maxSet.reps).split('-')[0];

        return { 
          exerciseId: exId, 
          maxWeight: parseFloat(String(maxSet.weight).replace(/[^0-9.]/g, '')) || 0,
          maxReps: parseInt(rawReps.replace(/[^0-9]/g, '')) || 0
        };
      }).filter(ex => ex !== null);

      if (exercisesPayload.length > 0) {
        const payload = { exercises: exercisesPayload };
        const token = localStorage.getItem('token');
        
        const res = await api.put(`/workout-logs/max`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (res.data?.log?._id) setCurrentLogId(res.data.log._id);
      }
    } catch (error) {
      console.error("Lỗi khi lưu dữ liệu:", error);
      setWorkoutData(previousWorkoutData);
      alert("Lỗi kết nối mạng hoặc máy chủ từ chối dữ liệu! Vui lòng thử lại.");
    }
  };

  // ==========================================
  // XỬ LÝ NÚT HOÀN THÀNH BUỔI TẬP & LƯU LỊCH SỬ
  // ==========================================
  const handleFinishWorkout = async () => {
    try {
      setIsSubmitting(true);

      // Gom toàn bộ các bài tập có nhập dữ liệu hoặc đã tích chọn
      const exercisesPayload = Object.keys(workoutData).map(exId => {
        const sets = workoutData[exId];
        // Tìm set đã tích Done hoặc set đầu tiên có nhập dữ liệu
        const targetSet = sets.find(s => s.isDone || (s.weight !== '' && s.reps !== '')) || sets[0];

        if (!targetSet) return null;

        const weightVal = parseFloat(String(targetSet.weight).replace(/[^0-9.]/g, '')) || 0;
        const rawReps = String(targetSet.reps).split('-')[0];
        const repsVal = parseInt(rawReps.replace(/[^0-9]/g, '')) || 0;

        // Bỏ qua bài tập không có bất kỳ thông số nào
        if (weightVal <= 0 && repsVal <= 0) return null;

        return {
          exerciseId: exId,
          maxWeight: weightVal,
          maxReps: repsVal
        };
      }).filter(Boolean);

      const token = localStorage.getItem('token');
      
      // Gọi API gửi mảng dữ liệu và đánh dấu isCompleted = true trên Backend
      const res = await api.put('/workout-logs/max', { exercises: exercisesPayload }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        alert("🎉 " + (res.data.message || "Tuyệt vời! Bạn đã hoàn thành và lưu lịch sử buổi tập thành công!"));
        // Điều hướng sang trang Lịch Sử (hoặc Trang Chủ '/')
        navigate('/history');
      }
    } catch (error) {
      console.error("Lỗi khi lưu hoàn thành buổi tập:", error);
      if (error.response?.status === 403) {
        alert("Buổi tập hôm nay đã được lưu và khóa lại từ trước!");
        navigate('/history');
      } else {
        alert("Có lỗi kết nối khi lưu kết quả buổi tập. Vui lòng thử lại!");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const getEmbedUrl = (url) => {
    if (!url) return '';
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|shorts\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    return match ? `https://www.youtube.com/embed/${match[1]}?autoplay=1` : url;
  };

  const handleAiEvaluationClick = (ex) => {
    if (!currentLogId) {
      alert("Bạn cần tập xong ít nhất 1 hiệp và bấm 'Lưu Max' để hệ thống lưu dữ liệu trước khi AI có thể đánh giá!");
      return;
    }

    if (!isPremium && userTickets <= 0) {
      setShowPremiumModal(true); 
      return;
    }

    if (!isPremium) {
      setUserTickets(prev => prev - 1);
    }

    setAiModal({ 
      isOpen: true, 
      exerciseId: ex.exerciseId._id, 
      exerciseName: ex.exerciseId.name 
    });
  };

  const handleWatchAd = () => {
    setIsLoadingAd(true);

    if (typeof window.adBreak !== 'function') {
      setIsLoadingAd(false);
      alert("Không thể tải quảng cáo! Vui lòng tắt trình chặn quảng cáo (AdBlock) để nhận vé AI miễn phí.");
      return;
    }

    window.adBreak({
      type: 'reward', 
      name: 'get_ai_ticket', 
      beforeReward: (showAdFn) => {
        showAdFn(); 
      },
      adRewarded: async () => {
        try {
          const token = localStorage.getItem('token');
          await api.post(`/transactions/virtual-ad`, 
            {}, 
            { headers: { Authorization: `Bearer ${token}` } }
          );
          
          alert("🎉 Cảm ơn bạn! Bạn đã nhận được 1 vé AI."); 
          setUserTickets(prev => prev + 1); 
          setShowPremiumModal(false); 
          
        } catch (error) {
          alert("Lỗi khi cộng vé vào tài khoản của bạn!");
        } finally {
          setIsLoadingAd(false);
        }
      },
      adDismissed: () => {
        setIsLoadingAd(false);
        alert("Bạn đã đóng quảng cáo sớm nên chưa nhận được vé. Hãy xem hết video nhé!");
      },
      adError: (error) => {
        console.error("Lỗi Google AdSense:", error);
        setIsLoadingAd(false);
        alert("Hiện tại không có quảng cáo khả dụng. Vui lòng thử lại sau!");
      }
    });
  };

  if (!todayPlan) return null;

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col pb-24 relative"> 
      
      {/* HEADER */}
      <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-800 bg-gray-900/80 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 bg-gray-800 text-gray-400 rounded-full hover:bg-gray-700 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl md:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">
              {todayPlan?.title || `Buổi tập ${todayPlan?.dayOfWeek}`}
            </h2>
            <div className="flex items-center gap-2 mt-1 text-gray-400 text-sm font-medium">
              <Clock className="w-4 h-4 text-emerald-500" />
              <WorkoutTimer startTime={startTime} />
            </div>
          </div>
        </div>
      </div>

      {/* DANH SÁCH BÀI TẬP */}
      <div className="flex-1 w-full p-4 md:p-8">
        <div className="max-w-3xl mx-auto space-y-6">
          {todayPlan?.exercises?.map((ex, index) => {
            const exerciseId = ex.exerciseId._id;
            const prevLog = prevRecords[exerciseId];
            
            return (
              <div key={index} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
                
                {/* Header bài tập */}
                <div className="p-4 md:p-5 border-b border-gray-800 bg-gray-800/20 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                  <div className="flex items-center gap-3 md:gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 border border-emerald-500/20">
                      <Dumbbell className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-gray-100">{ex.exerciseId.name}</h3>
                      <p className="text-sm font-medium text-gray-400 mt-1">Mục tiêu: {ex.sets} hiệp x {ex.reps} reps</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button 
                      onClick={() => handleAiEvaluationClick(ex)}
                      className="relative p-2 md:px-4 md:py-2 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 rounded-xl flex items-center gap-2 transition-colors border border-indigo-500/20 shrink-0 shadow-md group"
                    >
                      <BrainCircuit className="w-4 h-4 md:w-5 md:h-5 group-hover:scale-110 transition-transform" />
                      <span className="text-xs md:text-sm font-bold">AI Đánh giá</span>
                    </button>

                    <button 
                      onClick={() => openExerciseInfo(ex.exerciseId)}
                      className="p-2 md:px-4 md:py-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-xl flex items-center gap-2 transition-colors border border-blue-500/20 shrink-0"
                    >
                      <Info className="w-4 h-4 md:w-5 md:h-5" />
                      <span className="hidden md:inline text-sm font-bold">Thông tin</span>
                    </button>
                  </div>
                </div>

                <div className="px-4 md:px-5 py-3 bg-gray-950/50 border-b border-gray-800 flex gap-2 items-center text-sm text-gray-400">
                  <History className="w-4 h-4 text-orange-400" />
                  {prevLog && prevLog.length > 0 ? (
                    <span>Buổi trước: <strong className="text-gray-200">{Math.max(...prevLog.map(s => s.weight || 0))}kg</strong> (Max)</span>
                  ) : (
                    <span className="text-emerald-400/80 italic">Chưa có dữ liệu cũ. Cố lên nhé!</span>
                  )}
                </div>

                {/* Bảng nhập Sets (1 Row Max Set) */}
                <div className="p-4 md:p-5">
                  <div className="grid grid-cols-12 gap-2 md:gap-4 mb-3 text-xs font-black text-gray-500 uppercase tracking-widest text-center">
                    <div className="col-span-2">Hiệp</div>
                    <div className="col-span-3">KG Max</div>
                    <div className="col-span-3">Reps</div>
                    <div className="col-span-4">Trạng thái</div>
                  </div>

                  {workoutData[exerciseId]?.map((set, setIdx) => {
                    const prevMaxSet = prevLog && prevLog.length > 0 ? prevLog.reduce((p, c) => p.weight > c.weight ? p : c, prevLog[0]) : null;
                    return (
                      <div key={setIdx} className={`grid grid-cols-12 gap-2 md:gap-4 items-center mb-2 p-2 rounded-xl transition-all ${set.isDone ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-gray-800/30 border border-transparent'}`}>
                        <div className="col-span-2 text-center font-black text-emerald-400/70 text-lg">
                          MAX
                        </div>
                        <div className="col-span-3 relative">
                          <input 
                            type="number"
                            min="0"
                            placeholder={prevMaxSet?.weight || "-"}
                            value={set.weight}
                            onChange={(e) => handleSetChange(exerciseId, setIdx, 'weight', e.target.value)}
                            disabled={set.isDone}
                            className="w-full bg-gray-950 border border-gray-700 rounded-xl p-2.5 md:p-3 text-center text-white font-bold focus:border-emerald-500 outline-none disabled:opacity-50"
                          />
                        </div>
                        <div className="col-span-3">
                          <input 
                            type="number" 
                            min="0"
                            placeholder={prevMaxSet?.reps || ex.reps}
                            value={set.reps}
                            onChange={(e) => handleSetChange(exerciseId, setIdx, 'reps', e.target.value)}
                            disabled={set.isDone}
                            className="w-full bg-gray-950 border border-gray-700 rounded-xl p-2.5 md:p-3 text-center text-white font-bold focus:border-emerald-500 outline-none disabled:opacity-50"
                          />
                        </div>
                        <div className="col-span-4 flex justify-center">
                          <button 
                            onClick={() => toggleSetDone(exerciseId, setIdx)}
                            className={`w-full py-2.5 md:py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 transition-all ${
                              set.isDone 
                              ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                          >
                            {set.isDone ? <CheckCircle className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                            {set.isDone ? 'Xong' : 'Lưu Max'}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* FOOTER - TÍCH HỢP NÚT HOÀN THÀNH */}
      <div className="fixed bottom-0 left-0 right-0 p-4 md:p-6 bg-gray-900/90 backdrop-blur-md border-t border-gray-800 z-40">
        <div className="max-w-3xl mx-auto">
          <button 
            onClick={handleFinishWorkout}
            disabled={isSubmitting}
            className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 rounded-2xl text-white font-bold text-lg flex justify-center items-center gap-2 shadow-xl shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                Đang lưu lịch sử...
              </>
            ) : (
              <>
                <Trophy className="w-6 h-6" />
                Hoàn Thành Buổi Tập
              </>
            )}
          </button>
        </div>
      </div>

      {/* BẢNG ĐÁNH GIÁ AI */}
      <ExerciseEvaluation 
        isOpen={aiModal.isOpen}
        onClose={() => setAiModal({ isOpen: false, exerciseId: null, exerciseName: '' })}
        exerciseId={aiModal.exerciseId}
        exerciseName={aiModal.exerciseName}
        currentLogId={currentLogId}
      />

      {/* MODAL XEM CHI TIẾT BÀI TẬP */}
      {infoModal.isOpen && infoModal.exercise && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
          <div className="bg-gray-900 w-full max-w-lg rounded-3xl border border-gray-800 shadow-2xl overflow-hidden relative">
            <button 
              onClick={() => setInfoModal({ isOpen: false, exercise: null })}
              className="absolute top-3 right-3 p-2 bg-black/50 text-white rounded-full hover:bg-black/80 z-10 transition-colors"
            >
              <X className="w-5 h-5"/>
            </button>

            {infoModal.exercise.videoUrl ? (
              <div className="w-full aspect-video bg-black">
                {infoModal.exercise.videoUrl.includes('youtube') || infoModal.exercise.videoUrl.includes('youtu.be') ? (
                  <iframe 
                    className="w-full h-full" 
                    src={getEmbedUrl(infoModal.exercise.videoUrl)} 
                    frameBorder="0" 
                    allowFullScreen
                  ></iframe>
                ) : (
                  <video 
                    className="w-full h-full object-cover" 
                    controls autoPlay 
                    src={`${import.meta.env.VITE_API_URL || ""}${infoModal.exercise.videoUrl}`}
                  ></video>
                )}
              </div>
            ) : (
              <div className="w-full aspect-video bg-gray-800 flex flex-col items-center justify-center border-b border-gray-800">
                <Video className="w-12 h-12 text-gray-600 mb-2" />
                <span className="text-gray-500">Chưa có video hướng dẫn</span>
              </div>
            )}

            <div className="p-6">
              <h3 className="text-xl font-black text-white mb-4">{infoModal.exercise.name}</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3 bg-gray-950 p-3 rounded-xl border border-gray-800">
                  <div className="p-2 bg-blue-500/10 rounded-lg"><Dumbbell className="w-4 h-4 text-blue-400"/></div>
                  <div>
                    <p className="text-xs text-gray-500 font-bold uppercase">Nhóm cơ chính</p>
                    <p className="text-gray-200 font-medium">{infoModal.exercise.muscleGroup || 'Chưa phân loại'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-gray-950 p-3 rounded-xl border border-gray-800">
                  <div className="p-2 bg-emerald-500/10 rounded-lg"><CheckCircle className="w-4 h-4 text-emerald-400"/></div>
                  <div>
                    <p className="text-xs text-gray-500 font-bold uppercase">Thiết bị</p>
                    <p className="text-gray-200 font-medium">{infoModal.exercise.equipmentRequired || 'Không cần'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BẢNG YÊU CẦU PREMIUM / XEM QUẢNG CÁO */}
      <PremiumRequireModal 
        isOpen={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
        onWatchAd={handleWatchAd}
        onUpgrade={() => {
          setShowPremiumModal(false);
          navigate('/premium'); 
        }}
        isLoadingAd={isLoadingAd}
      />

    </div>
  );
}