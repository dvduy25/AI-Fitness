import React from 'react';
import { X, TrendingUp, Loader2 } from 'lucide-react';

export default function WeightPromptModal({ isOpen, onClose, weight, setWeight, onSubmit, isSubmitting }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-gray-900 w-full max-w-sm rounded-2xl border border-gray-800 shadow-2xl overflow-hidden">
        <div className="flex justify-between items-center p-5 border-b border-gray-800">
          <h3 className="font-bold text-lg text-emerald-400 flex items-center gap-2">
            <TrendingUp className="w-5 h-5"/> Cập nhật cân nặng
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 p-1.5 rounded-full">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5">
          <label className="block text-sm text-gray-400 mb-2">Cân nặng hiện tại (kg)</label>
          <input
            type="number"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            autoFocus
            className="w-full bg-gray-950 border border-gray-700 rounded-xl p-3 text-white text-lg focus:border-emerald-500 outline-none"
            placeholder="VD: 65.5"
          />
        </div>
        <div className="p-5 border-t border-gray-800 bg-gray-900/50 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 bg-gray-800 border border-gray-700 rounded-xl text-sm font-semibold text-gray-300">
            Hủy
          </button>
          <button onClick={onSubmit} disabled={isSubmitting} className="flex-1 py-3 bg-emerald-600 rounded-xl text-sm font-bold text-white flex justify-center items-center">
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Cập nhật"}
          </button>
        </div>
      </div>
    </div>
  );
}