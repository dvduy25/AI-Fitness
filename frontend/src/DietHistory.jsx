import api from "./services/api";
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  CalendarDays, ChevronLeft, ChevronRight, 
  Flame, Beef, Wheat, Droplet, Dumbbell, Utensils, Loader2, Activity, CheckCircle2 
} from 'lucide-react';

export default function ActivityHistory() {
  
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
        api.get(`/diet/date?date=${dateString}`, config),
        api.get(`/workout-logs/date?date=${dateString}`, config)
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
      days.push(<div key={`wk-${day}`} className="text-center text-[10px] md:text-xs font-black text-gray-500 py-2 uppercase tracking-widest">{day}</div>);
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
      const isPast = dateOfCell.getTime() < today.getTime();

      let cellStyle = "h-10 w-full rounded-xl flex items-center justify-center text-sm font-bold transition-all duration-200 border ";

      if (isSelected) {
        cellStyle += "bg-gradient-to-br from-purple-500 to-indigo-600 text-white border-transparent shadow-lg shadow-purple-500/30 transform scale-105";
      } else if (isToday) {
        cellStyle += "border-purple-500/50 text-purple-400 bg-purple-500/10 hover:bg-purple-500/20";
      } else if (isPast) {
        cellStyle += "border-transparent text-gray-400 hover:bg-gray-800 hover:text-white";
      } else {
        cellStyle += "border-transparent text-gray-600 hover:bg-gray-900/50 hover:text-gray-300";
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
      
      {/* HEADER ĐỒNG BỘ VỚI TRANG MEAL/WORKOUT PLAN */}
      <header className="bg-gray-900 border-b border-gray-800 p-5 sticky top-0 z-20 shadow-md">
        <div className="w-full px-4 md:px-8 lg:px-12 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <CalendarDays className="w-6 h-6 text-purple-400" /> Nhật Ký Hành Trình
            </h1>
            <p className="text-sm text-gray-400 mt-1 hidden sm:block">
              Theo dõi chi tiết lịch sử dinh dưỡng và tập luyện mỗi ngày của bạn.
            </p>
          </div>
        </div>
      </header>

      <div className="w-full px-4 md:px-8 lg:px-12 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* ================= CỘT TRÁI: BỘ ĐIỀU KHIỂN LỊCH ================= */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-gray-900 p-5 rounded-2xl border border-gray-800 shadow-lg relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-400" /> Tra cứu dữ liệu
              </h2>

              <div className="flex justify-between items-center mb-4 relative z-10 bg-gray-950 border border-gray-800 p-2 rounded-xl">
                <button onClick={prevMonth} className="p-2 rounded-lg bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"><ChevronLeft className="w-5 h-5" /></button>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  Tháng {currentMonth.getMonth() + 1} / {currentMonth.getFullYear()}
                </h2>
                <button onClick={nextMonth} className="p-2 rounded-lg bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"><ChevronRight className="w-5 h-5" /></button>
              </div>
              
              <div className="grid grid-cols-7 gap-1.5 relative z-10 bg-gray-950/50 p-3 rounded-xl border border-gray-800 shadow-inner">
                {renderCalendar()}
              </div>
              
              {/* Chú thích lịch */}
              <div className="mt-5 flex flex-wrap gap-4 justify-center text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                 <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full border border-purple-500 bg-purple-500/20"></div> Hôm nay</span>
                 <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-purple-500"></div> Đang chọn</span>
              </div>
            </div>
          </div>

          {/* ================= CỘT PHẢI: CHI TIẾT NGÀY ================= */}
          <div className="lg:col-span-8">
            <div className="bg-gray-900 min-h-[500px] p-4 md:p-6 rounded-2xl border border-gray-800 shadow-lg flex flex-col">
              
              {/* Header của cột bên phải */}
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-800">
                <div>
                  <h3 className="text-purple-400 font-bold flex items-center gap-2 text-lg">
                    <CalendarDays className="w-5 h-5"/> Báo cáo ngày
                  </h3>
                  <p className="text-sm text-gray-300 mt-1 font-bold">
                    {selectedDate.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </p>
                </div>
                {isLoading && <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />}
              </div>

              {/* NỘI DUNG HIỂN THỊ */}
              {!isLoading && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
                  
                  {/* CARD 1: DINH DƯỠNG */}
                  <div className="bg-gray-950 border border-gray-800 rounded-2xl p-5 flex flex-col hover:border-orange-500/30 transition-all shadow-inner">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide flex items-center gap-2 mb-6">
                      <Utensils className="text-orange-500 w-4 h-4" /> Dinh dưỡng đã nạp
                    </h3>

                    {dayData.diet ? (
                      <div className="flex-1 flex flex-col">
                        <div className="flex items-center gap-4 mb-6 p-4 bg-gray-900 rounded-xl border border-gray-800">
                          <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20 shrink-0">
                            <Flame className="text-orange-500 w-6 h-6" />
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Tổng Calories</span>
                            <div className="text-2xl font-black text-white leading-none">
                              {Math.round(dayData.diet.calories || 0)} <span className="text-xs font-bold text-orange-500/50">kcal</span>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 mt-auto">
                          <div className="bg-gray-900 p-2 rounded-xl border border-gray-800 text-center">
                            <Beef className="w-4 h-4 text-blue-400 mx-auto mb-1.5 opacity-80" />
                            <div className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Protein</div>
                            <div className="font-bold text-blue-400 text-base">{Math.round(dayData.diet.protein || 0)}g</div>
                          </div>
                          <div className="bg-gray-900 p-2 rounded-xl border border-gray-800 text-center">
                            <Wheat className="w-4 h-4 text-yellow-400 mx-auto mb-1.5 opacity-80" />
                            <div className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Carbs</div>
                            <div className="font-bold text-yellow-400 text-base">{Math.round(dayData.diet.carbs || 0)}g</div>
                          </div>
                          <div className="bg-gray-900 p-2 rounded-xl border border-gray-800 text-center">
                            <Droplet className="w-4 h-4 text-red-400 mx-auto mb-1.5 opacity-80" />
                            <div className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Fat</div>
                            <div className="font-bold text-red-400 text-base">{Math.round(dayData.diet.fat || 0)}g</div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center py-10 text-gray-600 border-2 border-dashed border-gray-800 rounded-xl bg-gray-900/30">
                        <Utensils className="w-8 h-8 mb-2 opacity-30" />
                        <p className="text-sm font-medium">Chưa lưu dinh dưỡng</p>
                      </div>
                    )}
                  </div>

                  {/* CARD 2: TẬP LUYỆN */}
                  <div className="bg-gray-950 border border-gray-800 rounded-2xl p-5 flex flex-col hover:border-emerald-500/30 transition-all shadow-inner">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide flex items-center gap-2 mb-6">
                      <Dumbbell className="text-emerald-500 w-4 h-4" /> Bài tập hoàn thành
                    </h3>

                    {dayData.workout && dayData.workout.exercises && dayData.workout.exercises.length > 0 ? (
                      <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar flex-1">
                        {dayData.workout.exercises.map((ex, index) => (
                          <div key={index} className="bg-gray-900 p-3 rounded-xl border border-gray-800 group hover:border-emerald-500/40 transition-colors">
                            <div className="font-bold text-gray-200 mb-2 flex justify-between items-center gap-2">
                              <span className="truncate flex items-center gap-2 text-sm">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                {ex.exerciseId?.name || "Bài tập"}
                              </span> 
                              <span className="text-[9px] font-black uppercase bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded border border-emerald-500/20 shrink-0">
                                {ex.setsPerformed?.length || 0} Hiệp
                              </span>
                            </div>
                            
                            <div className="space-y-1">
                              {ex.setsPerformed?.map((set, sIdx) => (
                                <div key={sIdx} className="flex justify-between items-center text-xs text-gray-400 bg-gray-950 px-2 py-1.5 rounded border border-gray-800/50">
                                  <span className="font-medium">Hiệp {set.setNumber}</span>
                                  <div className="flex gap-3">
                                    <span><strong className="text-white">{set.weight}</strong> kg</span>
                                    <span><strong className="text-emerald-400">{set.reps}</strong> reps</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center py-10 text-gray-600 border-2 border-dashed border-gray-800 rounded-xl bg-gray-900/30">
                        <Activity className="w-8 h-8 mb-2 opacity-30" />
                        <p className="text-sm font-medium">Chưa có bản ghi tập luyện</p>
                      </div>
                    )}
                  </div>

                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}