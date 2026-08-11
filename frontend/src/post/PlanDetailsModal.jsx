import React from 'react';
import { Activity, Utensils, X, Clock, Flame } from 'lucide-react';

const PlanDetailsModal = ({ plan, onClose }) => {
  if (!plan) return null;
  const { type, data } = plan;

  const getExerciseName = (ex) => {
    if (!ex) return "Bài tập";
    if (ex.exerciseId && typeof ex.exerciseId === 'object') return ex.exerciseId.name || ex.exerciseId.title || "Bài tập";
    if (ex.exercise && typeof ex.exercise === 'object') return ex.exercise.name || ex.exercise.title || "Bài tập";
    return ex.name || ex.title || "Bài tập";
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
        <div className={`p-4 flex items-center justify-between border-b ${type === 'workout' ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-yellow-500/30 bg-yellow-500/5'}`}>
          <div className="flex items-center gap-3">
            {type === 'workout' ? <Activity className="text-emerald-400 w-6 h-6" /> : <Utensils className="text-yellow-400 w-6 h-6" />}
            <h2 className="text-lg font-bold text-white">
              {type === 'workout' ? 'Chi tiết Lịch Tập' : 'Chi tiết Thực Đơn'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto custom-scrollbar flex-1 space-y-4">
          {type === 'workout' && data.weeklySchedule && (
            <div className="space-y-4">
              {data.weeklySchedule.map((day, idx) => (
                <div key={idx} className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-bold text-emerald-400">{day.dayOfWeek || `Ngày ${idx + 1}`}</h3>
                    {day.isRestDay ? (
                      <span className="text-xs px-2 py-1 bg-gray-700 text-gray-300 rounded-md">Ngày nghỉ</span>
                    ) : (
                      <span className="text-xs text-gray-400 flex items-center gap-1"><Clock className="w-3 h-3"/> {day.durationEstimated || 0} phút</span>
                    )}
                  </div>
                  
                  {!day.isRestDay && day.exercises?.length > 0 ? (
                    <div className="space-y-2">
                      {day.exercises.map((ex, exIdx) => (
                        <div key={exIdx} className="bg-gray-900 p-3 rounded-lg text-sm flex justify-between items-center border border-gray-800">
                          <div>
                            <p className="font-semibold text-gray-200">{getExerciseName(ex)}</p>
                            <p className="text-xs text-gray-500 mt-1">Nghỉ: {ex.restTimeInSeconds || 0}s</p>
                          </div>
                          <div className="text-right">
                            <p className="text-emerald-400 font-bold">{ex.sets} Hiệp</p>
                            <p className="text-gray-400 text-xs">{ex.reps} Reps</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    !day.isRestDay && <p className="text-sm text-gray-500 italic">Không có bài tập nào.</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {type === 'workout' && !data.weeklySchedule && data.exercises && (
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-emerald-400">Danh sách bài tập</h3>
              </div>
              <div className="space-y-2">
                {data.exercises.map((ex, exIdx) => (
                  <div key={exIdx} className="bg-gray-900 p-3 rounded-lg text-sm flex justify-between items-center border border-gray-800">
                    <div>
                      <p className="font-semibold text-gray-200">{getExerciseName(ex)}</p>
                      <p className="text-xs text-gray-500 mt-1">Nghỉ: {ex.restTimeInSeconds || 0}s</p>
                    </div>
                    <div className="text-right">
                      <p className="text-emerald-400 font-bold">{ex.sets} Hiệp</p>
                      <p className="text-gray-400 text-xs">{ex.reps} Reps</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {type === 'diet' && data.dailyTotal && (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-2 text-center mb-4">
                <div className="bg-gray-800 rounded-lg p-2 border border-gray-700">
                  <p className="text-xs text-gray-400 mb-1">Calo</p>
                  <p className="font-bold text-yellow-400 text-sm flex items-center justify-center gap-1"><Flame className="w-3 h-3"/> {data.dailyTotal.calories}</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-2 border border-gray-700">
                  <p className="text-xs text-gray-400 mb-1">Pro</p>
                  <p className="font-bold text-blue-400 text-sm">{data.dailyTotal.protein}g</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-2 border border-gray-700">
                  <p className="text-xs text-gray-400 mb-1">Carb</p>
                  <p className="font-bold text-green-400 text-sm">{data.dailyTotal.carbs}g</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-2 border border-gray-700">
                  <p className="text-xs text-gray-400 mb-1">Fat</p>
                  <p className="font-bold text-red-400 text-sm">{data.dailyTotal.fat}g</p>
                </div>
              </div>

              {data.meals?.map((meal, idx) => (
                <div key={idx} className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
                  <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-700">
                    <h3 className="font-bold text-yellow-400">{meal.mealType} <span className="text-xs text-gray-500 font-normal ml-2">({meal.scheduledTime})</span></h3>
                    <span className="text-xs font-bold text-gray-300">{meal.mealTotal?.calories || 0} kcal</span>
                  </div>
                  <div className="space-y-2">
                    {meal.items?.map((item, iIdx) => (
                      <div key={iIdx} className="flex justify-between text-sm">
                        <p className="text-gray-300">{item.foodName} <span className="text-gray-500">x{item.quantityInGrams}g</span></p>
                        <p className="text-gray-400">{item.calories} kcal</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlanDetailsModal;