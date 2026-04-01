import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, CalendarDays, ChevronLeft, ChevronRight, 
  Flame, Beef, Wheat, Droplet, Dumbbell, Utensils, Loader2, Activity 
} from 'lucide-react';

export default function ActivityHistory() {
  const navigate = useNavigate();
  const API_BASE_URL = 'https://ai-fitness-w6fd.onrender.com';
  
  // State quản lý Lịch
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // State quản lý Dữ liệu của ngày được chọn
  const [dayData, setDayData] = useState({ diet: null, workout: null });
  const [isLoading, setIsLoading] = useState(false);

  // Helper: Định dạng ngày thành YYYY-MM-DD để gửi lên API
  const formatDateToAPI = (date) => {
    const d = new Date(date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  };

  // Lấy dữ liệu khi người dùng bấm vào 1 ngày
  const fetchDayData = async (date) => {
    setIsLoading(true);
    setDayData({ diet: null, workout: null }); // Reset data cũ
    
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const dateString = formatDateToAPI(date);

      // Gọi song song 2 API: Dinh dưỡng & Tập luyện của ngày đó
      // LƯU Ý: Bạn cần đảm bảo Backend có 2 endpoint hỗ trợ query theo ngày (date)
      const [dietRes, workoutRes] = await Promise.allSettled([
        axios.get(`${API_BASE_URL}/api/diet/date?date=${dateString}`, config),
        axios.get(`${API_BASE_URL}/api/workout-logs/date?date=${dateString}`, config) // Endpoint lấy lịch sử tập theo ngày
      ]);

      let newDietData = null;
      let newWorkoutData = null;

      if (dietRes.status === 'fulfilled' && dietRes.value.data) {
        newDietData = dietRes.value.data.data || dietRes.value.data.record;
      }
      
      if (workoutRes.status === 'fulfilled' && workoutRes.value.data) {
        newWorkoutData = workoutRes.value.data.data || workoutRes.value.data.log;
      }

      setDayData({ diet: newDietData, workout: newWorkoutData });
    } catch (err) {
      console.error("Lỗi lấy dữ liệu ngày:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Cập nhật dữ liệu mỗi khi đổi ngày
  useEffect(() => {
    fetchDayData(selectedDate);
  }, [selectedDate]);

  // ================= CÁC HÀM XỬ LÝ LỊCH =================
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  // Chuyển Chủ nhật (0) thành ngày cuối tuần để Thứ 2 là đầu tuần
  const startDayOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; 

  const renderCalendar = () => {
    const days = [];
    const weekdays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

    // Header thứ trong tuần
    weekdays.forEach(day => {
      days.push(<div key={`wk-${day}`} className="text-center text-xs font-bold text-gray-500 py-2">{day}</div>);
    });

    // Ô trống đầu tháng
    for (let i = 0; i < startDayOffset; i++) {
      days.push(<div key={`empty-${i}`} className="p-2"></div>);
    }

    // Các ngày trong tháng
    for (let i = 1; i <= daysInMonth; i++) {
      const dateOfCell = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i);
      const isSelected = selectedDate.getDate() === i && selectedDate.getMonth() === currentMonth.getMonth() && selectedDate.getFullYear() === currentMonth.getFullYear();
      const isToday = new Date().getDate() === i && new Date().getMonth() === currentMonth.getMonth() && new Date().getFullYear() === currentMonth.getFullYear();

      days.push(
        <button
          key={i}
          onClick={() => setSelectedDate(dateOfCell)}
          className={`h-10 w-full rounded-xl flex items-center justify-center text-sm font-medium transition-all ${
            isSelected 
              ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' 
              : isToday 
                ? 'bg-gray-800 text-orange-400 border border-orange-500/50' 
                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
          }`}
        >
          {i}
        </button>
      );
    }
    return days;
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8 pb-20">
      {/* 1. THANH ĐIỀU HƯỚNG */}
      <div className="flex items-center justify-between mb-6 sticky top-0 bg-black/80 backdrop-blur-md py-4 z-10">
        <button onClick={() => navigate(-1)} className="p-2 bg-gray-900 border border-gray-800 rounded-xl hover:bg-gray-800 transition-colors">
          <ArrowLeft className="w-6 h-6 text-gray-300" />
        </button>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <CalendarDays className="text-orange-500" />
          Nhật ký Hành trình
        </h1>
        <div className="w-10"></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ================= CỘT TRÁI: LỊCH (CALENDAR) ================= */}
        <div className="lg:col-span-1">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-5 shadow-lg">
            <div className="flex justify-between items-center mb-6">
              <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-800 text-gray-400"><ChevronLeft className="w-5 h-5" /></button>
              <h2 className="text-lg font-bold text-white capitalize">
                Tháng {currentMonth.getMonth() + 1}, {currentMonth.getFullYear()}
              </h2>
              <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-800 text-gray-400"><ChevronRight className="w-5 h-5" /></button>
            </div>
            
            <div className="grid grid-cols-7 gap-1">
              {renderCalendar()}
            </div>
          </div>
        </div>

        {/* ================= CỘT PHẢI: CHI TIẾT NGÀY ĐƯỢC CHỌN ================= */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-gray-900/50 border border-gray-800 rounded-3xl p-5 flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Chi tiết hoạt động ngày</p>
              <h2 className="text-2xl font-bold text-white">
                {selectedDate.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
              </h2>
            </div>
            {isLoading && <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />}
          </div>

          {!isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* === CARD 1: LỊCH SỬ DINH DƯỠNG === */}
              <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-lg relative overflow-hidden">
                <div className="absolute -right-6 -top-6 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl"></div>
                
                <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-6">
                  <Utensils className="text-orange-500 w-5 h-5" />
                  Dinh dưỡng đã nạp
                </h3>

                {dayData.diet ? (
                  <>
                    <div className="flex items-center gap-4 mb-6 bg-black/40 p-4 rounded-2xl border border-gray-800">
                      <div className="w-14 h-14 rounded-xl bg-orange-500/20 flex items-center justify-center border border-orange-500/30">
                        <Flame className="text-orange-500 w-7 h-7" />
                      </div>
                      <div>
                        <span className="text-xs text-gray-400">Tổng Calories</span>
                        <div className="text-2xl font-black text-white">{dayData.diet.calories || 0} <span className="text-base font-normal text-gray-500">kcal</span></div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-gray-800/50 rounded-xl p-3 text-center border border-gray-700/50">
                        <Beef className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                        <div className="text-[10px] text-gray-400 uppercase font-bold">Protein</div>
                        <div className="font-bold text-white">{dayData.diet.protein || 0}g</div>
                      </div>
                      <div className="bg-gray-800/50 rounded-xl p-3 text-center border border-gray-700/50">
                        <Wheat className="w-5 h-5 text-green-400 mx-auto mb-1" />
                        <div className="text-[10px] text-gray-400 uppercase font-bold">Carbs</div>
                        <div className="font-bold text-white">{dayData.diet.carbs || 0}g</div>
                      </div>
                      <div className="bg-gray-800/50 rounded-xl p-3 text-center border border-gray-700/50">
                        <Droplet className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
                        <div className="text-[10px] text-gray-400 uppercase font-bold">Fat</div>
                        <div className="font-bold text-white">{dayData.diet.fat || 0}g</div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-gray-500">
                    <Utensils className="w-10 h-10 mb-3 opacity-20" />
                    <p className="text-sm">Không có dữ liệu ăn uống</p>
                  </div>
                )}
              </div>

              {/* === CARD 2: LỊCH SỬ TẬP LUYỆN === */}
              <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-lg relative overflow-hidden">
                <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl"></div>
                
                <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-6">
                  <Dumbbell className="text-blue-500 w-5 h-5" />
                  Bài tập đã hoàn thành
                </h3>

                {dayData.workout && dayData.workout.exercises && dayData.workout.exercises.length > 0 ? (
                  <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {dayData.workout.exercises.map((ex, index) => (
                      <div key={index} className="bg-black/40 p-4 rounded-2xl border border-gray-800">
                        <div className="font-bold text-white mb-2 flex justify-between">
                          {/* Nếu backend populate exerciseId thì dùng ex.exerciseId.name, nếu không thì hiện ID */}
                          <span>{ex.exerciseId?.name || "Bài tập"}</span> 
                          <span className="text-xs bg-blue-600/20 text-blue-400 px-2 py-1 rounded-md">
                            {ex.setsPerformed?.length || 0} Hiệp
                          </span>
                        </div>
                        
                        {/* Chi tiết từng Set (Dựa theo Model của bạn) */}
                        <div className="space-y-1">
                          {ex.setsPerformed?.map((set, sIdx) => (
                            <div key={sIdx} className="flex justify-between text-sm text-gray-400 bg-gray-800/30 px-3 py-1.5 rounded-lg">
                              <span>Hiệp {set.setNumber}</span>
                              <div className="flex gap-4">
                                <span className="font-medium text-white">{set.weight} kg</span>
                                <span className="font-medium text-white">{set.reps} reps</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-gray-500">
                    <Activity className="w-10 h-10 mb-3 opacity-20" />
                    <p className="text-sm">Ngày nghỉ / Không có dữ liệu tập</p>
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}