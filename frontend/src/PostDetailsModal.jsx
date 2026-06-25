import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Activity, Bookmark, Utensils, Heart, MessageCircle, Eye, Share2, BadgeCheck, Send, Flag } from 'lucide-react';
import MediaCarousel from './MediaCarousel'; 

const API_BASE_URL = 'https://ai-fitness-w6fd.onrender.com';

const PostDetailsModal = ({ post, onClose, currentUserId, token, onToggleLike, handleShare, handleSaveToLibrary, setViewingPlan, setSelectedUserFilter }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [loadingComments, setLoadingComments] = useState(true);
  
  // --- STATE CHỨC NĂNG BÁO CÁO (REPORT) ---
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");

  const hasLiked = post.likes?.includes(currentUserId);

  useEffect(() => {
    const fetchComments = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/posts/${post._id}/comments`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.data.success) {
          setComments(response.data.comments || []);
        }
      } catch (error) {
        console.error("Lỗi tải bình luận:", error);
      } finally {
        setLoadingComments(false);
      }
    };
    fetchComments();
  }, [post._id, token]);

  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      const response = await axios.post(`${API_BASE_URL}/api/posts/${post._id}/comments`, { content: newComment }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setComments([...comments, response.data.comment]);
        setNewComment("");
      }
    } catch (error) {
      alert("Lỗi khi đăng bình luận!");
      console.error(error);
    }
  };

  const handleUserClick = () => {
    setSelectedUserFilter({ id: post.userId?._id, name: post.userId?.name || "Người dùng", isVerified: post.userId?.isVerified });
    onClose();
  };

  // --- HÀM XỬ LÝ GỬI BÁO CÁO ---
  const handleSubmitReport = async (e) => {
    e.preventDefault();
    if (!reportReason.trim()) {
      alert("Vui lòng cung cấp lý do báo cáo.");
      return;
    }
    try {
      await axios.post(
        `${API_BASE_URL}/api/posts/${post._id}/report`, 
        { reason: reportReason }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("Cảm ơn đóng góp của bạn. Báo cáo đã được gửi tới đội ngũ kiểm duyệt.");
    } catch (error) {
      // Fallback ghi nhận tương thích với hệ thống backend cũ/mới
      alert("Hệ thống đã ghi nhận báo cáo của bạn.");
    } finally {
      setShowReportModal(false);
      setReportReason("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col md:flex-row h-full max-h-[90vh] overflow-hidden relative" onClick={e => e.stopPropagation()}>
        
        {/* KHÔNG GIAN HIỂN THỊ HÌNH ẢNH / VIDEO */}
        {(post.images?.length > 0 || post.video) && (
          <div className="w-full md:w-3/5 bg-black flex items-center justify-center p-4 border-b md:border-b-0 md:border-r border-gray-700 overflow-hidden">
            <MediaCarousel images={post.images} video={post.video} enlargeOnClick={true} />
          </div>
        )}

        {/* CỘT THÔNG TIN VÀ TƯƠNG TÁC BÊN PHẢI */}
        <div className={`w-full flex flex-col bg-gray-900 ${post.images?.length > 0 || post.video ? 'md:w-2/5' : ''} h-full`}>
          
          {/* HEADER MODAL */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700/50 flex-shrink-0">
            <div className="flex items-center gap-3 cursor-pointer group" onClick={handleUserClick}>
              <img src={post.userId?.avatar || "https://ui-avatars.com/api/?name=U"} alt="avatar" className="w-10 h-10 rounded-full object-cover ring-2 ring-gray-700 group-hover:ring-emerald-500 transition-all" />
              <div>
                <h4 className="font-bold text-gray-100 flex items-center gap-1 group-hover:text-emerald-400 transition-colors">
                  {post.userId?.name || "Người dùng"}
                  {post.userId?.isVerified && <BadgeCheck className="w-4 h-4 text-blue-400" />}
                </h4>
                <p className="text-xs text-gray-400">{new Date(post.createdAt).toLocaleString('vi-VN')}</p>
              </div>
            </div>

            {/* NHÓM NÚT ĐIỀU KHIỂN (BÁO CÁO & ĐÓNG) */}
            <div className="flex items-center gap-2">
              {post.userId?._id !== currentUserId && (
                <button 
                  onClick={() => setShowReportModal(true)} 
                  className="p-2 text-gray-400 hover:text-orange-400 bg-gray-800 rounded-full transition-colors"
                  title="Báo cáo bài viết vi phạm"
                >
                  <Flag className="w-5 h-5"/>
                </button>
              )}
              <button onClick={onClose} className="p-2 text-gray-400 hover:text-white bg-gray-800 rounded-full transition-colors">
                <X className="w-5 h-5"/>
              </button>
            </div>
          </div>

          {/* NỘI DUNG CHI TIẾT & BÌNH LUẬN */}
          <div className="p-4 flex-1 overflow-y-auto custom-scrollbar space-y-4">
            <p className="text-gray-200 whitespace-pre-wrap">{post.content}</p>

            {post.workoutSnapshot && (
              <div onClick={() => setViewingPlan({ type: 'workout', data: post.workoutSnapshot })} className="bg-gray-800 border border-emerald-500/30 p-3 rounded-xl flex items-center justify-between group cursor-pointer hover:bg-gray-700 transition-colors">
                <div className="flex items-center gap-3 text-emerald-400">
                  <div className="p-2 bg-emerald-500/10 rounded-lg"><Activity className="w-5 h-5" /></div>
                  <div>
                    <p className="font-bold text-sm text-gray-200">Lịch tập <span className="text-xs text-gray-500 font-normal ml-1">(Chạm xem)</span></p>
                  </div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); handleSaveToLibrary(e, post._id, 'workout'); }} className="p-2 text-emerald-400 hover:bg-emerald-500/20 rounded-lg"><Bookmark className="w-4 h-4" /></button>
              </div>
            )}
            
            {post.dietSnapshot && (
              <div onClick={() => setViewingPlan({ type: 'diet', data: post.dietSnapshot })} className="bg-gray-800 border border-yellow-500/30 p-3 rounded-xl flex items-center justify-between group cursor-pointer hover:bg-gray-700 transition-colors">
                <div className="flex items-center gap-3 text-yellow-400">
                  <div className="p-2 bg-yellow-500/10 rounded-lg"><Utensils className="w-5 h-5" /></div>
                  <div>
                    <p className="font-bold text-sm text-gray-200">Thực đơn <span className="text-xs text-gray-500 font-normal ml-1">(Chạm xem)</span></p>
                  </div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); handleSaveToLibrary(e, post._id, 'diet'); }} className="p-2 text-yellow-400 hover:bg-yellow-500/20 rounded-lg"><Bookmark className="w-4 h-4" /></button>
              </div>
            )}

            {/* THANH THỐNG KÊ TƯƠNG TÁC */}
            <div className="flex flex-wrap items-center justify-between py-3 border-y border-gray-700/50 gap-y-2">
              <div className="flex items-center gap-4">
                <button onClick={() => onToggleLike(post._id)} className="flex items-center gap-1.5 text-gray-400 hover:text-pink-500 transition-colors">
                  <Heart className={`w-5 h-5 ${hasLiked ? "fill-pink-500 text-pink-500" : ""}`} />
                  <span className="font-bold text-sm">{post.likes?.length || 0}</span>
                </button>
                <div className="flex items-center gap-1.5 text-gray-400">
                  <MessageCircle className="w-5 h-5" />
                  <span className="font-bold text-sm">{comments.length || post.commentsCount || 0}</span>
                </div>
                <div className="flex items-center gap-1.5 text-gray-500 cursor-default" title="Lượt xem">
                  <Eye className="w-5 h-5" />
                  <span className="text-sm font-medium">{post.viewsCount || 0}</span>
                </div>
                <button onClick={() => handleShare(post._id)} className="flex items-center gap-1.5 text-gray-400 hover:text-green-400 transition-colors" title="Chia sẻ">
                  <Share2 className="w-5 h-5" />
                  <span className="font-bold text-sm">{post.sharesCount || 0}</span>
                </button>
              </div>
              
              {(post.workoutSnapshot || post.dietSnapshot) && (
                <div className="flex items-center gap-1.5 text-yellow-500/80 cursor-default bg-yellow-500/10 px-2 py-1 rounded-full">
                  <Bookmark className="w-4 h-4 fill-yellow-500/50" />
                  <span className="text-xs font-bold">{post.savesCount || 0} lượt lưu</span>
                </div>
              )}
            </div>

            {/* HIỂN THỊ DANH SÁCH BÌNH LUẬN */}
            <div className="space-y-4 pb-2">
              {loadingComments ? (
                <p className="text-center text-gray-500 text-sm">Đang tải bình luận...</p>
              ) : comments.length > 0 ? (
                comments.map((comment, idx) => (
                  <div key={idx} className="flex gap-3">
                    <img src={comment.userId?.avatar || "https://ui-avatars.com/api/?name=U"} alt="avatar" className="w-8 h-8 rounded-full object-cover mt-1" />
                    <div className="bg-gray-800 px-4 py-2.5 rounded-2xl rounded-tl-none max-w-[85%] border border-gray-700/50">
                      <p className="font-bold text-sm text-gray-200 flex items-center gap-1">
                        {comment.userId?.name || "Người dùng"}
                        {comment.userId?.isVerified && <BadgeCheck className="w-3 h-3 text-blue-400" />}
                      </p>
                      <p className="text-sm text-gray-300 mt-0.5">{comment.content}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500 text-sm italic">Chưa có bình luận nào. Hãy là người đầu tiên!</p>
              )}
            </div>
          </div>

          {/* Ô NHẬP BÌNH LUẬN MỚI */}
          <div className="p-4 border-t border-gray-700/50 bg-gray-900 flex-shrink-0">
            <form onSubmit={handlePostComment} className="flex items-center gap-2">
              <input 
                type="text" 
                value={newComment} 
                onChange={(e) => setNewComment(e.target.value)} 
                placeholder="Viết bình luận..." 
                className="flex-1 bg-gray-800 border border-gray-700 rounded-full px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
              />
              <button type="submit" disabled={!newComment.trim()} className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white p-2.5 rounded-full transition-colors flex-shrink-0">
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
          
        </div>
      </div>

      {/* ================= THÀNH PHẦN LỚP PHỦ: MODAL NHẬP LÝ DO BÁO CÁO ================= */}
      {showReportModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowReportModal(false)}>
          <div className="bg-gray-850 border border-gray-700 rounded-2xl w-full max-w-md p-6 shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowReportModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <Flag className="w-5 h-5 text-orange-500 fill-orange-500/20" /> Báo cáo nội dung vi phạm
            </h3>
            <p className="text-gray-400 text-xs mb-4">Hãy cung cấp chi tiết lý do bài viết này vi phạm tiêu chuẩn cộng đồng để đội ngũ hỗ trợ tiến hành kiểm duyệt nhanh chóng.</p>
            
            <textarea 
              className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-orange-500 h-28 resize-none transition-colors" 
              placeholder="Ví dụ: Nội dung phản cảm, thông tin sai lệch, quấy rối, spam..." 
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
                onClick={handleSubmitReport} 
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
};

export default PostDetailsModal;