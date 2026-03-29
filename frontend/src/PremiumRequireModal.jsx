import React from 'react';
import { Crown, PlaySquare, X, Lock, Sparkles } from 'lucide-react';

export default function PremiumRequireModal({ isOpen, onClose, onWatchAd, onUpgrade, isLoadingAd }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center px-4">
      {/* Lớp nền đen mờ (Overlay) - Bấm vào nền cũng sẽ đóng Modal */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      {/* Nội dung Modal */}
      <div className="relative bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl transform transition-all animate-in fade-in zoom-in-95 duration-200">
        
        {/* Nút Tắt (X) */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Tiêu đề & Icon */}
        <div className="text-center mb-8">
          <div className="relative inline-flex items-center justify-center w-20 h-20 bg-gradient-to-tr from-yellow-100 to-yellow-50 rounded-full mb-4 shadow-inner">
            <Lock className="w-10 h-10 text-yellow-600 absolute" />
            <Sparkles className="w-5 h-5 text-yellow-400 absolute top-2 right-2 animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Tính năng Đặc Quyền!</h2>
          <p className="text-gray-500 text-sm px-2">
            Bạn đã hết vé AI miễn phí. Để tiếp tục sử dụng, vui lòng chọn 1 trong 2 cách dưới đây:
          </p>
        </div>

        {/* Các nút hành động */}
        <div className="space-y-4">
          
          {/* Lựa chọn 1: Xem Quảng Cáo */}
          <button 
            onClick={onWatchAd}
            disabled={isLoadingAd}
            className="w-full relative group overflow-hidden bg-white border-2 border-indigo-100 hover:border-indigo-500 text-indigo-600 rounded-2xl p-4 flex items-center justify-between transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            <div className="flex items-center">
              <div className="bg-indigo-100 text-indigo-600 p-2 rounded-xl mr-4 group-hover:scale-110 transition-transform">
                <PlaySquare className="w-6 h-6" />
              </div>
              <div className="text-left">
                <p className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">Xem 1 Quảng Cáo</p>
                <p className="text-xs text-gray-500">Nhận ngay +1 vé AI miễn phí</p>
              </div>
            </div>
            {isLoadingAd ? (
              <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <span className="text-indigo-600 font-semibold text-sm">Miễn phí</span>
            )}
          </button>

          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-gray-200"></div>
            <span className="flex-shrink-0 mx-4 text-gray-400 text-xs font-medium uppercase">Hoặc</span>
            <div className="flex-grow border-t border-gray-200"></div>
          </div>

          {/* Lựa chọn 2: Mua Premium */}
          <button 
            onClick={onUpgrade}
            className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white rounded-2xl p-4 flex items-center justify-between shadow-lg shadow-yellow-500/30 transition-all duration-300 transform hover:-translate-y-1"
          >
            <div className="flex items-center">
              <div className="bg-white/20 p-2 rounded-xl mr-4">
                <Crown className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <p className="font-bold text-white">Nâng cấp Premium</p>
                <p className="text-xs text-yellow-100">Dùng thả ga không giới hạn</p>
              </div>
            </div>
            <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full">Khuyên dùng</span>
          </button>

        </div>
      </div>
    </div>
  );
}