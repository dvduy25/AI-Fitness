import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  Heart, MessageCircle, Send, Activity, Utensils, 
  Download, Trash2, Image as ImageIcon, Film, X, Edit2 
} from 'lucide-react';

const API_BASE_URL = 'https://ai-fitness-w6fd.onrender.com';

export default function Community() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // State Đăng bài
  const [newPostContent, setNewPostContent] = useState("");
  const [selectedImages, setSelectedImages] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  
  // State Bình luận
  const [activeCommentPost, setActiveCommentPost] = useState(null);
  const [commentText, setCommentText] = useState("");
  const [postComments, setPostComments] = useState({}); // Lưu danh sách comment: { postId: [comments...] }
  
  // State Sửa bình luận
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editCommentText, setEditCommentText] = useState("");

  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);

  const token = localStorage.getItem("token");

  // HÀM GIẢI MÃ TOKEN ĐỂ LẤY ID USER HIỆN TẠI
  const getCurrentUserId = () => {
    if (!token) return null;
    try {
      const payload = token.split('.')[1];
      const decoded = JSON.parse(atob(payload));
      return decoded.id || decoded._id; 
    } catch (e) {
      return null;
    }
  };
  const currentUserId = getCurrentUserId();

  // ==========================================
  // API: BÀI VIẾT
  // ==========================================
  const fetchFeed = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/posts/feed`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setPosts(response.data.posts);
      }
    } catch (error) {
      console.error("Lỗi khi tải bảng tin:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, []);

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newPostContent.trim() && selectedImages.length === 0 && !selectedVideo) return;

    // Phải dùng FormData để gửi File thay vì JSON
    const formData = new FormData();
    formData.append("content", newPostContent);
    
    selectedImages.forEach(img => formData.append("images", img));
    if (selectedVideo) formData.append("video", selectedVideo);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/posts`, formData, { 
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        } 
      });
      if (response.data.success) {
        setNewPostContent("");
        setSelectedImages([]);
        setSelectedVideo(null);
        if (imageInputRef.current) imageInputRef.current.value = "";
        if (videoInputRef.current) videoInputRef.current.value = "";
        fetchFeed(); 
      }
    } catch (error) {
      alert("Lỗi khi đăng bài! Định dạng file có thể không được hỗ trợ hoặc quá lớn.");
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa bài viết này?")) return;
    try {
      const response = await axios.delete(`${API_BASE_URL}/api/posts/${postId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setPosts(posts.filter(p => p._id !== postId)); 
      }
    } catch (error) {
      alert("Lỗi khi xóa bài viết!");
    }
  };

  const handleToggleLike = async (postId) => {
    try {
      const postIndex = posts.findIndex(p => p._id === postId);
      const post = posts[postIndex];
      const isLiked = post.likes.includes(currentUserId);

      const updatedPosts = [...posts];
      if (isLiked) {
        updatedPosts[postIndex].likes = post.likes.filter(id => id !== currentUserId);
      } else {
        updatedPosts[postIndex].likes.push(currentUserId);
      }
      setPosts(updatedPosts);

      await axios.post(`${API_BASE_URL}/api/posts/${postId}/like`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (error) {
      fetchFeed(); 
    }
  };

  // ==========================================
  // API: BÌNH LUẬN
  // ==========================================
  const toggleComments = async (postId) => {
    if (activeCommentPost === postId) {
      setActiveCommentPost(null); // Đóng nếu đang mở
      return;
    }
    
    setActiveCommentPost(postId); // Mở
    // Gọi API lấy danh sách bình luận
    try {
      const response = await axios.get(`${API_BASE_URL}/api/posts/${postId}/comments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setPostComments(prev => ({ ...prev, [postId]: response.data.comments }));
      }
    } catch (error) {
      console.error("Lỗi khi tải bình luận:", error);
    }
  };

  const handleSendComment = async (postId) => {
    if (!commentText.trim()) return;
    try {
      const response = await axios.post(`${API_BASE_URL}/api/posts/${postId}/comment`, 
        { content: commentText },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.success) {
        setCommentText("");
        // Tải lại bình luận
        toggleComments(postId); // Mẹo: Gọi lại hàm này để load mới danh sách
        setActiveCommentPost(postId); // Giữ cho nó mở
        fetchFeed(); // Cập nhật số lượng comment trên feed
      }
    } catch (error) {
      console.error("Lỗi khi bình luận:", error);
    }
  };

  const handleDeleteComment = async (postId, commentId) => {
    if (!window.confirm("Xóa bình luận này?")) return;
    try {
      const response = await axios.delete(`${API_BASE_URL}/api/posts/comment/${commentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        // Cập nhật UI ngay lập tức
        setPostComments(prev => ({
          ...prev,
          [postId]: prev[postId].filter(c => c._id !== commentId)
        }));
        fetchFeed(); // Cập nhật đếm comment
      }
    } catch (error) {
      alert("Lỗi khi xóa bình luận!");
    }
  };

  const handleUpdateComment = async (postId, commentId) => {
    if (!editCommentText.trim()) return;
    try {
      const response = await axios.put(`${API_BASE_URL}/api/posts/comment/${commentId}`, 
        { content: editCommentText },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.success) {
        setEditingCommentId(null);
        // Cập nhật text trong UI
        setPostComments(prev => ({
          ...prev,
          [postId]: prev[postId].map(c => c._id === commentId ? { ...c, content: editCommentText } : c)
        }));
      }
    } catch (error) {
      alert("Lỗi khi sửa bình luận!");
    }
  };

  const handleClone = async (postId, type) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/posts/clone`, 
        { postId, type },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.success) alert(response.data.message);
    } catch (error) {
      alert("Lỗi khi lưu dữ liệu.");
    }
  };

  // ==========================================
  // RENDER HELPERS
  // ==========================================
  if (loading) return (
    <div className="flex justify-center items-center min-h-[50vh]">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500"></div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8 text-center md:text-left">
        <h1 className="text-2xl font-black text-white">Cộng Đồng Fitness</h1>
        <p className="text-gray-400 text-sm mt-1">Nơi chia sẻ thành quả và tiếp lửa đam mê</p>
      </div>

      {/* ================= BOX ĐĂNG BÀI ================= */}
      <div className="bg-gray-800/80 backdrop-blur-md border border-gray-700 p-4 rounded-2xl mb-8 shadow-xl">
        <form onSubmit={handleCreatePost} className="flex flex-col gap-3">
          <textarea 
            value={newPostContent}
            onChange={(e) => setNewPostContent(e.target.value)}
            placeholder="Bạn đã tập luyện thế nào hôm nay? Khoe ngay nào..."
            className="w-full bg-gray-900/50 border border-gray-700 rounded-xl p-4 text-gray-200 placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-none h-28 transition-all"
          />
          
          {/* PREVIEW ẢNH & VIDEO TRƯỚC KHI ĐĂNG */}
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
              
              <button type="button" onClick={() => imageInputRef.current?.click()} className="p-2 text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors" title="Thêm ảnh (Tối đa 4)">
                <ImageIcon className="w-5 h-5" />
              </button>
              <button type="button" onClick={() => videoInputRef.current?.click()} className="p-2 text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors" title="Thêm video">
                <Film className="w-5 h-5" />
              </button>
            </div>

            <button 
              type="submit" 
              disabled={!newPostContent.trim() && selectedImages.length === 0 && !selectedVideo}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-colors shadow-lg shadow-emerald-500/20"
            >
              <Send className="w-4 h-4" /> Đăng bài
            </button>
          </div>
        </form>
      </div>

      {/* ================= DANH SÁCH BÀI VIẾT ================= */}
      <div className="space-y-6">
        {posts.length === 0 ? (
          <div className="text-center bg-gray-800/30 border border-gray-700/50 rounded-2xl p-10">
            <Activity className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">Chưa có bài viết nào.</p>
          </div>
        ) : (
          posts.map(post => {
            const isMyPost = post.userId?._id === currentUserId || post.userId === currentUserId;
            const hasLiked = post.likes.includes(currentUserId);

            return (
              <div key={post._id} className="bg-gray-800/60 border border-gray-700/60 p-4 md:p-6 rounded-2xl shadow-lg">
                {/* HEADER BÀI VIẾT */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <img src={post.userId?.avatar || "https://ui-avatars.com/api/?name=User&background=10b981&color=fff"} alt="avatar" className="w-11 h-11 rounded-full object-cover border-2 border-gray-700" />
                    <div>
                      <h4 className="font-bold text-gray-100 flex items-center gap-2">
                        {post.userId?.name || "Người dùng ẩn danh"}
                        {post.userId?.role === 'admin' && <span className="bg-blue-500/20 text-blue-400 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">Admin</span>}
                      </h4>
                      <p className="text-xs text-gray-400 mt-0.5">{new Date(post.createdAt).toLocaleString('vi-VN')}</p>
                    </div>
                  </div>
                  {isMyPost && (
                    <button onClick={() => handleDeletePost(post._id)} className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* NỘI DUNG TEXT */}
                <p className="text-gray-200 whitespace-pre-wrap leading-relaxed text-sm md:text-base mb-4">
                  {post.content}
                </p>

                {/* NỘI DUNG MEDIA (ẢNH/VIDEO) */}
                {post.images && post.images.length > 0 && (
                  <div className={`grid gap-2 mb-4 ${post.images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                    {post.images.map((imgUrl, idx) => (
                      <img key={idx} src={imgUrl} alt="post media" className="w-full h-auto max-h-64 object-cover rounded-xl border border-gray-700/50" />
                    ))}
                  </div>
                )}
                {post.video && (
                  <div className="mb-4">
                    <video controls src={post.video} className="w-full h-auto max-h-96 rounded-xl border border-gray-700/50 bg-black"></video>
                  </div>
                )}

                {/* NỘI DUNG SNAPSHOT (LỊCH TẬP/ĂN) */}
                {post.workoutSnapshot && (
                  <div className="mt-4 bg-gray-900 border border-gray-700/80 p-3.5 rounded-xl flex items-center justify-between shadow-inner">
                    <div className="flex items-center gap-3 text-emerald-400">
                      <div className="p-2.5 bg-emerald-500/10 rounded-lg"><Activity className="w-5 h-5" /></div>
                      <div>
                        <p className="font-bold text-sm text-gray-200">Lịch tập được chia sẻ</p>
                        <p className="text-xs text-gray-400 mt-0.5">{post.workoutSnapshot.exercises?.length || 0} bài tập</p>
                      </div>
                    </div>
                    <button onClick={() => handleClone(post._id, 'workout')} className="p-2.5 text-gray-400 hover:text-emerald-400 rounded-xl"><Download className="w-5 h-5" /></button>
                  </div>
                )}
                {post.dietSnapshot && (
                  <div className="mt-4 bg-gray-900 border border-gray-700/80 p-3.5 rounded-xl flex items-center justify-between shadow-inner">
                    <div className="flex items-center gap-3 text-yellow-400">
                      <div className="p-2.5 bg-yellow-500/10 rounded-lg"><Utensils className="w-5 h-5" /></div>
                      <div>
                        <p className="font-bold text-sm text-gray-200">Lịch ăn được chia sẻ</p>
                        <p className="text-xs text-gray-400 mt-0.5">{post.dietSnapshot.totalCalories || 0} kcal</p>
                      </div>
                    </div>
                    <button onClick={() => handleClone(post._id, 'diet')} className="p-2.5 text-gray-400 hover:text-yellow-400 rounded-xl"><Download className="w-5 h-5" /></button>
                  </div>
                )}

                {/* THANH TƯƠNG TÁC */}
                <div className="flex items-center gap-6 mt-5 pt-4 border-t border-gray-700/50">
                  <button onClick={() => handleToggleLike(post._id)} className="flex items-center gap-2 text-gray-400 hover:text-pink-500 transition-colors group">
                    <Heart className={`w-5 h-5 transition-transform ${hasLiked ? "fill-pink-500 text-pink-500 scale-110" : "group-hover:scale-110"}`} />
                    <span className={`text-sm font-bold ${hasLiked ? "text-pink-500" : ""}`}>{post.likes?.length || 0}</span>
                  </button>
                  
                  <button onClick={() => toggleComments(post._id)} className="flex items-center gap-2 text-gray-400 hover:text-blue-400 transition-colors group">
                    <MessageCircle className="w-5 h-5 transition-transform group-hover:scale-110" />
                    <span className="text-sm font-bold">{post.commentsCount || 0}</span>
                  </button>
                </div>

                {/* ================= KHU VỰC BÌNH LUẬN ================= */}
                {activeCommentPost === post._id && (
                  <div className="mt-5 pt-4 border-t border-gray-700/30">
                    
                    {/* Form nhập bình luận */}
                    <div className="flex items-center gap-3 mb-5">
                      <img src="https://ui-avatars.com/api/?name=You&background=374151&color=fff" alt="you" className="w-8 h-8 rounded-full" />
                      <input 
                        type="text"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Viết bình luận của bạn..."
                        className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
                        onKeyDown={(e) => e.key === 'Enter' && handleSendComment(post._id)}
                      />
                      <button onClick={() => handleSendComment(post._id)} disabled={!commentText.trim()} className="p-2.5 text-white bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 rounded-xl">
                        <Send className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Danh sách bình luận */}
                    <div className="space-y-4 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                      {postComments[post._id]?.map(comment => {
                        const isCommentOwner = comment.userId?._id === currentUserId;
                        const canDelete = isCommentOwner || isMyPost; // Chủ comment hoặc Chủ post được xóa

                        return (
                          <div key={comment._id} className="flex gap-3">
                            <img src={comment.userId?.avatar || "https://ui-avatars.com/api/?name=C&background=4b5563&color=fff"} alt="avatar" className="w-8 h-8 rounded-full object-cover" />
                            <div className="flex-1">
                              <div className="bg-gray-900/80 rounded-2xl rounded-tl-none px-4 py-2 relative group w-fit min-w-[150px] max-w-full">
                                <h5 className="text-sm font-bold text-gray-200">{comment.userId?.name || "Ẩn danh"}</h5>
                                
                                {/* Edit Mode vs View Mode */}
                                {editingCommentId === comment._id ? (
                                  <div className="mt-1 flex items-center gap-2">
                                    <input 
                                      type="text" autoFocus value={editCommentText} onChange={(e) => setEditCommentText(e.target.value)}
                                      className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:outline-none"
                                      onKeyDown={(e) => e.key === 'Enter' && handleUpdateComment(post._id, comment._id)}
                                    />
                                    <button onClick={() => setEditingCommentId(null)} className="text-gray-400 hover:text-white"><X className="w-4 h-4"/></button>
                                  </div>
                                ) : (
                                  <p className="text-gray-300 text-sm mt-0.5 break-words">{comment.content}</p>
                                )}

                                {/* Nút thao tác (Sửa/Xóa) - Hiển thị khi hover */}
                                {!editingCommentId && (
                                  <div className="absolute -right-12 top-2 hidden group-hover:flex items-center gap-1">
                                    {isCommentOwner && (
                                      <button onClick={() => { setEditingCommentId(comment._id); setEditCommentText(comment.content); }} className="p-1 text-gray-500 hover:text-blue-400"><Edit2 className="w-3.5 h-3.5" /></button>
                                    )}
                                    {canDelete && (
                                      <button onClick={() => handleDeleteComment(post._id, comment._id)} className="p-1 text-gray-500 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                                    )}
                                  </div>
                                )}
                              </div>
                              <span className="text-[11px] text-gray-500 ml-2 mt-1 block">{new Date(comment.createdAt).toLocaleString('vi-VN')}</span>
                            </div>
                          </div>
                        );
                      })}
                      {(!postComments[post._id] || postComments[post._id].length === 0) && (
                        <p className="text-center text-sm text-gray-500 py-2">Chưa có bình luận nào.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}