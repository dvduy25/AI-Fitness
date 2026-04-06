// 📄 src/pages/Community.jsx
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
  Heart, MessageCircle, Send, Activity, Utensils, 
  Download, Trash2, Image as ImageIcon, Film, X, 
  Play, ChevronLeft, ChevronRight 
} from 'lucide-react'; // Thêm icon ChevronLeft, ChevronRight

const API_BASE_URL = 'https://ai-fitness-w6fd.onrender.com';

// ========================================================
// COMPONENT CAROUSEL STYLE INSTAGRAM (HIỂN THỊ ẢNH/VIDEO)
// ========================================================
const MediaCarousel = ({ images = [], video = null, onMediaClick }) => {
  // Gộp ảnh và video vào chung 1 mảng để dễ slide
  const mediaList = [
    ...(images || []).map(img => ({ type: 'image', url: img })),
    ...(video ? [{ type: 'video', url: video }] : [])
  ];

  const [currentIndex, setCurrentIndex] = useState(0);

  if (mediaList.length === 0) return null;

  const nextMedia = (e) => {
    e.stopPropagation(); // Chặn sự kiện click lọt xuống bài viết (chuyển trang)
    setCurrentIndex((prev) => (prev + 1) % mediaList.length);
  };

  const prevMedia = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? mediaList.length - 1 : prev - 1));
  };

  return (
    <div 
      className="relative w-full aspect-square md:aspect-[4/5] bg-black rounded-xl overflow-hidden mb-4 group cursor-pointer border border-gray-700/50 shadow-inner"
      onClick={onMediaClick}
    >
      {/* Hiển thị Media hiện tại */}
      {mediaList[currentIndex].type === 'image' ? (
        <img 
          src={mediaList[currentIndex].url} 
          alt="post media"
          className="w-full h-full object-cover group-hover:opacity-90 transition-opacity duration-300" 
        />
      ) : (
        <div className="relative w-full h-full flex items-center justify-center bg-black group-hover:opacity-90 transition-opacity duration-300">
          <video 
            src={mediaList[currentIndex].url} 
            className="w-full h-full object-contain pointer-events-none" 
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/10">
            <div className="bg-gray-900/70 p-4 rounded-full backdrop-blur-md shadow-lg border border-gray-600">
              <Play className="w-8 h-8 text-white fill-white ml-1" />
            </div>
          </div>
        </div>
      )}

      {/* Điều hướng Next / Prev (Chỉ hiện khi có nhiều hơn 1 media) */}
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
          
          {/* Nút chấm tròn (Dots) ở dưới cùng */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
            {mediaList.map((_, idx) => (
              <div 
                key={idx} 
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === currentIndex ? 'bg-blue-500 w-4' : 'bg-white/60 w-1.5'
                }`} 
              />
            ))}
          </div>
          
          {/* Badge số đếm ở góc trên phải (VD: 1/3) */}
          <div className="absolute top-4 right-4 bg-black/60 text-white text-xs font-bold px-2.5 py-1 rounded-full backdrop-blur-md z-10">
            {currentIndex + 1}/{mediaList.length}
          </div>
        </>
      )}
    </div>
  );
};

// ========================================================
// TRANG CỘNG ĐỒNG CHÍNH
// ========================================================
export default function Community() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [newPostContent, setNewPostContent] = useState("");
  const [selectedImages, setSelectedImages] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);

  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);

  const token = localStorage.getItem("token");

  const getCurrentUserId = () => {
    if (!token) return null;
    try {
      const payload = token.split('.')[1];
      return JSON.parse(atob(payload)).id || JSON.parse(atob(payload))._id;
    } catch (e) { return null; }
  };
  const currentUserId = getCurrentUserId();

  const fetchFeed = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/posts/feed`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) setPosts(response.data.posts);
    } catch (error) { console.error("Lỗi khi tải bảng tin:", error); } 
    finally { setLoading(false); }
  };

  useEffect(() => { fetchFeed(); }, []);

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newPostContent.trim() && selectedImages.length === 0 && !selectedVideo) return;

    const formData = new FormData();
    formData.append("content", newPostContent);
    selectedImages.forEach(img => formData.append("images", img));
    if (selectedVideo) formData.append("video", selectedVideo);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/posts`, formData, { 
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } 
      });
      if (response.data.success) {
        setNewPostContent(""); setSelectedImages([]); setSelectedVideo(null);
        if (imageInputRef.current) imageInputRef.current.value = "";
        if (videoInputRef.current) videoInputRef.current.value = "";
        fetchFeed(); 
      }
    } catch (error) { alert("Lỗi khi đăng bài!"); }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa bài viết này?")) return;
    try {
      const response = await axios.delete(`${API_BASE_URL}/api/posts/${postId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) setPosts(posts.filter(p => p._id !== postId)); 
    } catch (error) { alert("Lỗi khi xóa bài viết!"); }
  };

  const handleToggleLike = async (postId) => {
    try {
      const postIndex = posts.findIndex(p => p._id === postId);
      const post = posts[postIndex];
      const isLiked = post.likes.includes(currentUserId);
      const updatedPosts = [...posts];
      
      if (isLiked) updatedPosts[postIndex].likes = post.likes.filter(id => id !== currentUserId);
      else updatedPosts[postIndex].likes.push(currentUserId);
      
      setPosts(updatedPosts);
      await axios.post(`${API_BASE_URL}/api/posts/${postId}/like`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (error) { fetchFeed(); }
  };

  const handleClone = async (postId, type) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/posts/clone`, { postId, type }, { headers: { Authorization: `Bearer ${token}` } });
      if (response.data.success) alert(response.data.message);
    } catch (error) { alert("Lỗi khi lưu dữ liệu."); }
  };

  if (loading) return <div className="flex justify-center items-center min-h-[50vh]"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500"></div></div>;

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 w-full animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-white">Cộng Đồng Fitness</h1>
        <p className="text-gray-400 text-sm mt-1">Nơi chia sẻ thành quả và tiếp lửa đam mê</p>
      </div>

      {/* BOX ĐĂNG BÀI */}
      <div className="bg-gray-800/80 backdrop-blur-md border border-gray-700 p-4 rounded-2xl mb-8 shadow-xl">
        <form onSubmit={handleCreatePost} className="flex flex-col gap-3">
          <textarea value={newPostContent} onChange={(e) => setNewPostContent(e.target.value)} placeholder="Bạn đã tập luyện thế nào hôm nay? Khoe ngay nào..." className="w-full bg-gray-900/50 border border-gray-700 rounded-xl p-4 text-gray-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-none h-28" />
          
          {(selectedImages.length > 0 || selectedVideo) && (
            <div className="flex gap-2 overflow-x-auto py-2">
              {selectedImages.map((img, idx) => (
                <div key={idx} className="relative shrink-0">
                  <img src={URL.createObjectURL(img)} alt="preview" className="h-20 w-20 object-cover rounded-lg border border-gray-600" />
                  <button type="button" onClick={() => setSelectedImages(selectedImages.filter((_, i) => i !== idx))} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"><X className="w-3 h-3" /></button>
                </div>
              ))}
              {selectedVideo && (
                <div className="relative shrink-0">
                  <video src={URL.createObjectURL(selectedVideo)} className="h-20 w-32 object-cover rounded-lg border border-gray-600" />
                  <button type="button" onClick={() => setSelectedVideo(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"><X className="w-3 h-3" /></button>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-between items-center mt-2">
            <div className="flex gap-3">
              <input type="file" accept="image/*" multiple className="hidden" ref={imageInputRef} onChange={(e) => setSelectedImages(Array.from(e.target.files).slice(0, 4))} />
              <input type="file" accept="video/*" className="hidden" ref={videoInputRef} onChange={(e) => setSelectedVideo(e.target.files[0])} />
              <button type="button" onClick={() => imageInputRef.current?.click()} className="p-2 text-gray-400 hover:text-emerald-400 rounded-lg bg-gray-900/50"><ImageIcon className="w-5 h-5" /></button>
              <button type="button" onClick={() => videoInputRef.current?.click()} className="p-2 text-gray-400 hover:text-emerald-400 rounded-lg bg-gray-900/50"><Film className="w-5 h-5" /></button>
            </div>
            <button type="submit" disabled={!newPostContent.trim() && selectedImages.length === 0 && !selectedVideo} className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2">
              <Send className="w-4 h-4" /> Đăng
            </button>
          </div>
        </form>
      </div>

      {/* DANH SÁCH BÀI VIẾT */}
      <div className="space-y-6">
        {posts.length === 0 ? (
          <div className="text-center p-10"><p className="text-gray-400">Chưa có bài viết nào.</p></div>
        ) : (
          posts.map(post => {
            const isMyPost = post.userId?._id === currentUserId || post.userId === currentUserId;
            const hasLiked = post.likes.includes(currentUserId);

            return (
              <div key={post._id} className="bg-gray-800/60 border border-gray-700/60 p-4 md:p-6 rounded-2xl shadow-lg hover:border-gray-600 transition-colors">
                
                {/* Header người đăng */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <img src={post.userId?.avatar || "https://ui-avatars.com/api/?name=U&background=10b981&color=fff"} alt="avatar" className="w-11 h-11 rounded-full object-cover" />
                    <div>
                      <h4 className="font-bold text-gray-100">{post.userId?.name || "Người dùng ẩn danh"}</h4>
                      <p className="text-xs text-gray-400 mt-0.5">{new Date(post.createdAt).toLocaleString('vi-VN')}</p>
                    </div>
                  </div>
                  {isMyPost && (
                    <button onClick={() => handleDeletePost(post._id)} className="text-gray-500 hover:text-red-400 p-2"><Trash2 className="w-4 h-4" /></button>
                  )}
                </div>

                {/* Nội dung chữ */}
                <div onClick={() => navigate(`/post/${post._id}`)} className="cursor-pointer group block mb-3">
                  <p className="text-gray-200 whitespace-pre-wrap group-hover:text-white transition-colors">{post.content}</p>
                </div>

                {/* CAROUSEL INSTAGRAM CHO ẢNH/VIDEO */}
                <MediaCarousel 
                  images={post.images} 
                  video={post.video} 
                  onMediaClick={() => navigate(`/post/${post._id}`)} 
                />

                {/* SNAPSHOTS */}
                {post.workoutSnapshot && (
                  <div className="mt-2 bg-gray-900 border border-gray-700/80 p-3.5 rounded-xl flex justify-between">
                    <div className="flex items-center gap-3 text-emerald-400">
                      <div className="p-2.5 bg-emerald-500/10 rounded-lg"><Activity className="w-5 h-5" /></div>
                      <div>
                        <p className="font-bold text-sm text-gray-200">Lịch tập được chia sẻ</p>
                        <p className="text-xs text-gray-400 mt-0.5">{post.workoutSnapshot.exercises?.length || 0} bài tập</p>
                      </div>
                    </div>
                    <button onClick={() => handleClone(post._id, 'workout')} className="p-2 text-gray-400 hover:text-emerald-400 bg-gray-800 rounded-lg"><Download className="w-5 h-5" /></button>
                  </div>
                )}
                {post.dietSnapshot && (
                  <div className="mt-2 bg-gray-900 border border-gray-700/80 p-3.5 rounded-xl flex justify-between">
                    <div className="flex items-center gap-3 text-yellow-400">
                      <div className="p-2.5 bg-yellow-500/10 rounded-lg"><Utensils className="w-5 h-5" /></div>
                      <div>
                        <p className="font-bold text-sm text-gray-200">Lịch ăn được chia sẻ</p>
                        <p className="text-xs text-gray-400 mt-0.5">{post.dietSnapshot.totalCalories || 0} kcal</p>
                      </div>
                    </div>
                    <button onClick={() => handleClone(post._id, 'diet')} className="p-2 text-gray-400 hover:text-yellow-400 bg-gray-800 rounded-lg"><Download className="w-5 h-5" /></button>
                  </div>
                )}

                {/* TƯƠNG TÁC */}
                <div className="flex items-center gap-6 mt-5 pt-4 border-t border-gray-700/50">
                  <button onClick={() => handleToggleLike(post._id)} className="flex items-center gap-2 text-gray-400 hover:text-pink-500 group">
                    <Heart className={`w-5 h-5 transition-transform group-hover:scale-110 ${hasLiked ? "fill-pink-500 text-pink-500" : ""}`} />
                    <span className={`text-sm font-bold ${hasLiked ? "text-pink-500" : ""}`}>{post.likes?.length || 0}</span>
                  </button>
                  
                  <button onClick={() => navigate(`/post/${post._id}`)} className="flex items-center gap-2 text-gray-400 hover:text-blue-400 group">
                    <MessageCircle className="w-5 h-5 transition-transform group-hover:scale-110" />
                    <span className="text-sm font-bold">{post.commentsCount || 0}</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}