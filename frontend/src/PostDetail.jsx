import api from "./services/api";
// 📄 src/pages/PostDetail.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Heart, MessageCircle, Send, Activity, 
  Utensils, Download, Trash2, Edit2, X, ChevronLeft, ChevronRight, Flag 
} from 'lucide-react';


// ========================================================
// COMPONENT CAROUSEL CHO TRANG CHI TIẾT (CÓ CONTROLS VIDEO)
// ========================================================
const MediaCarousel = ({ images = [], video = null }) => {
  const mediaList = [
    ...(images || []).map(img => ({ type: 'image', url: img })),
    ...(video ? [{ type: 'video', url: video }] : [])
  ];

  const [currentIndex, setCurrentIndex] = useState(0);

  if (mediaList.length === 0) return null;

  const nextMedia = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % mediaList.length);
  };

  const prevMedia = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? mediaList.length - 1 : prev - 1));
  };

  return (
    <div className="relative w-full aspect-square md:aspect-[4/5] bg-black rounded-2xl overflow-hidden mb-6 group border border-gray-700/50 shadow-inner">
      {/* Hiển thị Media hiện tại */}
      {mediaList[currentIndex].type === 'image' ? (
        <img 
          src={mediaList[currentIndex].url} 
          alt="post media"
          className="w-full h-full object-cover" 
        />
      ) : (
        <div className="relative w-full h-full flex items-center justify-center bg-black">
          {/* Ở trang chi tiết thì phải hiện controls để xem được video */}
          <video 
            controls
            src={mediaList[currentIndex].url} 
            className="w-full h-full object-contain" 
          />
        </div>
      )}

      {/* Điều hướng Next / Prev */}
      {mediaList.length > 1 && (
        <>
          {currentIndex > 0 && (
            <button 
              onClick={prevMedia} 
              className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/70 text-white p-2 rounded-full backdrop-blur-md transition-all z-10 opacity-0 group-hover:opacity-100"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          
          {currentIndex < mediaList.length - 1 && (
            <button 
              onClick={nextMedia} 
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/70 text-white p-2 rounded-full backdrop-blur-md transition-all z-10 opacity-0 group-hover:opacity-100"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
          
          {/* Nút chấm tròn (Dots) */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10 pointer-events-none">
            {mediaList.map((_, idx) => (
              <div 
                key={idx} 
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === currentIndex ? 'bg-blue-500 w-4' : 'bg-white/60 w-1.5'
                }`} 
              />
            ))}
          </div>
          
          {/* Badge số đếm */}
          <div className="absolute top-4 right-4 bg-black/60 text-white text-xs font-bold px-2.5 py-1 rounded-full backdrop-blur-md z-10 pointer-events-none">
            {currentIndex + 1}/{mediaList.length}
          </div>
        </>
      )}
    </div>
  );
};

// ========================================================
// TRANG CHI TIẾT BÀI VIẾT
// ========================================================
export default function PostDetail() {
  const { postId } = useParams();
  const navigate = useNavigate();
  
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [commentText, setCommentText] = useState("");
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editCommentText, setEditCommentText] = useState("");

  // --- STATE CHỨC NĂNG BÁO CÁO (REPORT) ---
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");

  const token = localStorage.getItem("token");

  const getCurrentUserId = () => {
    if (!token) return null;
    try {
      const payload = token.split('.')[1];
      return JSON.parse(atob(payload)).id || JSON.parse(atob(payload))._id;
    } catch (e) { return null; }
  };
  const currentUserId = getCurrentUserId();

  const fetchPostDetail = async () => {
    try {
      const postRes = await api.get(`/posts/${postId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (postRes.data.success) setPost(postRes.data.post);

      const cmtRes = await api.get(`/posts/${postId}/comments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (cmtRes.data.success) setComments(cmtRes.data.comments);
    } catch (error) {
      console.error("Lỗi:", error);
      alert("Không thể tải bài viết!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPostDetail();
  }, [postId]);

  const handleToggleLike = async () => {
    try {
      const isLiked = post.likes.includes(currentUserId);
      const updatedPost = { ...post };
      if (isLiked) updatedPost.likes = post.likes.filter(id => id !== currentUserId);
      else updatedPost.likes.push(currentUserId);
      setPost(updatedPost);

      await api.post(`/posts/${postId}/like`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (error) { fetchPostDetail(); }
  };

  const handleSendComment = async () => {
    if (!commentText.trim()) return;
    try {
      await api.post(`/posts/${postId}/comment`, 
        { content: commentText },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCommentText("");
      fetchPostDetail(); 
    } catch (error) { alert("Lỗi khi bình luận!"); }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm("Xóa bình luận này?")) return;
    try {
      await api.delete(`/posts/comment/${commentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchPostDetail(); 
    } catch (error) { alert("Lỗi khi xóa bình luận!"); }
  };

  const handleUpdateComment = async (commentId) => {
    if (!editCommentText.trim()) return;
    try {
      await api.put(`/posts/comment/${commentId}`, 
        { content: editCommentText },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEditingCommentId(null);
      fetchPostDetail();
    } catch (error) { alert("Lỗi khi sửa bình luận!"); }
  };

  const handleClone = async (type) => {
    try {
      const res = await api.post(`/posts/clone`, { postId, type }, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data.success) alert(res.data.message);
    } catch (error) { alert("Lỗi khi lưu dữ liệu."); }
  };

  // --- HÀM GỬI YÊU CẦU BÁO CÁO BÀI VIẾT ---
  const handleReportPost = async (e) => {
    e.preventDefault();
    if (!reportReason.trim()) {
      alert("Vui lòng nhập lý do báo cáo.");
      return;
    }
    try {
      await api.post(
        `/posts/${postId}/report`,
        { reason: reportReason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("Cảm ơn đóng góp của bạn. Báo cáo đã được gửi tới đội ngũ kiểm duyệt.");
    } catch (error) {
      alert("Hệ thống đã ghi nhận báo cáo của bạn.");
    } finally {
      setShowReportModal(false);
      setReportReason("");
    }
  };

  if (loading) return <div className="flex justify-center items-center min-h-[50vh]"><div className="animate-spin rounded-full h-10 w-10 border-emerald-500 border-b-2"></div></div>;
  if (!post) return <div className="text-center text-white mt-20">Không tìm thấy bài viết này.</div>;

  const hasLiked = post.likes.includes(currentUserId);
  const isMyPost = post.userId?._id === currentUserId || post.userId === currentUserId;

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 w-full animate-in fade-in duration-300 relative">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors">
        <ArrowLeft className="w-5 h-5" /> Quay lại
      </button>

      <div className="bg-gray-800/80 border border-gray-700 p-5 md:p-8 rounded-3xl shadow-2xl">
        <div className="flex items-start gap-4 mb-6">
          <img src={post.userId?.avatar || "https://ui-avatars.com/api/?name=U&background=10b981&color=fff"} alt="avatar" className="w-14 h-14 rounded-full object-cover border-2 border-gray-700" />
          <div className="flex-1">
            <h4 className="font-bold text-lg text-gray-100">{post.userId?.name || "Người dùng ẩn danh"}</h4>
            <p className="text-sm text-gray-400 mt-0.5">{new Date(post.createdAt).toLocaleString('vi-VN')}</p>
          </div>
          
          {/* NÚT BÁO CÁO BÀI VIẾT (ẨN NẾU LÀ BÀI VIẾT CỦA CHÍNH MÌNH) */}
          {!isMyPost && (
            <button 
              onClick={() => setShowReportModal(true)}
              className="p-2.5 text-gray-400 hover:text-orange-400 bg-gray-950/50 hover:bg-gray-700 rounded-full transition-colors"
              title="Báo cáo bài viết"
            >
              <Flag className="w-5 h-5" />
            </button>
          )}
        </div>

        <p className="text-gray-200 whitespace-pre-wrap text-base md:text-lg mb-6 leading-relaxed">{post.content}</p>

        {/* CAROUSEL HÌNH ẢNH / VIDEO */}
        <MediaCarousel images={post.images} video={post.video} />

        {/* SNAPSHOTS */}
        {post.workoutSnapshot && (
          <div className="mt-4 bg-gray-900 border border-gray-700 p-4 rounded-2xl flex justify-between items-center">
            <div className="flex items-center gap-3 text-emerald-400">
              <div className="p-3 bg-emerald-500/10 rounded-xl"><Activity className="w-6 h-6" /></div>
              <div>
                <p className="font-bold text-gray-200">Lịch tập được chia sẻ</p>
                <p className="text-sm text-gray-400 mt-0.5">{post.workoutSnapshot.exercises?.length || 0} bài tập</p>
              </div>
            </div>
            <button onClick={() => handleClone('workout')} className="p-3 text-emerald-400 hover:bg-emerald-500/10 rounded-xl"><Download className="w-5 h-5" /></button>
          </div>
        )}
        {post.dietSnapshot && (
          <div className="mt-4 bg-gray-900 border border-gray-700 p-4 rounded-2xl flex justify-between items-center">
            <div className="flex items-center gap-3 text-yellow-400">
              <div className="p-3 bg-yellow-500/10 rounded-xl"><Utensils className="w-6 h-6" /></div>
              <div>
                <p className="font-bold text-gray-200">Lịch ăn được chia sẻ</p>
                <p className="text-sm text-gray-400 mt-0.5">{post.dietSnapshot.totalCalories || 0} kcal</p>
              </div>
            </div>
            <button onClick={() => handleClone('diet')} className="p-3 text-yellow-400 hover:bg-yellow-500/10 rounded-xl"><Download className="w-5 h-5" /></button>
          </div>
        )}

        {/* LIKE & COMMENT COUNTS */}
        <div className="flex items-center gap-6 mt-6 pt-5 border-t border-gray-700/50">
          <button onClick={handleToggleLike} className="flex items-center gap-2 text-gray-400 hover:text-pink-500">
            <Heart className={`w-6 h-6 transition-transform hover:scale-110 ${hasLiked ? "fill-pink-500 text-pink-500 scale-110" : ""}`} />
            <span className={`font-bold text-lg ${hasLiked ? "text-pink-500" : ""}`}>{post.likes?.length || 0}</span>
          </button>
          <div className="flex items-center gap-2 text-blue-400">
            <MessageCircle className="w-6 h-6 fill-blue-500/20" />
            <span className="font-bold text-lg">{post.commentsCount || 0}</span>
          </div>
        </div>
      </div>

      {/* ================= KHU VỰC BÌNH LUẬN ================= */}
      <div className="mt-8 bg-gray-800/50 border border-gray-700 p-5 md:p-8 rounded-3xl">
        <h3 className="text-xl font-bold text-white mb-6">Bình luận</h3>
        
        {/* Nhập bình luận */}
        <div className="flex items-start gap-4 mb-8">
          <img src="https://ui-avatars.com/api/?name=You&background=3b82f6&color=fff" alt="you" className="w-10 h-10 rounded-full" />
          <div className="flex-1 flex gap-2">
            <input 
              type="text" value={commentText} onChange={(e) => setCommentText(e.target.value)}
              placeholder="Viết bình luận của bạn..."
              className="flex-1 bg-gray-900 border border-gray-700 rounded-2xl px-5 py-3 text-gray-200 focus:border-blue-500 focus:outline-none"
              onKeyDown={(e) => e.key === 'Enter' && handleSendComment()}
            />
            <button onClick={handleSendComment} disabled={!commentText.trim()} className="px-5 text-white bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 rounded-2xl transition">
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Giao diện danh sách bình luận */}
        <div className="space-y-6">
          {comments.length === 0 ? (
            <p className="text-center text-gray-500 py-4">Hãy là người đầu tiên bình luận!</p>
          ) : (
            comments.map(comment => {
              const isCommentOwner = comment.userId?._id === currentUserId;
              const canDelete = isCommentOwner || isMyPost;

              return (
                <div key={comment._id} className="flex gap-4">
                  <img src={comment.userId?.avatar || "https://ui-avatars.com/api/?name=C&background=4b5563&color=fff"} className="w-10 h-10 rounded-full object-cover" alt="" />
                  <div className="flex-1">
                    <div className="bg-gray-900 rounded-3xl rounded-tl-none px-5 py-3 relative group w-fit min-w-[200px] max-w-full">
                      <h5 className="font-bold text-gray-200 mb-1">{comment.userId?.name || "Ẩn danh"}</h5>
                      
                      {editingCommentId === comment._id ? (
                        <div className="flex items-center gap-2">
                          <input 
                            type="text" autoFocus value={editCommentText} onChange={(e) => setEditCommentText(e.target.value)}
                            className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-1.5 text-white focus:outline-none w-full"
                            onKeyDown={(e) => e.key === 'Enter' && handleUpdateComment(comment._id)}
                          />
                          <button onClick={() => setEditingCommentId(null)} className="text-gray-400 hover:text-white"><X className="w-5 h-5"/></button>
                        </div>
                      ) : (
                        <p className="text-gray-300 break-words leading-relaxed">{comment.content}</p>
                      )}

                      {!editingCommentId && (
                        <div className="absolute -right-16 top-3 hidden group-hover:flex items-center gap-2">
                          {isCommentOwner && (
                            <button onClick={() => { setEditingCommentId(comment._id); setEditCommentText(comment.content); }} className="p-1.5 bg-gray-800 rounded-full text-gray-400 hover:text-blue-400"><Edit2 className="w-4 h-4" /></button>
                          )}
                          {canDelete && (
                            <button onClick={() => handleDeleteComment(comment._id)} className="p-1.5 bg-gray-800 rounded-full text-gray-400 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                          )}
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 ml-4 mt-1.5 block">{new Date(comment.createdAt).toLocaleString('vi-VN')}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ================= GIAO DIỆN LỚP PHỦ MODAL BÁO CÁO (REPORT MODAL) ================= */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowReportModal(false)}>
          <div className="bg-gray-850 border border-gray-700 rounded-2xl w-full max-w-md p-6 shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowReportModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <Flag className="w-5 h-5 text-orange-500 fill-orange-500/20" /> Báo cáo nội dung vi phạm
            </h3>
            <p className="text-gray-400 text-xs mb-4">Vui lòng cung cấp lý do bài viết này vi phạm tiêu chuẩn cộng đồng để đội ngũ hỗ trợ tiến hành xử lý sớm nhất.</p>
            
            <textarea 
              className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-orange-500 h-28 resize-none transition-colors" 
              placeholder="Nhập nội dung lý do (Ví dụ: thông tin sai lệch, phản cảm, spam, đả kích cá nhân...)" 
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
            />
            
            <div className="flex justify-end gap-3 mt-4">
              <button 
                type="button" 
                onClick={() => setShowReportModal(false)} 
                className="px-4 py-2 text-xs font-semibold bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-colors"
              >
                Hủy bỏ
              </button>
              <button 
                type="button" 
                onClick={handleReportPost} 
                disabled={!reportReason.trim()} 
                className="px-4 py-2 text-xs font-semibold bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white rounded-xl transition-colors"
              >
                Gửi báo cáo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}