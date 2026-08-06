import React, { useState, useEffect } from 'react';
import api from './services/api';
import { 
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend 
} from 'recharts';
import { 
  CalendarDays, ChevronLeft, ChevronRight, 
  Flame, Dumbbell, Utensils, Loader2, Activity, CheckCircle2, Scale, 
  LineChart as ChartIcon, Plus, TrendingDown, TrendingUp, Calendar,
  Lock, Unlock, Moon, AlertCircle
} from 'lucide-react';

// ==========================================
// COMPONENT 1: THEO DÕI CÂN NẶNG
// ==========================================
const WeightTracker = () => {
  const [weightInput, setWeightInput] = useState('');
  const [period, setPeriod] = useState('month'); 
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [msg, setMsg] = useState(null);

  const fetchWeightHistory = async (selectedPeriod) => {
    setIsLoading(true);
    try {
      const res = await api.get(`/weight/history?period=${selectedPeriod}`);
      
      const rawList = res.data?.data || res.data?.history || res.data?.logs || res.data?.weightList || (Array.isArray(res.data) ? res.data : []);
      
      const formattedData = rawList.map((item) => ({
        ...item,
        weight: Number(item.weight || item.value || 0),
        displayDate: item.date ? new Date(item.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) : ''
      }));

      setHistory(formattedData);
    } catch (err) {
      console.error('Lỗi lấy lịch sử cân nặng:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWeightHistory(period);
  }, [period]);

  const handleSaveWeight = async (e) => {
    e.preventDefault();
    if (!weightInput || isNaN(weightInput) || Number(weightInput) <= 0) return;

    setIsSubmitting(true);
    setMsg(null);
    try {
      const res = await api.post('/weight', { weight: Number(weightInput) });
      setMsg({ type: 'success', text: res.data?.message || 'Lưu cân nặng thành công!' });
      setWeightInput('');
      fetchWeightHistory(period); 
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Có lỗi xảy ra khi lưu cân nặng!' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const firstWeight = history[0]?.weight;
  const latestWeight = history[history.length - 1]?.weight;
  const diffWeight = firstWeight && latestWeight ? (latestWeight - firstWeight).toFixed(1) : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-4 bg-gray-900 border border-gray-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 text-purple-400 font-bold text-base mb-2">
            <Scale className="w-5 h-5" /> Ghi Nhận Cân Nặng
          </div>
          <p className="text-xs text-gray-400 mb-6">
            Cập nhật cân nặng hàng tuần để hệ thống điều chỉnh lại TDEE & Calories cho bạn.
          </p>

          {msg && (
            <div className={`p-3 rounded-xl mb-4 text-xs font-bold flex items-center gap-2 ${
              msg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
            }`}>
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              {msg.text}
            </div>
          )}

          <form onSubmit={handleSaveWeight} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase block mb-1.5">Cân nặng hôm nay (kg)</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  placeholder="VD: 68.5"
                  value={weightInput}
                  onChange={(e) => setWeightInput(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white font-bold text-lg focus:outline-none focus:border-purple-500 transition-colors"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm">kg</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !weightInput}
              className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Plus className="w-5 h-5" /> Lưu Chỉ Số Cân Nặng</>}
            </button>
          </form>
        </div>

        {history.length > 1 && (
          <div className="mt-6 pt-4 border-t border-gray-800 flex justify-between items-center bg-gray-950/50 p-3 rounded-xl">
            <span className="text-xs text-gray-400 font-medium">Thay đổi thời gian qua:</span>
            <span className={`text-sm font-black flex items-center gap-1 ${diffWeight > 0 ? 'text-emerald-400' : diffWeight < 0 ? 'text-orange-400' : 'text-gray-400'}`}>
              {diffWeight > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {diffWeight > 0 ? `+${diffWeight}` : diffWeight} kg
            </span>
          </div>
        )}
      </div>

      <div className="lg:col-span-8 bg-gray-900 border border-gray-800 rounded-2xl p-5 shadow-lg flex flex-col">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h3 className="text-white font-bold text-base flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-400" /> Biểu Đồ Lịch Sử Cân Nặng
          </h3>
          <div className="flex bg-gray-950 p-1 rounded-xl border border-gray-800 text-xs font-bold">
            {[
              { id: 'week', label: '1 Tuần' },
              { id: 'month', label: '1 Tháng' },
              { id: 'year', label: '1 Năm' },
              { id: 'all', label: 'Tất cả' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setPeriod(tab.id)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  period === tab.id ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
          </div>
        ) : history.length > 0 ? (
          <div className="h-72 w-full min-h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis dataKey="displayDate" stroke="#6b7280" fontSize={11} tickLine={false} />
                <YAxis stroke="#6b7280" fontSize={11} tickLine={false} domain={['dataMin - 1', 'dataMax + 1']} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#090d16', borderColor: '#374151', borderRadius: '12px', color: '#fff' }}
                  formatter={(val) => [`${val} kg`, 'Cân nặng']}
                />
                <Line type="monotone" dataKey="weight" stroke="#a855f7" strokeWidth={3} dot={{ fill: '#a855f7', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-gray-800 rounded-xl text-gray-500 text-sm">
            Chưa có dữ liệu cân nặng trong khoảng thời gian này.
          </div>
        )}
      </div>
    </div>
  );
};

// ==========================================
// COMPONENT 2: TIẾN ĐỘ TĂNG TẠ
// ==========================================
const ExerciseProgressTracker = () => {
  const [exercisesList, setExercisesList] = useState([]);
  const [selectedExId, setSelectedExId] = useState('');
  const [progressData, setProgressData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchExercises = async () => {
      try {
        const res = await api.get('/exercises'); 
        const list = res.data?.data || res.data?.exercises || (Array.isArray(res.data) ? res.data : []);
        setExercisesList(list);
        if (list.length > 0) setSelectedExId(list[0]._id || list[0].id);
      } catch (err) {
        console.error("Lỗi lấy danh sách bài tập:", err);
      }
    };
    fetchExercises();
  }, []);

  useEffect(() => {
    if (!selectedExId) return;

    const fetchProgress = async () => {
      setIsLoading(true);
      try {
        const res = await api.get(`/workout-logs/exercise-progress/${selectedExId}`);
        setProgressData(res.data?.data || res.data);
      } catch (err) {
        console.error("Lỗi lấy tiến độ bài tập:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProgress();
  }, [selectedExId]);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 shadow-lg">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-gray-800 mb-6">
        <div>
          <h3 className="text-white font-bold text-lg flex items-center gap-2">
            <Dumbbell className="w-5 h-5 text-emerald-400" /> Tiến Độ Tăng Trưởng Mức Tạ
          </h3>
          <p className="text-xs text-gray-400 mt-1">Theo dõi sức mạnh tăng tiến (Progressive Overload) qua thời gian.</p>
        </div>
        <div className="w-full sm:w-64">
          <select
            value={selectedExId}
            onChange={(e) => setSelectedExId(e.target.value)}
            className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2.5 text-emerald-400 font-bold text-sm focus:outline-none focus:border-emerald-500"
          >
            {exercisesList.length === 0 && <option value="">Không có bài tập nào</option>}
            {exercisesList.map((ex) => (
              <option key={ex._id || ex.id} value={ex._id || ex.id}>{ex.name || ex.exerciseName}</option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        </div>
      ) : progressData && progressData.timeline && progressData.timeline.length > 0 ? (
        <div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="bg-gray-950 p-3.5 rounded-xl border border-gray-800">
              <span className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Mức tạ cao nhất</span>
              <div className="text-xl font-black text-white flex items-baseline gap-1">
                {progressData.summary?.allTimeHighestWeight || 0} <span className="text-xs text-emerald-400 font-bold">kg</span>
              </div>
            </div>
            <div className="bg-gray-950 p-3.5 rounded-xl border border-gray-800">
              <span className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Tăng thêm</span>
              <div className="text-xl font-black text-emerald-400 flex items-baseline gap-1">
                +{progressData.summary?.weightGained || 0} <span className="text-xs font-bold">kg</span>
              </div>
            </div>
            <div className="bg-gray-950 p-3.5 rounded-xl border border-gray-800">
              <span className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Tỷ lệ tăng trưởng</span>
              <div className="text-xl font-black text-purple-400 flex items-baseline gap-1">
                +{progressData.summary?.growthPercentage || 0}%
              </div>
            </div>
            <div className="bg-gray-950 p-3.5 rounded-xl border border-gray-800">
              <span className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Số buổi đã ghi</span>
              <div className="text-xl font-black text-yellow-400">
                {progressData.summary?.totalSessionsLogged || 0} <span className="text-xs text-gray-400 font-medium">buổi</span>
              </div>
            </div>
          </div>

          <div className="h-72 w-full min-h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={progressData.timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis dataKey="date" stroke="#6b7280" fontSize={11} tickLine={false} />
                <YAxis stroke="#6b7280" fontSize={11} tickLine={false} domain={['dataMin - 5', 'dataMax + 10']} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#090d16', borderColor: '#374151', borderRadius: '12px', color: '#fff' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Line type="monotone" name="Mức tạ Max (kg)" dataKey="maxWeight" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', r: 4 }} />
                <Line type="monotone" name="1RM Ước tính (kg)" dataKey="estimatedOneRepMax" stroke="#6366f1" strokeWidth={2} strokeDasharray="5 5" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="py-12 flex flex-col items-center justify-center border-2 border-dashed border-gray-800 rounded-xl text-gray-500 text-sm">
          <Dumbbell className="w-10 h-10 mb-2 opacity-20 text-emerald-400" />
          Chưa có dữ liệu tăng trưởng mức tạ cho bài tập này.
        </div>
      )}
    </div>
  );
};

// ==========================================
// COMPONENT CHÍNH: ACTIVITY HISTORY
// ==========================================
export default function ActivityHistory() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dayData, setDayData] = useState({ diet: null, workout: null });
  const [isLoadingDay, setIsLoadingDay] = useState(false);
  const [apiError, setApiError] = useState(null);

  const formatDateToAPI = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const fetchDayData = async (date) => {
    setIsLoadingDay(true);
    setApiError(null);
    setDayData({ diet: null, workout: null });
    
    const dateString = formatDateToAPI(date);

    try {
      const [dietRes, workoutRes] = await Promise.allSettled([
        api.get(`/diet/date?date=${dateString}`),
        api.get(`/workout-logs/date?date=${dateString}`)
      ]);

      let extractedDiet = null;
      let extractedWorkout = null;

      // 1. Dữ liệu Diet
      if (dietRes.status === 'fulfilled' && dietRes.value?.data) {
        const raw = dietRes.value.data;
        extractedDiet = raw.data || raw.record || raw.diet || (raw.calories !== undefined ? raw : null);
      }

      // 2. Dữ liệu Workout
      if (workoutRes.status === 'fulfilled' && workoutRes.value?.data) {
        const raw = workoutRes.value.data;
        extractedWorkout = raw.data || raw.log || raw.workout || raw.record || (raw.exerciseMaxes || raw.exercises || raw.didWorkout !== undefined ? raw : null);
      }

      setDayData({ diet: extractedDiet, workout: extractedWorkout });
    } catch (err) {
      console.error("Lỗi lấy dữ liệu ngày:", err);
      setApiError("Không thể kết nối đến máy chủ.");
    } finally {
      setIsLoadingDay(false);
    }
  };

  useEffect(() => {
    fetchDayData(selectedDate);
  }, [selectedDate]);

  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const startDayOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; 

  const renderCalendar = () => {
    const days = [];
    const weekdays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    weekdays.forEach(day => {
      days.push(<div key={`wk-${day}`} className="text-center text-[10px] md:text-xs font-black text-gray-500 py-2 uppercase tracking-widest">{day}</div>);
    });

    for (let i = 0; i < startDayOffset; i++) {
      days.push(<div key={`empty-${i}`} className="p-2"></div>);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const dateOfCell = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i);
      const isSelected = selectedDate.getDate() === i && selectedDate.getMonth() === currentMonth.getMonth() && selectedDate.getFullYear() === currentMonth.getFullYear();
      const isToday = today.getTime() === dateOfCell.getTime();

      let cellStyle = "h-10 w-full rounded-xl flex items-center justify-center text-sm font-bold transition-all duration-200 border cursor-pointer ";

      if (isSelected) {
        cellStyle += "bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-transparent shadow-lg shadow-blue-500/30 transform scale-105";
      } else if (isToday) {
        cellStyle += "border-blue-500/50 text-blue-400 bg-blue-500/10 hover:bg-blue-500/20";
      } else {
        cellStyle += "border-transparent text-gray-400 hover:bg-gray-800 hover:text-white";
      }

      days.push(
        <button key={i} onClick={() => setSelectedDate(dateOfCell)} className={cellStyle}>
          {i}
        </button>
      );
    }
    return days;
  };

  return (
    <div className="bg-gray-950 min-h-screen text-gray-200 pb-12">
      <header className="bg-gray-900 border-b border-gray-800 p-5 sticky top-0 z-20 shadow-md">
        <div className="w-full px-4 md:px-8 lg:px-12">
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Activity className="w-6 h-6 text-purple-400" /> Bảng Điều Khiển Tổng Hợp
          </h1>
          <p className="text-gray-400 text-sm mt-1">Theo dõi nhật ký, cân nặng và biểu đồ sức mạnh của bạn.</p>
        </div>
      </header>

      <div className="w-full px-4 md:px-8 lg:px-12 py-8 flex flex-col gap-12">
        {/* SECTION 1: NHẬT KÝ THEO NGÀY */}
        <section>
          <div className="flex items-center gap-2 mb-6">
            <CalendarDays className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-bold text-white">Nhật Ký Hàng Ngày</h2>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Lịch */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-gray-900 p-5 rounded-2xl border border-gray-800 shadow-lg relative overflow-hidden">
                <div className="flex justify-between items-center mb-4 bg-gray-950 border border-gray-800 p-2 rounded-xl">
                  <button onClick={prevMonth} className="p-2 rounded-lg bg-gray-900 text-gray-400 hover:text-white"><ChevronLeft className="w-5 h-5" /></button>
                  <h2 className="text-sm font-bold text-white uppercase">Tháng {currentMonth.getMonth() + 1} / {currentMonth.getFullYear()}</h2>
                  <button onClick={nextMonth} className="p-2 rounded-lg bg-gray-900 text-gray-400 hover:text-white"><ChevronRight className="w-5 h-5" /></button>
                </div>
                <div className="grid grid-cols-7 gap-1.5 bg-gray-950/50 p-3 rounded-xl border border-gray-800">
                  {renderCalendar()}
                </div>
              </div>
            </div>

            {/* Chi tiết dữ liệu ngày */}
            <div className="lg:col-span-8">
              <div className="bg-gray-900 min-h-[450px] p-6 rounded-2xl border border-gray-800 shadow-lg flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-800">
                    <div>
                      <h3 className="text-blue-400 font-bold text-lg">Chi tiết ngày {selectedDate.toLocaleDateString('vi-VN')}</h3>
                    </div>
                    {isLoadingDay && <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />}
                  </div>

                  {apiError && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" /> {apiError}
                    </div>
                  )}

                  {!isLoadingDay && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* DINH DƯỠNG */}
                      <div className="bg-gray-950 border border-gray-800 rounded-2xl p-5">
                        <h3 className="text-sm font-bold text-gray-400 uppercase flex items-center gap-2 mb-4">
                          <Utensils className="text-orange-500 w-4 h-4" /> Dinh dưỡng đã nạp
                        </h3>
                        {dayData.diet ? (
                          <div className="space-y-4">
                            <div className="p-4 bg-gray-900 rounded-xl border border-gray-800 flex items-center gap-4">
                              <Flame className="text-orange-500 w-8 h-8" />
                              <div>
                                <span className="text-[10px] text-gray-500 font-bold block uppercase">Tổng Calories</span>
                                <div className="text-2xl font-black text-white">{Math.round(dayData.diet.calories || dayData.diet.totalCalories || 0)} <span className="text-xs text-orange-500">kcal</span></div>
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-center">
                              <div className="bg-gray-900 p-2 rounded-xl border border-gray-800"><div className="text-xs text-blue-400 font-bold">{Math.round(dayData.diet.protein || dayData.diet.totalProtein || 0)}g</div><div className="text-[9px] text-gray-500 uppercase">Protein</div></div>
                              <div className="bg-gray-900 p-2 rounded-xl border border-gray-800"><div className="text-xs text-yellow-400 font-bold">{Math.round(dayData.diet.carbs || dayData.diet.totalCarbs || 0)}g</div><div className="text-[9px] text-gray-500 uppercase">Carbs</div></div>
                              <div className="bg-gray-900 p-2 rounded-xl border border-gray-800"><div className="text-xs text-red-400 font-bold">{Math.round(dayData.diet.fat || dayData.diet.totalFat || 0)}g</div><div className="text-[9px] text-gray-500 uppercase">Fat</div></div>
                            </div>
                          </div>
                        ) : <div className="py-12 text-center text-gray-600 text-sm">Chưa lưu dữ liệu dinh dưỡng ngày này</div>}
                      </div>

                      {/* BÀI TẬP - TỐI ƯU HIỂN THỊ LỊCH SỬ TẬP */}
                      <div className="bg-gray-950 border border-gray-800 rounded-2xl p-5">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-sm font-bold text-gray-400 uppercase flex items-center gap-2">
                            <Dumbbell className="text-emerald-500 w-4 h-4" /> Kết quả tập luyện
                          </h3>
                          
                          {dayData.workout && (
                            dayData.workout.isCompleted ? (
                              <span className="flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 font-bold">
                                <Lock className="w-3 h-3" /> Đã hoàn thành
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-[11px] text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20 font-bold">
                                <Unlock className="w-3 h-3" /> Chưa khóa
                              </span>
                            )
                          )}
                        </div>

                        {(() => {
                          if (!dayData.workout) {
                            return <div className="py-12 text-center text-gray-600 text-sm">Chưa có bản ghi tập luyện ngày này</div>;
                          }

                          if (dayData.workout.didWorkout === false) {
                            return (
                              <div className="py-8 flex flex-col items-center justify-center text-center">
                                <Moon className="w-10 h-10 text-indigo-400 mb-2 opacity-80" />
                                <div className="text-sm font-bold text-gray-300">Hôm nay là Ngày Nghỉ!</div>
                                <p className="text-xs text-gray-500 mt-1">Nghỉ ngơi và hồi phục cơ bắp.</p>
                              </div>
                            );
                          }

                          // ƯU TIÊN BÓC TÁCH MẢNG exerciseMaxes NẾU CÓ
                          const exercises = dayData.workout.exerciseMaxes 
                                         || dayData.workout.exercises 
                                         || dayData.workout.workoutList 
                                         || dayData.workout.items 
                                         || [];

                          if (exercises.length > 0) {
                            return (
                              <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
                                {exercises.map((ex, idx) => {
                                  const sets = ex.setsPerformed || ex.sets || ex.setsData || [];
                                  const exerciseName = ex.exerciseId?.name || ex.exerciseName || ex.name || "Bài tập";
                                  const maxWeight = ex.maxWeight ?? ex.weight;
                                  const maxReps = ex.maxReps ?? ex.reps;

                                  return (
                                    <div key={idx} className="bg-gray-900 p-3 rounded-xl border border-gray-800 text-sm hover:border-gray-700 transition-colors">
                                      <div className="font-bold text-gray-200 flex items-center justify-between gap-2 mb-1.5">
                                        <span className="flex items-center gap-2">
                                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0"/>
                                          {exerciseName}
                                        </span>
                                        {ex.exerciseId?.muscleGroup && (
                                          <span className="text-[10px] font-semibold text-gray-400 bg-gray-950 px-2 py-0.5 rounded border border-gray-800">
                                            {ex.exerciseId.muscleGroup}
                                          </span>
                                        )}
                                      </div>
                                      
                                      <div className="text-xs text-gray-400 flex flex-wrap gap-1.5">
                                        {/* Trường hợp 1: Có dữ liệu Max Weight & Reps */}
                                        {maxWeight !== undefined && maxReps !== undefined ? (
                                          <span className="bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg text-xs font-mono text-emerald-400 font-bold flex items-center gap-1">
                                            🔥 Max: {maxWeight} kg × {maxReps} reps
                                          </span>
                                        ) : sets.length > 0 ? (
                                          /* Trường hợp 2: Có danh sách từng Hiệp (sets) */
                                          sets.map((s, sIdx) => (
                                            <span key={sIdx} className="bg-gray-950 px-2 py-1 rounded border border-gray-800 text-[11px] text-gray-300 font-mono">
                                              H{sIdx + 1}: <strong className="text-emerald-400">{s.weight}kg</strong> × {s.reps}
                                            </span>
                                          ))
                                        ) : (
                                          <span className="text-[11px] text-gray-500 italic">Đã ghi nhận hoàn thành</span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          }

                          return <div className="py-12 text-center text-gray-600 text-sm">Chưa có bản ghi tập luyện ngày này</div>;
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: CÂN NẶNG */}
        <section>
          <div className="flex items-center gap-2 mb-6 border-t border-gray-800 pt-8">
            <Scale className="w-6 h-6 text-purple-400" />
            <h2 className="text-xl font-bold text-white">Biến Động Trọng Lượng Cơ Thể</h2>
          </div>
          <WeightTracker />
        </section>

        {/* SECTION 3: TIẾN ĐỘ TĂNG TẠ */}
        <section>
          <div className="flex items-center gap-2 mb-6 border-t border-gray-800 pt-8">
            <ChartIcon className="w-6 h-6 text-emerald-400" />
            <h2 className="text-xl font-bold text-white">Phân Tích Tiến Độ Tập Luyện</h2>
          </div>
          <ExerciseProgressTracker />
        </section>
      </div>
    </div>
  );
}