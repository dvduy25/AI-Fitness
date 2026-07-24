import api from "./services/api";
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
  RadialBarChart, RadialBar, ResponsiveContainer, Tooltip as RechartsTooltip,
  LineChart, Line, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { 
  CheckCircle, Clock, Zap, BrainCircuit, Loader2, 
  Trash2, X, AlertTriangle, Sparkles, Edit2, RefreshCw,
  TrendingUp, Dumbbell, Calendar, Info, Target, PlayCircle, Activity, BellRing, Video, Utensils
} from 'lucide-react'; 

import DietEvaluation from './DietEvaluation'; 
import WorkoutTracker from './WorkoutTracker';
import PremiumRequireModal from './PremiumRequireModal'; 

export default function DailyDashboard() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // State Modals
  const [showLogModal, setShowLogModal] = useState(false);
  const [showAiEvaluation, setShowAiEvaluation] = useState(false);

  const [selectedExercise, setSelectedExercise] = useState(null); 
  const [selectedMealDetail, setSelectedMealDetail] = useState(null); 

  // State Cân nặng & Nhắc nhở
  const [showWeightPrompt, setShowWeightPrompt] = useState(false);
  const [needsWeightUpdate, setNeedsWeightUpdate] = useState(false);
  const [newWeight, setNewWeight] = useState('');
  const [isSubmittingWeight, setIsSubmittingWeight] = useState(false);

  // Cờ điều khiển màn hình theo dõi tập luyện
  const [showWorkoutTracker, setShowWorkoutTracker] = useState(false);
  
  const [isLogging, setIsLogging] = useState(false);
  const [logForm, setLogForm] = useState({
    mealId: null, mealType: '', logType: 'EXACT', extraFoodText: ''
  });

  // State Premium / Quảng cáo
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [isLoadingAd, setIsLoadingAd] = useState(false);

  // State Dashboard
  const [dashboardData, setDashboardData] = useState({
    user: null, 
    macros: { 
      calories: { target: 0, planned: 0, actual: 0 },
      protein: { target: 0, planned: 0, actual: 0 },
      carbs: { target: 0, planned: 0, actual: 0 },
      fat: { target: 0, planned: 0, actual: 0 }
    },
    diet: { consumed: [], upcoming: [], aiNote: "" },
    workout: { isRestDay: true, title: '', scheduledTime: '', exercises: [] }
  });

  const [weightData, setWeightData] = useState([]);
  const [weightPeriod, setWeightPeriod] = useState('month'); 

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    fetchWeightHistory(weightPeriod);
  }, [weightPeriod]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token'); 
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const today = new Date().toISOString().split('T')[0];

      const [profileRes, dietRes, workoutRes, mealPlanRes] = await Promise.all([
        api.get(`/users/me`, config),
        api.get(`/ai/daily-log?date=${today}`, config), 
        api.get(`/workout-plan/today`, config).catch(() => ({ data: {} })),
        api.get(`/meal-plan/my-plan`, config).catch(() => ({ data: null }))
      ]);

      const user = profileRes.data?.data || profileRes.data?.user || profileRes.data || {};
      const diet = dietRes.data;
      const workoutPlan = workoutRes.data;
      const mealPlanData = mealPlanRes.data;
      const mealPlan = mealPlanData?.masterMealPlan || mealPlanData?.plan || mealPlanData;

      let plannedTotals = { calories: 0, protein: 0, carbs: 0, fat: 0 };

      if (mealPlan && mealPlan.dailyTotal && mealPlan.dailyTotal.calories > 0) {
        plannedTotals = mealPlan.dailyTotal;
      } else if (user.targetMacros) {
        plannedTotals = user.targetMacros;
      }

      setDashboardData({
        user: user, 
        macros: {
          calories: {
            target: user.targetMacros?.calories || 0,        
            actual: diet.actualDailyTotal?.calories || 0,    
            planned: Math.round(plannedTotals.calories)
          },
          protein: {
            target: user.targetMacros?.protein || 0, actual: diet.actualDailyTotal?.protein || 0, planned: Math.round(plannedTotals.protein)
          },
          carbs: {
            target: user.targetMacros?.carbs || 0, actual: diet.actualDailyTotal?.carbs || 0, planned: Math.round(plannedTotals.carbs)
          },
          fat: {
            target: user.targetMacros?.fat || 0, actual: diet.actualDailyTotal?.fat || 0, planned: Math.round(plannedTotals.fat)
          }
        },
        diet: {
          consumed: diet.consumedMeals || [],
          upcoming: diet.adjustedUpcomingMeals || [],
          aiNote: diet.dailyAiSummary || diet.adjustmentNote || "" 
        },
        workout: workoutPlan.hasPlan && workoutPlan.todayWorkout ? {
          isRestDay: workoutPlan.todayWorkout.isRestDay, title: workoutPlan.todayWorkout.title, scheduledTime: workoutPlan.todayWorkout.scheduledTime, exercises: workoutPlan.todayWorkout.exercises || []
        } : { isRestDay: true, title: '', scheduledTime: '', exercises: [] }
      });
    } catch (err) {
      console.error("Lỗi tải dữ liệu:", err);
      setError("Không thể tải dữ liệu. Vui lòng thử lại sau.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchWeightHistory = async (period) => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await api.get(`/weight/history?period=${period}`, config);
      const rawData = res.data.data || [];
      const formattedData = rawData.map(item => {
        const d = new Date(item.date);
        return { ...item, displayDate: `${d.getDate()}/${d.getMonth() + 1}` };
      });
      setWeightData(formattedData);
      checkIfNeedsWeightUpdate(rawData);
    } catch (err) {}
  };

  const checkIfNeedsWeightUpdate = (data) => {
    if (!data || data.length === 0) { setNeedsWeightUpdate(true); return; }
    const latestDate = new Date(Math.max(...data.map(e => new Date(e.date))));
    const diffDays = Math.ceil(Math.abs(new Date() - latestDate) / (1000 * 60 * 60 * 24));
    setNeedsWeightUpdate(diffDays >= 7);
  };

  const checkAiAccess = () => {
    const user = dashboardData.user;
    if (!user) return false;
    if (user.isPremium) return true; 
    if (user.aiTickets > 0) return true; 
    return false; 
  };

  const handleWatchAd = async () => {
    setIsLoadingAd(true);
    try {
      const token = localStorage.getItem('token');
      const res = await api.post(`/transactions/virtual-ad`, {}, { headers: { Authorization: `Bearer ${token}` } });
      alert(res.data.message); 
      fetchDashboardData(); 
      setShowPremiumModal(false); 
    } catch (error) {
      alert(error.response?.data?.message || "Lỗi xem quảng cáo!");
    } finally {
      setIsLoadingAd(false);
    }
  };

  const handleWeightSubmit = async () => {
    if (!newWeight || isNaN(newWeight) || Number(newWeight) <= 0) { alert("Vui lòng nhập cân nặng hợp lệ!"); return; }
    setIsSubmittingWeight(true);
    try {
      const token = localStorage.getItem('token');
      await api.post(`/weight`, { weight: Number(newWeight), date: new Date().toISOString() }, { headers: { Authorization: `Bearer ${token}` } });
      setShowWeightPrompt(false); setNewWeight(''); setNeedsWeightUpdate(false);
      await fetchWeightHistory(weightPeriod); await fetchDashboardData(); 
      alert("Cập nhật cân nặng thành công!");
    } catch (err) { alert(err.response?.data?.message || "Lỗi khi cập nhật cân nặng."); } finally { setIsSubmittingWeight(false); }
  };

  const handleSyncPlan = async () => {
    if (!checkAiAccess()) {
      setShowPremiumModal(true);
      return;
    }
    setIsSyncing(true);
    try {
      const token = localStorage.getItem('token');
      const res = await api.post(`/ai/daily-log/sync-plan`, {}, { headers: { Authorization: `Bearer ${token}` } });
      alert(res.data.message || "Đồng bộ thành công!");
      await fetchDashboardData();
    } catch (err) { alert(err.response?.data?.message || "Đã xảy ra lỗi khi đồng bộ lịch ăn mới."); } finally { setIsSyncing(false); }
  };

  const handleDeleteMeal = async (mealId, mealType) => {
    if (!checkAiAccess()) {
      setShowPremiumModal(true);
      return;
    }
    if (!window.confirm(`Bạn có chắc muốn xóa "${mealType}" không? AI sẽ khôi phục lại lịch trình gốc.`)) return;
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      await api.delete(`/ai/daily-log/meal/${mealId}`, { headers: { Authorization: `Bearer ${token}` } });
      await fetchDashboardData(); 
    } catch (err) { alert(err.response?.data?.message || "Đã xảy ra lỗi khi xóa bữa ăn."); setIsLoading(false); }
  };

  const openLogModal = (mealType) => { 
    setLogForm({ mealId: null, mealType, logType: 'EXACT', extraFoodText: '' }); 
    setShowLogModal(true); 
  };
  
  const openEditModal = (meal) => { 
    if (!checkAiAccess()) {
      setShowPremiumModal(true);
      return;
    }
    const text = meal.items.map(i => `${i.foodName} (${i.quantityInGrams}g)`).join(', '); 
    setLogForm({ mealId: meal._id, mealType: meal.mealType, logType: 'CUSTOM', extraFoodText: text }); 
    setShowLogModal(true); 
  };

  const submitLogMeal = async () => {
    if ((logForm.logType === 'CUSTOM' || logForm.logType === 'ADD_EXTRA') && !logForm.extraFoodText.trim()) { alert("Vui lòng nhập món ăn bạn đã ăn!"); return; }
    
    if (logForm.logType !== 'EXACT' && !checkAiAccess()) {
      setShowPremiumModal(true);
      return;
    }

    setIsLogging(true);
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const today = new Date().toISOString().split('T')[0];
      if (logForm.mealId) { await api.put(`/ai/daily-log/meal/${logForm.mealId}`, { extraFoodText: logForm.extraFoodText }, config); } 
      else { await api.post(`/ai/log-meal`, { date: today, mealType: logForm.mealType, logType: logForm.logType, extraFoodText: logForm.extraFoodText }, config); }
      setShowLogModal(false); await fetchDashboardData();
    } catch (err) { alert(err.response?.data?.message || "Có lỗi xảy ra khi ghi nhận."); } finally { setIsLogging(false); }
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

  const getExerciseDetails = (ex) => {
    if (!ex) return {};
    const detailObj = ex.exerciseId || ex.exercise || ex || {};
    return { name: detailObj.name || detailObj.exerciseName || "Đang tải tên...", muscleGroup: detailObj.muscleGroup || 'Chưa rõ', level: detailObj.level || 'Cơ bản', equipmentRequired: detailObj.equipmentRequired || 'bodyweight', description: detailObj.description || '', videoUrl: detailObj.videoUrl || '', sets: ex.sets || 0, reps: ex.reps || 0 };
  };

  const MacroProgressBar = ({ label, actual, planned, target, colorClass }) => {
    const percent = Math.min(100, Math.max(0, target > 0 ? (actual / target) * 100 : 0));
    return (
      <div className="mb-4">
        <div className="flex justify-between items-end mb-1.5">
          <div className="flex flex-col">
            <span className="text-gray-300 font-bold text-sm">{label}</span>
            <span className="text-[10px] text-gray-500 mt-0.5">
              Thực tế: <strong className="text-white">{actual}g</strong> | Kế hoạch: <strong className="text-gray-300">{planned}g</strong>
            </span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-emerald-400/80 block uppercase tracking-wide font-bold">Đề xuất</span>
            <span className="text-gray-200 font-black">{target}g</span>
          </div>
        </div>
        <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
          <div className={`h-full ${colorClass} transition-all duration-700 ease-out`} style={{ width: `${percent}%` }}></div>
        </div>
      </div>
    );
  };

  // --- HÀM TẠO TIMELINE (GỘP ĂN VÀ TẬP) ---
  const generateTimeline = () => {
    const timeline = [];

    // Helper map mealType to approximate time for sorting
    const getMealTime = (mealType) => {
      const type = mealType?.toLowerCase() || '';
      if (type.includes('sáng') && !type.includes('phụ') && !type.includes('vặt')) return { time: '07:00', order: 7 };
      if (type.includes('phụ sáng') || type.includes('vặt sáng')) return { time: '10:00', order: 10 };
      if (type.includes('trưa')) return { time: '12:30', order: 12.5 };
      if (type.includes('phụ chiều') || type.includes('vặt chiều')) return { time: '15:30', order: 15.5 };
      if (type.includes('tối')) return { time: '19:00', order: 19 };
      if (type.includes('đêm')) return { time: '21:30', order: 21.5 };
      return { time: '12:00', order: 12 }; // Default
    };

    // 1. Thêm Bữa ăn đã hoàn thành
    dashboardData.diet.consumed.forEach(meal => {
      const { time, order } = getMealTime(meal.mealType);
      timeline.push({ id: `c_${meal._id || Math.random()}`, type: 'MEAL', status: 'COMPLETED', time, order, title: meal.mealType, data: meal });
    });

    // 2. Thêm Bữa ăn sắp tới
    dashboardData.diet.upcoming.forEach(meal => {
      const { time, order } = getMealTime(meal.mealType);
      timeline.push({ id: `u_${Math.random()}`, type: 'MEAL', status: 'UPCOMING', time, order, title: meal.mealType, data: meal });
    });

    // 3. Thêm Lịch Tập
    if (!dashboardData.workout.isRestDay && dashboardData.workout.title) {
      let timeStr = dashboardData.workout.scheduledTime || '16:00';
      let order = parseInt(timeStr.split(':')[0]) + (timeStr.includes('30') ? 0.5 : 0);
      // Tạm coi lịch tập luôn hiển thị để user click Bắt đầu. (Nếu có tracking workout completed thì xử lý status riêng)
      timeline.push({ id: `w_${Math.random()}`, type: 'WORKOUT', status: 'UPCOMING', time: timeStr, order, title: dashboardData.workout.title, data: dashboardData.workout });
    }

    // Sắp xếp theo trình tự thời gian
    timeline.sort((a, b) => a.order - b.order);
    return timeline;
  };

  const timelineItems = generateTimeline();

  if (isLoading && !showLogModal) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950">
        <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
        <p className="text-gray-400 font-medium">Đang tải dữ liệu AI...</p>
      </div>
    );
  }

  const calorieChartData = [
    { name: 'Thực tế', calo: dashboardData.macros.calories.actual, fill: '#10b981' }, 
    { name: 'Kế hoạch', calo: dashboardData.macros.calories.planned, fill: '#a855f7' }, 
    { name: 'Đề xuất', calo: dashboardData.macros.calories.target, fill: '#eab308' }   
  ];

  const hasOffPlanMeals = dashboardData.diet.consumed.some(m => m.isExactlyAsPlanned === false);
  const isAllMealsCompleted = dashboardData.diet.upcoming.length === 0 && dashboardData.diet.consumed.length > 0;

  const targetCal = dashboardData.macros.calories.target;
  const plannedCal = dashboardData.macros.calories.planned;
  const isCalorieMismatched = targetCal > 0 && plannedCal > 0 && Math.abs(targetCal - plannedCal) > 100;

  return (
    <div className="bg-gray-950 min-h-screen text-gray-200 pb-20">
      
      {/* HEADER */}
      <header className="bg-gray-900 border-b border-gray-800 p-4 md:p-5 sticky top-0 z-20 shadow-md">
        <div className="w-full max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">Tổng quan hôm nay</h1>
            <p className="text-xs md:text-sm text-gray-400 mt-1 flex items-center gap-1.5"><Sparkles className="w-3 h-3 md:w-4 md:h-4 text-emerald-500" /> Đồng bộ với AI Fitness</p>
          </div>
          {dashboardData.user && (
            <div className="flex items-center gap-1.5 md:gap-3 bg-gray-950/50 border border-gray-800 px-3 py-1.5 md:px-5 md:py-2.5 rounded-xl shadow-inner shrink-0">
              <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
              <span className="text-[10px] md:text-sm font-semibold">
                {dashboardData.user.isPremium ? <span className="text-yellow-400">Premium</span> : <span>Vé AI: <strong className="text-white bg-gray-800 px-1.5 py-0.5 rounded-lg ml-1">{dashboardData.user.aiTickets || 0}</strong></span>}
              </span>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-7xl mx-auto w-full">
        {/* THÔNG BÁO CÂN NẶNG */}
        {needsWeightUpdate && (
          <div className="w-full px-4 mt-6">
            <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg shadow-emerald-900/10">
              <div className="flex items-start gap-3"><div className="p-2 bg-emerald-500/20 rounded-full shrink-0"><BellRing className="w-6 h-6 text-emerald-400 animate-pulse" /></div><div><h3 className="font-bold text-emerald-400">Tới lịch cập nhật cân nặng!</h3><p className="text-sm text-emerald-100/70 mt-0.5">Bạn chưa nhập cân nặng trong tuần này. AI cần số liệu mới nhất để tính toán thực đơn và bài tập chính xác hơn.</p></div></div>
              <button onClick={() => setShowWeightPrompt(true)} className="shrink-0 w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-xl transition-colors shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"><TrendingUp className="w-4 h-4" /> Nhập cân nặng</button>
            </div>
          </div>
        )}

        {/* THÔNG BÁO CHÊNH LỆCH CALO */}
        {isCalorieMismatched && (
          <div className="w-full px-4 mt-4">
            <div className="bg-orange-900/20 border border-orange-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg shadow-orange-900/10">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-orange-500/20 rounded-full shrink-0">
                  <AlertTriangle className="w-6 h-6 text-orange-400" />
                </div>
                <div>
                  <h3 className="font-bold text-orange-400">Lịch ăn đang lệch mục tiêu!</h3>
                  <p className="text-sm text-orange-100/70 mt-0.5">
                    Tổng calo lịch ăn hiện tại là <strong className="text-orange-300">{plannedCal} kcal</strong>, lệch so với mục tiêu đề xuất của bạn là <strong className="text-orange-300">{targetCal} kcal</strong>. Bạn có thể vào Quản lý Lịch ăn để điều chỉnh lại nhé.
                  </p>
                </div>
              </div>
              <button onClick={() => navigate('/meal-plan')} className="shrink-0 w-full sm:w-auto px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white text-sm font-bold rounded-xl transition-colors shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2">
                <Utensils className="w-4 h-4" /> Quản lý Lịch ăn
              </button>
            </div>
          </div>
        )}

        {error && <div className="w-full px-4 mt-4"><div className="p-3 bg-red-900/30 text-red-400 border border-red-800/50 rounded-xl text-sm">{error}</div></div>}

        <div className="w-full px-4 py-6">

          {/* NÚT TRUY CẬP NHANH LỊCH TẬP / LỊCH ĂN */}
          <div className="flex gap-3 md:gap-4 mb-6">
            <button onClick={() => navigate('/workout-plan')} className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 border border-blue-500/30 hover:bg-blue-600/30 text-blue-400 hover:text-blue-300 px-4 py-3 md:py-4 rounded-2xl font-bold transition-all active:scale-95 shadow-lg shadow-blue-900/20">
              <Dumbbell className="w-5 h-5 md:w-6 md:h-6" />
              <span className="text-sm md:text-base">Quản lý Lịch Tập</span>
            </button>

            <button onClick={() => navigate('/meal-plan')} className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600/20 to-teal-600/20 border border-emerald-500/30 hover:bg-emerald-600/30 text-emerald-400 hover:text-emerald-300 px-4 py-3 md:py-4 rounded-2xl font-bold transition-all active:scale-95 shadow-lg shadow-emerald-900/20">
              <Utensils className="w-5 h-5 md:w-6 md:h-6" />
              <span className="text-sm md:text-base">Quản lý Lịch Ăn</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* CỘT TRÁI: THỐNG KÊ MACRO & CÂN NẶNG */}
            <div className="lg:col-span-6 xl:col-span-7 space-y-6">
              
              {/* KHU VỰC THỐNG KÊ CALO & MACRO */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-900 p-5 md:p-6 rounded-2xl border border-gray-800 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/5 rounded-full blur-3xl"></div>
                
                <div>
                  <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2"><Zap className="w-5 h-5 text-yellow-500" /> Năng lượng (Kcal)</h2>
                  
                  <div className="h-40 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadialBarChart cx="50%" cy="50%" innerRadius="50%" outerRadius="100%" barSize={8} data={calorieChartData} startAngle={90} endAngle={-270}>
                        <RechartsTooltip cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }} formatter={(value) => `${value} kcal`} />
                        <RadialBar minAngle={15} background={{ fill: '#374151' }} clockWise dataKey="calo" cornerRadius={10} />
                      </RadialBarChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-2">
                      <span className="text-4xl font-black text-white">{dashboardData.macros.calories.actual}</span>
                      <span className="text-xs text-gray-400 font-medium mt-1">/ {dashboardData.macros.calories.target} kcal</span>
                    </div>
                  </div>

                  <div className="flex justify-center gap-4 mt-5 text-[10px] font-medium text-gray-400">
                    <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Thực tế</div>
                    <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span> K.hoạch</div>
                    <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span> Đề xuất</div>
                  </div>
                </div>

                <div className="flex flex-col justify-center">
                  <h3 className="text-sm font-bold text-gray-300 mb-5 flex items-center gap-2"><Target className="w-4 h-4 text-purple-400" /> Tiến độ Dinh dưỡng</h3>
                  <MacroProgressBar label="Đạm (Protein)" actual={dashboardData.macros.protein.actual} planned={dashboardData.macros.protein.planned} target={dashboardData.macros.protein.target} colorClass="bg-blue-500" />
                  <MacroProgressBar label="Tinh bột (Carbs)" actual={dashboardData.macros.carbs.actual} planned={dashboardData.macros.carbs.planned} target={dashboardData.macros.carbs.target} colorClass="bg-yellow-500" />
                  <MacroProgressBar label="Chất béo (Fat)" actual={dashboardData.macros.fat.actual} planned={dashboardData.macros.fat.planned} target={dashboardData.macros.fat.target} colorClass="bg-red-500" />
                </div>
              </div>

              {/* CÂN NẶNG */}
              <div className="bg-gray-900 p-5 md:p-6 rounded-2xl border border-gray-800 shadow-lg">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-3">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2"><TrendingUp className="w-5 h-5 text-emerald-400" /> Theo dõi Cân nặng</h2>
                  <div className="flex items-center gap-3 self-start sm:self-auto">
                    <button onClick={() => setShowWeightPrompt(true)} className="px-3 py-1.5 text-xs font-semibold rounded-md border border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10 flex items-center gap-1">+ Nhập</button>
                    <div className="flex bg-gray-800 rounded-lg p-1">
                      <button onClick={() => setWeightPeriod('week')} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${weightPeriod === 'week' ? 'bg-emerald-500 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}>Tuần</button>
                      <button onClick={() => setWeightPeriod('month')} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${weightPeriod === 'month' ? 'bg-emerald-500 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}>Tháng</button>
                      <button onClick={() => setWeightPeriod('all')} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${weightPeriod === 'all' ? 'bg-emerald-500 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}>Tất cả</button>
                    </div>
                  </div>
                </div>
                {weightData.length > 0 ? (
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={weightData}><CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} /><XAxis dataKey="displayDate" stroke="#9ca3af" tick={{fontSize: 12}} tickLine={false} axisLine={false} dy={10} /><YAxis domain={['dataMin - 1', 'dataMax + 1']} stroke="#9ca3af" tick={{fontSize: 12}} tickLine={false} axisLine={false} width={35} /><RechartsTooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff', borderRadius: '8px' }} itemStyle={{ color: '#10b981' }} formatter={(value) => [`${value} kg`, 'Cân nặng']} /><Line type="monotone" dataKey="weight" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#1f2937' }} activeDot={{ r: 6 }} /></LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-40 flex flex-col items-center justify-center text-gray-500 border border-dashed border-gray-700 rounded-xl"><Info className="w-6 h-6 mb-2 opacity-50" /><p className="text-sm">Chưa có dữ liệu.</p></div>
                )}
              </div>
            </div>

            {/* CỘT PHẢI: LỊCH TRÌNH TRONG NGÀY (TIMELINE) */}
            <div className="lg:col-span-6 xl:col-span-5 space-y-6">
              <div className="bg-gray-900 p-5 md:p-6 rounded-2xl border border-gray-800 shadow-lg sticky top-24">
                
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-800">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2"><Clock className="w-5 h-5 text-blue-400"/> Lịch trình hôm nay</h2>
                  <button onClick={handleSyncPlan} disabled={isSyncing} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all border ${isSyncing ? 'bg-gray-800 text-gray-500 border-gray-700 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/20'}`}>
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} /> {isSyncing ? 'Đang đồng bộ...' : 'Đồng bộ AI'}
                  </button>
                </div>

                {dashboardData.workout.isRestDay && (
                   <div className="mb-6 bg-blue-900/10 border border-blue-500/20 rounded-xl p-3 flex items-center gap-3">
                     <div className="p-2 bg-blue-500/20 rounded-full"><Calendar className="w-5 h-5 text-blue-400" /></div>
                     <div>
                       <h3 className="text-white font-bold text-sm">Hôm nay là ngày nghỉ tập</h3>
                       <p className="text-xs text-gray-400">Tập trung vào dinh dưỡng và phục hồi.</p>
                     </div>
                   </div>
                )}

                {timelineItems.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-6 bg-gray-800/30 rounded-xl border border-gray-800">Chưa có lịch trình nào hôm nay.</p>
                ) : (
                  <div className="relative pl-6 border-l-2 border-gray-800 space-y-8 pb-4">
                    {timelineItems.map((item, idx) => {
                      const isCompletedMeal = item.type === 'MEAL' && item.status === 'COMPLETED';
                      const isUpcomingMeal = item.type === 'MEAL' && item.status === 'UPCOMING';
                      const isWorkout = item.type === 'WORKOUT';
                      
                      // Xác định màu sắc của Node (chấm tròn trên timeline)
                      let nodeColor = "bg-gray-700 border-gray-800";
                      let NodeIcon = Clock;
                      
                      if (isCompletedMeal) {
                        nodeColor = item.data.isExactlyAsPlanned ? "bg-emerald-500 border-emerald-900" : "bg-orange-500 border-orange-900";
                        NodeIcon = item.data.isExactlyAsPlanned ? CheckCircle : AlertTriangle;
                      } else if (isWorkout) {
                        nodeColor = "bg-blue-500 border-blue-900";
                        NodeIcon = Dumbbell;
                      }

                      return (
                        <div key={item.id} className="relative">
                          {/* Dot / Node */}
                          <div className={`absolute -left-[35px] top-1 w-7 h-7 rounded-full border-4 flex items-center justify-center ${nodeColor} z-10 shadow-lg`}>
                             {isCompletedMeal ? <NodeIcon className="w-3.5 h-3.5 text-white" /> : 
                              isWorkout ? <NodeIcon className="w-3.5 h-3.5 text-white" /> : 
                              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>}
                          </div>

                          {/* Time label */}
                          <span className="text-xs font-bold text-gray-400 block mb-2">{item.time}</span>

                          {/* Content Card */}
                          <div className="w-full">
                            {/* === GIAO DIỆN BỮA ĂN ĐÃ HOÀN THÀNH === */}
                            {isCompletedMeal && (
                              <div onClick={() => setSelectedMealDetail(item.data)} className={`flex justify-between items-start p-4 rounded-xl border cursor-pointer hover:shadow-md transition-all ${item.data.isExactlyAsPlanned ? 'bg-emerald-900/10 border-emerald-800/50 hover:bg-emerald-900/20' : 'bg-orange-900/10 border-orange-800/50 hover:bg-orange-900/20'}`}>
                                <div className="flex-1 pr-2">
                                  <h3 className={`font-bold text-sm ${item.data.isExactlyAsPlanned ? 'text-emerald-400' : 'text-orange-400'}`}>
                                    {item.title} <span className="text-xs font-medium ml-1 opacity-70">({item.data.mealTotal?.calories || 0} kcal)</span>
                                  </h3>
                                  {!item.data.isExactlyAsPlanned && <span className="inline-block mt-1 px-1.5 py-0.5 bg-orange-900/50 text-orange-300 text-[10px] font-bold rounded border border-orange-800/50">LỆCH LỊCH TRÌNH</span>}
                                  <p className="text-xs mt-1 text-gray-400 leading-relaxed line-clamp-2">{item.data.items && item.data.items.length > 0 ? item.data.items.map(i => `${i.foodName} (${i.quantityInGrams}g)`).join(', ') : "Không có món"}</p>
                                </div>
                                <div className="flex flex-col gap-1 shrink-0">
                                  <button onClick={(e) => { e.stopPropagation(); openEditModal(item.data); }} className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-gray-800 rounded-lg"><Edit2 className="w-3.5 h-3.5" /></button>
                                  <button onClick={(e) => { e.stopPropagation(); handleDeleteMeal(item.data._id, item.data.mealType); }} className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                                </div>
                              </div>
                            )}

                            {/* === GIAO DIỆN BỮA ĂN SẮP TỚI === */}
                            {isUpcomingMeal && (
                              <div onClick={() => setSelectedMealDetail(item.data)} className={`flex flex-col p-4 rounded-xl border relative overflow-hidden cursor-pointer hover:shadow-md transition-all ${hasOffPlanMeals ? 'border-purple-800/50 bg-purple-900/10 hover:bg-purple-900/20' : 'border-gray-800 bg-gray-800/30 hover:bg-gray-800/50'}`}>
                                <div className="flex items-start justify-between w-full">
                                  <div className="flex-1">
                                    <h3 className="font-bold text-gray-200 flex flex-wrap items-center gap-1.5 text-sm">
                                      {item.title} <span className="text-xs font-medium text-gray-500">({item.data.mealTotal?.calories || 0} kcal)</span>
                                      {hasOffPlanMeals && <span className="flex items-center gap-1 bg-purple-900/50 text-purple-300 text-[10px] px-1.5 py-0.5 rounded border border-purple-800/50"><Sparkles className="w-3 h-3" /> ĐÃ TÍNH LẠI</span>}
                                    </h3>
                                    <p className="text-xs text-gray-400 mt-1 line-clamp-2 leading-relaxed">{item.data.items && item.data.items.length > 0 ? item.data.items.map(i => `${i.foodName} (${i.quantityInGrams}g)`).join(', ') : "Chưa lên thực đơn"}</p>
                                  </div>
                                </div>
                                <div className="mt-3">
                                  <button onClick={(e) => { e.stopPropagation(); openLogModal(item.title); }} className={`w-full py-2 font-semibold text-xs rounded-lg transition-colors shadow-sm ${hasOffPlanMeals ? 'bg-purple-600 hover:bg-purple-500 text-white' : 'bg-gray-700 hover:bg-gray-600 text-white'}`}>Ghi nhận đã ăn</button>
                                </div>
                              </div>
                            )}

                            {/* === GIAO DIỆN LỊCH TẬP === */}
                            {isWorkout && (
                              <div className="bg-blue-900/10 border border-blue-800/30 p-4 rounded-xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 blur-xl rounded-full"></div>
                                <h3 className="font-bold text-blue-400 text-sm mb-2">{item.title}</h3>
                                
                                {item.data.exercises && item.data.exercises.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mb-3">
                                    {item.data.exercises.slice(0, 3).map((ex, i) => (
                                      <span key={i} onClick={() => setSelectedExercise(getExerciseDetails(ex))} className="text-[10px] bg-gray-800 border border-gray-700 px-2 py-1 rounded cursor-pointer hover:border-blue-500 hover:text-blue-300 transition-colors truncate max-w-[120px]">
                                        {getExerciseDetails(ex).name}
                                      </span>
                                    ))}
                                    {item.data.exercises.length > 3 && <span className="text-[10px] bg-gray-800 border border-gray-700 px-2 py-1 rounded text-gray-400">+{item.data.exercises.length - 3} bài</span>}
                                  </div>
                                )}

                                <button 
                                  onClick={() => {
                                    if (item.data.exercises?.length > 0) {
                                      navigate('/workout-tracker', { state: { todayPlan: item.data } });
                                    } else {
                                      alert("Chưa có bài tập nào cho hôm nay!");
                                    }
                                  }}
                                  className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold flex justify-center items-center gap-2 shadow-lg shadow-blue-500/20 transition-all hover:-translate-y-0.5"
                                >
                                  <PlayCircle className="w-4 h-4" /> BẮT ĐẦU TẬP NGAY
                                </button>
                              </div>
                            )}

                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* NOTE TỪ AI & ĐÁNH GIÁ CUỐI NGÀY */}
                {isAllMealsCompleted && (
                  <div className="mt-4 pt-4 border-t border-gray-800">
                    <button 
                      onClick={() => {
                        if (!checkAiAccess()) { setShowPremiumModal(true); return; }
                        setShowAiEvaluation(true);
                      }}
                      className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 hover:scale-[1.02] text-sm"
                    >
                      <BrainCircuit className="w-5 h-5" />
                      AI Đánh giá ngày hôm nay
                    </button>
                  </div>
                )}

                {!isAllMealsCompleted && dashboardData.diet.aiNote && (
                  <div className="mt-4 p-3.5 bg-indigo-900/20 rounded-xl flex items-start gap-3 border border-indigo-800/30">
                    <div className="p-1.5 bg-indigo-500/20 rounded-full shrink-0"><BrainCircuit className="w-4 h-4 text-indigo-400" /></div>
                    <p className="text-xs text-indigo-200/90 leading-relaxed italic">{dashboardData.diet.aiNote}</p>
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>
      </div>

      {showAiEvaluation && (
        <DietEvaluation onClose={() => setShowAiEvaluation(false)} />
      )}

      {/* =========================================================
      // CÁC MODALS (NHẬP BỮA ĂN, CÂN NẶNG, TẬP LUYỆN...)
      // ========================================================= */}
      {showLogModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-gray-900 w-full max-w-sm rounded-2xl border border-gray-800 shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b border-gray-800">
              <h3 className="font-bold text-lg text-white">{logForm.mealId ? `Sửa: ${logForm.mealType}` : `Ghi nhận: ${logForm.mealType}`}</h3>
              <button onClick={() => setShowLogModal(false)} className="text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 p-1.5 rounded-full transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              {!logForm.mealId && (
                <>
                  <p className="text-sm text-gray-400">Bạn đã ăn bữa này như thế nào?</p>
                  <div className="space-y-2.5">
                    {[{ val: 'EXACT', label: 'Ăn chuẩn 100% theo lịch' }, { val: 'ADD_EXTRA', label: 'Ăn theo lịch + Ăn thêm món khác' }, { val: 'CUSTOM', label: 'Ăn món khác hoàn toàn' }].map((opt) => (
                      <label key={opt.val} className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-colors ${logForm.logType === opt.val ? 'bg-emerald-900/20 border-emerald-500/50' : 'bg-gray-800 border-gray-700 hover:bg-gray-700/50'}`}>
                        <input type="radio" name="logType" value={opt.val} checked={logForm.logType === opt.val} onChange={(e) => setLogForm({...logForm, logType: e.target.value})} className="w-4 h-4 text-emerald-500 bg-gray-900 border-gray-600 focus:ring-emerald-500 focus:ring-offset-gray-900" />
                        <span className={`text-sm font-medium ${logForm.logType === opt.val ? 'text-emerald-400' : 'text-gray-300'}`}>{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </>
              )}
              
              {(logForm.mealId || logForm.logType === 'ADD_EXTRA' || logForm.logType === 'CUSTOM') && (
                <div className="mt-4">
                  <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">{logForm.mealId ? "Cập nhật món ăn:" : "Bạn đã ăn thêm gì (AI sẽ ước lượng):"}</label>
                  <textarea rows="3" className="w-full p-3 border border-gray-700 rounded-xl bg-gray-950 text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all resize-none placeholder-gray-600" placeholder="VD: 1 bát phở bò, 1 ly cafe sữa..." value={logForm.extraFoodText} onChange={(e) => setLogForm({...logForm, extraFoodText: e.target.value})}></textarea>
                </div>
              )}
            </div>
            <div className="p-5 border-t border-gray-800 bg-gray-900/50 flex gap-3">
              <button onClick={() => setShowLogModal(false)} className="flex-1 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm font-semibold text-gray-300 hover:bg-gray-700 transition-colors">Hủy</button>
              <button onClick={submitLogMeal} disabled={isLogging} className="flex-1 py-2.5 bg-emerald-600 rounded-xl text-sm font-bold text-white hover:bg-emerald-500 transition-colors flex justify-center items-center">
                {isLogging ? <Loader2 className="w-4 h-4 animate-spin" /> : "Ghi nhận"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showWorkoutTracker && (
        <WorkoutTracker 
          todayPlan={dashboardData.workout} 
          onClose={() => setShowWorkoutTracker(false)}
          onComplete={() => setShowWorkoutTracker(false)}
        />
      )}

      {/* MODAL CẬP NHẬT CÂN NẶNG */}
      {showWeightPrompt && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-gray-900 w-full max-w-sm rounded-2xl border border-gray-800 shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b border-gray-800">
              <h3 className="font-bold text-lg text-emerald-400 flex items-center gap-2"><TrendingUp className="w-5 h-5"/> Nhập cân nặng</h3>
              <button onClick={() => setShowWeightPrompt(false)} className="text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 p-1.5 rounded-full"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5">
              <label className="block text-sm text-gray-400 mb-2">Cân nặng hiện tại (kg)</label>
              <input type="number" value={newWeight} onChange={(e) => setNewWeight(e.target.value)} autoFocus className="w-full bg-gray-950 border border-gray-700 rounded-xl p-3 text-white text-lg focus:border-emerald-500 outline-none" placeholder="VD: 65.5" />
            </div>
            <div className="p-5 border-t border-gray-800 bg-gray-900/50 flex gap-3">
              <button onClick={() => setShowWeightPrompt(false)} className="flex-1 py-3 bg-gray-800 border border-gray-700 rounded-xl text-sm font-semibold text-gray-300">Hủy</button>
              <button onClick={handleWeightSubmit} disabled={isSubmittingWeight} className="flex-1 py-3 bg-emerald-600 rounded-xl text-sm font-bold text-white flex justify-center items-center">
                {isSubmittingWeight ? <Loader2 className="w-4 h-4 animate-spin" /> : "Cập nhật"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CHI TIẾT BÀI TẬP */}
      {selectedExercise && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-3 md:p-4 animate-in fade-in duration-200" onClick={() => setSelectedExercise(null)}>
          <div className="bg-gray-900 w-full max-w-2xl rounded-2xl md:rounded-3xl border border-gray-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 md:p-5 border-b border-gray-800 bg-gray-900/50 shrink-0">
              <h3 className="font-black text-white text-base md:text-xl flex items-center gap-2 truncate">
                <Dumbbell className="w-5 h-5 text-emerald-500 shrink-0" />
                <span className="truncate">{selectedExercise.name}</span>
              </h3>
              <button onClick={() => setSelectedExercise(null)} className="text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 p-1.5 md:p-2 rounded-full transition-colors shrink-0 ml-2">
                <X className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            </div>

            <div className="p-4 md:p-6 overflow-y-auto custom-scrollbar">
              <div className="w-full aspect-video bg-black rounded-xl overflow-hidden mb-5 border border-gray-800 flex items-center justify-center relative shadow-inner">
                {selectedExercise.videoUrl ? (
                  selectedExercise.videoUrl.includes('youtube') || selectedExercise.videoUrl.includes('youtu.be') ? (
                    <iframe className="w-full h-full" src={getYouTubeEmbedUrl(selectedExercise.videoUrl)} frameBorder="0" allowFullScreen></iframe>
                  ) : (
                    <video className="w-full h-full object-contain" controls autoPlay src={selectedExercise.videoUrl.startsWith('http') ? selectedExercise.videoUrl : `${import.meta.env.VITE_API_URL || ""}${selectedExercise.videoUrl}`}></video>
                  )
                ) : (
                  <div className="text-gray-600 flex flex-col items-center">
                    <Video size={36} className="mb-2 opacity-30"/>
                    <span className="text-sm font-medium">Chưa có video minh họa</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="bg-gray-800/80 p-3 md:p-4 rounded-xl border border-gray-700">
                  <p className="text-gray-400 text-[10px] md:text-xs font-bold uppercase mb-1 tracking-wider">Nhóm cơ</p>
                  <p className="text-sm md:text-base text-blue-400 font-bold">{selectedExercise.muscleGroup}</p>
                </div>
                <div className="bg-gray-800/80 p-3 md:p-4 rounded-xl border border-gray-700">
                  <p className="text-gray-400 text-[10px] md:text-xs font-bold uppercase mb-1 tracking-wider">Dụng cụ</p>
                  <p className="text-sm md:text-base text-purple-400 font-bold">{selectedExercise.equipmentRequired || 'Bodyweight'}</p>
                </div>
              </div>

              <div className="bg-gray-950 p-4 md:p-5 rounded-2xl border border-gray-800">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Info className="w-4 h-4" /> Hướng dẫn chi tiết</h4>
                <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">{selectedExercise.description || 'Chưa có hướng dẫn chi tiết.'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CHI TIẾT BỮA ĂN */}
      {selectedMealDetail && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-3 md:p-4 animate-in fade-in duration-200" onClick={() => setSelectedMealDetail(null)}>
          <div className="bg-gray-900 w-full max-w-md rounded-2xl md:rounded-3xl border border-gray-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 md:p-5 border-b border-gray-800 bg-gray-900/50 shrink-0">
              <h3 className="font-black text-white text-base md:text-xl flex items-center gap-2 truncate">
                <Utensils className="w-5 h-5 text-emerald-500 shrink-0" />
                <span className="truncate">Chi tiết {selectedMealDetail.mealType}</span>
              </h3>
              <button onClick={() => setSelectedMealDetail(null)} className="text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 p-1.5 md:p-2 rounded-full transition-colors shrink-0 ml-2">
                <X className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            </div>

            <div className="p-4 md:p-5 overflow-y-auto custom-scrollbar">
              <div className="flex flex-col items-center justify-center py-4 bg-emerald-900/10 border border-emerald-500/20 rounded-2xl mb-5">
                 <span className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Tổng Năng Lượng</span>
                 <span className="text-emerald-400 font-black text-4xl">{selectedMealDetail.mealTotal?.calories || 0} <span className="text-lg text-emerald-500/50 font-semibold">kcal</span></span>
              </div>

              <div className="flex gap-3 mb-6">
                 <div className="flex-1 bg-gray-800/50 p-3 rounded-xl border border-gray-700/50 text-center">
                   <span className="block text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Protein</span>
                   <span className="font-black text-blue-400 text-lg">{selectedMealDetail.mealTotal?.protein || 0}g</span>
                 </div>
                 <div className="flex-1 bg-gray-800/50 p-3 rounded-xl border border-gray-700/50 text-center">
                   <span className="block text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Carbs</span>
                   <span className="font-black text-yellow-400 text-lg">{selectedMealDetail.mealTotal?.carbs || 0}g</span>
                 </div>
                 <div className="flex-1 bg-gray-800/50 p-3 rounded-xl border border-gray-700/50 text-center">
                   <span className="block text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Fat</span>
                   <span className="font-black text-red-400 text-lg">{selectedMealDetail.mealTotal?.fat || 0}g</span>
                 </div>
              </div>

              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-purple-400" />
                Danh sách món ăn
              </h4>

              <div className="space-y-2.5">
                {selectedMealDetail.items && selectedMealDetail.items.length > 0 ? (
                  selectedMealDetail.items.map((item, i) => (
                    <div key={i} className="flex justify-between items-center bg-gray-950 p-3.5 rounded-xl border border-gray-800 hover:border-gray-700 transition-colors">
                      <div className="flex-1 min-w-0 pr-3">
                        <span className="text-sm font-bold text-gray-200 block truncate">{item.foodName}</span>
                      </div>
                      <span className="text-xs text-emerald-400 font-black bg-emerald-500/10 px-2.5 py-1.5 rounded-lg border border-emerald-500/20 whitespace-nowrap">
                        {item.quantityInGrams} gram
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 italic text-center py-4 bg-gray-950 rounded-xl border border-gray-800 border-dashed">Không có dữ liệu món ăn chi tiết.</p>
                )}
              </div>
            </div>
            
            <div className="p-4 border-t border-gray-800 bg-gray-900/50">
               <button onClick={() => setSelectedMealDetail(null)} className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl transition-colors">Đóng</button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* BẢNG YÊU CẦU PREMIUM / XEM QUẢNG CÁO */}
      {/* ========================================================= */}
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