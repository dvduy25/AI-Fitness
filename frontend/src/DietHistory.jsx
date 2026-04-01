import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  CalendarDays, ChevronLeft, ChevronRight, 
  Flame, Beef, Wheat, Droplet, Dumbbell, Utensils, Loader2, Activity, CheckCircle2 
} from 'lucide-react';

export default function ActivityHistory() {
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
    setDayData({ diet: null, workout: null });
    
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const dateString = formatDateToAPI(date);

      const [dietRes, workoutRes] = await Promise.allSettled([
        axios.get(`${API_BASE_URL}/api/diet/date?date=${dateString}`, config),
        axios.get(`${API_BASE_URL}/api/workout-logs/date?date=${dateString}`, config)
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

  useEffect(() => {
    fetchDayData(selectedDate);
  }, [selectedDate]);

  // ================= CÁC HÀM XỬ LÝ LỊCH =================
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const startDayOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; 

  const renderCalendar = () => {
    const days = [];
    const weekdays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
    
    // Đặt mốc 0h00 của ngày hôm nay để so sánh
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Header thứ trong tuần
    weekdays.forEach(day => {
      days.push(<div key={`wk-${day}`} className="text-center text-xs font-black text-gray-500 py-3 uppercase tracking-wider">{day}</div>);
    });

    // Ô trống đầu tháng
    for (let i = 0; i < startDayOffset; i++) {
      days.push(<div key={`empty-${i}`} className="p-2"></div>);
    }

    // Các ngày trong tháng
    for (let i = 1; i <= daysInMonth; i++) {
      const dateOfCell = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i);
      
      const isSelected = selectedDate.getDate() === i && selectedDate.getMonth() === currentMonth.getMonth() && selectedDate.getFullYear() === currentMonth.getFullYear();
      const isToday = today.getTime() === dateOfCell.getTime();
      const isPast = dateOfCell.getTime() < today.getTime(); // Kiểm tra ngày đã qua

      // Xử lý logic màu sắc chuyên nghiệp
      let cellStyle = "h-10 w-full rounded-xl flex items-center justify-center text-sm font-bold transition-all duration-300 ";

      if (isSelected) {
        // Ngày được chọn: Nếu là quá khứ thì Nền Đỏ, còn lại Nền Cam
        cellStyle += isPast 
          ? "bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-lg shadow-red-500/40 transform scale-105" 
          : "bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/40 transform scale-105";
      } else if (isToday) {
        // Ngày hôm nay (Không chọn)
        cellStyle += "border border-orange-500/50 text-orange-400 bg-orange-500/10 hover:bg-orange-500/20";
      } else if (isPast) {
        // Ngày đã qua (Màu đỏ nhạt)
        cellStyle += "text-red-400 hover:bg-red-500/15";
      } else {
        // Ngày tương lai
        cellStyle += "text-gray-400 hover:bg-gray-800 hover:text-white";
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
    <div className="min-h-screen bg-black text-gray-200 p-4 md:p-6 lg:p-8 pb-24 font-sans selection:bg-orange-500/30">
      
      {/* 1. HEADER (Đã bỏ nút Back, làm gọn và sang hơn) */}
      <div className="flex flex-col items-center justify-center mb-8 mt-2 space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-orange-500/20 to-rose-500/20 border border-orange-500/30 mb-2">
          <CalendarDays className="text-orange-500 w-6 h-6" />
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
          Nhật ký Hành trình
        </h1>
        <p className="text-gray-400 text-sm font-medium">Theo dõi chi tiết dinh dưỡng và tập luyện mỗi ngày</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 max-w-7xl mx-auto">
        
        {/* ================= CỘT TRÁI: LỊCH (CALENDAR) ================= */}
        <div className="lg:col-span-4">
          <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800 rounded-3xl p-5 md:p-6 shadow-2xl relative overflow-hidden">
            {/* Vệt sáng Decor */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="flex justify-between items-center mb-6 relative z-10">
              <button onClick={prevMonth} className="p-2 rounded-xl bg-gray-800/50 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors border border-gray-700/50"><ChevronLeft className="w-5 h-5" /></button>
              <h2 className="text-lg font-black text-white capitalize tracking-wide">
                Tháng {currentMonth.getMonth() + 1}, {currentMonth.getFullYear()}
              </h2>
              <button onClick={nextMonth} className="p-2 rounded-xl bg-gray-800/50 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors border border-gray-700/50"><ChevronRight className="w-5 h-5" /></button>
            </div>
            
            <div className="grid grid-cols-7 gap-1 md:gap-1.5 relative z-10">
              {renderCalendar()}
            </div>
            
            {/* Chú thích lịch */}
            <div className="mt-6 pt-4 border-t border-gray-800/50 flex flex-wrap gap-3 justify-center text-[10px] uppercase font-bold text-gray-500 tracking-wider">
               <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-400"></div> Đã qua</span>
               <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full border border-orange-500 bg-orange-500/20"></div> Hôm nay</span>
               <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-gray-600"></div> Sắp tới</span>
            </div>
          </div>
        </div>

        {/* ================= CỘT PHẢI: CHI TIẾT NGÀY ĐƯỢC CHỌN ================= */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Header hiển thị ngày đang chọn */}
          <div className="bg-gradient-to-r from-gray-900 to-gray-950 border border-gray-800 rounded-3xl p-6 md:p-8 flex items-center justify-between shadow-xl">
            <div>
              <p className="text-orange-500/80 text-xs md:text-sm font-bold uppercase tracking-widest mb-1.5">Báo cáo chi tiết</p>
              <h2 className="text-2xl md:text-3xl font-black text-white">
                {selectedDate.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
              </h2>
            </div>
            {isLoading && <Loader2 className="w-8 h-8 text-orange-500 animate-spin opacity-50" />}
          </div>

          {!isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* === CARD 1: LỊCH SỬ DINH DƯỠNG === */}
              <div className="bg-gray-900/60 backdrop-blur-lg border border-gray-800 rounded-3xl p-6 shadow-xl relative overflow-hidden flex flex-col hover:border-orange-500/30 transition-colors duration-500">
                <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-orange-500/5 rounded-full blur-3xl pointer-events-none"></div>
                
                <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-6">
                  <Utensils className="text-orange-500 w-4 h-4" /> Dinh dưỡng đã nạp
                </h3>

                {dayData.diet ? (
                  <div className="flex-1 flex flex-col justify-between">
                    <div className="flex items-center gap-5 mb-8">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-500/10 flex items-center justify-center border border-orange-500/20 shadow-inner">
                        <Flame className="text-orange-500 w-8 h-8" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Tổng Calories</span>
                        <div className="text-4xl font-black text-white leading-none mt-1">
                          {dayData.diet.calories || 0} <span className="text-lg font-bold text-orange-500/50">kcal</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-gray-950/50 rounded-2xl p-4 text-center border border-gray-800 shadow-inner">
                        <Beef className="w-5 h-5 text-blue-400 mx-auto mb-2 opacity-80" />
                        <div className="text-[10px] text-gray-500 uppercase font-black tracking-wider">Protein</div>
                        <div className="font-black text-white text-lg">{dayData.diet.protein || 0}g</div>
                      </div>
                      <div className="bg-gray-950/50 rounded-2xl p-4 text-center border border-gray-800 shadow-inner">
                        <Wheat className="w-5 h-5 text-emerald-400 mx-auto mb-2 opacity-80" />
                        <div className="text-[10px] text-gray-500 uppercase font-black tracking-wider">Carbs</div>
                        <div className="font-black text-white text-lg">{dayData.diet.carbs || 0}g</div>
                      </div>
                      <div className="bg-gray-950/50 rounded-2xl p-4 text-center border border-gray-800 shadow-inner">
                        <Droplet className="w-5 h-5 text-yellow-400 mx-auto mb-2 opacity-80" />
                        <div className="text-[10px] text-gray-500 uppercase font-black tracking-wider">Fat</div>
                        <div className="font-black text-white text-lg">{dayData.diet.fat || 0}g</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center py-10 text-gray-600 border-2 border-dashed border-gray-800 rounded-2xl">
                    <Utensils className="w-10 h-10 mb-3 opacity-30" />
                    <p className="text-sm font-medium">Không có dữ liệu ăn uống</p>
                  </div>
                )}
              </div>

              {/* === CARD 2: LỊCH SỬ TẬP LUYỆN === */}
              <div className="bg-gray-900/60 backdrop-blur-lg border border-gray-800 rounded-3xl p-6 shadow-xl relative overflow-hidden flex flex-col hover:border-blue-500/30 transition-colors duration-500">
                <div className="absolute -left-10 -top-10 w-40 h-40 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>
                
                <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-6">
                  <Dumbbell className="text-blue-500 w-4 h-4" /> Bài tập hoàn thành
                </h3>

                {dayData.workout && dayData.workout.exercises && dayData.workout.exercises.length > 0 ? (
                  <div className="space-y-4 max-h-[320px] overflow-y-auto pr-2 custom-scrollbar">
                    {dayData.workout.exercises.map((ex, index) => (
                      <div key={index} className="bg-gray-950/50 p-4 md:p-5 rounded-2xl border border-gray-800 shadow-inner group hover:border-blue-500/40 transition-colors">
                        <div className="font-black text-gray-200 mb-3 flex justify-between items-center gap-3">
                          <span className="truncate flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                            {ex.exerciseId?.name || "Bài tập"}
                          </span> 
                          <span className="text-[10px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-400 px-2.5 py-1 rounded-md border border-blue-500/20 shrink-0">
                            {ex.setsPerformed?.length || 0} Hiệp
                          </span>
                        </div>
                        
                        <div className="space-y-1.5">
                          {ex.setsPerformed?.map((set, sIdx) => (
                            <div key={sIdx} className="flex justify-between items-center text-xs text-gray-400 bg-gray-900 px-3 py-2 rounded-lg border border-gray-800/80">
                              <span className="font-bold">Hiệp {set.setNumber}</span>
                              <div className="flex gap-4">
                                <span><strong className="text-white">{set.weight}</strong> kg</span>
                                <span><strong className="text-white">{set.reps}</strong> reps</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center py-10 text-gray-600 border-2 border-dashed border-gray-800 rounded-2xl">
                    <Activity className="w-10 h-10 mb-3 opacity-30" />
                    <p className="text-sm font-medium">Ngày nghỉ / Chưa có dữ liệu</p>
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