import React, { useState, useEffect } from 'react';
import { Settings, ShieldAlert, Power, Loader2 } from 'lucide-react';

const MaintenanceManager = () => {
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  // 1. Lấy trạng thái hiện tại khi vừa mở trang
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/system/maintenance");
        const data = await res.json();
        if (data.success) {
          setIsMaintenance(data.isMaintenance);
        }
      } catch (error) {
        console.error("Lỗi khi lấy trạng thái bảo trì:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStatus();
  }, []);

  // 2. Hàm xử lý khi bấm nút bật/tắt
  const handleToggle = async () => {
    // Hỏi lại cho chắc chắn để tránh bấm nhầm
    const confirmMsg = isMaintenance 
      ? "Bạn có chắc chắn muốn TẮT bảo trì? Người dùng sẽ có thể truy cập lại hệ thống ngay lập tức." 
      : "Bạn có chắc chắn muốn BẬT bảo trì? Tất cả người dùng hiện tại sẽ bị đăng xuất và không thể thao tác.";
      
    if (!window.confirm(confirmMsg)) return;

    setIsUpdating(true);
    try {
      const res = await fetch("http://localhost:5000/api/system/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: !isMaintenance })
      });
      
      const data = await res.json();
      if (data.success) {
        setIsMaintenance(data.isMaintenance);
        alert(data.message);
      } else {
        alert("Có lỗi xảy ra: " + data.message);
      }
    } catch (error) {
      alert("Không thể kết nối đến server!");
      console.error(error);
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin" /> Đang tải trạng thái...
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 max-w-lg shadow-xl relative overflow-hidden">
      {/* Background Effect */}
      {isMaintenance && (
        <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
      )}

      <div className="flex items-start justify-between mb-6 relative z-10">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-xl ${isMaintenance ? 'bg-red-500/20 text-red-500' : 'bg-emerald-500/20 text-emerald-500'}`}>
            {isMaintenance ? <ShieldAlert className="w-6 h-6" /> : <Settings className="w-6 h-6" />}
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Chế Độ Bảo Trì</h2>
            <p className="text-sm text-gray-400 mt-1">Quản lý trạng thái hoạt động của hệ thống</p>
          </div>
        </div>
      </div>

      <div className="bg-gray-950/50 p-4 rounded-xl border border-gray-800 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-200">Trạng thái hiện tại</p>
            <p className={`text-xs font-bold mt-1 uppercase tracking-wider ${isMaintenance ? 'text-red-500' : 'text-emerald-500'}`}>
              {isMaintenance ? "Đang khóa (Bảo trì)" : "Hoạt động bình thường"}
            </p>
          </div>
          
          {/* Nút Toggle Switch phong cách iOS/Tailwind */}
          <button
            onClick={handleToggle}
            disabled={isUpdating}
            className={`
              relative inline-flex h-8 w-14 items-center rounded-full transition-all duration-300 focus:outline-none shadow-inner
              ${isUpdating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              ${isMaintenance ? 'bg-red-500' : 'bg-gray-700'}
            `}
          >
            <span
              className={`
                inline-flex items-center justify-center h-6 w-6 transform rounded-full bg-white transition-all duration-300 shadow-md
                ${isMaintenance ? 'translate-x-7' : 'translate-x-1'}
              `}
            >
              <Power className={`w-3.5 h-3.5 ${isMaintenance ? 'text-red-500' : 'text-gray-400'}`} />
            </span>
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-500 leading-relaxed">
        <strong>Lưu ý:</strong> Khi bật chế độ này, người dùng sẽ không thể truy cập vào bất kỳ tính năng nào của ứng dụng. Hãy đảm bảo bạn chỉ bật nó khi cần thiết để cập nhật hệ thống hoặc sửa lỗi nghiêm trọng.
      </p>
    </div>
  );
};

export default MaintenanceManager;