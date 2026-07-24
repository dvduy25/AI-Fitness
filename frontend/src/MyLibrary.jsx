import api from "./services/api";
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Dumbbell, Apple, Trash2, CheckCircle2, 
  ChevronRight, Bookmark, AlertTriangle, Loader2 
} from 'lucide-react';


export default function MyLibrary() {
  const [library, setLibrary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [applyingId, setApplyingId] = useState(null); // Theo dõi item đang được áp dụng
  const token = localStorage.getItem("token");

  // 1. Lấy danh sách từ kho
  const fetchLibrary = async () => {
    try {
      const response = await api.get(`/library`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setLibrary(response.data.library);
      }
    } catch (error) {
      console.error("Lỗi tải kho lưu trữ:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLibrary(); }, []);

  // 2. Chức năng quan trọng nhất: ÁP DỤNG VÀO LỊCH CÁ NHÂN
  const handleApplyPlan = async (item) => {
    const confirmMsg = `Bạn có chắc muốn dùng "${item.title}" để thay thế hoàn toàn lịch ${item.type === 'workout' ? 'tập' : 'ăn'} hiện tại của mình không?`;
    
    if (!window.confirm(confirmMsg)) return;

    setApplyingId(item._id);
    try {
      // Gọi API apply bạn đã viết ở Backend
      const response = await api.post(
        `/library/${item._id}/apply`, 
        {}, 
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        alert("🎉 Chúc mừng! Lịch mới đã được cập nhật vào kế hoạch cá nhân của bạn.");
      }
    } catch (error) {
      alert(error.response?.data?.message || "Lỗi khi áp dụng lịch.");
    } finally {
      setApplyingId(null);
    }
  };

  // 3. Xóa khỏi kho
  const handleRemove = async (id) => {
    if (!window.confirm("Xóa mục này khỏi kho lưu trữ?")) return;
    try {
      await api.delete(`/library/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLibrary(library.filter(item => item._id !== id));
    } catch (error) {
      alert("Không thể xóa.");
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mb-4" />
      <p className="text-gray-400">Đang mở kho lưu trữ...</p>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Bookmark className="text-emerald-500 w-7 h-7" /> Kho lưu trữ cá nhân
          </h1>
          <p className="text-gray-400 text-sm mt-1">Nơi chứa các lịch tập và thực đơn bạn đã sưu tầm</p>
        </div>
        <div className="bg-gray-800 px-4 py-2 rounded-full border border-gray-700 text-sm text-gray-300">
          Tổng cộng: <b>{library.length}</b>
        </div>
      </div>

      {library.length === 0 ? (
        <div className="bg-gray-800/50 border-2 border-dashed border-gray-700 rounded-3xl p-12 text-center">
          <div className="bg-gray-700/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Bookmark className="text-gray-500 w-8 h-8" />
          </div>
          <p className="text-gray-400">Kho của bạn đang trống.</p>
          <p className="text-sm text-gray-500 mt-2 text-balance">Hãy dạo quanh cộng đồng và lưu những lịch tập/ăn bổ ích nhé!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {library.map((item) => (
            <div key={item._id} className="group bg-gray-800 border border-gray-700 hover:border-emerald-500/50 rounded-2xl p-5 transition-all duration-300 shadow-lg relative overflow-hidden">
              
              {/* Type Badge */}
              <div className="absolute top-0 right-0 p-3">
                {item.type === 'workout' ? (
                  <Dumbbell className="text-emerald-500/20 w-12 h-12 rotate-12" />
                ) : (
                  <Apple className="text-yellow-500/20 w-12 h-12 rotate-12" />
                )}
              </div>

              <div className="flex items-start gap-4 relative z-10">
                <div className={`p-3 rounded-xl ${item.type === 'workout' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                  {item.type === 'workout' ? <Dumbbell className="w-6 h-6" /> : <Apple className="w-6 h-6" />}
                </div>
                <div className="flex-1 pr-8">
                  <h3 className="font-bold text-gray-100 text-lg line-clamp-1">{item.title}</h3>
                  <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider font-semibold">
                    Loại: {item.type === 'workout' ? 'Lịch tập' : 'Thực đơn'}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex gap-3 relative z-10">
                {/* NÚT QUAN TRỌNG: ÁP DỤNG */}
                <button 
                  onClick={() => handleApplyPlan(item)}
                  disabled={applyingId === item._id}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md
                    ${item.type === 'workout' 
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20' 
                      : 'bg-yellow-600 hover:bg-yellow-500 text-white shadow-yellow-900/20'} 
                    disabled:opacity-50`}
                >
                  {applyingId === item._id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  {applyingId === item._id ? "Đang áp dụng..." : "Áp dụng ngay"}
                </button>

                <button 
                  onClick={() => handleRemove(item._id)}
                  className="p-2.5 bg-gray-700 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded-xl transition-all border border-gray-600 hover:border-red-500/50"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-700/50 flex items-center justify-between text-[11px] text-gray-500 uppercase tracking-widest font-medium">
                <span>Đã lưu vào: {new Date(item.createdAt).toLocaleDateString('vi-VN')}</span>
                <div className="flex items-center gap-1 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  Xem chi tiết <ChevronRight className="w-3 h-3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cảnh báo ghi đè */}
      <div className="mt-10 p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-2xl flex items-start gap-4">
        <AlertTriangle className="text-yellow-500 w-6 h-6 shrink-0 mt-0.5" />
        <p className="text-xs text-gray-400 leading-relaxed">
          <b className="text-yellow-500 uppercase">Lưu ý quan trọng:</b> Khi bạn nhấn nút "Áp dụng", hệ thống sẽ thay thế toàn bộ lịch trình hiện tại của bạn bằng dữ liệu mới từ kho lưu trữ. Hành động này không thể hoàn tác, hãy chắc chắn rằng bạn muốn thay đổi.
        </p>
      </div>
    </div>
  );
}