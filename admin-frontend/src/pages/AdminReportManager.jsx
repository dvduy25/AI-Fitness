// 📄 src/pages/AdminReportManager.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AlertTriangle, Check, Trash2, Eye, ShieldAlert, Clock, MessageSquare, Heart, Mail, User } from 'lucide-react';

const AdminReportManager = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Tab 'queue' sẽ lấy cả pending_review và hidden_by_system (mặc định của Backend)
  // Tab 'approved' sẽ lấy danh sách các bài viết đã an toàn
  const [activeTab, setActiveTab] = useState('queue'); 
  const [selectedReports, setSelectedReports] = useState(null);

  // Cấu hình Base URL của API (Thay đổi map với cổng backend của bạn, ví dụ: http://localhost:5000)
  const API_BASE_URL = 'http://localhost:5000/api/admin'; 

  // Hàm lấy token từ LocalStorage để đưa vào Header Authorization
  const getAuthHeader = () => {
    const token = localStorage.getItem('adminToken');
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  // 1. FETCH DỮ LIỆU THỰC TỪ BACKEND
  const fetchReportedPosts = async () => {
    setLoading(true);
    setError(null);
    try {
      // Nếu tab là 'queue', không truyền status để backend tự lấy ['pending_review', 'hidden_by_system']
      const url = activeTab === 'queue' 
        ? `${API_BASE_URL}/posts/queue` 
        : `${API_BASE_URL}/posts/queue?status=${activeTab}`;

      const response = await axios.get(url, getAuthHeader());
      
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
    if (note === null) return; // Bấm hủy bỏ

    try {
      const response = await axios.patch(
        `${API_BASE_URL}/posts/${postId}/resolve`, 
        { action: 'allow', note }, 
        getAuthHeader()
      );

      if (response.data.success) {
        alert(response.data.message);
        // Cập nhật lại UI lập tức bằng cách lọc bỏ bài viết vừa xử lý khỏi danh sách hiển thị
        setPosts(prev => prev.filter(post => post._id !== postId));
      }
    } catch (err) {
      alert(err.response?.data?.message || "Thao tác thất bại.");
    }
  };


  // 3. XỬ LÝ PHÁN QUYẾT: XÓA VĨNH VIỄN (DELETE)
  const handleDeletePost = async (postId) => {
    if (!window.confirm("CẢNH BÁO: Hành động này sẽ XÓA VĨNH VIỄN bài viết và toàn bộ dữ liệu đi kèm khỏi hệ thống! Bạn có chắc chắn không?")) {
      return;
    }

    try {
      const response = await axios.patch(
        `${API_BASE_URL}/posts/${postId}/resolve`, 
        { action: 'delete' }, 
        getAuthHeader()
      );

      if (response.data.success) {
        alert(response.data.message);
        setPosts(prev => prev.filter(post => post._id !== postId));
      }
    } catch (err) {
      alert(err.response?.data?.message || "Thao tác thất bại.");
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
        /* Danh sách bài viết đổ từ MongoDB */
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {posts.map((post) => (
            <div key={post._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
              
              {/* Thẻ hiển thị số lượng report xấu */}
              <div className={`px-6 py-2.5 border-b flex items-center justify-between ${
                post.status === 'hidden_by_system' ? 'bg-red-50 border-red-100' : 'bg-amber-50 border-amber-100'
              }`}>
                <span className={`text-xs font-bold flex items-center gap-1.5 ${
                  post.status === 'hidden_by_system' ? 'text-red-800' : 'text-amber-800'
                }`}>
                  <AlertTriangle size={14} />
                  {post.status === 'hidden_by_system' 
                    ? "Hệ thống AI tự động ẩn ngầm bài viết này!" 
                    : `Bị cộng đồng báo cáo xấu: ${post.reportsCount} lượt!`
                  }
                </span>
                
                {post.reports && post.reports.length > 0 && (
                  <button 
                    onClick={() => setSelectedReports(post.reports)}
                    className="text-xs text-blue-600 hover:underline font-semibold flex items-center gap-1"
                  >
                    <Eye size={12} /> Xem lý do chi tiết ({post.reports.length})
                  </button>
                )}
              </div>

              {/* Chi tiết nội dung bài viết */}
              <div className="p-6 flex items-start gap-4 flex-1">
                {/* Fallback Avatar bằng Icon vì backend chỉ populate name và email */}
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

                  {/* Nội dung text bài viết */}
                  {post.content ? (
                    <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap break-words">{post.content}</p>
                  ) : (
                    <p className="text-gray-400 text-xs italic">Bài viết không có nội dung văn bản</p>
                  )}

                  {/* Hình ảnh đính kèm thực tế */}
                  {post.images && post.images.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      {post.images.map((img, i) => (
                        <a href={img} target="_blank" rel="noreferrer" key={i}>
                          <img src={img} alt="Đính kèm" className="rounded-xl h-24 w-full object-cover border hover:opacity-90 transition-opacity" />
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Video đính kèm thực tế */}
                  {post.video && (
                    <div className="pt-1">
                      <video src={post.video} controls className="rounded-xl max-h-48 w-full bg-black" />
                    </div>
                  )}

                  {/* Thống kê tương tác sơ bộ */}
                  <div className="flex items-center gap-4 text-xs text-gray-400 font-medium pt-2">
                    <span className="flex items-center gap-1"><Heart size={14} /> {post.likes?.length || 0} Thích</span>
                    <span className="flex items-center gap-1"><MessageSquare size={14} /> {post.commentsCount || 0} Bình luận</span>
                  </div>
                </div>
              </div>

              {/* Thanh phán quyết hành động (Chỉ hiện ở tab hàng đợi xử lý) */}
              {activeTab === 'queue' && (
                <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3">
                  <button
                    onClick={() => handleAllowPost(post._id)}
                    className="flex-1 bg-white hover:bg-green-50 border border-gray-200 hover:border-green-200 text-gray-700 hover:text-green-700 px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                  >
                    <Check size={14} /> Phê duyệt (Giữ bài)
                  </button>
                  <button
                    onClick={() => handleDeletePost(post._id)}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm shadow-red-100"
                  >
                    <Trash2 size={14} /> Xóa vĩnh viễn khỏi DB
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal Popup hiển thị chi tiết mảng các lý do báo cáo từ người dùng */}
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
                    {/* reporterId là ObjectId chưa populate tên nên ta để Tạm tính ẩn danh hoặc ID gốc */}
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