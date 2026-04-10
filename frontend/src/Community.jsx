import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
  Heart, MessageCircle, Send, Activity, Utensils, 
  Trash2, Image as ImageIcon, Film, X, 
  Dumbbell, Apple, Bookmark, Flame, Search, User,
  Eye, Share2, Bell, BadgeCheck, UserPlus, UserMinus, Info
} from 'lucide-react';

// IMPORT CÁC COMPONENT CON
import PlanDetailsModal from './PlanDetailsModal';
import MediaCarousel from './MediaCarousel';
import PostDetailsModal from './PostDetailsModal';

const API_BASE_URL = 'https://ai-fitness-w6fd.onrender.com';
// const API_BASE_URL = 'http://localhost:5000';

export default function Community() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUserFilter, setSelectedUserFilter] = useState(null);
  const [savedScrollPos, setSavedScrollPos] = useState(0); // State lưu vị trí cuộn chuột

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
  
  const notifications = [
    { id: 1, text: "AI Fitness vừa ra mắt tính năng Mạng Xã Hội mới! Khám phá ngay.", time: "1 giờ trước", icon: <Flame className="w-5 h-5 text-orange-500" /> },
    { id: 2, text: "Bạn đã đạt mục tiêu Calo ngày hôm qua. Tiếp tục phát huy nhé!", time: "Hôm qua", icon: <BadgeCheck className="w-5 h-5 text-emerald-500" /> }
  ];

  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const token = localStorage.getItem("token");

  const getCurrentUserId = () => {
    if (!token) return null;
    try { return JSON.parse(atob(token.split('.')[1])).id || JSON.parse(atob(token.split('.')[1]))._id; } catch (e) { return null; }
  };
  const currentUserId = getCurrentUserId();

  // TẢI DỮ LIỆU BAN ĐẦU
  const fetchFeed = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/posts/feed`, { headers: { Authorization: `Bearer ${token}` } });
      if (response.data.success) setPosts(response.data.posts);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const fetchFollowing = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/users/me/following`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data.success) setFollowingList(res.data.following);
    } catch (error) { console.error("Lỗi tải danh sách theo dõi", error); }
  };

  useEffect(() => { 
    fetchFeed(); 
    fetchFollowing();
  }, []);

  // XEM VÀ ĐÓNG PROFILE CHI TIẾT
  const handleViewProfile = async (userId, basicInfo) => {
    // 1. Lưu vị trí cuộn hiện tại
    setSavedScrollPos(window.scrollY);
    
    setSelectedUserFilter({ id: userId, ...basicInfo, isLoading: true });
    // 2. Cuộn lên đầu trang mượt mà
    window.scrollTo({ top: 0, behavior: 'smooth' });

    try {
      const res = await axios.get(`${API_BASE_URL}/api/users/${userId}/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setSelectedUserFilter({ id: userId, ...res.data.user, isLoading: false });
      }
    } catch (error) {
      console.error("Lỗi tải thông tin user", error);
      setSelectedUserFilter(prev => ({
        ...prev, followersCount: 0, followingCount: 0, bio: "Đang cập nhật tiểu sử...", isLoading: false
      }));
    }
  };

  const handleCloseProfile = () => {
    setSelectedUserFilter(null);
    // Trả màn hình về lại vị trí cũ ngay lập tức
    setTimeout(() => {
      window.scrollTo({ top: savedScrollPos, behavior: 'instant' });
    }, 10); 
  };

  const handleToggleFollow = async (userId) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/api/users/${userId}/follow`, {}, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data.success) fetchFollowing(); 
    } catch (error) { console.error(error); }
  };

  const handleShare = async (postId) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/api/posts/${postId}/share`, {}, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data.success) {
        setPosts(posts.map(p => p._id === postId ? { ...p, sharesCount: res.data.sharesCount } : p));
        if (viewingPostDetails?._id === postId) setViewingPostDetails(prev => ({ ...prev, sharesCount: res.data.sharesCount }));
        navigator.clipboard.writeText(`${window.location.origin}/post/${postId}`);
        alert("Đã sao chép liên kết bài viết!");
      }
    } catch (error) { console.error(error); }
  };

  // QUẢN LÝ ĐĂNG BÀI & ĐÍNH KÈM
  const openArchiveSelector = async (type) => {
    setArchiveSelectionType(type);
    setShowArchiveModal(true);
    setLoadingArchive(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/library?type=${type}`, { headers: { Authorization: `Bearer ${token}` } });
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

    let endpoint = `${API_BASE_URL}/api/posts`;
    if (attachPlan) {
      if (attachPlan.source === 'master') {
        endpoint = `${API_BASE_URL}/api/posts/share-master`;
        formData.append("shareType", attachPlan.type);
      } else if (attachPlan.source === 'archive') {
        endpoint = `${API_BASE_URL}/api/posts/share-library`; 
        formData.append("libraryId", attachPlan.libraryId); 
      }
    }

    try {
      const response = await axios.post(endpoint, formData, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } });
      if (response.data.success) {
        setNewPostContent(""); setSelectedImages([]); setSelectedVideo(null); setAttachPlan(null);
        if (imageInputRef.current) imageInputRef.current.value = "";
        if (videoInputRef.current) videoInputRef.current.value = "";
        fetchFeed(); 
      }
    } catch (error) { alert(error.response?.data?.message || "Lỗi khi đăng bài!"); }
  };

  // TƯƠNG TÁC BÀI VIẾT
  const handleSaveToLibrary = async (e, postId, type) => {
    e.stopPropagation();
    try {
      const response = await axios.post(`${API_BASE_URL}/api/library`, { postId, type }, { headers: { Authorization: `Bearer ${token}` } });
      if (response.data.success) {
        alert(`✅ ${response.data.message}`);
        setPosts(posts.map(p => p._id === postId ? { ...p, savesCount: (p.savesCount || 0) + 1 } : p));
        if (viewingPostDetails?._id === postId) setViewingPostDetails(prev => ({ ...prev, savesCount: (prev.savesCount || 0) + 1 }));
      }
    } catch (error) { alert(error.response?.data?.message || "Lỗi khi lưu dữ liệu."); }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm("Bạn có chắc muốn xóa bài viết này?")) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/posts/${postId}`, { headers: { Authorization: `Bearer ${token}` } });
      setPosts(posts.filter(p => p._id !== postId)); 
      if (viewingPostDetails?._id === postId) setViewingPostDetails(null); 
    } catch (error) {}
  };

  const handleToggleLike = async (postId) => {
    try {
      const postIndex = posts.findIndex(p => p._id === postId);
      const isLiked = posts[postIndex].likes.includes(currentUserId);
      const updatedPosts = [...posts];
      
      if (isLiked) updatedPosts[postIndex].likes = updatedPosts[postIndex].likes.filter(id => id !== currentUserId);
      else updatedPosts[postIndex].likes.push(currentUserId);
      
      setPosts(updatedPosts);
      if (viewingPostDetails?._id === postId) setViewingPostDetails(updatedPosts[postIndex]);
      await axios.post(`${API_BASE_URL}/api/posts/${postId}/like`, {}, { headers: { Authorization: `Bearer ${token}` } });
    } catch (error) { fetchFeed(); }
  };

  const handleViewPostDetails = async (post) => {
    setViewingPostDetails(post);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/posts/${post._id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data.success) {
        setViewingPostDetails(res.data.post);
        setPosts(posts.map(p => p._id === post._id ? res.data.post : p));
      }
    } catch (error) { console.error(error); }
  };

  const filteredPosts = posts.filter(post => {
    if (selectedUserFilter && post.userId?._id !== selectedUserFilter.id) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return post.content?.toLowerCase().includes(term) || post.userId?.name?.toLowerCase().includes(term);
    }
    return true;
  });

  if (loading) return <div className="flex justify-center items-center min-h-[70vh]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div></div>;

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex gap-6 lg:gap-8 justify-center items-start animate-in fade-in duration-500 relative">
      
      {/* ================= CỘT TRÁI: ĐANG THEO DÕI ================= */}
      <div className="hidden lg:block w-72 xl:w-80 shrink-0 sticky top-24 space-y-6">
        <div className="bg-gray-800/80 backdrop-blur-md border border-gray-700/50 rounded-3xl p-6 shadow-xl">
          <h3 className="text-white text-lg font-bold mb-5 flex items-center gap-2 border-b border-gray-700/50 pb-4">
            <User className="w-5 h-5 text-emerald-400" /> Đang theo dõi <span className="bg-emerald-500/20 text-emerald-400 text-sm px-2 py-0.5 rounded-full ml-auto">{followingList.length}</span>
          </h3>
          
          <div className="space-y-2 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
            {followingList.length > 0 ? followingList.map(user => (
              <div 
                key={user._id} 
                onClick={() => handleViewProfile(user._id, { name: user.name, isVerified: user.isVerified, avatar: user.avatar })}
                className={`flex items-center gap-3 p-2.5 rounded-2xl cursor-pointer transition-all ${selectedUserFilter?.id === user._id ? 'bg-emerald-500/20 border border-emerald-500/40 shadow-inner' : 'hover:bg-gray-700 border border-transparent'}`}
              >
                <img src={user.avatar || "https://ui-avatars.com/api/?name=U"} className="w-12 h-12 rounded-full object-cover border-2 border-gray-600 shadow-sm" alt="avatar" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-100 flex items-center gap-1 truncate">
                    {user.name}
                    {user.isVerified && <BadgeCheck className="w-4 h-4 text-blue-400 shrink-0" />}
                  </p>
                </div>
              </div>
            )) : (
              <div className="text-center py-6">
                <Info className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Bạn chưa theo dõi ai.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ================= CỘT GIỮA: NỘI DUNG CHÍNH ================= */}
      <div className="flex-1 max-w-2xl min-w-0 w-full flex flex-col gap-6">
        
        {/* Thanh Tìm Kiếm */}
        <div className="relative z-10 shadow-lg">
          <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Tìm kiếm nội dung bài viết, người dùng..."
            className="block w-full pl-12 pr-4 py-4 border border-gray-700 rounded-2xl bg-gray-800/80 backdrop-blur-md text-gray-100 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 transition-all text-base"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* PROFILE CARD */}
        {selectedUserFilter && (
          <div className="bg-gray-800/80 backdrop-blur-md border border-gray-700/80 p-6 sm:p-8 rounded-3xl shadow-2xl relative overflow-hidden animate-in slide-in-from-top-4 duration-300 group">
            <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-emerald-900/40 to-transparent"></div>
            
            <button 
              onClick={handleCloseProfile} 
              className="absolute top-4 right-4 p-2.5 text-gray-400 hover:text-white bg-gray-900/80 hover:bg-red-500 rounded-full transition-all z-10 shadow-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 items-center sm:items-start relative z-0">
              <div className="relative">
                <img 
                  src={selectedUserFilter.avatar || "https://ui-avatars.com/api/?name=U"} 
                  alt="avatar" 
                  className="w-28 h-28 sm:w-32 sm:h-32 rounded-full object-cover border-4 border-gray-800 shadow-xl ring-2 ring-emerald-500/30 group-hover:ring-emerald-500/60 transition-all" 
                />
                {selectedUserFilter.isLoading && (
                  <div className="absolute inset-0 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin"></div>
                )}
              </div>

              <div className="flex-1 text-center sm:text-left w-full mt-2">
                <h2 className="text-2xl sm:text-3xl font-bold text-white flex items-center justify-center sm:justify-start gap-2 mb-3">
                  {selectedUserFilter.name}
                  {selectedUserFilter.isVerified && <BadgeCheck className="w-6 h-6 sm:w-7 sm:h-7 text-blue-400" />}
                </h2>

                <p className="text-gray-300 text-sm sm:text-base mb-6 max-w-lg mx-auto sm:mx-0 leading-relaxed">
                  {selectedUserFilter.bio || "Thành viên tích cực của AI Fitness Community. Chúc bạn một ngày tập luyện hiệu quả!"}
                </p>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 sm:gap-4 mb-6">
                  <div className="bg-gray-900/60 border border-gray-700/50 px-4 py-3 rounded-2xl text-center min-w-[100px]">
                    <p className="text-xl sm:text-2xl font-bold text-white">{selectedUserFilter.isLoading ? "..." : (selectedUserFilter.followersCount || 0)}</p>
                    <p className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider font-semibold mt-1">Người theo dõi</p>
                  </div>
                  <div className="bg-gray-900/60 border border-gray-700/50 px-4 py-3 rounded-2xl text-center min-w-[100px]">
                    <p className="text-xl sm:text-2xl font-bold text-white">{selectedUserFilter.isLoading ? "..." : (selectedUserFilter.followingCount || 0)}</p>
                    <p className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider font-semibold mt-1">Đang theo dõi</p>
                  </div>
                  <div className="bg-emerald-900/20 border border-emerald-500/30 px-4 py-3 rounded-2xl text-center min-w-[100px]">
                    <p className="text-xl sm:text-2xl font-bold text-emerald-400">{filteredPosts.length}</p>
                    <p className="text-[10px] sm:text-xs text-emerald-500/80 uppercase tracking-wider font-semibold mt-1">Bài viết</p>
                  </div>
                </div>

                {selectedUserFilter.id !== currentUserId && (
                  <button 
                    onClick={() => handleToggleFollow(selectedUserFilter.id)}
                    className={`w-full sm:w-64 flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-base transition-all shadow-lg ${
                      followingList.some(u => u._id === selectedUserFilter.id) 
                      ? 'bg-gray-700 text-white hover:bg-gray-600 border border-gray-600'
                      : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-900/30 hover:scale-[1.02]'
                    }`}
                  >
                    {followingList.some(u => u._id === selectedUserFilter.id) ? (
                      <><UserMinus className="w-5 h-5"/> Đang theo dõi</>
                    ) : (
                      <><UserPlus className="w-5 h-5"/> Theo dõi người này</>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* FORM ĐĂNG BÀI */}
        {!selectedUserFilter && (
          <div className="bg-gray-800/80 backdrop-blur-md border border-gray-700/60 p-5 sm:p-6 rounded-3xl shadow-xl">
            <form onSubmit={handleCreatePost} className="flex flex-col gap-4">
              <textarea 
                value={newPostContent} 
                onChange={(e) => setNewPostContent(e.target.value)} 
                placeholder="Hôm nay bạn đã tập luyện thế nào? Chia sẻ cùng mọi người nhé..." 
                className="w-full bg-gray-900/60 border border-gray-700/80 rounded-2xl p-5 text-gray-100 text-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 resize-none h-28 placeholder-gray-500" 
              />
              
              {attachPlan && (
                <div className="flex items-center justify-between bg-gray-900/80 border border-emerald-500/40 p-4 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${attachPlan.type === 'workout' ? 'bg-emerald-500/20' : 'bg-yellow-500/20'}`}>
                      {attachPlan.type === 'workout' ? <Dumbbell className="text-emerald-400 w-5 h-5" /> : <Apple className="text-yellow-400 w-5 h-5" />}
                    </div>
                    <span className="text-base text-gray-200">
                      Đính kèm: <b>{attachPlan.type === 'workout' ? 'Lịch tập' : 'Thực đơn'}</b> <span className="text-gray-400 text-sm ml-1">({attachPlan.source === 'master' ? 'Đang áp dụng' : 'Từ kho'})</span>
                    </span>
                  </div>
                  <button type="button" onClick={() => setAttachPlan(null)} className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded-full transition-colors"><X className="w-5 h-5" /></button>
                </div>
              )}

              {(selectedImages.length > 0 || selectedVideo) && (
                <div className="flex gap-4 mt-2 overflow-x-auto pb-3 custom-scrollbar">
                  {selectedImages.map((img, idx) => (
                    <div key={idx} className="relative flex-shrink-0 w-24 h-24 rounded-2xl overflow-hidden border border-gray-600 shadow-md">
                      <img src={URL.createObjectURL(img)} alt={`preview-${idx}`} className="w-full h-full object-cover" />
                      <button type="button" onClick={() => handleRemovePreviewImage(idx)} className="absolute top-1.5 right-1.5 bg-black/70 p-1.5 rounded-full text-gray-300 hover:text-white hover:bg-red-500 transition-all z-10">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  
                  {selectedVideo && (
                    <div className="relative flex-shrink-0 w-24 h-24 rounded-2xl overflow-hidden border border-gray-600 bg-gray-900 flex items-center justify-center shadow-md">
                      <video src={URL.createObjectURL(selectedVideo)} className="absolute inset-0 w-full h-full object-cover opacity-60" />
                      <Film className="w-8 h-8 text-emerald-400 z-10" />
                      <button type="button" onClick={handleRemovePreviewVideo} className="absolute top-1.5 right-1.5 bg-black/70 p-1.5 rounded-full text-gray-300 hover:text-white hover:bg-red-500 transition-all z-20">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-between items-center pt-4 border-t border-gray-700/50">
                <div className="flex gap-1 sm:gap-2">
                  <input type="file" accept="image/*" multiple className="hidden" ref={imageInputRef} onChange={(e) => {
                      const newImages = Array.from(e.target.files);
                      setSelectedImages(prev => [...prev, ...newImages].slice(0, 4));
                    }} 
                  />
                  <input type="file" accept="video/*" className="hidden" ref={videoInputRef} onChange={(e) => setSelectedVideo(e.target.files[0])} />
                  
                  <button type="button" onClick={() => imageInputRef.current?.click()} className="p-2.5 text-gray-400 hover:text-emerald-400 hover:bg-gray-700/50 rounded-xl transition-colors" title="Thêm ảnh (tối đa 4)"><ImageIcon className="w-6 h-6" /></button>
                  <button type="button" onClick={() => videoInputRef.current?.click()} className="p-2.5 text-gray-400 hover:text-emerald-400 hover:bg-gray-700/50 rounded-xl transition-colors" title="Thêm video"><Film className="w-6 h-6" /></button>
                  <div className="w-px h-8 bg-gray-700 mx-2 self-center"></div>
                  
                  <button type="button" onClick={() => openArchiveSelector('workout')} className="p-2.5 text-gray-400 hover:text-emerald-400 hover:bg-gray-700/50 rounded-xl transition-colors" title="Đính kèm lịch tập"><Dumbbell className="w-6 h-6" /></button>
                  <button type="button" onClick={() => openArchiveSelector('diet')} className="p-2.5 text-gray-400 hover:text-yellow-400 hover:bg-gray-700/50 rounded-xl transition-colors" title="Đính kèm thực đơn"><Apple className="w-6 h-6" /></button>
                </div>
                <button type="submit" disabled={!newPostContent.trim() && selectedImages.length === 0 && !selectedVideo && !attachPlan} className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:hover:scale-100 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-emerald-900/30 hover:shadow-emerald-900/50 transition-all hover:-translate-y-0.5">
                  <Send className="w-5 h-5" /> <span className="hidden sm:inline">Đăng bài</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* DANH SÁCH BÀI VIẾT (FEED) */}
        <div className="space-y-6">
          {filteredPosts.length > 0 ? (
            filteredPosts.map(post => {
              const isMyPost = post.userId?._id === currentUserId || post.userId === currentUserId;
              const hasLiked = post.likes.includes(currentUserId);

              return (
                <div key={post._id} className="bg-gray-800/60 backdrop-blur-sm border border-gray-700/60 p-5 md:p-7 rounded-3xl shadow-xl hover:border-gray-600 transition-colors cursor-pointer group/post" onClick={() => handleViewPostDetails(post)}>
                  <div className="flex items-start justify-between mb-5">
                    <div className="flex items-center gap-4 cursor-pointer group/avatar" onClick={(e) => {
                        e.stopPropagation();
                        if (!selectedUserFilter || selectedUserFilter.id !== post.userId?._id) {
                          handleViewProfile(post.userId?._id, { name: post.userId?.name || "Người dùng", isVerified: post.userId?.isVerified, avatar: post.userId?.avatar });
                        }
                      }}>
                      <img src={post.userId?.avatar || "https://ui-avatars.com/api/?name=U"} alt="avatar" className="w-12 h-12 rounded-full object-cover ring-2 ring-gray-700 group-hover/avatar:ring-emerald-500 transition-all shadow-md" />
                      <div>
                        <h4 className="font-bold text-base text-gray-100 group-hover/avatar:text-emerald-400 transition-colors flex items-center gap-1.5">
                          {post.userId?.name || "Người dùng"}
                          {post.userId?.isVerified && <BadgeCheck className="w-4 h-4 text-blue-400" />}
                        </h4>
                        <p className="text-xs text-gray-400 mt-0.5">{new Date(post.createdAt).toLocaleString('vi-VN')}</p>
                      </div>
                    </div>
                    {isMyPost && <button onClick={(e) => { e.stopPropagation(); handleDeletePost(post._id); }} className="text-gray-500 hover:text-red-400 p-2 hover:bg-gray-700/50 rounded-xl transition-colors"><Trash2 className="w-5 h-5" /></button>}
                  </div>

                  <div className="mb-4">
                    <p className="text-gray-200 text-[15px] leading-relaxed whitespace-pre-wrap">{post.content}</p>
                  </div>

                  <MediaCarousel images={post.images} video={post.video} onMediaClick={(e) => { e.stopPropagation(); handleViewPostDetails(post); }} />

                  {post.workoutSnapshot && (
                    <div onClick={(e) => { e.stopPropagation(); setViewingPlan({ type: 'workout', data: post.workoutSnapshot }) }} className="mt-4 bg-gray-900/80 border border-emerald-500/30 p-5 rounded-2xl flex items-center justify-between group/plan hover:bg-gray-800 transition-all hover:border-emerald-500/60 shadow-md">
                      <div className="flex items-center gap-4 text-emerald-400">
                        <div className="p-3 bg-emerald-500/10 rounded-xl group-hover/plan:bg-emerald-500/20 transition-colors"><Activity className="w-6 h-6" /></div>
                        <div>
                          <p className="font-bold text-[15px] text-gray-100">Lịch tập được chia sẻ <span className="text-xs text-gray-500 font-normal ml-1">(Chạm để xem)</span></p>
                          <p className="text-sm text-gray-400 mt-1">Gồm {post.workoutSnapshot.weeklySchedule?.length || post.workoutSnapshot.exercises?.length || 0} bài tập / mục</p>
                        </div>
                      </div>
                      <button onClick={(e) => handleSaveToLibrary(e, post._id, 'workout')} className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-emerald-400 hover:text-white bg-emerald-400/10 hover:bg-emerald-500 rounded-xl transition-all">
                        <Bookmark className="w-4 h-4" /> <span className="hidden sm:inline">Lưu về kho</span>
                      </button>
                    </div>
                  )}
                  
                  {post.dietSnapshot && (
                    <div onClick={(e) => { e.stopPropagation(); setViewingPlan({ type: 'diet', data: post.dietSnapshot }) }} className="mt-4 bg-gray-900/80 border border-yellow-500/30 p-5 rounded-2xl flex items-center justify-between group/plan hover:bg-gray-800 transition-all hover:border-yellow-500/60 shadow-md">
                      <div className="flex items-center gap-4 text-yellow-400">
                        <div className="p-3 bg-yellow-500/10 rounded-xl group-hover/plan:bg-yellow-500/20 transition-colors"><Utensils className="w-6 h-6" /></div>
                        <div>
                          <p className="font-bold text-[15px] text-gray-100">Thực đơn được chia sẻ <span className="text-xs text-gray-500 font-normal ml-1">(Chạm để xem)</span></p>
                          <p className="text-sm text-gray-400 mt-1">Mục tiêu: {post.dietSnapshot.dailyTotal?.calories || 0} kcal/ngày</p>
                        </div>
                      </div>
                      <button onClick={(e) => handleSaveToLibrary(e, post._id, 'diet')} className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-yellow-400 hover:text-white bg-yellow-400/10 hover:bg-yellow-500 rounded-xl transition-all">
                        <Bookmark className="w-4 h-4" /> <span className="hidden sm:inline">Lưu về kho</span>
                      </button>
                    </div>
                  )}

                  {/* Thanh tương tác */}
                  <div className="flex items-center justify-between mt-6 pt-5 border-t border-gray-700/50 flex-wrap gap-y-4">
                    <div className="flex items-center gap-6 sm:gap-8">
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

                    <div className="flex items-center gap-5 sm:gap-6">
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

                      <button onClick={(e) => { e.stopPropagation(); handleShare(post._id); }} className="flex items-center gap-1.5 text-gray-400 hover:text-emerald-400 bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-lg transition-colors" title="Chia sẻ">
                        <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span className="text-sm font-semibold hidden sm:inline">Chia sẻ</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-16 bg-gray-800/40 border border-gray-700/50 rounded-3xl backdrop-blur-sm">
              <Search className="w-16 h-16 text-gray-600 mx-auto mb-5" />
              <p className="text-gray-300 font-bold text-lg mb-2">Không tìm thấy bài viết nào.</p>
              <p className="text-base text-gray-500">Hãy thử tạo một bài viết mới hoặc thay đổi từ khóa nhé!</p>
            </div>
          )}
        </div>
      </div>

      {/* ================= CỘT PHẢI: THÔNG BÁO ================= */}
      <div className="hidden xl:block w-80 shrink-0 sticky top-24 space-y-6">
        <div className="bg-gray-800/80 backdrop-blur-md border border-gray-700/50 rounded-3xl p-6 shadow-xl">
          <h3 className="text-white text-lg font-bold mb-5 flex items-center gap-2 border-b border-gray-700/50 pb-4">
            <Bell className="w-5 h-5 text-yellow-400" /> Thông báo mới
          </h3>
          <div className="space-y-4">
            {notifications.map(noti => (
              <div key={noti.id} className="flex items-start gap-3 p-4 bg-gray-900/60 rounded-2xl border border-gray-700/40 cursor-pointer hover:bg-gray-800 hover:border-gray-600 transition-all shadow-sm">
                <div className="mt-0.5 bg-gray-800 p-2 rounded-full shrink-0 shadow-inner">{noti.icon}</div>
                <div>
                  <p className="text-sm text-gray-200 leading-snug">{noti.text}</p>
                  <p className="text-[11px] text-gray-500 mt-1.5 font-medium">{noti.time}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-4 border-t border-gray-700/50 text-center">
            <span className="text-[11px] uppercase font-bold tracking-widest text-emerald-500/50 bg-emerald-900/20 px-3 py-1 rounded-full">Tính năng đang phát triển</span>
          </div>
        </div>
      </div>

      {/* ================= CÁC MODAL ẨN ================= */}
      {viewingPostDetails && (
        <PostDetailsModal 
          post={viewingPostDetails} 
          onClose={() => setViewingPostDetails(null)}
          currentUserId={currentUserId}
          token={token}
          onToggleLike={handleToggleLike}
          handleShare={handleShare}
          handleSaveToLibrary={handleSaveToLibrary}
          setViewingPlan={setViewingPlan}
          setSelectedUserFilter={setSelectedUserFilter}
        />
      )}

      <PlanDetailsModal plan={viewingPlan} onClose={() => setViewingPlan(null)} />

      {showArchiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowArchiveModal(false)}>
          <div className="bg-gray-900 border border-gray-700 w-full max-w-sm rounded-3xl shadow-2xl p-6 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-white mb-5">Bạn muốn đính kèm lịch nào?</h3>
            <button onClick={() => handleSelectPlanToAttach('master', archiveSelectionType)} className="w-full text-left p-4 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-2xl mb-4 transition-all flex items-center justify-between group">
              <div>
                <p className="font-bold text-emerald-400 text-base">Lịch đang áp dụng (Master)</p>
                <p className="text-sm text-gray-400 mt-1">Lịch chính mà bạn đang tập/ăn</p>
              </div>
              <Activity className="w-6 h-6 text-gray-500 group-hover:text-emerald-400 transition-colors"/>
            </button>
            <div className="border-t border-gray-700/80 pt-4">
              <p className="text-sm font-semibold text-gray-400 mb-3">Hoặc chọn từ kho lưu trữ của bạn:</p>
              {loadingArchive ? (
                <div className="text-center py-6 text-emerald-500 font-medium animate-pulse">Đang tải kho thư viện...</div>
              ) : archivedPlansList.length > 0 ? (
                <div className="space-y-3 max-h-56 overflow-y-auto custom-scrollbar pr-2">
                  {archivedPlansList.map(plan => (
                    <button key={plan._id} onClick={() => handleSelectPlanToAttach('archive', archiveSelectionType, plan._id)} className="w-full text-left p-3.5 bg-gray-800/50 hover:bg-gray-700 border border-gray-700/50 rounded-xl transition-all flex justify-between items-center group">
                      <span className="text-sm font-medium text-gray-200 group-hover:text-white truncate pr-2">{plan.title}</span>
                      <Bookmark className="w-5 h-5 text-gray-500 shrink-0 group-hover:text-emerald-400" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 bg-gray-800/30 rounded-xl">
                  <Bookmark className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Kho lưu trữ hiện đang trống.</p>
                </div>
              )}
            </div>
            <button onClick={() => setShowArchiveModal(false)} className="w-full mt-5 p-3 text-sm font-bold text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors">Hủy bỏ</button>
          </div>
        </div>
      )}

    </div>
  );
}