import api from "./services/api";
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Heart, MessageCircle, Send, Activity, Utensils,
  Trash2, Image as ImageIcon, Film, X,
  Dumbbell, Apple, Bookmark, Flame, Search, User,
  Eye, Share2, Bell, BadgeCheck, UserPlus, UserMinus, Info, Link, Edit, UserCircle, Users, Sparkles
} from 'lucide-react';

// IMPORT CÁC COMPONENT CON
import PlanDetailsModal from './post/PlanDetailsModal';
import MediaCarousel from './post/MediaCarousel';
import PostDetailsModal from './post/PostDetailsModal';
import PostItem from './post/PostItem';
import NotificationSidebar from './post/NotificationSidebar';

// ================= HUY HIỆU XÁC THỰC =================
// Hiện tích xanh nếu: đã verify (isVerified) HOẶC là Personal Trainer (role === 'trainer').
// Trainer luôn được coi là đáng tin cậy trên nền tảng nên hiện tích xanh mặc định,
// kể cả khi admin chưa gắn cờ isVerified riêng cho họ.
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

// Vòng avatar: gradient nổi bật hơn cho Trainer, viền xám nhạt cho user thường
const avatarRingClass = (u) =>
  u?.role === 'trainer'
    ? 'ring-2 ring-offset-2 ring-offset-gray-900 ring-sky-400/70'
    : 'ring-1 ring-white/10';

export default function Community() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [posts, setPosts] = useState([]);
  const [userProfilePosts, setUserProfilePosts] = useState([]); // State riêng lưu bài viết trang cá nhân
  const [loading, setLoading] = useState(true);
  const [loadingProfilePosts, setLoadingProfilePosts] = useState(false);

  const [activeTab, setActiveTab] = useState('feed');

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUserFilter, setSelectedUserFilter] = useState(null);
  const [savedScrollPos, setSavedScrollPos] = useState(0);

  const [newPostContent, setNewPostContent] = useState("");
  const [selectedImages, setSelectedImages] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [attachPlan, setAttachPlan] = useState(null);

  const [viewingPlan, setViewingPlan] = useState(null);
  const [viewingPostDetails, setViewingPostDetails] = useState(null);

  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [archiveSelectionType, setArchiveSelectionType] = useState(null);
  const [archivedPlansList, setArchivedPlansList] = useState([]);
  const [loadingArchive, setLoadingArchive] = useState(false);

  const [followingList, setFollowingList] = useState([]);
  const [realNotifications, setRealNotifications] = useState([]);

  const [showShareModal, setShowShareModal] = useState(false);
  const [sharingPostId, setSharingPostId] = useState(null);

  const [editingPost, setEditingPost] = useState(null);

  // --- STATE CHO MOBILE MODALS ---
  const [showMobileFollowing, setShowMobileFollowing] = useState(false);
  const [showMobileNotifications, setShowMobileNotifications] = useState(false);

  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const token = localStorage.getItem("token");

  // --- REQUEST GUARDS: chống race-condition khi đổi tab / đổi profile liên tục ---
  const feedFetchToken = useRef(0);
  const profileFetchToken = useRef(0);

  const getCurrentUser = () => {
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return {
        id: payload.id || payload._id,
        name: payload.name || payload.fullName || payload.username || "tôi",
        role: payload.role || null,
        isVerified: payload.isVerified || false
      };
    } catch (e) { return null; }
  };
  const currentUser = getCurrentUser();
  const currentUserId = currentUser?.id;

  const unreadCount = realNotifications.filter(n => !n.isRead).length;

  // ================= TẢI DỮ LIỆU BAN ĐẦU =================
  const fetchPosts = async (type = activeTab) => {
    const myToken = ++feedFetchToken.current;
    setLoading(true);
    try {
      let endpoint = `/posts/feed`;
      if (type === 'latest') endpoint = `/posts/latest`;
      else if (type === 'following') endpoint = `/posts/following`;
      else if (type === 'liked') endpoint = `/posts/liked`;

      const response = await api.get(endpoint, { headers: { Authorization: `Bearer ${token}` } });
      if (myToken !== feedFetchToken.current) return; // có request mới hơn, bỏ qua kết quả cũ này
      if (response.data.success) {
        setPosts(response.data.posts);
      }
    } catch (error) {
      if (myToken === feedFetchToken.current) console.error("Lỗi tải bài viết:", error);
    } finally {
      if (myToken === feedFetchToken.current) setLoading(false);
    }
  };

  const fetchFollowing = async () => {
    try {
      const res = await api.get(`/users/me/following`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data.success) setFollowingList(res.data.following);
    } catch (error) { console.error("Lỗi tải danh sách theo dõi", error); }
  };

  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const res = await api.get(`/posts/notifications`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data.success) setRealNotifications(res.data.notifications);
    } catch (error) { console.error("Lỗi tải danh sách thông báo", error); }
  };

  useEffect(() => {
    fetchPosts(activeTab);
    fetchFollowing();
    fetchNotifications();
  }, [activeTab]);

  // ================= XỬ LÝ PROFILE =================
  const handleViewProfile = async (userId, basicInfo) => {
    const myToken = ++profileFetchToken.current;
    setSavedScrollPos(window.scrollY);
    setUserProfilePosts([]); // xóa ngay dữ liệu cũ, tránh nháy bài viết của user/tab trước đó
    setSelectedUserFilter({ id: userId, ...basicInfo, isLoading: true });
    setLoadingProfilePosts(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    try {
      // 1. Tải thông tin Profile User
      const resUser = await api.get(`/users/${userId}/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (myToken !== profileFetchToken.current) return; // đã có lượt xem profile mới hơn
      if (resUser.data.success) {
        setSelectedUserFilter({
          id: userId,
          ...resUser.data.user,
          followersCount: resUser.data.user.followers?.length || 0,
          followingCount: resUser.data.user.following?.length || 0,
          isLoading: false
        });
      }

      // 2. Tải RIÊNG danh sách bài viết chuẩn của User này (không lọc theo Tab)
      const resPosts = await api.get(`/posts/user/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (myToken !== profileFetchToken.current) return;
      if (resPosts.data.success) {
        setUserProfilePosts(resPosts.data.posts);
      }
    } catch (error) {
      if (myToken !== profileFetchToken.current) return;
      console.error("Lỗi tải thông tin user", error);
      setSelectedUserFilter(prev => ({
        ...prev, followersCount: 0, followingCount: 0, bio: "Chưa cập nhật tiểu sử.", isLoading: false
      }));
    } finally {
      if (myToken === profileFetchToken.current) setLoadingProfilePosts(false);
    }
  };

  const handleCloseProfile = () => {
    profileFetchToken.current++; // vô hiệu hóa mọi request profile đang bay
    setSelectedUserFilter(null);
    setUserProfilePosts([]);
    setTimeout(() => {
      window.scrollTo({ top: savedScrollPos, behavior: 'instant' });
    }, 10);
  };

  // ================= MỞ PROFILE TỪ QUÉT MÃ QR =================
  // Khi được điều hướng tới đây kèm ?viewUser=<id> (ví dụ từ màn hình quét QR),
  // tự động mở đúng profile card đó — giống hệt hành vi bấm vào 1 người trong danh sách theo dõi.
  useEffect(() => {
    const viewUserId = searchParams.get('viewUser');
    if (!viewUserId) return;

    handleViewProfile(viewUserId, {});

    // Xóa query param khỏi URL sau khi đã xử lý, tránh việc refresh/back lại mở lại profile này
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('viewUser');
    setSearchParams(nextParams, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleToggleFollow = async (userId) => {
    try {
      const res = await api.post(`/users/${userId}/follow`, {}, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data.success) {
        fetchFollowing();
        if (selectedUserFilter && selectedUserFilter.id === userId) {
          setSelectedUserFilter(prev => ({
            ...prev,
            followersCount: res.data.isFollowing
              ? (prev.followersCount || 0) + 1
              : Math.max(0, (prev.followersCount || 0) - 1)
          }));
        }
      }
    } catch (error) { console.error(error); }
  };

  const handleViewMyProfile = () => {
    handleViewProfile(currentUserId, { name: currentUser?.name, role: currentUser?.role, isVerified: currentUser?.isVerified });
  };

  // ================= QUẢN LÝ ĐĂNG BÀI & ĐÍNH KÈM =================
  const openArchiveSelector = async (type) => {
    setArchiveSelectionType(type);
    setShowArchiveModal(true);
    setLoadingArchive(true);
    try {
      const response = await api.get(`/library?type=${type}`, { headers: { Authorization: `Bearer ${token}` } });
      if (response.data.success) setArchivedPlansList(response.data.library);
    } catch (error) { alert("Không thể tải kho lưu trữ."); } finally { setLoadingArchive(false); }
  };

  const handleSelectPlanToAttach = (source, type, libraryId = null) => {
    setAttachPlan({ source, type, libraryId });
    setShowArchiveModal(false);
  };

  const handleRemovePreviewImage = (indexToRemove) => setSelectedImages(prev => prev.filter((_, idx) => idx !== indexToRemove));
  const handleRemovePreviewVideo = () => { setSelectedVideo(null); if (videoInputRef.current) videoInputRef.current.value = ""; };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newPostContent.trim() && selectedImages.length === 0 && !selectedVideo && !attachPlan) return;

    const formData = new FormData();
    formData.append("content", newPostContent);
    selectedImages.forEach(img => formData.append("images", img));
    if (selectedVideo) formData.append("video", selectedVideo);

    let endpoint = `/posts`;
    if (attachPlan) {
      if (attachPlan.source === 'master') {
        endpoint = `/posts/share-master`;
        formData.append("shareType", attachPlan.type);
      } else if (attachPlan.source === 'archive') {
        endpoint = `/posts/share-library`;
        formData.append("libraryId", attachPlan.libraryId);
      }
    }

    try {
      // Không tự set 'Content-Type': 'multipart/form-data' — thiếu boundary khiến backend
      // (Multer) không parse được FormData, req.body sẽ undefined. Để axios tự set header.
      const response = await api.post(endpoint, formData, { headers: { Authorization: `Bearer ${token}` } });
      if (response.data.success) {
        setNewPostContent(""); setSelectedImages([]); setSelectedVideo(null); setAttachPlan(null);
        if (imageInputRef.current) imageInputRef.current.value = "";
        if (videoInputRef.current) videoInputRef.current.value = "";

        // Nếu đang ở trang cá nhân của chính mình, cập nhật luôn
        if (selectedUserFilter?.id === currentUserId) {
          handleViewProfile(currentUserId, { name: currentUser?.name });
        } else {
          fetchPosts(activeTab);
        }
      }
    } catch (error) { alert(error.response?.data?.message || "Lỗi khi đăng bài!"); }
  };

  // ================= TƯƠNG TÁC BÀI VIẾT (SỬA, XÓA, LƯU, LIKE) =================
  const handleSaveEditPost = async (postId) => {
    if (!editingPost.content.trim()) return;
    try {
      const res = await api.put(`/posts/${postId}`, { content: editingPost.content }, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data.success) {
        const updateFn = list => list.map(p => p._id === postId ? { ...p, content: editingPost.content } : p);
        setPosts(updateFn);
        setUserProfilePosts(updateFn);
        setEditingPost(null);
      }
    } catch (error) {
      alert(error.response?.data?.message || "Lỗi khi cập nhật bài viết.");
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm("Bạn có chắc muốn xóa bài viết này? Hành động này không thể hoàn tác.")) return;
    try {
      await api.delete(`/posts/${postId}`, { headers: { Authorization: `Bearer ${token}` } });
      setPosts(prev => prev.filter(p => p._id !== postId));
      setUserProfilePosts(prev => prev.filter(p => p._id !== postId));
      if (viewingPostDetails?._id === postId) setViewingPostDetails(null);
    } catch (error) {
      alert("Lỗi khi xóa bài viết.");
    }
  };

  const handleSaveToLibrary = async (e, postId, type) => {
    e.stopPropagation();
    try {
      const response = await api.post(`/library`, { postId, type }, { headers: { Authorization: `Bearer ${token}` } });
      if (response.data.success) {
        alert(`✅ ${response.data.message}`);
        const updateSaves = list => list.map(p => p._id === postId ? { ...p, savesCount: (p.savesCount || 0) + 1 } : p);
        setPosts(updateSaves);
        setUserProfilePosts(updateSaves);
        if (viewingPostDetails?._id === postId) setViewingPostDetails(prev => ({ ...prev, savesCount: (prev.savesCount || 0) + 1 }));
      }
    } catch (error) { alert(error.response?.data?.message || "Lỗi khi lưu dữ liệu."); }
  };

  const handleToggleLike = async (postId) => {
    try {
      const updateLikes = list => list.map(p => {
        if (p._id === postId) {
          const isLiked = p.likes?.includes(currentUserId);
          const newLikes = isLiked ? p.likes.filter(id => id !== currentUserId) : [...(p.likes || []), currentUserId];
          return { ...p, likes: newLikes };
        }
        return p;
      });

      setPosts(updateLikes);
      setUserProfilePosts(updateLikes);

      if (viewingPostDetails?._id === postId) {
        setViewingPostDetails(prev => {
          const isLiked = prev.likes?.includes(currentUserId);
          return {
            ...prev,
            likes: isLiked ? prev.likes.filter(id => id !== currentUserId) : [...(prev.likes || []), currentUserId]
          };
        });
      }

      await api.post(`/posts/${postId}/like`, {}, { headers: { Authorization: `Bearer ${token}` } });
    } catch (error) {
      fetchPosts(activeTab);
    }
  };

  const handleViewPostDetails = async (post) => {
    setViewingPostDetails(post);
    try {
      const res = await api.get(`/posts/${post._id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data.success) {
        setViewingPostDetails(res.data.post);
        const updatePost = list => list.map(p => p._id === post._id ? res.data.post : p);
        setPosts(updatePost);
        setUserProfilePosts(updatePost);
      }
    } catch (error) { console.error(error); }
  };

  // ================= XỬ LÝ CHIA SẺ =================
  const openShareModal = (postId) => {
    setSharingPostId(postId);
    setShowShareModal(true);
  };

  const handleCopyLink = async () => {
    try {
      const res = await api.post(`/posts/${sharingPostId}/share`, {}, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data.success) {
        const updateShare = list => list.map(p => p._id === sharingPostId ? { ...p, sharesCount: res.data.sharesCount } : p);
        setPosts(updateShare);
        setUserProfilePosts(updateShare);
        if (viewingPostDetails?._id === sharingPostId) setViewingPostDetails(prev => ({ ...prev, sharesCount: res.data.sharesCount }));
      }
    } catch (error) { console.error(error); }

    navigator.clipboard.writeText(`${window.location.origin}/post/${sharingPostId}`);
    alert("Đã sao chép liên kết bài viết!");
    setShowShareModal(false);
  };

  const handleSendToUser = async (targetUserId) => {
    try {
      const res = await api.post(`/posts/${sharingPostId}/share-to-user`, { targetUserId }, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data.success) {
        alert("Đã gửi bài viết thành công!");
        setShowShareModal(false);
      }
    } catch (error) {
      alert("Lỗi khi gửi bài viết. Vui lòng thử lại.");
    }
  };

  // ================= XỬ LÝ THÔNG BÁO & BÁO CÁO =================
  const handleNotificationClick = async (noti) => {
    setRealNotifications(prev => prev.map(n => n._id === noti._id ? { ...n, isRead: true } : n));
    try { await api.patch(`/posts/notifications/${noti._id}/read`, {}, { headers: { Authorization: `Bearer ${token}` } }); } catch (e) { }

    if (noti.type === 'follow' && noti.senderId) {
      handleViewProfile(noti.senderId._id, { name: noti.senderId.name, isVerified: noti.senderId.isVerified, avatar: noti.senderId.avatar, role: noti.senderId.role });
      return;
    }

    if (noti.postId) {
      try {
        const res = await api.get(`/posts/${noti.postId}`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.data.success) setViewingPostDetails(res.data.post);
        else alert("Bài viết này không còn tồn tại.");
      } catch (error) { alert("Không thể tải bài viết lúc này."); }
    }
  };

  const handleDeleteNotification = async (e, notiId) => {
    e.stopPropagation();
    try {
      await api.delete(`/posts/notifications/${notiId}`, { headers: { Authorization: `Bearer ${token}` } });
      setRealNotifications(prev => prev.filter(n => n._id !== notiId));
    } catch (error) { console.error("Lỗi xóa thông báo", error); }
  };

  const handleReportPost = async (postId, reason) => {
    if (!reason) return;
    try {
      await api.post(`/posts/${postId}/report`, { reason }, { headers: { Authorization: `Bearer ${token}` } });
      alert("Đã gửi báo cáo bài viết tới Quản trị viên.");
    } catch (error) {
      alert(error.response?.data?.message || "Lỗi khi báo cáo bài viết.");
    }
  };

  // ================= TÍNH DANH SÁCH BÀI VIẾT HIỂN THỊ =================
  const displayPosts = selectedUserFilter
    ? userProfilePosts.filter(post => {
        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          return post.content?.toLowerCase().includes(term);
        }
        return true;
      })
    : posts.filter(post => {
        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          return post.content?.toLowerCase().includes(term) || post.userId?.name?.toLowerCase().includes(term);
        }
        return true;
      });

  const TABS = [
    { key: 'feed', label: 'Dành cho bạn', icon: Flame },
    { key: 'latest', label: 'Mới nhất', icon: Sparkles },
    { key: 'following', label: 'Đang theo dõi', icon: User },
    { key: 'liked', label: 'Đã thích', icon: Heart },
  ];

  if (loading && posts.length === 0 && !selectedUserFilter) {
    return (
      <div className="flex justify-center items-center min-h-[70vh] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-950/40 via-gray-950 to-gray-950">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-800 border-t-emerald-400"></div>
          <div className="absolute inset-0 animate-ping rounded-full h-12 w-12 border border-emerald-500/20"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-950/30 via-gray-950 to-gray-950">
      <div className="max-w-[1440px] mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 w-full flex gap-4 sm:gap-6 lg:gap-8 justify-center items-start animate-in fade-in duration-500 relative">

        {/* ================= CỘT TRÁI: ĐANG THEO DÕI ================= */}
        <div className="hidden lg:block w-72 xl:w-80 shrink-0 sticky top-24 space-y-5 z-10">
          <button
            onClick={handleViewMyProfile}
            className="w-full bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white rounded-3xl p-4 shadow-lg shadow-emerald-900/30 flex items-center gap-3 transition-all hover:-translate-y-0.5 hover:shadow-emerald-900/50"
          >
            <div className={`bg-white/15 p-2 rounded-full ${avatarRingClass(currentUser)}`}>
              <UserCircle className="w-6 h-6" />
            </div>
            <span className="font-bold text-base truncate flex items-center gap-1.5">
              {currentUser?.name || "Tài khoản của tôi"}
              <VerifiedBadge user={currentUser} className="w-4 h-4 text-white" />
            </span>
          </button>

          <div className="bg-gray-900/60 backdrop-blur-xl border border-white/5 rounded-3xl p-5 shadow-xl shadow-black/20">
            <h3 className="text-white text-[15px] font-bold mb-4 flex items-center gap-2 border-b border-white/5 pb-3.5">
              <Users className="w-4 h-4 text-emerald-400" /> Đang theo dõi
              <span className="bg-emerald-500/15 text-emerald-300 text-xs font-semibold px-2 py-0.5 rounded-full ml-auto">{followingList.length}</span>
            </h3>
            <div className="space-y-1 max-h-[50vh] overflow-y-auto custom-scrollbar pr-1.5">
              {followingList.length > 0 ? followingList.map(user => (
                <div
                  key={user._id}
                  onClick={() => handleViewProfile(user._id, { name: user.name, isVerified: user.isVerified, avatar: user.avatar, role: user.role })}
                  className={`flex items-center gap-3 p-2 rounded-2xl cursor-pointer transition-all ${selectedUserFilter?.id === user._id ? 'bg-emerald-500/10 border border-emerald-500/30' : 'hover:bg-white/5 border border-transparent'}`}
                >
                  <img src={user.avatar || "https://ui-avatars.com/api/?name=U"} className={`w-10 h-10 rounded-full object-cover ${avatarRingClass(user)}`} alt="avatar" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-100 flex items-center gap-1 truncate">
                      {user.name}
                      <VerifiedBadge user={user} className="w-3.5 h-3.5" />
                    </p>
                    {user.role === 'trainer' && <p className="text-[11px] text-sky-400/80 font-medium">Personal Trainer</p>}
                  </div>
                </div>
              )) : (
                <div className="text-center py-6">
                  <Info className="w-7 h-7 text-gray-700 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Bạn chưa theo dõi ai.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ================= CỘT GIỮA: NỘI DUNG CHÍNH ================= */}
        <div className="flex-1 max-w-2xl min-w-0 w-full flex flex-col gap-4 sm:gap-5">

          {/* === MOBILE ACTION BAR === */}
          <div className="lg:hidden flex items-center justify-between bg-gray-900/70 backdrop-blur-xl border border-white/5 p-2.5 rounded-2xl shadow-lg z-20 relative">
            <button onClick={handleViewMyProfile} className="flex items-center gap-2 text-white font-bold hover:text-emerald-400 transition-colors">
              <div className={`bg-emerald-500/15 text-emerald-400 p-1.5 rounded-full ${avatarRingClass(currentUser)}`}>
                <UserCircle className="w-5 h-5" />
              </div>
              <span className="truncate max-w-[130px] text-[15px] flex items-center gap-1">
                {currentUser?.name || "Tài khoản"}
                <VerifiedBadge user={currentUser} className="w-3.5 h-3.5" />
              </span>
            </button>

            <div className="flex items-center gap-2">
              <button onClick={() => setShowMobileFollowing(true)} className="relative p-2 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors">
                <Users className="w-5 h-5" />
                <span className="absolute -top-1.5 -right-1.5 bg-gray-700 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-gray-950">{followingList.length}</span>
              </button>
              <button onClick={() => setShowMobileNotifications(true)} className="relative p-2 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors xl:hidden">
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-gray-950">{unreadCount}</span>}
              </button>
            </div>
          </div>

          {/* Thanh Tìm Kiếm */}
          <div className="relative z-10">
            <div className="absolute inset-y-0 left-0 pl-4 sm:pl-5 flex items-center pointer-events-none">
              <Search className="h-4.5 w-4.5 text-gray-500" />
            </div>
            <input
              type="text"
              placeholder="Tìm kiếm nội dung bài viết, người dùng..."
              className="block w-full pl-11 sm:pl-12 pr-4 py-3.5 border border-white/5 rounded-2xl bg-gray-900/60 backdrop-blur-xl text-gray-100 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all text-[15px] shadow-lg shadow-black/10 placeholder:text-gray-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* PROFILE CARD */}
          {selectedUserFilter && (
            <div className="bg-gray-900/60 backdrop-blur-xl border border-white/5 p-5 sm:p-8 rounded-3xl shadow-2xl shadow-black/30 relative overflow-hidden animate-in slide-in-from-top-4 duration-300 group">
              <div className="absolute top-0 left-0 w-full h-28 bg-gradient-to-b from-emerald-500/10 via-emerald-500/0 to-transparent"></div>
              <button
                onClick={handleCloseProfile}
                className="absolute top-4 right-4 p-2.5 text-gray-400 hover:text-white bg-black/30 hover:bg-rose-500 rounded-full transition-all z-10"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 items-center sm:items-start relative z-0">
                <div className="relative">
                  <img
                    src={selectedUserFilter.avatar || "https://ui-avatars.com/api/?name=U"}
                    alt="avatar"
                    className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-4 border-gray-900 shadow-xl ${selectedUserFilter.role === 'trainer' ? 'ring-2 ring-sky-400/70 ring-offset-2 ring-offset-gray-900' : 'ring-1 ring-white/10'}`}
                  />
                  {selectedUserFilter.isLoading && (
                    <div className="absolute inset-0 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin"></div>
                  )}
                </div>
                <div className="flex-1 text-center sm:text-left w-full mt-2">
                  <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center justify-center sm:justify-start gap-2 mb-1">
                    {selectedUserFilter.name}
                    <VerifiedBadge user={selectedUserFilter} className="w-5 h-5 sm:w-6 sm:h-6" />
                  </h2>
                  {selectedUserFilter.role === 'trainer' && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-sky-300 bg-sky-500/10 border border-sky-500/20 px-2.5 py-1 rounded-full mb-3">
                      <BadgeCheck className="w-3.5 h-3.5" /> Personal Trainer
                    </span>
                  )}
                  <p className="text-gray-400 text-sm sm:text-base mb-5 max-w-lg mx-auto sm:mx-0 leading-relaxed">
                    {selectedUserFilter.bio || "Thành viên tích cực của AI Fitness Community. Chúc bạn một ngày tập luyện hiệu quả!"}
                  </p>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 sm:gap-3 mb-6">
                    <div className="bg-white/[0.03] border border-white/5 px-4 py-2.5 rounded-2xl text-center min-w-[86px]">
                      <p className="text-lg sm:text-xl font-bold text-white">{selectedUserFilter.isLoading ? "..." : (selectedUserFilter.followersCount || 0)}</p>
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mt-0.5">Theo dõi</p>
                    </div>
                    <div className="bg-white/[0.03] border border-white/5 px-4 py-2.5 rounded-2xl text-center min-w-[86px]">
                      <p className="text-lg sm:text-xl font-bold text-white">{selectedUserFilter.isLoading ? "..." : (selectedUserFilter.followingCount || 0)}</p>
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mt-0.5">Đang theo dõi</p>
                    </div>
                    <div className="bg-emerald-500/10 border border-emerald-500/20 px-4 py-2.5 rounded-2xl text-center min-w-[86px]">
                      <p className="text-lg sm:text-xl font-bold text-emerald-400">{displayPosts.length}</p>
                      <p className="text-[10px] text-emerald-500/70 uppercase tracking-wider font-semibold mt-0.5">Bài viết</p>
                    </div>
                  </div>
                  {selectedUserFilter.id !== currentUserId && (
                    <button
                      onClick={() => handleToggleFollow(selectedUserFilter.id)}
                      className={`w-full sm:w-60 flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm transition-all ${followingList.some(u => u._id === selectedUserFilter.id)
                          ? 'bg-white/5 text-white hover:bg-white/10 border border-white/10'
                          : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-900/30 hover:shadow-emerald-900/50 hover:-translate-y-0.5'
                        }`}
                    >
                      {followingList.some(u => u._id === selectedUserFilter.id) ? (
                        <><UserMinus className="w-4 h-4" /> Đang theo dõi</>
                      ) : (
                        <><UserPlus className="w-4 h-4" /> Theo dõi</>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* FORM ĐĂNG BÀI */}
          {!selectedUserFilter && (
            <div className="bg-gray-900/60 backdrop-blur-xl border border-white/5 p-4 sm:p-6 rounded-3xl shadow-xl shadow-black/20">
              <form onSubmit={handleCreatePost} className="flex flex-col gap-4">
                <div className="flex gap-3 items-start">
                  <img src={currentUser ? undefined : undefined} className="hidden" />
                  <div className={`shrink-0 mt-0.5 hidden sm:flex items-center justify-center w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-400 ${avatarRingClass(currentUser)}`}>
                    <UserCircle className="w-6 h-6" />
                  </div>
                  <textarea
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                    placeholder="Hôm nay bạn đã tập luyện thế nào? Chia sẻ cùng mọi người nhé..."
                    className="w-full bg-black/20 border border-white/5 rounded-2xl p-4 sm:p-5 text-gray-100 text-base focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 resize-none h-24 sm:h-28 placeholder-gray-500 transition-all"
                  />
                </div>

                {attachPlan && (
                  <div className="flex items-center justify-between bg-black/20 border border-emerald-500/25 p-4 rounded-2xl flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl ${attachPlan.type === 'workout' ? 'bg-emerald-500/15' : 'bg-amber-500/15'}`}>
                        {attachPlan.type === 'workout' ? <Dumbbell className="text-emerald-400 w-5 h-5" /> : <Apple className="text-amber-400 w-5 h-5" />}
                      </div>
                      <span className="text-sm sm:text-base text-gray-200">
                        Đính kèm: <b>{attachPlan.type === 'workout' ? 'Lịch tập' : 'Thực đơn'}</b> <span className="text-gray-500 text-xs sm:text-sm ml-1">({attachPlan.source === 'master' ? 'Đang áp dụng' : 'Từ kho'})</span>
                      </span>
                    </div>
                    <button type="button" onClick={() => setAttachPlan(null)} className="p-2 text-gray-500 hover:text-rose-400 hover:bg-white/5 rounded-full transition-colors"><X className="w-5 h-5" /></button>
                  </div>
                )}

                {(selectedImages.length > 0 || selectedVideo) && (
                  <div className="flex gap-3 mt-1 overflow-x-auto pb-2 custom-scrollbar">
                    {selectedImages.map((img, idx) => (
                      <div key={idx} className="relative flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border border-white/10 shadow-md">
                        <img src={URL.createObjectURL(img)} alt={`preview-${idx}`} className="w-full h-full object-cover" />
                        <button type="button" onClick={() => handleRemovePreviewImage(idx)} className="absolute top-1.5 right-1.5 bg-black/60 p-1.5 rounded-full text-gray-300 hover:text-white hover:bg-rose-500 transition-all z-10">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    {selectedVideo && (
                      <div className="relative flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border border-white/10 bg-black flex items-center justify-center shadow-md">
                        <video src={URL.createObjectURL(selectedVideo)} className="absolute inset-0 w-full h-full object-cover opacity-60" />
                        <Film className="w-7 h-7 text-emerald-400 z-10" />
                        <button type="button" onClick={handleRemovePreviewVideo} className="absolute top-1.5 right-1.5 bg-black/60 p-1.5 rounded-full text-gray-300 hover:text-white hover:bg-rose-500 transition-all z-20">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-between items-center pt-3 border-t border-white/5">
                  <div className="flex gap-1">
                    <input type="file" accept="image/*" multiple className="hidden" ref={imageInputRef} onChange={(e) => {
                      const newImages = Array.from(e.target.files);
                      setSelectedImages(prev => [...prev, ...newImages].slice(0, 4));
                    }}
                    />
                    <input type="file" accept="video/*" className="hidden" ref={videoInputRef} onChange={(e) => setSelectedVideo(e.target.files[0])} />

                    <button type="button" onClick={() => imageInputRef.current?.click()} className="p-2.5 text-gray-400 hover:text-emerald-400 hover:bg-white/5 rounded-xl transition-colors" title="Thêm ảnh (tối đa 4)"><ImageIcon className="w-5 h-5" /></button>
                    <button type="button" onClick={() => videoInputRef.current?.click()} className="p-2.5 text-gray-400 hover:text-emerald-400 hover:bg-white/5 rounded-xl transition-colors" title="Thêm video"><Film className="w-5 h-5" /></button>
                    <div className="w-px h-6 bg-white/10 mx-1 self-center"></div>
                    <button type="button" onClick={() => openArchiveSelector('workout')} className="p-2.5 text-gray-400 hover:text-emerald-400 hover:bg-white/5 rounded-xl transition-colors" title="Đính kèm lịch tập"><Dumbbell className="w-5 h-5" /></button>
                    <button type="button" onClick={() => openArchiveSelector('diet')} className="p-2.5 text-gray-400 hover:text-amber-400 hover:bg-white/5 rounded-xl transition-colors" title="Đính kèm thực đơn"><Apple className="w-5 h-5" /></button>
                  </div>
                  <button type="submit" disabled={!newPostContent.trim() && selectedImages.length === 0 && !selectedVideo && !attachPlan} className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:shadow-emerald-900/50 disabled:opacity-40 disabled:hover:translate-y-0 text-white px-5 sm:px-6 py-2.5 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-emerald-900/30 transition-all hover:-translate-y-0.5">
                    <Send className="w-4 h-4" /> <span className="hidden sm:inline">Đăng bài</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TABS BẢNG TIN */}
          {!selectedUserFilter && (
            <div className="flex overflow-x-auto gap-1.5 p-1.5 bg-gray-900/60 backdrop-blur-xl border border-white/5 rounded-2xl custom-scrollbar">
              {TABS.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-4 py-2.5 rounded-xl font-semibold text-sm whitespace-nowrap transition-all flex items-center gap-2 shrink-0 ${isActive
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-900/30'
                        : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                      }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive && tab.key === 'liked' ? 'fill-white' : ''}`} /> {tab.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* DANH SÁCH BÀI VIẾT */}
          <div className="space-y-4 sm:space-y-5">
            {(loading && !selectedUserFilter) || (loadingProfilePosts && selectedUserFilter) ? (
              <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-7 w-7 border-2 border-gray-800 border-t-emerald-400"></div></div>
            ) : displayPosts.length > 0 ? (
              displayPosts.map(post => (
                <PostItem
                  key={post._id}
                  post={post}
                  currentUserId={currentUserId}
                  editingPost={editingPost}
                  setEditingPost={setEditingPost}
                  handleViewPostDetails={handleViewPostDetails}
                  handleViewProfile={handleViewProfile}
                  selectedUserFilter={selectedUserFilter}
                  handleDeletePost={handleDeletePost}
                  handleSaveEditPost={handleSaveEditPost}
                  setViewingPlan={setViewingPlan}
                  handleSaveToLibrary={handleSaveToLibrary}
                  handleToggleLike={handleToggleLike}
                  openShareModal={openShareModal}
                  handleReportPost={handleReportPost}
                />
              ))
            ) : (
              <div className="text-center py-14 sm:py-16 bg-gray-900/40 border border-white/5 rounded-3xl backdrop-blur-sm">
                <Search className="w-12 h-12 sm:w-14 sm:h-14 text-gray-700 mx-auto mb-4" />
                <p className="text-gray-300 font-bold text-base sm:text-lg mb-1.5">Không tìm thấy bài viết nào.</p>
                <p className="text-sm text-gray-500">Hãy thử tạo một bài viết mới hoặc chuyển sang tab khác nhé!</p>
              </div>
            )}
          </div>
        </div>

        {/* ================= CỘT PHẢI: THÔNG BÁO ================= */}
        <div className="hidden xl:block w-80 shrink-0 sticky top-24 space-y-6 z-10">
          <NotificationSidebar
            unreadCount={unreadCount}
            realNotifications={realNotifications}
            handleNotificationClick={handleNotificationClick}
            handleDeleteNotification={handleDeleteNotification}
          />
        </div>

        {/* ================= CÁC MODAL ẨN ================= */}

        {/* 1. Modal Chi Tiết Bài Viết */}
        {viewingPostDetails && (
          <PostDetailsModal
            post={viewingPostDetails}
            onClose={() => setViewingPostDetails(null)}
            currentUserId={currentUserId}
            token={token}
            onToggleLike={handleToggleLike}
            handleShare={() => openShareModal(viewingPostDetails._id)}
            handleSaveToLibrary={handleSaveToLibrary}
            setViewingPlan={setViewingPlan}
            setSelectedUserFilter={setSelectedUserFilter}
          />
        )}

        {/* 2. Modal Chi Tiết Lịch Tập/Ăn */}
        {viewingPlan && (
          <PlanDetailsModal plan={viewingPlan} onClose={() => setViewingPlan(null)} />
        )}

        {/* 3. Modal Đính Kèm Từ Kho Lưu Trữ */}
        {showArchiveModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setShowArchiveModal(false)}>
            <div className="bg-gray-900 border border-white/10 w-full max-w-sm rounded-3xl shadow-2xl p-6 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
              <h3 className="text-xl font-bold text-white mb-5">Bạn muốn đính kèm lịch nào?</h3>
              <button onClick={() => handleSelectPlanToAttach('master', archiveSelectionType)} className="w-full text-left p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl mb-4 transition-all flex items-center justify-between group">
                <div>
                  <p className="font-bold text-emerald-400 text-base">Lịch đang áp dụng (Master)</p>
                  <p className="text-sm text-gray-500 mt-1">Lịch chính mà bạn đang tập/ăn</p>
                </div>
                <Activity className="w-6 h-6 text-gray-600 group-hover:text-emerald-400 transition-colors" />
              </button>
              <div className="border-t border-white/5 pt-4">
                <p className="text-sm font-semibold text-gray-500 mb-3">Hoặc chọn từ kho lưu trữ của bạn:</p>
                {loadingArchive ? (
                  <div className="text-center py-6 text-emerald-400 font-medium animate-pulse">Đang tải kho thư viện...</div>
                ) : archivedPlansList.length > 0 ? (
                  <div className="space-y-3 max-h-56 overflow-y-auto custom-scrollbar pr-2">
                    {archivedPlansList.map(plan => (
                      <button key={plan._id} onClick={() => handleSelectPlanToAttach('archive', archiveSelectionType, plan._id)} className="w-full text-left p-3.5 bg-white/[0.03] hover:bg-white/10 border border-white/5 rounded-xl transition-all flex justify-between items-center group">
                        <span className="text-sm font-medium text-gray-200 group-hover:text-white truncate pr-2">{plan.title}</span>
                        <Bookmark className="w-5 h-5 text-gray-600 shrink-0 group-hover:text-emerald-400" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 bg-white/[0.02] rounded-xl">
                    <Bookmark className="w-8 h-8 text-gray-700 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Kho lưu trữ hiện đang trống.</p>
                  </div>
                )}
              </div>
              <button onClick={() => setShowArchiveModal(false)} className="w-full mt-5 p-3 text-sm font-bold text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors">Hủy bỏ</button>
            </div>
          </div>
        )}

        {/* 4. MODAL CHIA SẺ */}
        {showShareModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setShowShareModal(false)}>
            <div className="bg-gray-900 border border-white/10 w-full max-w-sm rounded-3xl shadow-2xl p-6 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-5 border-b border-white/5 pb-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Share2 className="w-5 h-5 text-emerald-400" /> Chia sẻ bài viết
                </h3>
                <button onClick={() => setShowShareModal(false)} className="text-gray-500 hover:text-white hover:bg-white/5 p-1.5 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <button onClick={handleCopyLink} className="w-full flex items-center justify-center gap-2 p-3.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white font-semibold transition-all mb-4">
                <Link className="w-5 h-5 text-sky-400" /> Sao chép liên kết
              </button>
              <div>
                <p className="text-sm font-semibold text-gray-500 mb-3">Gửi trực tiếp cho người bạn theo dõi:</p>
                <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                  {followingList.length > 0 ? followingList.map(user => (
                    <div key={user._id} className="flex justify-between items-center bg-white/[0.03] border border-white/5 p-2.5 rounded-xl">
                      <div className="flex items-center gap-3 min-w-0">
                        <img src={user.avatar || "https://ui-avatars.com/api/?name=U"} alt="avatar" className={`w-9 h-9 rounded-full object-cover ${avatarRingClass(user)}`} />
                        <p className="text-sm font-bold text-gray-200 truncate flex items-center gap-1">{user.name}<VerifiedBadge user={user} className="w-3.5 h-3.5" /></p>
                      </div>
                      <button onClick={() => handleSendToUser(user._id)} className="bg-emerald-500/90 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors">Gửi</button>
                    </div>
                  )) : (
                    <div className="text-center py-4 bg-white/[0.02] rounded-xl border border-white/5">
                      <p className="text-sm text-gray-500">Bạn chưa theo dõi ai để gửi.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 5. MODAL MOBILE: ĐANG THEO DÕI */}
        {showMobileFollowing && (
          <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm lg:hidden" onClick={() => setShowMobileFollowing(false)}>
            <div className="bg-gray-900 border-t sm:border border-white/10 w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 max-h-[80vh] flex flex-col animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-4">
                <h3 className="text-white text-lg font-bold flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-400" /> Đang theo dõi <span className="bg-emerald-500/15 text-emerald-300 text-sm px-2 py-0.5 rounded-full">{followingList.length}</span>
                </h3>
                <button onClick={() => setShowMobileFollowing(false)} className="text-gray-500 hover:text-white bg-white/5 hover:bg-white/10 p-1.5 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="overflow-y-auto custom-scrollbar flex-1 pr-2 space-y-2">
                {followingList.length > 0 ? followingList.map(user => (
                  <div
                    key={user._id}
                    onClick={() => {
                      handleViewProfile(user._id, { name: user.name, isVerified: user.isVerified, avatar: user.avatar, role: user.role });
                      setShowMobileFollowing(false);
                    }}
                    className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all ${selectedUserFilter?.id === user._id ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-white/[0.02] hover:bg-white/5 border border-transparent'}`}
                  >
                    <img src={user.avatar || "https://ui-avatars.com/api/?name=U"} className={`w-11 h-11 rounded-full object-cover ${avatarRingClass(user)}`} alt="avatar" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-100 flex items-center gap-1 truncate">
                        {user.name}
                        <VerifiedBadge user={user} className="w-3.5 h-3.5" />
                      </p>
                      {user.role === 'trainer' && <p className="text-[11px] text-sky-400/80 font-medium">Personal Trainer</p>}
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-6">
                    <Info className="w-7 h-7 text-gray-700 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Bạn chưa theo dõi ai.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 6. MODAL MOBILE: THÔNG BÁO */}
        {showMobileNotifications && (
          <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm xl:hidden" onClick={() => setShowMobileNotifications(false)}>
            <div className="bg-gray-900 border-t sm:border border-white/10 w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 max-h-[80vh] flex flex-col animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-4">
                <h3 className="text-white text-lg font-bold flex items-center gap-2">
                  <Bell className="w-5 h-5 text-amber-400" /> Thông báo mới
                  {unreadCount > 0 && <span className="bg-rose-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{unreadCount}</span>}
                </h3>
                <button onClick={() => setShowMobileNotifications(false)} className="text-gray-500 hover:text-white bg-white/5 hover:bg-white/10 p-1.5 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="overflow-y-auto custom-scrollbar flex-1 pr-2 space-y-2">
                {realNotifications.length > 0 ? (
                  realNotifications.map(noti => {
                    let icon = <Bell className="w-4 h-4 text-gray-400" />;
                    let text = "đã gửi thông báo cho bạn.";
                    switch (noti.type) {
                      case 'like': icon = <Heart className="w-4 h-4 text-rose-400 fill-rose-400" />; text = "đã thích bài viết của bạn."; break;
                      case 'comment': icon = <MessageCircle className="w-4 h-4 text-sky-400" />; text = "đã bình luận về bài viết của bạn."; break;
                      case 'share_post': icon = <Share2 className="w-4 h-4 text-emerald-400" />; text = "đã chia sẻ một bài viết với bạn."; break;
                      case 'save_plan': icon = <Bookmark className="w-4 h-4 text-amber-400 fill-amber-400" />; text = "đã lưu lịch của bạn về kho."; break;
                      case 'new_post': icon = <Activity className="w-4 h-4 text-fuchsia-400" />; text = "vừa đăng một bài viết mới."; break;
                      case 'follow': icon = <UserPlus className="w-4 h-4 text-sky-400" />; text = "đã bắt đầu theo dõi bạn."; break;
                      default: break;
                    }

                    return (
                      <div
                        key={noti._id}
                        onClick={() => {
                          handleNotificationClick(noti);
                          setShowMobileNotifications(false);
                        }}
                        className={`relative flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${!noti.isRead
                            ? 'bg-white/5 border-white/10 hover:bg-white/[0.08]'
                            : 'bg-transparent border-white/5 hover:bg-white/[0.03]'
                          }`}
                      >
                        <div className="mt-0.5 bg-black/30 p-2 rounded-full shrink-0">{icon}</div>
                        <div className="flex-1 pr-4">
                          <p className={`text-[14px] leading-snug ${!noti.isRead ? 'text-white' : 'text-gray-400'}`}>
                            <span className="font-bold text-emerald-400 inline-flex items-center gap-1">
                              {noti.senderId?.name || "Người dùng ẩn danh"}
                              <VerifiedBadge user={noti.senderId} className="w-3.5 h-3.5" />
                            </span> {text}
                          </p>
                          <p className="text-[11px] text-gray-600 mt-1 font-medium">{new Date(noti.createdAt).toLocaleString('vi-VN')}</p>
                        </div>
                        {!noti.isRead && <div className="absolute top-1/2 -translate-y-1/2 right-3.5 w-2 h-2 bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.7)]"></div>}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8">
                    <Bell className="w-9 h-9 text-gray-700 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium text-sm">Chưa có thông báo nào.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}