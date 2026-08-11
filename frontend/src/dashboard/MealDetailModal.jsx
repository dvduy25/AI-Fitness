import React from 'react';
import { X, Utensils, Sparkles } from 'lucide-react';

export default function MealDetailModal({ meal, onClose }) {
  if (!meal) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-3 md:p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-gray-900 w-full max-w-md rounded-2xl md:rounded-3xl border border-gray-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 md:p-5 border-b border-gray-800 bg-gray-900/50 shrink-0">
          <h3 className="font-black text-white text-base md:text-xl flex items-center gap-2 truncate">
            <Utensils className="w-5 h-5 text-emerald-500 shrink-0" />
            <span className="truncate">Chi tiết {meal.mealType}</span>
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 p-1.5 md:p-2 rounded-full transition-colors shrink-0 ml-2">
            <X className="w-4 h-4 md:w-5 md:h-5" />
          </button>
        </div>

        <div className="p-4 md:p-5 overflow-y-auto custom-scrollbar">
          <div className="flex flex-col items-center justify-center py-4 bg-emerald-900/10 border border-emerald-500/20 rounded-2xl mb-5">
            <span className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Tổng Năng Lượng</span>
            <span className="text-emerald-400 font-black text-4xl">{meal.mealTotal?.calories || 0} <span className="text-lg text-emerald-500/50 font-semibold">kcal</span></span>
          </div>

          <div className="flex gap-3 mb-6">
            <div className="flex-1 bg-gray-800/50 p-3 rounded-xl border border-gray-700/50 text-center">
              <span className="block text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Protein</span>
              <span className="font-black text-blue-400 text-lg">{meal.mealTotal?.protein || 0}g</span>
            </div>
            <div className="flex-1 bg-gray-800/50 p-3 rounded-xl border border-gray-700/50 text-center">
              <span className="block text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Carbs</span>
              <span className="font-black text-yellow-400 text-lg">{meal.mealTotal?.carbs || 0}g</span>
            </div>
            <div className="flex-1 bg-gray-800/50 p-3 rounded-xl border border-gray-700/50 text-center">
              <span className="block text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Fat</span>
              <span className="font-black text-red-400 text-lg">{meal.mealTotal?.fat || 0}g</span>
            </div>
          </div>

          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-purple-400" />
            Danh sách món ăn
          </h4>

          <div className="space-y-2.5">
            {meal.items && meal.items.length > 0 ? (
              meal.items.map((item, i) => (
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
          <button onClick={onClose} className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl transition-colors">Đóng</button>
        </div>
      </div>
    </div>
  );
}