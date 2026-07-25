// 📄 src/pages/AdminReportManager.jsx
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  AlertTriangle, Check, Trash2, Eye, ShieldAlert, 
  Clock, MessageSquare, Heart, Mail, User, Ban 
} from 'lucide-react';

const AdminReportManager = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [activeTab, setActiveTab] = useState('queue'); 
  const [selectedReports, setSelectedReports] = useState(null);

  // 1. FETCH DỮ LIỆU
  const fetchReportedPosts = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = activeTab === 'queue' 
        ? `/admin/posts/queue` 
        : `/admin/posts/queue?status=${activeTab}`;

      const response = await api.get(url);
      
      if (response.data.success) {
        setPosts(response.data.data);
      }
    } catch (err) {
      console.error("Fetch reports error:", err);
      setError(err.response?.data?.message || "Không thể kết nối đến máy chủ.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportedPosts();
  }, [activeTab]);


  // 2. XỬ LÝ PHÁN QUYẾT: CHO PHÉP HIỂN THỊ LẠI (ALLOW)
  const handleAllowPost = async (postId) => {
    const note = prompt("Nhập ghi chú phê duyệt (Không bắt buộc):", "Đã kiểm tra. Bài viết hợp lệ.");
    if (note === null) return; 

    try {
      const response = await api.patch(
        `/admin/posts/${postId}/resolve`, 
        { action: 'allow', note }
      );

      if (response.data.success) {
        alert(response.data.message || "Đã phê duyệt bài viết.");
        setPosts(prev => prev.filter(post => post._id !== postId));
      }
    } catch (err) {
      alert(err.response?.data?.message || "Thao tác thất bại.");
    }
  };


  // 3. XỬ LÝ PHÁN QUYẾT: XÓA VĨNH VIỄN BÀI VIẾT (DELETE)
  const handleDeletePost = async (postId) => {
    if (!window.confirm("CẢNH BÁO: Hành động này sẽ XÓA VĨNH VIỄN bài viết khỏi hệ thống! Bạn có chắc chắn không?")) {
      return;
    }

    try {
      const response = await api.patch(
        `/admin/posts/${postId}/resolve`, 
        { action: 'delete' }
      );

      if (response.data.success) {
        alert(response.data.message || "Đã xóa bài viết.");
        setPosts(prev => prev.filter(post => post._id !== postId));
      }
    } catch (err) {
      alert(err.response?.data?.message || "Thao tác thất bại.");
    }
  };

  // 4. KHÓA TÀI KHOẢN NGƯỜI DÙNG (Cập nhật để tự động load lại trang)
  const handleLockAccount = async (userId) => {
    if (!userId) {
      alert("Lỗi: Không tìm thấy ID người dùng.");
      return;
    }

    if (!window.confirm("⛔ CẢNH BÁO: Bạn sắp KHÓA tài khoản của người dùng này. Họ sẽ không thể đăng nhập. Tiếp tục?")) {
      return;
    }

    const reason = prompt("Nhập lý do khóa tài khoản (Hiển thị cho user):", "Vi phạm tiêu chuẩn cộng đồng nhiều lần.");
    if (reason === null) return;

    try {
      const response = await api.put(
        `/admin/users/${userId}/toggle-lock`, 
        { reason }
      );

      if (response.data.success) {
        // Hiện thông báo thành công
        alert("🔒 Thao tác khóa tài khoản thành công!");
        
        // CÁCH 1: Tải lại mượt mà (chỉ fetch lại dữ liệu, không chớp màn hình)
        fetchReportedPosts(); 
        
        // CÁCH 2: Nếu bạn muốn F5 cứng (Hard Reload) thì bỏ comment dòng dưới và xóa dòng trên:
        // window.location.reload();
      }
    } catch (err) {
      alert(err.response?.data?.message || "Lỗi khi khóa tài khoản.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-950 tracking-tight flex items-center gap-2">
            <ShieldAlert className="text-red-500" size={28} />
            Hệ thống Kiểm duyệt bài viết
          </h1>
          <p className="text-sm text-gray-500 mt-1">Xử lý các bài viết bị người dùng báo cáo vi phạm hoặc hệ thống tự động ẩn ngầm.</p>
        </div>
      </div>

      {/* Bộ lọc Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('queue')}
          className={`px-5 py-3 font-semibold text-sm transition-all border-b-2 -mb-px flex items-center gap-2 ${
            activeTab === 'queue' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Clock size={16} />
          Hàng đợi xử lý 
          <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full font-bold">Cần duyệt</span>
        </button>
        
        <button
          onClick={() => setActiveTab('approved')}
          className={`px-5 py-3 font-semibold text-sm transition-all border-b-2 -mb-px flex items-center gap-2 ${
            activeTab === 'approved' ? 'border-green-600 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Check size={16} />
          Đã khôi phục / An toàn
        </button>
      </div>

      {/* Xử lý Trạng thái: Loading / Error / Empty */}
      {loading ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-gray-100 text-gray-400 font-medium">
          <div className="animate-spin inline-block w-6 h-6 border-[3px] border-current border-t-transparent text-blue-600 rounded-full mb-2" role="status"></div>
          <p>Đang đồng bộ dữ liệu báo cáo từ server...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 p-6 text-center rounded-2xl border border-red-100 text-red-600 font-medium">
          {error}
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-gray-100 text-gray-400">
          Tuyệt vời! Không có bài viết nào cần xử lý trong mục này.
        </div>
      ) : (
        /* Danh sách bài viết */
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {posts.map((post) => (
            <div key={post._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
              
              {/* Thẻ hiển thị số lượng report */}
              <div className={`px-6 py-2.5 border-b flex items-center justify-between ${
                post.status === 'hidden_by_system' ? 'bg-red-50 border-red-100' : 
                activeTab === 'approved' ? 'bg-green-50 border-green-100' : 'bg-amber-50 border-amber-100'
              }`}>
                <span className={`text-xs font-bold flex items-center gap-1.5 ${
                  post.status === 'hidden_by_system' ? 'text-red-800' : 
                  activeTab === 'approved' ? 'text-green-800' : 'text-amber-800'
                }`}>
                  <AlertTriangle size={14} />
                  {activeTab === 'approved' ? "Bài viết đang hiển thị bình thường" : 
                   post.status === 'hidden_by_system' ? "Hệ thống tự động ẩn ngầm!" : 
                   `Bị cộng đồng báo cáo xấu: ${post.reportsCount} lượt!`
                  }
                </span>
                
                {post.reports && post.reports.length > 0 && (
                  <button 
                    onClick={() => setSelectedReports(post.reports)}
                    className="text-xs text-blue-600 hover:underline font-semibold flex items-center gap-1"
                  >
                    <Eye size={12} /> Xem lý do ({post.reports.length})
                  </button>
                )}
              </div>

              {/* Chi tiết nội dung */}
              <div className="p-6 flex items-start gap-4 flex-1">
                <div className="bg-gray-100 text-gray-500 p-3 rounded-full border flex-shrink-0">
                  <User size={20} />
                </div>
                
                <div className="flex-1 space-y-3 min-w-0">
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm truncate">{post.userId?.name || "Người dùng ẩn danh"}</h3>
                    <div className="text-xs text-gray-400 mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-blue-600 font-medium flex items-center gap-0.5">
                        <Mail size={12} /> {post.userId?.email || "N/A"}
                      </span>
                      •
                      <span className="uppercase font-bold text-[10px] px-1.5 py-0.2 rounded bg-gray-100 text-gray-600">
                        {post.postType}
                      </span>
                      • {new Date(post.createdAt).toLocaleString('vi-VN')}
                    </div>
                  </div>

                  {post.content ? (
                    <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap break-words">{post.content}</p>
                  ) : (
                    <p className="text-gray-400 text-xs italic">Bài viết không có nội dung văn bản</p>
                  )}

                  {post.images && post.images.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      {post.images.map((img, i) => (
                        <a href={img} target="_blank" rel="noreferrer" key={i}>
                          <img src={img} alt="Đính kèm" className="rounded-xl h-24 w-full object-cover border hover:opacity-90 transition-opacity" />
                        </a>
                      ))}
                    </div>
                  )}

                  {post.video && (
                    <div className="pt-1">
                      <video src={post.video} controls className="rounded-xl max-h-48 w-full bg-black" />
                    </div>
                  )}
                </div>
              </div>

              {/* THANH QUYỀN LỰC (Hiển thị cả 2 tab) */}
              <div className="p-4 bg-gray-50 border-t border-gray-100 flex flex-wrap sm:flex-nowrap gap-3">
                
                {/* Nút Giữ bài (Chỉ hiện ở hàng đợi) */}
                {activeTab === 'queue' && (
                  <button
                    onClick={() => handleAllowPost(post._id)}
                    className="flex-1 bg-white hover:bg-green-50 border border-gray-200 hover:border-green-200 text-gray-700 hover:text-green-700 px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                  >
                    <Check size={14} /> Giữ bài
                  </button>
                )}

                {/* Nút Xóa bài (Hiện ở cả 2 tab) */}
                <button
                  onClick={() => handleDeletePost(post._id)}
                  className="flex-1 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                >
                  <Trash2 size={14} /> Xóa bài
                </button>

                {/* Nút Khóa Tài Khoản (Hiện ở cả 2 tab) */}
                <button
                  onClick={() => handleLockAccount(post.userId?._id)}
                  disabled={!post.userId?._id}
                  className="flex-1 bg-gray-900 hover:bg-black text-white px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Ban size={14} /> Khóa TK
                </button>

              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Lịch sử báo cáo */}
      {selectedReports && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden max-h-[80vh] flex flex-col">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                <AlertTriangle className="text-amber-500" size={20} />
                Lịch sử báo cáo vi phạm
              </h3>
              <button 
                onClick={() => setSelectedReports(null)}
                className="text-gray-400 hover:text-gray-600 font-bold text-sm bg-gray-100 px-2.5 py-1 rounded-full"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {selectedReports.map((rep, idx) => (
                <div key={idx} className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-gray-700">User ID: {rep.reporterId || "Ẩn danh"}</span>
                    <span className="text-gray-400">{new Date(rep.createdAt).toLocaleString('vi-VN')}</span>
                  </div>
                  <p className="text-sm text-gray-600">Lý do báo cáo: <span className="text-red-600 font-semibold">{rep.reason}</span></p>
                </div>
              ))}
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 text-right">
              <button
                onClick={() => setSelectedReports(null)}
                className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl text-xs font-bold hover:bg-gray-50"
              >
                Đóng lại
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminReportManager;