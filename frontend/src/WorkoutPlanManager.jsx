import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom'; // Thêm import chuyển trang
import { 
  Bot, Sparkles, Target, Activity, Dumbbell, Play, Pause, MapPin,
  Clock, AlertTriangle, CheckCircle, Loader2, MessageSquareText,
  Plus, Trash2, Edit2, X, Search, Calendar, ChevronDown, ChevronUp, Video
} from 'lucide-react';
import MasterWorkoutEvaluation from './MasterWorkoutEvaluation';
import PremiumRequireModal from './PremiumRequireModal'; // Đảm bảo đường dẫn chính xác

export default function WorkoutPlanManager() {
  const navigate = useNavigate(); // Khởi tạo điều hướng

  const [userData, setUserData] = useState(null);
  const [customRequest, setCustomRequest] = useState(""); 
  const [customAvailability, setCustomAvailability] = useState({});
  const [showTimeConfig, setShowTimeConfig] = useState(false);

  const [isLoadingPlan, setIsLoadingPlan] = useState(true); 
  const [isGenerating, setIsGenerating] = useState(false);  
  const [workoutPlan, setWorkoutPlan] = useState(null);
  
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [showEvaluation, setShowEvaluation] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [showEditExModal, setShowEditExModal] = useState(false);
  const [showAddExModal, setShowAddExModal] = useState(false);
  const [showExDetailsModal, setShowExDetailsModal] = useState(false); 

  const [editData, setEditData] = useState({ dayOfWeek: '', exerciseId: '', exName: '', sets: 3, reps: 10, restTimeInSeconds: 60 });
  const [selectedEx, setSelectedEx] = useState(null); 
  
  const [targetDayForExercise, setTargetDayForExercise] = useState('');
  const [exerciseDatabase, setExerciseDatabase] = useState([]);
  const [searchExQuery, setSearchExQuery] = useState('');
  const [isLoadingExercises, setIsLoadingExercises] = useState(false);

  // ==========================================
  // STATE CHO TÍNH NĂNG PREMIUM / QUẢNG CÁO
  // ==========================================
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [isLoadingAd, setIsLoadingAd] = useState(false);

  const API_BASE_URL = 'https://ai-fitness-w6fd.onrender.com';
  
  // Lấy Token xác thực
  const getHeaders = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

  const dayMap = {
    'Monday': 'Thứ 2', 'Tuesday': 'Thứ 3', 'Wednesday': 'Thứ 4',
    'Thursday': 'Thứ 5', 'Friday': 'Thứ 6', 'Saturday': 'Thứ 7', 'Sunday': 'Chủ Nhật'
  };

  const daysList = [
    { key: 'Monday', label: 'Thứ 2' }, { key: 'Tuesday', label: 'Thứ 3' },
    { key: 'Wednesday', label: 'Thứ 4' }, { key: 'Thursday', label: 'Thứ 5' },
    { key: 'Friday', label: 'Thứ 6' }, { key: 'Saturday', label: 'Thứ 7' },
    { key: 'Sunday', label: 'Chủ Nhật' }
  ];

  useEffect(() => {
    fetchUserData();
    fetchCurrentPlan(); 
    fetchExercises(); 
  }, []);

  const fetchUserData = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/users/me`, getHeaders());
      setUserData(res.data.data || res.data);
    } catch (err) { console.error("Lỗi tải User:", err); }
  };

  const fetchCurrentPlan = async () => {
    setIsLoadingPlan(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/workout-plan`, getHeaders());
      if (res.data && res.data.plan) {
        setWorkoutPlan(res.data.plan);
      } else { setWorkoutPlan(null); }
    } catch (err) { setWorkoutPlan(null); } finally { setIsLoadingPlan(false); }
  };

  // ==========================================
  // HÀM KIỂM TRA QUYỀN TRUY CẬP AI
  // ==========================================
  const checkAiAccess = () => {
    if (!userData) return false;
    if (userData.isPremium) return true; // VIP thì pass hết
    if (userData.aiTickets > 0) return true; // Thường mà có vé thì pass
    return false; // Hết vé thì chặn
  };

  // ==========================================
  // XỬ LÝ NÚT: AI XẾP LỊCH TẬP
  // ==========================================
  const handleGeneratePlan = async () => {
    // 1. Chặn lại nếu hết quyền
    if (!checkAiAccess()) {
      setShowPremiumModal(true);
      return;
    }

    setIsGenerating(true); setError(null); setSuccessMsg("");
    try {
      const payload = { notes: customRequest, customAvailability: customAvailability };
      await axios.post(`${API_BASE_URL}/api/ai/generate-workout-plan`, payload, getHeaders());
      fetchCurrentPlan();
      setSuccessMsg("AI đã tạo thành công lịch tập 7 ngày!");
      
      // Load lại User để thấy số vé bị trừ đi (Backend phải xử lý trừ vé nhé)
      fetchUserData(); 
    } catch (err) {
      setError(err.response?.data?.message || "Lỗi tạo lịch tập. Thử lại sau.");
    } finally { setIsGenerating(false); }
  };

  // ==========================================
  // XỬ LÝ NÚT: AI ĐÁNH GIÁ LỊCH TẬP
  // ==========================================
  const handleEvaluatePlanClick = () => {
    // 1. Chặn lại nếu hết quyền
    if (!checkAiAccess()) {
      setShowPremiumModal(true);
      return;
    }
    
    // Nếu pass, mở bảng đánh giá
    setShowEvaluation(true);
  };

  // ==========================================
  // XỬ LÝ: XEM QUẢNG CÁO ẢO
  // ==========================================
  const handleWatchAd = async () => {
    setIsLoadingAd(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/api/transactions/virtual-ad`, {}, getHeaders());
      alert(res.data.message); 
      fetchUserData(); // Tải lại số vé hiển thị lên header
      setShowPremiumModal(false); // Tắt bảng
    } catch (error) {
      alert(error.response?.data?.message || "Lỗi xem quảng cáo!");
    } finally {
      setIsLoadingAd(false);
    }
  };

  // Các hàm tiện ích khác giữ nguyên
  const handleAvailabilityChange = (dayKey, value) => {
    setCustomAvailability(prev => ({ ...prev, [dayKey]: value }));
  };

  const handleViewExercise = async (exData) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/exercises/${exData._id}`, getHeaders());
      const exerciseDetail = res.data.data || res.data.exercise || res.data;
      setSelectedEx(exerciseDetail);
      setShowExDetailsModal(true);
    } catch (error) {
      console.error("Không tải được chi tiết bài tập", error);
      setSelectedEx(exData);
      setShowExDetailsModal(true);
    }
  };

  const fetchExercises = async () => {
    setIsLoadingExercises(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/exercises`, getHeaders());
      const exerciseArray = res.data.data || res.data.exercises || res.data || [];
      setExerciseDatabase(Array.isArray(exerciseArray) ? exerciseArray : []);
    } catch (error) { 
      console.error("Lỗi tải thư viện bài tập", error); 
    } finally { 
      setIsLoadingExercises(false); 
    }
  };

  const getYouTubeEmbedUrl = (url) => {
    if (!url) return null;
    let videoId = '';
    if (url.includes('youtube.com/watch')) {
      videoId = new URL(url).searchParams.get('v');
    } else if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1].split('?')[0];
    }
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  };

  const handleAddExerciseToDay = async (exerciseId) => {
    try {
      const payload = { 
        dayOfWeek: targetDayForExercise, 
        exerciseId: exerciseId, 
        sets: 3, 
        reps: "10", 
        restTimeInSeconds: 60 
      };
      
      await axios.post(`${API_BASE_URL}/api/workout-plan/exercise`, payload, getHeaders());
      fetchCurrentPlan();
      setShowAddExModal(false);
      setShowExDetailsModal(false); 
    } catch (error) {
      alert("Không thể thêm bài tập: " + (error.response?.data?.message || "Lỗi server"));
    }
  };

  const handleUpdateExercise = async () => {
    setIsProcessing(true);
    try {
      const payload = {
        dayOfWeek: editData.dayOfWeek,
        exerciseId: editData.exerciseId,
        sets: Number(editData.sets),
        reps: Number(editData.reps) || editData.reps, 
        restTimeInSeconds: Number(editData.restTimeInSeconds)
      };
      await axios.patch(`${API_BASE_URL}/api/workout-plan/exercise`, payload, getHeaders());
      
      await fetchCurrentPlan(); 
      setShowEditExModal(false);
    } catch (error) { 
      const errorMsg = error.response?.data?.message || error.message;
      alert(`❌ LỖI CẬP NHẬT BÀI TẬP:\n\n${errorMsg}`); 
    } finally { 
      setIsProcessing(false); 
    }
  };

  const handleRemoveExercise = async (dayOfWeek, exerciseId) => {
    if (!window.confirm("Bạn có chắc muốn xóa bài tập này khỏi lịch?")) return;
    setIsProcessing(true);
    try {
      await axios.delete(`${API_BASE_URL}/api/workout-plan/exercise`, {
        ...getHeaders(), 
        data: { dayOfWeek, exerciseId } 
      });
      await fetchCurrentPlan();
    } catch (error) { 
      const errorMsg = error.response?.data?.message || error.message;
      alert(`❌ LỖI XÓA BÀI TẬP:\n\n${errorMsg}`); 
    } finally { 
      setIsProcessing(false); 
    }
  };

  const toggleRestDay = async (dayOfWeek, currentStatus) => {
    setIsProcessing(true);
    try {
      await axios.patch(`${API_BASE_URL}/api/workout-plan/day`, {
        dayOfWeek, isRestDay: !currentStatus
      }, getHeaders());
      fetchCurrentPlan();
    } catch (error) { alert("Lỗi cập nhật ngày tập!"); } finally { setIsProcessing(false); }
  };

  const filteredEx = exerciseDatabase.filter(ex => 
    ex.name?.toLowerCase().includes(searchExQuery.toLowerCase()) || 
    ex.muscleGroup?.toLowerCase().includes(searchExQuery.toLowerCase())
  );

  return (
    <div className="bg-gray-950 min-h-screen !w-full !max-w-none text-gray-200 font-sans selection:bg-blue-500/30 overflow-x-hidden">
      
      {/* HEADER TỔNG */}
      <header className="bg-gray-900/80 backdrop-blur-xl border-b border-gray-800 p-3 sm:p-4 sticky top-0 z-40 w-full shadow-lg">
        <div className="w-full px-2 sm:px-4 md:px-6 lg:px-8 flex flex-row items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg md:text-2xl font-black text-white tracking-tight flex items-center gap-1.5 md:gap-2 truncate">
              <Dumbbell className="w-6 h-6 md:w-8 md:h-8 text-blue-500 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)] shrink-0" /> 
              AI Lịch Tập
            </h1>
          </div>
          {userData && (
            <div className="flex items-center gap-1.5 md:gap-3 bg-gray-950/50 border border-gray-800 px-3 py-1.5 md:px-5 md:py-2.5 rounded-xl shadow-inner shrink-0">
              <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
              <span className="text-[10px] md:text-sm font-semibold">
                {userData.isPremium ? <span className="text-yellow-400">Premium</span> : <span>Vé AI: <strong className="text-white bg-gray-800 px-1.5 py-0.5 rounded-lg ml-1">{userData.aiTickets}</strong></span>}
              </span>
            </div>
          )}
        </div>
      </header>

      <div className="w-full px-3 sm:px-4 md:px-6 xl:px-8 mt-4 md:mt-6">
        {error && <div className="p-3 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl mb-4 flex gap-2"><AlertTriangle className="w-5 h-5"/> {error}</div>}
        {successMsg && <div className="p-3 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl mb-4 flex gap-2"><CheckCircle className="w-5 h-5"/> {successMsg}</div>}
      </div>

      {/* MAIN LAYOUT */}
      <div className="w-full px-3 sm:px-4 md:px-6 xl:px-8 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 xl:gap-8 w-full">
          
          {/* CỘT TRÁI (Lệnh cho AI) */}
          <div className="lg:col-span-4 xl:col-span-3 space-y-4 md:space-y-6 lg:sticky lg:top-24 self-start w-full">
            <div className="bg-gradient-to-b from-gray-900 to-gray-950 p-4 rounded-3xl border border-gray-800 shadow-xl w-full">
              <h2 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2"><Target className="w-4 h-4 text-blue-500" /> Nền tảng thể lực</h2>
              <div className="space-y-3">
                <div className="bg-gray-950/50 p-3 rounded-2xl border border-gray-800 flex justify-between shadow-inner"><span className="text-gray-400 text-sm font-semibold"><Activity className="w-4 h-4 inline mr-2"/> Mục tiêu</span><span className="text-sm font-bold text-white uppercase">{userData?.goal?.replace('_', ' ') || 'Chưa Đặt'}</span></div>
                <div className="bg-gray-950/50 p-3 rounded-2xl border border-gray-800 flex justify-between shadow-inner"><span className="text-gray-400 text-sm font-semibold"><Target className="w-4 h-4 inline mr-2"/> Cấp độ</span><span className="text-sm font-bold text-blue-400 uppercase">{userData?.fitnessLevel || 'N/A'}</span></div>
                <div className="bg-gray-950/50 p-3 rounded-2xl border border-gray-800 flex justify-between shadow-inner"><span className="text-gray-400 text-sm font-semibold"><MapPin className="w-4 h-4 inline mr-2"/> Nơi tập</span><span className="text-sm font-bold text-purple-400 uppercase">{userData?.workoutLocation || 'N/A'}</span></div>
              </div>
            </div>

            <div className="bg-gradient-to-b from-gray-900 to-gray-950 p-4 md:p-5 rounded-3xl border border-gray-800 shadow-xl w-full">
              <h2 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2"><Bot className="w-4 h-4 text-blue-500" /> Ra lệnh cho AI</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2"><MessageSquareText className="w-4 h-4 text-blue-500"/> Ghi chú cho PT (Tùy chọn)</label>
                  <textarea value={customRequest} onChange={(e) => setCustomRequest(e.target.value)} placeholder="VD: Tôi bị đau lưng dưới..." className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-3 text-sm text-gray-200 outline-none resize-none" rows="3"/>
                </div>
                <div className="bg-gray-950 border border-gray-800 rounded-2xl p-4">
                  <button onClick={() => setShowTimeConfig(!showTimeConfig)} className="flex items-center justify-between w-full text-sm font-semibold text-gray-300 outline-none"><span className="flex items-center gap-2"><Clock className="w-4 h-4 text-blue-500"/> Thiết lập giờ rảnh</span>{showTimeConfig ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}</button>
                  {showTimeConfig && (
                    <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-gray-800">
                      {daysList.map(day => (
                        <div key={day.key} className={day.key === 'Sunday' ? 'col-span-2' : ''}>
                          <label className="block text-[10px] text-gray-500 font-bold uppercase mb-1">{day.label}</label>
                          <input type="text" placeholder="VD: 17h-19h" value={customAvailability[day.key] || ''} onChange={(e) => handleAvailabilityChange(day.key, e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-xs text-gray-200 outline-none"/>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              {/* NÚT AI XẾP LỊCH TẬP ĐÃ ĐƯỢC CHÈN LOGIC CHẶN */}
              <button onClick={handleGeneratePlan} className="w-full mt-5 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-lg rounded-2xl shadow-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
                {isGenerating ? <><Loader2 className="w-5 h-5 animate-spin" /> Đang phân tích...</> : <><Sparkles className="w-5 h-5"/> AI XẾP LỊCH TẬP</>}
              </button>
            </div>
          </div>

          {/* CỘT PHẢI (Hiển thị Lịch) */}
          <div className="lg:col-span-8 xl:col-span-9 w-full">
            <div className="bg-gray-900/50 min-h-[500px] p-4 md:p-8 rounded-3xl border border-gray-800 shadow-2xl w-full">
              {isLoadingPlan && !isGenerating && (
                <div className="flex flex-col items-center justify-center h-full min-h-[500px] text-gray-400 space-y-3"><Loader2 className="w-10 h-10 animate-spin text-blue-500/50" /><p className="animate-pulse">Đang tải lịch tập...</p></div>
              )}

              {isGenerating && (
                <div className="flex flex-col items-center justify-center h-full min-h-[500px] text-center space-y-6">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full border-4 border-gray-800 border-t-blue-500 animate-spin"></div>
                    <Bot className="w-8 h-8 text-blue-500 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white mb-2">AI đang soạn lịch tập...</h3>
                    <p className="text-sm text-gray-400 max-w-sm mx-auto">Đang căn chỉnh lịch nghỉ ngơi và chọn bài tập phù hợp cho bạn...</p>
                  </div>
                </div>
              )}

              {!isLoadingPlan && !isGenerating && !workoutPlan && (
                <div className="flex flex-col items-center justify-center min-h-[500px] text-center border-2 border-dashed border-gray-800 rounded-3xl bg-gray-900/30 px-4">
                  <Calendar className="w-10 h-10 text-gray-500 mb-4" />
                  <h3 className="text-gray-300 font-bold text-xl">Chưa có lịch tập</h3>
                  <p className="text-sm text-gray-500 mt-2 max-w-sm">Hãy dùng công cụ AI bên trái để tự động tạo một lịch trình hoàn hảo cho 7 ngày.</p>
                </div>
              )}

              {!isLoadingPlan && !isGenerating && workoutPlan && (
                <div className={`w-full ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}>
                  <div className="bg-gradient-to-r from-gray-900 to-gray-950 p-5 rounded-3xl border border-blue-900/30 shadow-xl mb-8 w-full flex justify-between items-center">
                    <div>
                      <h3 className="text-blue-400 font-black flex items-center gap-2 text-xl"><Calendar className="w-6 h-6"/> Lịch Tập Hàng Tuần</h3>
                      <p className="text-sm text-gray-400 mt-1 font-medium">Bao gồm ngày tập luyện và ngày nghỉ phục hồi.</p>
                    </div>
                  </div>

                  <div className="space-y-8 w-full">
                    {workoutPlan.weeklySchedule?.map((day, index) => (
                      <div key={index} className="flex gap-5 group w-full">
                        <div className="flex flex-col items-center shrink-0 w-14">
                          <div className="w-14 h-14 rounded-full border-4 border-gray-950 bg-gray-900 text-gray-500 flex items-center justify-center group-hover:text-blue-400 transition-all z-10"><Calendar className="w-5 h-5" /></div>
                          {index !== 6 && <div className="w-0.5 bg-gray-800 flex-1 my-1"></div>}
                        </div>
                        
                        <div className="flex-1 w-full pb-10">
                          <div className={`w-full border rounded-3xl p-6 shadow-lg ${day.isRestDay ? 'bg-gray-900/30 border-gray-800/50' : 'bg-gray-900/80 border-gray-800 hover:border-gray-700'}`}>
                            <div className="flex justify-between mb-4 border-b border-gray-800/80 pb-4">
                              <div>
                                <div className="flex items-center gap-2 mb-1.5">
                                  <span className="bg-gray-800 text-gray-300 text-xs font-black uppercase px-3 py-1 rounded-md">{dayMap[day.dayOfWeek] || day.dayOfWeek}</span>
                                  {day.isRestDay && <span className="bg-emerald-500/10 text-emerald-400 text-xs font-bold px-3 py-1 rounded-md border border-emerald-500/20">NGÀY NGHỈ</span>}
                                </div>
                                <h4 className={`font-black text-xl ${day.isRestDay ? 'text-gray-500' : 'text-white'}`}>{day.title || (day.isRestDay ? "Nghỉ ngơi" : "Ngày tập luyện")}</h4>
                                <span className="text-sm font-medium text-blue-500/80 flex items-center gap-1 mt-1.5"><Clock className="w-3.5 h-3.5" /> Dự kiến tập lúc: {day.scheduledTime || "Chưa đặt giờ"}</span>
                              </div>
                              <button onClick={() => toggleRestDay(day.dayOfWeek, day.isRestDay)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border ${day.isRestDay ? 'bg-gray-800 text-gray-300 border-gray-700' : 'bg-orange-500/10 text-orange-400 border-orange-500/30'}`}>
                                {day.isRestDay ? <><Play className="w-4 h-4"/> Chuyển thành Tập</> : <><Pause className="w-4 h-4"/> Đổi thành Nghỉ</>}
                              </button>
                            </div>
                            
                            {!day.isRestDay && (
                              <div className="space-y-3 w-full">
                                {day.exercises && day.exercises.filter(item => item && item.exerciseId).length > 0 ? (
                                  day.exercises.filter(item => item && item.exerciseId).map((exItem, i) => {
                                    const exData = exItem.exerciseId; 
                                    return (
                                      <div key={i} onClick={() => handleViewExercise(exData)} className="flex xl:items-center justify-between bg-gray-950/50 p-4 rounded-2xl border border-gray-800/50 hover:border-blue-500/50 hover:bg-blue-900/10 cursor-pointer transition-all gap-4 w-full">
                                        <div className="flex-1 min-w-0">
                                          <span className="font-bold text-gray-200 text-base block truncate hover:text-blue-400">{exData.name || "Bài tập không xác định"}</span>
                                          <div className="flex gap-3 mt-2 text-xs font-semibold text-gray-500">
                                            <span className="text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">{exData.muscleGroup || "N/A"}</span>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-5 border-l border-gray-800 pl-5">
                                          <div className="flex gap-6 text-center">
                                            <div><span className="block text-[10px] text-gray-500 uppercase mb-0.5">Sets</span><span className="text-lg font-black text-white">{exItem.sets}</span></div>
                                            <div><span className="block text-[10px] text-gray-500 uppercase mb-0.5">Reps</span><span className="text-lg font-black text-emerald-400">{exItem.reps}</span></div>
                                            <div><span className="block text-[10px] text-gray-500 uppercase mb-0.5">Nghỉ</span><span className="text-lg font-black text-yellow-400">{exItem.restTimeInSeconds}s</span></div>
                                          </div>
                                          <div className="flex gap-2 pl-2">
                                            <button onClick={(e) => { e.stopPropagation(); setEditData({ dayOfWeek: day.dayOfWeek, exerciseId: exData._id, exName: exData.name, sets: exItem.sets, reps: exItem.reps, restTimeInSeconds: exItem.restTimeInSeconds }); setShowEditExModal(true); }} className="p-2.5 bg-gray-900 text-gray-400 hover:text-blue-400 rounded-xl border border-gray-800"><Edit2 className="w-4 h-4" /></button>
                                            <button onClick={(e) => { e.stopPropagation(); handleRemoveExercise(day.dayOfWeek, exData._id); }} className="p-2.5 bg-gray-900 text-gray-400 hover:text-red-400 rounded-xl border border-gray-800"><X className="w-4 h-4" /></button>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })
                                ) : (
                                  <p className="text-sm text-gray-500 italic text-center py-4 bg-gray-950/30 rounded-2xl border border-gray-800 border-dashed">Chưa có bài tập nào. Hãy thêm bài!</p>
                                )}

                                <button onClick={() => { setTargetDayForExercise(day.dayOfWeek); setShowAddExModal(true); if (exerciseDatabase.length === 0) fetchExercises(); }} className="w-full mt-4 py-3.5 border-2 border-dashed border-blue-900/50 text-blue-500 hover:border-blue-500 hover:bg-blue-500/10 rounded-2xl font-bold flex items-center justify-center gap-2">
                                  <Plus className="w-5 h-5" /> THÊM BÀI TẬP VÀO {dayMap[day.dayOfWeek]?.toUpperCase() || day.dayOfWeek.toUpperCase()}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* AI EVALUATION BUTTON ĐÃ ĐƯỢC CHÈN LOGIC CHẶN */}
            {!isLoadingPlan && workoutPlan && (
              <div className="w-full pb-10 mt-6">
                <button onClick={handleEvaluatePlanClick} className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-500 rounded-2xl text-white font-bold flex justify-center items-center gap-2 shadow-lg hover:shadow-blue-500/30">
                  <Sparkles className="w-5 h-5"/> Đánh giá Lịch Tập này với AI
                </button>
              </div>
            )}
            
            {showEvaluation && (
              <MasterWorkoutEvaluation onClose={() => setShowEvaluation(false)} />
            )}
          </div>
        </div>
      </div>

      {/* CÁC MODAL KHÁC GIỮ NGUYÊN BÊN TRONG NÀY... */}
      {showExDetailsModal && selectedEx && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200" onClick={() => setShowExDetailsModal(false)}>
          <div className="bg-gray-900 w-full max-w-2xl rounded-3xl border border-gray-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 md:p-6 border-b border-gray-800 bg-gray-900/50">
              <h3 className="font-black text-white text-lg md:text-2xl flex items-center gap-2 md:gap-3 truncate">
                <Dumbbell className="w-5 h-5 md:w-6 md:h-6 text-blue-500 shrink-0" />
                {selectedEx.name}
              </h3>
              <button onClick={() => setShowExDetailsModal(false)} className="text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 p-2 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 md:p-6 overflow-y-auto custom-scrollbar">
              <div className="w-full aspect-video bg-black rounded-xl overflow-hidden mb-6 flex items-center justify-center border border-gray-800">
                {selectedEx.videoUrl ? (
                  selectedEx.videoUrl.includes('youtube') || selectedEx.videoUrl.includes('youtu.be') ? (
                    <iframe className="w-full h-full" src={getYouTubeEmbedUrl(selectedEx.videoUrl)} frameBorder="0" allowFullScreen></iframe>
                  ) : (
                    <video className="w-full h-full object-contain" controls autoPlay src={selectedEx.videoUrl.startsWith('http') ? selectedEx.videoUrl : `${API_BASE_URL}${selectedEx.videoUrl}`}></video>
                  )
                ) : (
                  <div className="text-gray-600 flex flex-col items-center"><Video size={48} className="mb-2 opacity-50"/><span>Chưa có video minh họa</span></div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-800 p-4 rounded-xl">
                  <p className="text-gray-400 text-xs font-bold uppercase mb-1">Nhóm cơ</p>
                  <p className="text-white font-semibold">{selectedEx.muscleGroup}</p>
                </div>
                <div className="bg-gray-800 p-4 rounded-xl">
                  <p className="text-gray-400 text-xs font-bold uppercase mb-1">Dụng cụ</p>
                  <p className="text-white font-semibold">{selectedEx.equipmentRequired || 'Bodyweight'}</p>
                </div>
              </div>

              {showAddExModal ? (
                <button 
                  onClick={() => handleAddExerciseToDay(selectedEx._id)}
                  className="w-full mt-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex justify-center items-center gap-2 shadow-lg shadow-blue-500/20"
                >
                  {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Plus className="w-5 h-5" /> Thêm vào {dayMap[targetDayForExercise]}</>}
                </button>
              ) : (
                <button 
                  onClick={() => setShowExDetailsModal(false)}
                  className="w-full mt-6 py-3.5 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl"
                >
                  Đóng chi tiết
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showAddExModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-gray-900 w-full max-w-xl rounded-3xl border border-gray-800 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="p-4 md:p-6 border-b border-gray-800 flex justify-between items-center">
              <h3 className="font-black text-white text-lg">Thêm Bài Tập</h3>
              <button onClick={() => setShowAddExModal(false)} className="text-gray-400 hover:text-white"><X className="w-6 h-6"/></button>
            </div>
            <div className="p-4 border-b border-gray-800 bg-gray-950">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                <input 
                  type="text" placeholder="Tìm theo tên bài tập, nhóm cơ..." 
                  value={searchExQuery} onChange={e => setSearchExQuery(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-10 pr-4 py-3 text-white focus:border-blue-500 outline-none"
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 custom-scrollbar space-y-2">
              {isLoadingExercises ? (
                <div className="flex justify-center p-10"><Loader2 className="animate-spin text-blue-500 w-8 h-8"/></div>
              ) : filteredEx.length > 0 ? (
                filteredEx.map(ex => (
                  <div 
                    key={ex._id} 
                    onClick={() => handleViewExercise(ex)} 
                    className="flex justify-between items-center bg-gray-950 p-3 rounded-xl border border-gray-800 hover:border-blue-500/50 transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-gray-800 flex items-center justify-center border border-gray-700 shrink-0">
                        <Dumbbell className="w-6 h-6 text-gray-500" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-200 group-hover:text-blue-400 transition-colors">{ex.name}</h4>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="text-[10px] text-gray-500 font-medium bg-gray-900 px-2 py-0.5 rounded border border-gray-800">{ex.muscleGroup}</span>
                          <span className="text-[10px] text-gray-500 font-medium bg-gray-900 px-2 py-0.5 rounded border border-gray-800">{ex.equipmentRequired || 'Bodyweight'}</span>
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={(e) => { e.stopPropagation(); handleAddExerciseToDay(ex._id); }} 
                      className="text-xs font-bold text-blue-500 bg-blue-500/10 px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap"
                    >
                      + Thêm
                    </button>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center text-gray-500 py-10">
                  <Dumbbell className="w-10 h-10 mb-3 opacity-20"/>
                  <p>Không tìm thấy bài tập nào.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showEditExModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-gray-900 w-full max-w-sm rounded-3xl border border-gray-800 shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-gray-800 flex justify-between items-center">
              <h3 className="font-black text-white text-lg">Tùy chỉnh thông số</h3>
              <button onClick={() => setShowEditExModal(false)} className="text-gray-400 hover:text-white"><X className="w-6 h-6"/></button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-blue-400 font-bold bg-blue-500/10 p-3 rounded-xl border border-blue-500/20">{editData.exName}</p>
              <div>
                <label className="block text-gray-400 text-xs font-bold mb-2 uppercase">Số hiệp (Sets)</label>
                <input type="number" value={editData.sets} onChange={e => setEditData({...editData, sets: e.target.value})} className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-white focus:border-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-gray-400 text-xs font-bold mb-2 uppercase">Số lần (Reps)</label>
                <input type="text" value={editData.reps} onChange={e => setEditData({...editData, reps: e.target.value})} className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-white focus:border-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-gray-400 text-xs font-bold mb-2 uppercase">Nghỉ giữa hiệp (giây)</label>
                <input type="number" value={editData.restTimeInSeconds} onChange={e => setEditData({...editData, restTimeInSeconds: e.target.value})} className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-white focus:border-blue-500 outline-none" />
              </div>
            </div>
            <div className="p-4 bg-gray-950 border-t border-gray-800 flex gap-3">
              <button onClick={() => setShowEditExModal(false)} className="flex-1 py-3 bg-gray-800 text-gray-400 rounded-xl hover:text-white transition-colors">Hủy</button>
              <button onClick={handleUpdateExercise} className="flex-1 py-3 text-white bg-blue-600 rounded-xl hover:bg-blue-500 font-bold flex justify-center items-center transition-colors">
                {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Lưu lại'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* BẢNG YÊU CẦU PREMIUM NẰM Ở CUỐI CÙNG (Dành cho việc chặn) */}
      {/* ========================================================= */}
      <PremiumRequireModal 
        isOpen={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
        onWatchAd={handleWatchAd}
        onUpgrade={() => {
          setShowPremiumModal(false);
          navigate('/premium'); // Đổi sang route trang gói cước của bạn nếu tên khác
        }}
        isLoadingAd={isLoadingAd}
      />

    </div>
  );
}