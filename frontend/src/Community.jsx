import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
  Heart, MessageCircle, Send, Activity, Utensils, 
  Trash2, Image as ImageIcon, Film, X, 
  Dumbbell, Apple, Bookmark, Flame, Search, User,
  Eye, Share2, Bell, BadgeCheck, UserPlus, UserMinus
} from 'lucide-react';

// IMPORT 3 COMPONENT VỪA TÁCH:
import PlanDetailsModal from './PlanDetailsModal';
import MediaCarousel from './MediaCarousel';
import PostDetailsModal from './PostDetailsModal';

const API_BASE_URL = 'https://ai-fitness-w6fd.onrender.com';

export default function Community() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUserFilter, setSelectedUserFilter] = useState(null);

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
    { id: 1, text: "AI Fitness vừa ra mắt tính năng Mạng Xã Hội mới!", time: "1 giờ trước", icon: <Flame className="w-4 h-4 text-orange-500" /> },
    { id: 2, text: "Bạn đã đạt mục tiêu Calo ngày hôm qua. Tuyệt vời!", time: "Hôm qua", icon: <BadgeCheck className="w-4 h-4 text-emerald-500" /> }
  ];

  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const token = localStorage.getItem("token");

  const getCurrentUserId = () => {
    if (!token) return null;
    try { return JSON.parse(atob(token.split('.')[1])).id || JSON.parse(atob(token.split('.')[1]))._id; } catch (e) { return null; }
  };
  const currentUserId = getCurrentUserId();

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

  const handleToggleFollow = async (userId) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/api/users/${userId}/follow`, {}, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data.success) {
        fetchFollowing(); 
      }
    } catch (error) { console.error(error); }
  };

  const handleShare = async (postId) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/api/posts/${postId}/share`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setPosts(posts.map(p => p._id === postId ? { ...p, sharesCount: res.data.sharesCount } : p));
        if (viewingPostDetails && viewingPostDetails._id === postId) {
          setViewingPostDetails(prev => ({ ...prev, sharesCount: res.data.sharesCount }));
        }
        navigator.clipboard.writeText(`${window.location.origin}/post/${postId}`);
        alert("Đã sao chép liên kết bài viết! Bạn có thể gửi cho bạn bè.");
      }
    } catch (error) {
      console.error("Lỗi khi chia sẻ:", error);
    }
  };

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

  const handleRemovePreviewImage = (indexToRemove) => {
    setSelectedImages(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleRemovePreviewVideo = () => {
    setSelectedVideo(null);
    if (videoInputRef.current) videoInputRef.current.value = "";
  };

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

  const handleSaveToLibrary = async (e, postId, type) => {
    e.stopPropagation();
    try {
      const response = await axios.post(`${API_BASE_URL}/api/posts/clone`, { postId, type }, { headers: { Authorization: `Bearer ${token}` } });
      if (response.data.success) {
        alert(`✅ ${response.data.message}`);
        setPosts(posts.map(p => p._id === postId ? { ...p, savesCount: (p.savesCount || 0) + 1 } : p));
        if (viewingPostDetails && viewingPostDetails._id === postId) {
          setViewingPostDetails(prev => ({ ...prev, savesCount: (prev.savesCount || 0) + 1 }));
        }
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
      
      if (viewingPostDetails && viewingPostDetails._id === postId) {
          setViewingPostDetails(updatedPosts[postIndex]);
      }

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
    } catch (error) {
      console.error(error);
    }
  };

  const filteredPosts = posts.filter(post => {
    if (selectedUserFilter && post.userId?._id !== selectedUserFilter.id) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return post.content?.toLowerCase().includes(term) || post.userId?.name?.toLowerCase().includes(term);
    }
    return true;
  });

  if (loading) return <div className="flex justify-center items-center min-h-[50vh]"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500"></div></div>;

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 w-full flex gap-8 justify-center items-start animate-in fade-in duration-500 relative">
      
      <div className="hidden lg:block w-64 xl:w-72 shrink-0 sticky top-24 space-y-6">
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-5 shadow-lg">
          <h3 className="text-white font-bold mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-emerald-400" /> Đang theo dõi ({followingList.length})
          </h3>
          
          <div className="space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
            {followingList.length > 0 ? followingList.map(user => (
              <div 
                key={user._id} 
                onClick={() => {
                  setSelectedUserFilter({ id: user._id, name: user.name, isVerified: user.isVerified });
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-colors ${selectedUserFilter?.id === user._id ? 'bg-emerald-500/20 border border-emerald-500/30' : 'hover:bg-gray-700 border border-transparent'}`}
              >
                <img src={user.avatar || "https://ui-avatars.com/api/?name=U"} className="w-10 h-10 rounded-full object-cover border border-gray-600" alt="avatar" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-200 flex items-center gap-1 truncate">
                    {user.name}
                    {user.isVerified && <BadgeCheck className="w-3 h-3 text-blue-400 shrink-0" />}
                  </p>
                </div>
              </div>
            )) : (
              <p className="text-sm text-gray-500 italic">Bạn chưa theo dõi ai.</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-2xl min-w-0 w-full">
        
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
            <div className="bg-gray-900 border border-gray-700 w-full max-w-sm rounded-2xl shadow-2xl p-5" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-white mb-4">Bạn muốn chia sẻ lịch nào?</h3>
              <button onClick={() => handleSelectPlanToAttach('master', archiveSelectionType)} className="w-full text-left p-4 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl mb-3 transition-colors flex items-center justify-between">
                <div>
                  <p className="font-bold text-emerald-400">Lịch đang áp dụng (Master Plan)</p>
                  <p className="text-xs text-gray-400 mt-1">Lịch chính mà bạn đang dùng</p>
                </div>
                <Activity className="w-5 h-5 text-gray-500"/>
              </button>
              <div className="border-t border-gray-700 pt-3">
                <p className="text-sm font-semibold text-gray-400 mb-3">Hoặc chọn từ kho lưu trữ:</p>
                {loadingArchive ? (
                  <div className="text-center py-4 text-emerald-500 animate-pulse">Đang tải kho...</div>
                ) : archivedPlansList.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                    {archivedPlansList.map(plan => (
                      <button key={plan._id} onClick={() => handleSelectPlanToAttach('archive', archiveSelectionType, plan._id)} className="w-full text-left p-3 bg-gray-800/50 hover:bg-gray-700 border border-gray-700/50 rounded-lg transition-colors flex justify-between items-center">
                        <span className="text-sm text-gray-200">{plan.title}</span>
                        <Bookmark className="w-4 h-4 text-gray-500" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 text-center py-2">Kho lưu trữ trống.</p>
                )}
              </div>
              <button onClick={() => setShowArchiveModal(false)} className="w-full mt-4 p-2 text-sm text-gray-400 hover:text-white transition-colors">Hủy</button>
            </div>
          </div>
        )}

        <div className="relative mb-6">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Tìm kiếm nội dung bài viết, tên người dùng..."
            className="block w-full pl-11 pr-4 py-3 border border-gray-700 rounded-xl bg-gray-900/50 text-gray-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {selectedUserFilter && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-emerald-900/20 border border-emerald-500/30 p-4 rounded-2xl mb-6 shadow-lg shadow-emerald-900/5 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/20 rounded-full"><User className="text-emerald-400 w-6 h-6" /></div>
              <div>
                <p className="text-sm text-gray-300">Đang xem dòng thời gian của:</p>
                <p className="font-bold text-emerald-400 flex items-center gap-1 text-lg">
                  {selectedUserFilter.name}
                  {selectedUserFilter.isVerified && <BadgeCheck className="w-5 h-5 text-blue-400" />}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 w-full sm:w-auto">
              {selectedUserFilter.id !== currentUserId && (
                <button 
                  onClick={() => handleToggleFollow(selectedUserFilter.id)}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                    followingList.some(u => u._id === selectedUserFilter.id) 
                    ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-600'
                    : 'bg-emerald-600 text-white hover:bg-emerald-500'
                  }`}
                >
                  {followingList.some(u => u._id === selectedUserFilter.id) ? (
                    <><UserMinus className="w-4 h-4"/> Đang theo dõi</>
                  ) : (
                    <><UserPlus className="w-4 h-4"/> Theo dõi</>
                  )}
                </button>
              )}
              
              <button onClick={() => setSelectedUserFilter(null)} className="p-2.5 text-gray-400 hover:text-white bg-gray-800 hover:bg-red-500/20 rounded-xl transition-colors shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {!selectedUserFilter && (
          <div className="bg-gray-800/80 backdrop-blur-md border border-gray-700 p-4 rounded-2xl mb-8 shadow-xl">
            <form onSubmit={handleCreatePost} className="flex flex-col gap-3">
              <textarea value={newPostContent} onChange={(e) => setNewPostContent(e.target.value)} placeholder="Bạn đã tập luyện thế nào hôm nay? Khoe ngay nào..." className="w-full bg-gray-900/50 border border-gray-700 rounded-xl p-4 text-gray-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-none h-24" />
              
              {attachPlan && (
                <div className="flex items-center justify-between bg-gray-900 border border-emerald-500/50 p-3 rounded-xl">
                  <div className="flex items-center gap-3">
                    {attachPlan.type === 'workout' ? <Dumbbell className="text-emerald-400 w-5 h-5" /> : <Apple className="text-yellow-400 w-5 h-5" />}
                    <span className="text-sm text-gray-200">
                      Đính kèm: <b>{attachPlan.type === 'workout' ? 'Lịch tập' : 'Thực đơn'}</b> <span className="text-gray-400 text-xs">({attachPlan.source === 'master' ? 'Đang áp dụng' : 'Từ kho'})</span>
                    </span>
                  </div>
                  <button type="button" onClick={() => setAttachPlan(null)} className="text-gray-400 hover:text-red-400"><X className="w-5 h-5" /></button>
                </div>
              )}

              {(selectedImages.length > 0 || selectedVideo) && (
                <div className="flex gap-3 mt-2 overflow-x-auto pb-2 custom-scrollbar">
                  {selectedImages.map((img, idx) => (
                    <div key={idx} className="relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border border-gray-600 shadow-sm">
                      <img src={URL.createObjectURL(img)} alt={`preview-${idx}`} className="w-full h-full object-cover" />
                      <button type="button" onClick={() => handleRemovePreviewImage(idx)} className="absolute top-1 right-1 bg-black/70 p-1 rounded-full text-gray-300 hover:text-white hover:bg-red-500 transition-all z-10">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  
                  {selectedVideo && (
                    <div className="relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border border-gray-600 bg-gray-900 flex items-center justify-center shadow-sm">
                      <video src={URL.createObjectURL(selectedVideo)} className="absolute inset-0 w-full h-full object-cover opacity-50" />
                      <Film className="w-6 h-6 text-emerald-400 z-10" />
                      <button type="button" onClick={handleRemovePreviewVideo} className="absolute top-1 right-1 bg-black/70 p-1 rounded-full text-gray-300 hover:text-white hover:bg-red-500 transition-all z-20">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-between items-center mt-2 border-t border-gray-700/50 pt-3">
                <div className="flex gap-2 sm:gap-3">
                  <input type="file" accept="image/*" multiple className="hidden" ref={imageInputRef} onChange={(e) => {
                      const newImages = Array.from(e.target.files);
                      setSelectedImages(prev => [...prev, ...newImages].slice(0, 4));
                    }} 
                  />
                  <input type="file" accept="video/*" className="hidden" ref={videoInputRef} onChange={(e) => setSelectedVideo(e.target.files[0])} />
                  
                  <button type="button" onClick={() => imageInputRef.current?.click()} className="p-2 text-gray-400 hover:text-emerald-400 hover:bg-gray-700/50 rounded-lg" title="Thêm ảnh (tối đa 4)"><ImageIcon className="w-5 h-5" /></button>
                  <button type="button" onClick={() => videoInputRef.current?.click()} className="p-2 text-gray-400 hover:text-emerald-400 hover:bg-gray-700/50 rounded-lg" title="Thêm video"><Film className="w-5 h-5" /></button>
                  <div className="w-px h-6 bg-gray-700 mx-1 self-center"></div>
                  
                  <button type="button" onClick={() => openArchiveSelector('workout')} className="p-2 text-gray-400 hover:text-emerald-400 hover:bg-gray-700/50 rounded-lg" title="Đính kèm lịch tập"><Dumbbell className="w-5 h-5" /></button>
                  <button type="button" onClick={() => openArchiveSelector('diet')} className="p-2 text-gray-400 hover:text-yellow-400 hover:bg-gray-700/50 rounded-lg" title="Đính kèm thực đơn"><Apple className="w-5 h-5" /></button>
                </div>
                <button type="submit" disabled={!newPostContent.trim() && selectedImages.length === 0 && !selectedVideo && !attachPlan} className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-emerald-900/20">
                  <Send className="w-4 h-4" /> <span className="hidden sm:inline">Đăng bài</span>
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="space-y-6">
          {filteredPosts.length > 0 ? (
            filteredPosts.map(post => {
              const isMyPost = post.userId?._id === currentUserId || post.userId === currentUserId;
              const hasLiked = post.likes.includes(currentUserId);

              return (
                <div key={post._id} className="bg-gray-800/60 border border-gray-700/60 p-4 md:p-6 rounded-2xl shadow-lg hover:border-gray-600 transition-colors cursor-pointer" onClick={() => handleViewPostDetails(post)}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3 cursor-pointer group" onClick={(e) => {
                        e.stopPropagation();
                        if (!selectedUserFilter || selectedUserFilter.id !== post.userId?._id) {
                          setSelectedUserFilter({ id: post.userId?._id, name: post.userId?.name || "Người dùng", isVerified: post.userId?.isVerified });
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }
                      }}>
                      <img src={post.userId?.avatar || "https://ui-avatars.com/api/?name=U"} alt="avatar" className="w-11 h-11 rounded-full object-cover ring-2 ring-gray-700 group-hover:ring-emerald-500 transition-all" />
                      <div>
                        <h4 className="font-bold text-gray-100 group-hover:text-emerald-400 transition-colors flex items-center gap-1">
                          {post.userId?.name || "Người dùng"}
                          {post.userId?.isVerified && <BadgeCheck className="w-4 h-4 text-blue-400" />}
                        </h4>
                        <p className="text-xs text-gray-400 mt-0.5">{new Date(post.createdAt).toLocaleString('vi-VN')}</p>
                      </div>
                    </div>
                    {isMyPost && <button onClick={(e) => { e.stopPropagation(); handleDeletePost(post._id); }} className="text-gray-500 hover:text-red-400 p-2"><Trash2 className="w-4 h-4" /></button>}
                  </div>

                  <div className="group block mb-3">
                    <p className="text-gray-200 whitespace-pre-wrap">{post.content}</p>
                  </div>

                  <MediaCarousel images={post.images} video={post.video} onMediaClick={(e) => { e.stopPropagation(); handleViewPostDetails(post); }} />

                  {post.workoutSnapshot && (
                    <div onClick={(e) => { e.stopPropagation(); setViewingPlan({ type: 'workout', data: post.workoutSnapshot }) }} className="mt-3 bg-gray-900 border border-emerald-500/30 p-4 rounded-xl flex items-center justify-between group hover:bg-gray-800 transition-colors">
                      <div className="flex items-center gap-3 text-emerald-400">
                        <div className="p-2.5 bg-emerald-500/10 rounded-lg group-hover:bg-emerald-500/20"><Activity className="w-5 h-5" /></div>
                        <div>
                          <p className="font-bold text-sm text-gray-200">Lịch tập được chia sẻ <span className="text-xs text-gray-500 font-normal ml-1">(Chạm để xem)</span></p>
                          <p className="text-xs text-gray-400 mt-0.5">Lịch trình {post.workoutSnapshot.weeklySchedule?.length || post.workoutSnapshot.exercises?.length || 0} mục</p>
                        </div>
                      </div>
                      <button onClick={(e) => handleSaveToLibrary(e, post._id, 'workout')} className="flex items-center gap-2 px-3 py-2 text-sm font-bold text-emerald-400 hover:text-white bg-emerald-400/10 hover:bg-emerald-500 rounded-lg">
                        <Bookmark className="w-4 h-4" /> <span className="hidden sm:inline">Lưu lịch</span>
                      </button>
                    </div>
                  )}
                  
                  {post.dietSnapshot && (
                    <div onClick={(e) => { e.stopPropagation(); setViewingPlan({ type: 'diet', data: post.dietSnapshot }) }} className="mt-3 bg-gray-900 border border-yellow-500/30 p-4 rounded-xl flex items-center justify-between group hover:bg-gray-800 transition-colors">
                      <div className="flex items-center gap-3 text-yellow-400">
                        <div className="p-2.5 bg-yellow-500/10 rounded-lg group-hover:bg-yellow-500/20"><Utensils className="w-5 h-5" /></div>
                        <div>
                          <p className="font-bold text-sm text-gray-200">Thực đơn được chia sẻ <span className="text-xs text-gray-500 font-normal ml-1">(Chạm để xem)</span></p>
                          <p className="text-xs text-gray-400 mt-0.5">{post.dietSnapshot.dailyTotal?.calories || 0} kcal / ngày</p>
                        </div>
                      </div>
                      <button onClick={(e) => handleSaveToLibrary(e, post._id, 'diet')} className="flex items-center gap-2 px-3 py-2 text-sm font-bold text-yellow-400 hover:text-white bg-yellow-400/10 hover:bg-yellow-500 rounded-lg">
                        <Bookmark className="w-4 h-4" /> <span className="hidden sm:inline">Lưu lịch</span>
                      </button>
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-700/50 flex-wrap gap-y-3">
                    <div className="flex items-center gap-4 sm:gap-6">
                      <button onClick={(e) => { e.stopPropagation(); handleToggleLike(post._id); }} className="flex items-center gap-1.5 text-gray-400 hover:text-pink-500 group">
                        <Heart className={`w-5 h-5 sm:w-5 sm:h-5 ${hasLiked ? "fill-pink-500 text-pink-500" : ""}`} />
                        <span className="text-sm font-bold">{post.likes?.length || 0}</span>
                      </button>
                      <button className="flex items-center gap-1.5 text-gray-400 hover:text-blue-400">
                        <MessageCircle className="w-5 h-5 sm:w-5 sm:h-5" />
                        <span className="text-sm font-bold">{post.commentsCount || 0}</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-4 sm:gap-6">
                      <div className="flex items-center gap-1.5 text-gray-500" title="Lượt xem">
                        <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span className="text-xs sm:text-sm font-semibold">{post.viewsCount || 0}</span>
                      </div>
                      
                      {(post.workoutSnapshot || post.dietSnapshot) && (
                        <div className="flex items-center gap-1.5 text-yellow-500/80 bg-yellow-500/10 px-2 py-0.5 rounded-full" title="Số người đã lưu lịch này">
                          <Bookmark className="w-3 h-3 sm:w-4 sm:h-4 fill-yellow-500/50" />
                          <span className="text-xs sm:text-sm font-semibold">{post.savesCount || 0}</span>
                        </div>
                      )}

                      <button onClick={(e) => { e.stopPropagation(); handleShare(post._id); }} className="flex items-center gap-1.5 text-gray-500 hover:text-emerald-400 transition-colors" title="Chia sẻ">
                        <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span className="text-xs sm:text-sm font-semibold">{post.sharesCount || 0}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 bg-gray-800/30 border border-gray-700/50 rounded-2xl">
              <Search className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 font-semibold">Không tìm thấy bài viết nào.</p>
              {searchTerm && <p className="text-sm text-gray-500 mt-2">Thử một từ khóa khác xem sao!</p>}
            </div>
          )}
        </div>
      </div>

      <div className="hidden xl:block w-72 shrink-0 sticky top-24 space-y-6">
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-5 shadow-lg">
          <h3 className="text-white font-bold mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5 text-yellow-400" /> Thông báo mới
          </h3>
          <div className="space-y-3">
            {notifications.map(noti => (
              <div key={noti.id} className="flex items-start gap-3 p-3 bg-gray-900/50 rounded-xl border border-gray-700/30 cursor-pointer hover:bg-gray-800 transition-colors">
                <div className="mt-1 bg-gray-800 p-1.5 rounded-full shrink-0">{noti.icon}</div>
                <div>
                  <p className="text-sm text-gray-200 line-clamp-2">{noti.text}</p>
                  <p className="text-[10px] text-gray-500 mt-1">{noti.time}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-gray-700/50 text-center">
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-500/50">Tính năng đang phát triển</span>
          </div>
        </div>
      </div>

    </div>
  );
}