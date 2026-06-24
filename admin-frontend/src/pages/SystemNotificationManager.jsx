import React, { useState, useEffect } from 'react';
import { Save, Bell, AlertTriangle, Settings, Activity, CheckCircle, XCircle } from 'lucide-react';

const SystemNotificationManager = () => {
  const [config, setConfig] = useState({
    isActive: false,
    type: 'NORMAL', // 'NORMAL' hoặc 'MAINTENANCE'
    message: '',
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [feedback, setFeedback] = useState({ show: false, type: '', text: '' });

  // 1. TẢI CẤU HÌNH HIỆN TẠI TỪ SERVER KHI VỪA VÀO TRANG
  useEffect(() => {
    const fetchCurrentStatus = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/system/maintenance");
        const result = await res.json();
        if (result.success && result.data) {
          setConfig({
            isActive: result.data.isActive || false,
            type: result.data.type || 'NORMAL',
            message: result.data.message || '',
          });
        }
      } catch (error) {
        console.error("Lỗi khi lấy dữ liệu:", error);
      } finally {
        setIsFetching(false);
      }
    };
    fetchCurrentStatus();
  }, []);

  // 2. XỬ LÝ LƯU CẤU HÌNH LÊN SERVER
  const handleSave = async () => {
    setIsLoading(true);
    setFeedback({ show: false, type: '', text: '' });

    try {
      // Lấy Token của Admin (đảm bảo bạn đang lưu token này trong localStorage)
     // Đổi dòng đó thành:
const token = localStorage.getItem("adminToken") || localStorage.getItem("token");

      const res = await fetch("http://localhost:5000/api/system/maintenance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` // Gửi kèm Token để qua ải middleware
        },
        body: JSON.stringify(config),
      });

      const result = await res.json();

      if (res.ok && result.success) {
        setFeedback({ show: true, type: 'success', text: "Đã cập nhật hệ thống thành công!" });
      } else {
        setFeedback({ show: true, type: 'error', text: result.message || "Không thể cập nhật cấu hình!" });
      }
    } catch (error) {
      setFeedback({ show: true, type: 'error', text: "Lỗi kết nối đến máy chủ!" });
    } finally {
      setIsLoading(false);
      // Ẩn thông báo sau 3 giây
      setTimeout(() => setFeedback({ show: false, type: '', text: '' }), 3000);
    }
  };

  if (isFetching) {
    return (
      <div className="flex items-center justify-center p-8 text-emerald-500">
        <Activity className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 md:p-8 max-w-2xl mx-auto text-gray-200 shadow-2xl">
      <div className="flex items-center gap-3 mb-8 border-b border-gray-800 pb-6">
        <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20">
          <Settings className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-black text-white">Quản Trị Hệ Thống</h2>
          <p className="text-sm text-gray-400 mt-1">Cấu hình thông báo và chế độ bảo trì</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* BẬT / TẮT HỆ THỐNG THÔNG BÁO */}
        <div className="flex items-center justify-between p-5 bg-gray-950 rounded-2xl border border-gray-800">
          <div>
            <p className="font-bold text-white mb-1">Trạng thái hoạt động</p>
            <p className="text-sm text-gray-500">Bật để hiển thị thông báo hoặc khóa bảo trì</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer" 
              checked={config.isActive}
              onChange={(e) => setConfig({ ...config, isActive: e.target.checked })}
            />
            <div className="w-14 h-7 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-emerald-500"></div>
          </label>
        </div>

        {/* LỰA CHỌN LOẠI THÔNG BÁO (Chỉ hiện khi nút trên được bật) */}
        <div className={`transition-all duration-300 ${config.isActive ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
          <p className="font-bold text-white mb-3 ml-1">Loại sự kiện</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Banner Thông Thường */}
            <label 
              className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${
                config.type === 'NORMAL' 
                  ? 'bg-blue-500/10 border-blue-500 text-blue-400 shadow-inner' 
                  : 'bg-gray-950 border-gray-800 text-gray-400 hover:border-gray-700'
              }`}
              onClick={() => setConfig({ ...config, type: 'NORMAL' })}
            >
              <input type="radio" name="type" className="hidden" checked={config.type === 'NORMAL'} readOnly />
              <Bell className="w-6 h-6 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-gray-200">Banner Thông Báo</p>
                <p className="text-xs mt-1 opacity-80 leading-relaxed">Hiện thanh màu xanh trên cùng, người dùng có thể tắt đi (Ví dụ: Chào mừng sự kiện mới).</p>
              </div>
            </label>

            {/* Chế Độ Bảo Trì */}
            <label 
              className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${
                config.type === 'MAINTENANCE' 
                  ? 'bg-amber-500/10 border-amber-500 text-amber-500 shadow-inner' 
                  : 'bg-gray-950 border-gray-800 text-gray-400 hover:border-gray-700'
              }`}
              onClick={() => setConfig({ ...config, type: 'MAINTENANCE' })}
            >
              <input type="radio" name="type" className="hidden" checked={config.type === 'MAINTENANCE'} readOnly />
              <AlertTriangle className="w-6 h-6 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-gray-200">Bảo Trì Khẩn Cấp</p>
                <p className="text-xs mt-1 opacity-80 leading-relaxed">Khóa cứng toàn bộ màn hình App. Chỉ Admin mới có thể vào được (Ví dụ: Nâng cấp Server).</p>
              </div>
            </label>
          </div>
        </div>

        {/* NỘI DUNG THÔNG BÁO */}
        <div className={`transition-all duration-300 ${config.isActive ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
          <p className="font-bold text-white mb-3 ml-1">Nội dung hiển thị</p>
          <textarea
            rows="3"
            className="w-full bg-gray-950 border border-gray-800 text-gray-200 text-sm rounded-2xl focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 block p-4 placeholder-gray-600 transition-all resize-none"
            placeholder={config.type === 'NORMAL' ? "Ví dụ: 🔥 Khuyến mãi 50% Gói VIP nhân dịp cuối tuần!" : "Ví dụ: Hệ thống đang nâng cấp, vui lòng quay lại sau 15 phút."}
            value={config.message}
            onChange={(e) => setConfig({ ...config, message: e.target.value })}
          ></textarea>
        </div>

        {/* FEEDBACK THÔNG BÁO */}
        {feedback.show && (
          <div className={`p-4 rounded-2xl flex items-center gap-3 text-sm font-semibold animate-in fade-in slide-in-from-bottom-2 ${
            feedback.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
          }`}>
            {feedback.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
            {feedback.text}
          </div>
        )}

        {/* NÚT LƯU */}
        <button
          onClick={handleSave}
          disabled={isLoading}
          className={`w-full flex items-center justify-center gap-2 p-4 rounded-2xl font-bold text-white transition-all shadow-lg hover:shadow-emerald-500/25 ${
            isLoading ? 'bg-emerald-600/50 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 hover:-translate-y-0.5'
          }`}
        >
          {isLoading ? (
            <Activity className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Save className="w-5 h-5" /> Lưu Cấu Hình Hệ Thống
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default SystemNotificationManager;