// 📄 src/pages/AdminReportManager.jsx
import React, { useState, useEffect } from 'react';
import { AlertTriangle, Check, X, Eye, ShieldAlert, Clock, MessageSquare, Heart } from 'lucide-react';

const AdminReportManager = () => {
  const [reportedPosts, setReportedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending_review'); // pending_review | banned | approved
  const [selectedReportList, setSelectedReportList] = useState(null); // Dùng mở Modal xem chi tiết lý do

  // Giả lập dữ liệu fetch từ API tương ứng cấu trúc Model Post của bạn
  useEffect(() => {
    // Trong thực tế: axios.get(`/api/admin/posts/reported?status=${activeTab}`)
    setLoading(true);
    setTimeout(() => {
      const mockData = [
        {
          _id: "post123",
          content: "Lịch tập siêu khô mỡ cấp tốc giảm 10kg trong 3 ngày không cần ăn uống gì kham khổ cả anh em ơi!! Xem video hướng dẫn tại bio.",
          images: ["https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=500"],
          video: null,
          postType: "workout_log",
          status: "pending_review",
          reportsCount: 3,
          likes: [1, 2, 3, 4],
          commentsCount: 12,
          userId: {
            name: "Hulk Gymmer",
            avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100",
            role: "user"
          },
          reports: [
            { reporterId: { name: "Nguyễn Văn A" }, reason: "Spam nội dung quảng cáo sai sự thật", createdAt: "2026-03-24T10:00:00.000Z" },
            { reporterId: { name: "Trần Thị B" }, reason: "Kinh doanh lừa đảo, thông tin phản khoa học", createdAt: "2026-03-24T10:15:00.000Z" },
            { reporterId: { name: "Lê Văn C" }, reason: "Nội dung kích động, lôi kéo", createdAt: "2026-03-24T11:00:00.000Z" }
          ],
          createdAt: "2026-03-23T08:00:00.000Z"
        },
        {
          _id: "post456",
          content: "Bán thuốc tăng cơ không rõ nguồn gốc xuất xứ cam kết hoàn tiền...",
          images: [],
          video: null,
          postType: "text",
          status: "pending_review",
          reportsCount: 1,
          likes: [1],
          commentsCount: 0,
          userId: {
            name: "ShopThucPhamChucNang",
            avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100",
            role: "user"
          },
          reports: [
            { reporterId: { name: "Hoàng M" }, reason: "Bán hàng cấm, hàng giả", createdAt: "2026-03-24T09:00:00.000Z" }
          ],
          createdAt: "2026-03-24T02:00:00.000Z"
        }
      ];

      // Lọc theo tab giả lập
      setReportedPosts(mockData.filter(p => p.status === activeTab || (activeTab === 'approved' && p.reportsCount > 0 && p.status === 'approved')));
      setLoading(false);
    }, 600);
  }, [activeTab]);

  // Hành động 1: Giữ lại bài viết (Bỏ qua toàn bộ báo cáo, set status về 'approved')
  const handleApprovePost = async (postId) => {
    if (window.confirm("Bạn xác định bài viết này HỢP LỆ và muốn giữ lại trên hệ thống?")) {
      // Gọi API: axios.put(`/api/admin/posts/${postId}/approve`)
      setReportedPosts(prev => prev.filter(p => p._id !== postId));
      alert("Đã phê duyệt giữ lại bài viết.");
    }
  };

  // Hành động 2: Khóa/Ẩn bài viết vi phạm (Set status về 'banned')
  const handleBanPost = async (postId) => {
    const note = prompt("Nhập lý do khóa bài viết (Gửi tới người dùng):");
    if (note === null) return; // Nhấn hủy

    // Gọi API: axios.put(`/api/admin/posts/${postId}/ban`, { moderationNote: note })
    setReportedPosts(prev => prev.filter(p => p._id !== postId));
    alert("Đã gỡ bỏ và khóa bài viết vi phạm thành công.");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-950 tracking-tight flex items-center gap-2">
            <ShieldAlert className="text-red-500" size={28} />
            Kiểm duyệt Báo cáo Vi phạm
          </h1>
          <p className="text-sm text-gray-500 mt-1">Quản lý và xử lý các bài viết cộng đồng bị người dùng báo cáo vi phạm tiêu chuẩn.</p>
        </div>
      </div>

      {/* Tabs Bộ lọc */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('pending_review')}
          className={`px-5 py-3 font-semibold text-sm transition-all border-b-2 -mb-px flex items-center gap-2 ${
            activeTab === 'pending_review' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Clock size={16} />
          Chờ kiểm duyệt
          <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full font-bold">New</span>
        </button>
        <button
          onClick={() => setActiveTab('banned')}
          className={`px-5 py-3 font-semibold text-sm transition-all border-b-2 -mb-px flex items-center gap-2 ${
            activeTab === 'banned' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <X size={16} />
          Đã chặn / Ẩn
        </button>
        <button
          onClick={() => setActiveTab('approved')}
          className={`px-5 py-3 font-semibold text-sm transition-all border-b-2 -mb-px flex items-center gap-2 ${
            activeTab === 'approved' ? 'border-green-600 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Check size={16} />
          Đã bỏ qua báo cáo
        </button>
      </div>

      {/* Danh sách bài viết */}
      {loading ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-gray-100 text-gray-400 font-medium">
          Đang tải dữ liệu kiểm duyệt...
        </div>
      ) : reportedPosts.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-gray-100 text-gray-400">
          Không có bài viết nào trong danh sách này.
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {reportedPosts.map((post) => (
            <div key={post._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
              {/* Thẻ cảnh báo số lượng report */}
              <div className="bg-amber-50 px-6 py-2.5 border-b border-amber-100 flex items-center justify-between">
                <span className="text-amber-800 text-xs font-bold flex items-center gap-1.5">
                  <AlertTriangle size={14} />
                  Bài viết có {post.reportsCount} lượt báo cáo xấu!
                </span>
                <button 
                  onClick={() => setSelectedReportList(post.reports)}
                  className="text-xs text-blue-600 hover:underline font-semibold flex items-center gap-1"
                >
                  <Eye size={12} /> Xem các lý do
                </button>
              </div>

              {/* Thông tin tác giả */}
              <div className="p-6 flex items-start gap-4 flex-1">
                <img src={post.userId.avatar} alt="avatar" className="w-11 h-11 rounded-full object-cover border" />
                <div className="flex-1 space-y-3">
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">{post.userId.name}</h3>
                    <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
                      <span className="uppercase font-bold tracking-wider text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                        {post.postType}
                      </span>
                      • {new Date(post.createdAt).toLocaleDateString('vi-VN')}
                    </div>
                  </div>

                  {/* Nội dung bài đăng */}
                  <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{post.content}</p>

                  {/* Media đính kèm (nếu có) */}
                  {post.images && post.images.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      {post.images.map((img, i) => (
                        <img key={i} src={img} alt="attachment" className="rounded-xl max-h-28 w-full object-cover border" />
                      ))}
                    </div>
                  )}

                  {/* Tương tác cơ bản */}
                  <div className="flex items-center gap-4 text-xs text-gray-400 font-medium pt-2">
                    <span className="flex items-center gap-1"><Heart size={14} /> {post.likes.length} Likes</span>
                    <span className="flex items-center gap-1"><MessageSquare size={14} /> {post.commentsCount} Bình luận</span>
                  </div>
                </div>
              </div>

              {/* Thanh công cụ hành động của Admin */}
              {post.status === 'pending_review' && (
                <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3">
                  <button
                    onClick={() => handleApprovePost(post._id)}
                    className="flex-1 bg-white hover:bg-green-50 border border-gray-200 hover:border-green-200 text-gray-700 hover:text-green-700 px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                  >
                    <Check size={14} /> Bỏ qua & Giữ bài
                  </button>
                  <button
                    onClick={() => handleBanPost(post._id)}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm shadow-red-100"
                  >
                    <X size={14} /> Gỡ bài & Khóa
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal hiển thị chi tiết lý do báo cáo */}
      {selectedReportList && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden max-h-[80vh] flex flex-col">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                <AlertTriangle className="text-amber-500" size={20} />
                Chi tiết các lý do báo cáo
              </h3>
              <button 
                onClick={() => setSelectedReportList(null)}
                className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-full"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {selectedReportList.map((rep, idx) => (
                <div key={idx} className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-gray-800">{rep.reporterId?.name || "Người dùng ẩn danh"}</span>
                    <span className="text-[11px] text-gray-400">{new Date(rep.createdAt).toLocaleString('vi-VN')}</span>
                  </div>
                  <p className="text-sm text-gray-600 font-medium">Lý do: <span className="text-red-600">{rep.reason}</span></p>
                </div>
              ))}
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 text-right">
              <button
                onClick={() => setSelectedReportList(null)}
                className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl text-xs font-bold hover:bg-gray-50"
              >
                Đóng cửa sổ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminReportManager;