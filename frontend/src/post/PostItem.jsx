import React, { useState, useRef, useEffect } from 'react';
import { 
  BadgeCheck, Edit, Trash2, Activity, Bookmark, 
  Utensils, Heart, MessageCircle, Eye, Share2, 
  MoreVertical, Flag, X, AlertTriangle 
} from 'lucide-react';
import MediaCarousel from './MediaCarousel';

// ================= HUY HIỆU XÁC THỰC =================
// Hiện tích xanh nếu: đã verify (isVerified) HOẶC là Personal Trainer (role === 'trainer').
// Đồng bộ logic với Community.jsx.
const isBadgeUser = (u) => !!(u?.isVerified || u?.role === 'trainer');

const VerifiedBadge = ({ user, className = "w-4 h-4" }) => {
  if (!isBadgeUser(user)) return null;
  return (
    <BadgeCheck
      className={`${className} text-sky-400 fill-sky-400/20 shrink-0`}
      title={user?.role === 'trainer' ? 'Personal Trainer' : 'Đã xác thực'}
    />
  );
};

const avatarRingClass = (u) =>
  u?.role === 'trainer'
    ? 'ring-2 ring-sky-400/70 group-hover/avatar:ring-sky-400'
    : 'ring-2 ring-gray-700 group-hover/avatar:ring-emerald-500';

export default function PostItem({
  post,
  currentUserId,
  editingPost,
  setEditingPost,
  handleViewPostDetails,
  handleViewProfile,
  selectedUserFilter,
  handleDeletePost,
  handleSaveEditPost,
  setViewingPlan,
  handleSaveToLibrary,
  handleToggleLike,
  openShareModal,
  handleReportPost 
}) {
  const isMyPost = post.userId?._id === currentUserId || post.userId === currentUserId;
  const hasLiked = post.likes?.includes(currentUserId);
  const isEditing = editingPost?.id === post._id;
  
  // State quản lý menu 3 chấm
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  // State quản lý Modal Báo cáo
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [errorMsg, setErrorMsg] = useState(""); // 🌟 State quản lý lỗi báo cáo

  // Xử lý click ra ngoài để đóng menu 3 chấm
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const submitReport = (e) => {
    e.stopPropagation();
    if (!reportReason.trim()) {
      setErrorMsg("⚠️ Vui lòng nhập chi tiết lý do báo cáo!"); // Báo lỗi trên UI thay vì alert
      return;
    }
    // Gọi hàm truyền từ cha xuống, truyền ID bài viết và lý do
    handleReportPost(post._id, reportReason);
    setShowReportModal(false);
    setReportReason("");
    setErrorMsg(""); // Reset lại lỗi
  };

  return (
    <>
      <div 
        className="bg-gray-800/60 backdrop-blur-sm border border-gray-700/60 p-5 md:p-7 rounded-3xl shadow-xl hover:border-gray-600 transition-colors cursor-pointer group/post" 
        onClick={() => !isEditing && handleViewPostDetails(post)}
      >
        {/* HEADER BÀI VIẾT */}
        <div className="flex items-start justify-between mb-5">
          <div 
            className="flex items-center gap-4 cursor-pointer group/avatar" 
            onClick={(e) => {
              e.stopPropagation();
              if (!selectedUserFilter || selectedUserFilter.id !== post.userId?._id) {
                handleViewProfile(post.userId?._id, { 
                  name: post.userId?.name || "Người dùng", 
                  isVerified: post.userId?.isVerified, 
                  avatar: post.userId?.avatar,
                  role: post.userId?.role
                });
              }
            }}
          >
            <img 
              src={post.userId?.avatar || "https://ui-avatars.com/api/?name=U"} 
              alt="avatar" 
              className={`w-12 h-12 rounded-full object-cover transition-all shadow-md ${avatarRingClass(post.userId)}`}
            />
            <div>
              <h4 className="font-bold text-base text-gray-100 group-hover/avatar:text-emerald-400 transition-colors flex items-center gap-1.5">
                {post.userId?.name || "Người dùng"}
                <VerifiedBadge user={post.userId} className="w-4 h-4" />
              </h4>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xs text-gray-400">{new Date(post.createdAt).toLocaleString('vi-VN')}</p>
                {post.userId?.role === 'trainer' && (
                  <span className="text-[10px] font-semibold text-sky-400/90 bg-sky-500/10 border border-sky-500/20 px-1.5 py-0.5 rounded-full">
                    Personal Trainer
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 3 CHẤM QUYỀN LỰC */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="text-gray-500 hover:text-gray-200 p-2 hover:bg-gray-700/50 rounded-xl transition-colors"
              title="Tùy chọn"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {/* MENU DROPDOWN */}
            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-20 overflow-hidden">
                {isMyPost ? (
                  <>
                    <button
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        setEditingPost({ id: post._id, content: post.content });
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:bg-gray-800 hover:text-blue-400 transition-colors"
                    >
                      <Edit className="w-4 h-4" /> Sửa bài viết
                    </button>
                    <button
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        handleDeletePost(post._id);
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:bg-gray-800 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" /> Xóa bài viết
                    </button>
                  </>
                ) : (
                  <button
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      setShowReportModal(true); // Mở Modal thay vì gọi prompt
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:bg-gray-800 hover:text-yellow-400 transition-colors"
                  >
                    <Flag className="w-4 h-4" /> Báo cáo bài viết
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* NỘI DUNG BÀI VIẾT (HOẶC CHẾ ĐỘ EDIT) */}
        <div className="mb-4">
          {isEditing ? (
            <div onClick={e => e.stopPropagation()} className="space-y-3">
              <textarea
                value={editingPost.content}
                onChange={(e) => setEditingPost({ ...editingPost, content: e.target.value })}
                className="w-full bg-gray-900 border border-emerald-500/50 rounded-xl p-4 text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none h-24"
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => setEditingPost(null)} className="px-4 py-2 text-sm font-bold text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-lg">Hủy</button>
                <button onClick={() => handleSaveEditPost(post._id)} className="px-4 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg">Lưu cập nhật</button>
              </div>
            </div>
          ) : (
            <p className="text-gray-200 text-[15px] leading-relaxed whitespace-pre-wrap">{post.content}</p>
          )}
        </div>

        {/* HÌNH ẢNH / VIDEO BÀI VIẾT */}
        <MediaCarousel 
          images={post.images} 
          video={post.video} 
          onMediaClick={(e) => { e.stopPropagation(); handleViewPostDetails(post); }} 
        />

        {/* SNAPSHOT LỊCH TẬP ĐÍNH KÈM */}
        {post.workoutSnapshot && (
          <div 
            onClick={(e) => { e.stopPropagation(); setViewingPlan({ type: 'workout', data: post.workoutSnapshot }) }} 
            className="mt-4 bg-gray-900/80 border border-emerald-500/30 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group/plan hover:bg-gray-800 transition-all hover:border-emerald-500/60 shadow-md"
          >
            <div className="flex items-center gap-4 text-emerald-400">
              <div className="p-3 bg-emerald-500/10 rounded-xl group-hover/plan:bg-emerald-500/20 transition-colors"><Activity className="w-6 h-6" /></div>
              <div>
                <p className="font-bold text-[15px] text-gray-100">Lịch tập được chia sẻ <span className="text-xs text-gray-500 font-normal ml-1">(Chạm để xem)</span></p>
                <p className="text-sm text-gray-400 mt-1">Gồm {post.workoutSnapshot.weeklySchedule?.length || post.workoutSnapshot.exercises?.length || 0} bài tập / mục</p>
              </div>
            </div>
            <button 
              onClick={(e) => handleSaveToLibrary(e, post._id, 'workout')} 
              className="w-full sm:w-auto flex justify-center items-center gap-2 px-4 py-2.5 text-sm font-bold text-emerald-400 hover:text-white bg-emerald-400/10 hover:bg-emerald-500 rounded-xl transition-all"
            >
              <Bookmark className="w-4 h-4" /> <span>Lưu về kho</span>
            </button>
          </div>
        )}

        {/* SNAPSHOT THỰC ĐƠN ĐÍNH KÈM */}
        {post.dietSnapshot && (
          <div 
            onClick={(e) => { e.stopPropagation(); setViewingPlan({ type: 'diet', data: post.dietSnapshot }) }} 
            className="mt-4 bg-gray-900/80 border border-yellow-500/30 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group/plan hover:bg-gray-800 transition-all hover:border-yellow-500/60 shadow-md"
          >
            <div className="flex items-center gap-4 text-yellow-400">
              <div className="p-3 bg-yellow-500/10 rounded-xl group-hover/plan:bg-yellow-500/20 transition-colors"><Utensils className="w-6 h-6" /></div>
              <div>
                <p className="font-bold text-[15px] text-gray-100">Thực đơn được chia sẻ <span className="text-xs text-gray-500 font-normal ml-1">(Chạm để xem)</span></p>
                <p className="text-sm text-gray-400 mt-1">Mục tiêu: {post.dietSnapshot.dailyTotal?.calories || 0} kcal/ngày</p>
              </div>
            </div>
            <button 
              onClick={(e) => handleSaveToLibrary(e, post._id, 'diet')} 
              className="w-full sm:w-auto flex justify-center items-center gap-2 px-4 py-2.5 text-sm font-bold text-yellow-400 hover:text-white bg-yellow-400/10 hover:bg-yellow-500 rounded-xl transition-all"
            >
              <Bookmark className="w-4 h-4" /> <span>Lưu về kho</span>
            </button>
          </div>
        )}

        {/* THANH THỐNG KÊ VÀ TƯƠNG TÁC */}
        <div className="flex items-center justify-between mt-6 pt-5 border-t border-gray-700/50 flex-wrap gap-y-4">
          <div className="flex items-center gap-4 sm:gap-8">
            <button onClick={(e) => { e.stopPropagation(); handleToggleLike(post._id); }} className="flex items-center gap-2 text-gray-400 hover:text-pink-500 group/btn transition-colors">
              <div className={`p-2 rounded-full ${hasLiked ? 'bg-pink-500/10' : 'group-hover/btn:bg-pink-500/10'}`}>
                <Heart className={`w-5 h-5 sm:w-6 sm:h-6 transition-transform group-hover/btn:scale-110 ${hasLiked ? "fill-pink-500 text-pink-500" : ""}`} />
              </div>
              <span className="text-base font-bold">{post.likes?.length || 0}</span>
            </button>
            <button className="flex items-center gap-2 text-gray-400 hover:text-blue-400 group/btn transition-colors">
              <div className="p-2 rounded-full group-hover/btn:bg-blue-400/10">
                <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6 transition-transform group-hover/btn:scale-110" />
              </div>
              <span className="text-base font-bold">{post.commentsCount || 0}</span>
            </button>
          </div>

          <div className="flex items-center gap-3 sm:gap-6">
            <div className="flex items-center gap-1.5 text-gray-500 bg-gray-800 px-3 py-1.5 rounded-lg" title="Lượt xem">
              <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-sm font-semibold">{post.viewsCount || 0}</span>
            </div>

            {(post.workoutSnapshot || post.dietSnapshot) && (
              <div className="flex items-center gap-1.5 text-yellow-500/90 bg-yellow-500/10 px-3 py-1.5 rounded-lg border border-yellow-500/20" title="Số người đã lưu lịch này">
                <Bookmark className="w-4 h-4 sm:w-5 sm:h-5 fill-yellow-500/50" />
                <span className="text-sm font-bold">{post.savesCount || 0}</span>
              </div>
            )}

            <button 
              onClick={(e) => { e.stopPropagation(); openShareModal(post._id); }} 
              className="flex items-center gap-1.5 text-gray-400 hover:text-emerald-400 bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-lg transition-colors" 
              title="Chia sẻ"
            >
              <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-sm font-semibold hidden sm:inline">Chia sẻ</span>
            </button>
          </div>
        </div>
      </div>

      {/* MODAL BÁO CÁO BÀI VIẾT */}
      {showReportModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={(e) => { 
            e.stopPropagation(); 
            setShowReportModal(false);
            setErrorMsg(""); // Reset khi click ra ngoài
            setReportReason("");
          }}
        >
          <div 
            className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md shadow-2xl relative animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()} 
          >
            {/* Tiêu đề Modal */}
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold text-gray-100 flex items-center gap-2">
                <AlertTriangle className="w-6 h-6 text-yellow-500" /> 
                Báo cáo bài viết
              </h3>
              <button 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  setShowReportModal(false);
                  setErrorMsg(""); // Reset khi tắt modal
                  setReportReason("");
                }} 
                className="text-gray-500 hover:text-gray-300 transition-colors p-1 bg-gray-800 hover:bg-gray-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-sm text-gray-400 mb-5">
              Bạn đang báo cáo bài viết của <strong className="text-gray-200">{post.userId?.name || "người dùng này"}</strong>. Vui lòng cho quản trị viên biết chi tiết vấn đề.
            </p>

            {/* Input nhập lý do */}
            <textarea
              autoFocus
              value={reportReason}
              onChange={(e) => {
                setReportReason(e.target.value);
                if (errorMsg) setErrorMsg(""); // 🌟 Tự động xóa dòng báo lỗi khi người dùng bắt đầu gõ
              }}
              placeholder="Ví dụ: Nội dung spam, thô tục, sai sự thật..."
              className={`w-full bg-gray-800 border ${
                errorMsg ? 'border-red-500 focus:ring-red-500' : 'border-gray-700 focus:border-yellow-500 focus:ring-yellow-500'
              } rounded-xl p-4 text-gray-100 focus:outline-none focus:ring-1 resize-none h-32 mb-2 placeholder-gray-500 transition-colors`}
            />

            {/* 🌟 Dòng text báo lỗi xịn xò thay cho alert */}
            <div className="h-5 mb-4">
              {errorMsg && <p className="text-red-400 text-sm animate-pulse">{errorMsg}</p>}
            </div>

            {/* Nút hành động */}
            <div className="flex justify-end gap-3">
              <button 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  setShowReportModal(false);
                  setErrorMsg(""); // 🌟 Reset lỗi khi bấm hủy
                  setReportReason(""); 
                }}
                className="px-5 py-2.5 text-sm font-bold text-gray-300 bg-gray-800 hover:bg-gray-700 rounded-xl transition-all"
              >
                Hủy bỏ
              </button>
              <button 
                onClick={submitReport}
                className="px-5 py-2.5 text-sm font-bold text-gray-900 bg-yellow-500 hover:bg-yellow-400 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-yellow-500/20"
              >
                <Flag className="w-4 h-4" /> Gửi báo cáo
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}