// 📄 src/pages/Exercises.jsx
import React, { useEffect, useState } from 'react';
import { Dumbbell, Plus, Search, Pencil, Trash2, Video, X, UploadCloud, Loader2, Eye, PlayCircle } from 'lucide-react';
import api from '../services/api';

const Exercises = () => {
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // State cho Modal THÊM/SỬA
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentExercise, setCurrentExercise] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    muscleGroup: '',
    difficulty: 'beginner',
    equipmentRequired: '',
    videoUrl: ''
  });

  // State cho Modal XEM CHI TIẾT
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewExercise, setViewExercise] = useState(null);

  useEffect(() => {
    fetchExercises();
  }, []);

  const fetchExercises = async () => {
    try {
      const response = await api.get('/exercises');
      setExercises(response.data);
    } catch (error) {
      alert('Lỗi khi tải danh sách bài tập');
    } finally {
      setLoading(false);
    }
  };

  // --- CHỨC NĂNG XỬ LÝ (THÊM / SỬA / XÓA) ---
  const openModal = (ex = null) => {
    if (ex) {
      setCurrentExercise(ex);
      setFormData({
        name: ex.name,
        muscleGroup: ex.muscleGroup,
        difficulty: ex.difficulty,
        equipmentRequired: ex.equipmentRequired || '',
        videoUrl: ex.videoUrl || ''
      });
    } else {
      setCurrentExercise(null);
      setFormData({ name: '', muscleGroup: '', difficulty: 'beginner', equipmentRequired: '', videoUrl: '' });
    }
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa bài tập này không?')) {
      try {
        await api.delete(`/exercises/${id}`);
        setExercises(exercises.filter(ex => ex._id !== id));
        alert('Đã xóa thành công!');
      } catch (error) {
        alert('Lỗi khi xóa bài tập');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (uploading) {
      alert("Vui lòng chờ video tải lên hoàn tất trước khi lưu!");
      return;
    }
    try {
      if (currentExercise) {
        const res = await api.put(`/exercises/${currentExercise._id}`, formData);
        setExercises(exercises.map(ex => ex._id === currentExercise._id ? res.data : ex));
        alert('Cập nhật thành công!');
      } else {
        const res = await api.post('/exercises', formData);
        setExercises([res.data, ...exercises]);
        alert('Thêm bài tập mới thành công!');
      }
      setIsModalOpen(false);
    } catch (error) {
      alert('Lỗi khi lưu bài tập. Vui lòng kiểm tra lại!');
    }
  };

  const handleVideoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploading(true);
      const uploadData = new FormData();
      uploadData.append('video', file);

      const response = await api.post('/exercises/upload-video', uploadData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data && response.data.videoUrl) {
        setFormData({ ...formData, videoUrl: response.data.videoUrl });
      }
    } catch (error) {
      console.error('Lỗi upload video:', error);
      alert('Lỗi khi tải video lên server. Hãy chắc chắn file không quá nặng.');
    } finally {
      setUploading(false);
      e.target.value = null; 
    }
  };

  // --- CHỨC NĂNG XEM CHI TIẾT ---
  const handleViewExercise = (ex) => {
    setViewExercise(ex);
    setIsViewModalOpen(true);
  };

  // Helper chuyển đổi link YouTube thành dạng Embed để chạy trong iframe
  const getEmbedUrl = (url) => {
    if (!url) return '';
    if (url.includes('youtube.com/watch?v=')) {
      return url.replace('watch?v=', 'embed/');
    }
    if (url.includes('youtu.be/')) {
      return url.replace('youtu.be/', 'youtube.com/embed/');
    }
    return url;
  };

  // Helper hiển thị tên độ khó
  const getDifficultyText = (diff) => {
    switch (diff) {
      case 'beginner': return 'Dễ (Beginner)';
      case 'intermediate': return 'Vừa (Intermediate)';
      case 'advanced': return 'Khó (Advanced)';
      default: return diff;
    }
  };

  // --- GIAO DIỆN ---
  const renderDifficultyTag = (difficulty) => {
    const tags = {
      'beginner': { text: 'Dễ', color: 'bg-green-50 text-green-700 border-green-100' },
      'intermediate': { text: 'Vừa', color: 'bg-yellow-50 text-yellow-700 border-yellow-100' },
      'advanced': { text: 'Khó', color: 'bg-red-50 text-red-700 border-red-100' },
    };
    const tag = tags[difficulty] || { text: difficulty, color: 'bg-gray-50 text-gray-700' };
    return <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${tag.color}`}>{tag.text}</span>;
  };

  const filteredExercises = exercises.filter(ex =>
    ex.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 font-sans p-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Thư viện Bài Tập</h1>
          <p className="text-gray-500 mt-1">Quản lý và cập nhật kho bài tập FitAdmin</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" placeholder="Tìm bài tập..." value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2.5 w-full md:w-64 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 outline-none transition"
            />
          </div>
          <button 
            onClick={() => openModal()}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-bold shadow-lg shadow-blue-100"
          >
            <Plus size={18} /> Thêm bài tập
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 text-center">Video</th>
              <th className="px-6 py-4">Tên bài tập</th>
              <th className="px-6 py-4">Nhóm cơ</th>
              <th className="px-6 py-4">Độ khó</th>
              <th className="px-6 py-4 text-center">Tác vụ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredExercises.map((ex) => (
              <tr 
                key={ex._id} 
                onClick={() => handleViewExercise(ex)} // CLICK DÒNG ĐỂ XEM CHI TIẾT
                className="hover:bg-blue-50/50 cursor-pointer transition-colors group"
              >
                <td className="px-6 py-5">
                   <div className="mx-auto w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center border border-gray-200 shadow-inner relative overflow-hidden">
                    {ex.videoUrl ? (
                      <>
                        <div className="absolute inset-0 bg-blue-100/50"></div>
                        <PlayCircle size={24} className="text-blue-600 relative z-10" />
                      </>
                    ) : (
                      <Video size={20} className="text-gray-300" />
                    )}
                  </div>
                </td>
                <td className="px-6 py-5 font-bold text-gray-800">{ex.name}</td>
                <td className="px-6 py-5 text-gray-600">{ex.muscleGroup}</td>
                <td className="px-6 py-5">{renderDifficultyTag(ex.difficulty)}</td>
                <td className="px-6 py-5 text-center">
                  <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleViewExercise(ex); }} 
                      className="p-2 text-green-600 hover:bg-green-50 border border-transparent hover:border-green-100 rounded-lg transition shadow-sm" title="Xem">
                      <Eye size={18} />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); openModal(ex); }} 
                      className="p-2 text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-100 rounded-lg transition shadow-sm" title="Sửa">
                      <Pencil size={18} />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDelete(ex._id); }} 
                      className="p-2 text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-lg transition shadow-sm" title="Xóa">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredExercises.length === 0 && (
              <tr>
                <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                  Không tìm thấy bài tập nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* --- MODAL XEM CHI TIẾT & PHÁT VIDEO --- */}
      {isViewModalOpen && viewExercise && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
          onClick={() => setIsViewModalOpen(false)} // Click ra ngoài để đóng
        >
          <div 
            className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()} // Chặn sự kiện đóng khi click vào trong form
          >
            <div className="flex justify-between items-center p-5 border-b border-gray-100">
              <h2 className="text-xl font-black text-gray-900">{viewExercise.name}</h2>
              <button onClick={() => setIsViewModalOpen(false)} className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition"><X size={20}/></button>
            </div>
            
            <div className="p-6">
              {/* Vùng phát Video */}
              <div className="w-full aspect-video bg-gray-900 rounded-2xl overflow-hidden mb-6 shadow-inner flex items-center justify-center">
                {viewExercise.videoUrl ? (
                  viewExercise.videoUrl.includes('youtube.com') || viewExercise.videoUrl.includes('youtu.be') ? (
                    // Nếu là link YouTube
                    <iframe 
                      className="w-full h-full" 
                      src={getEmbedUrl(viewExercise.videoUrl)} 
                      title={viewExercise.name}
                      frameBorder="0" 
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                      allowFullScreen
                    ></iframe>
                  ) : (
                    // Nếu là file video upload lên Server (.mp4)
                    // URL có thể cần nối thêm domain Backend nếu Backend lưu dạng đường dẫn tương đối (VD: /uploads/...)
                    <video 
  className="w-full h-full object-contain" 
  controls 
  autoPlay
  src={viewExercise.videoUrl.startsWith('http') ? viewExercise.videoUrl : `http://localhost:5000${viewExercise.videoUrl}`} 
>
  Trình duyệt của bạn không hỗ trợ thẻ video.
</video>
                  )
                ) : (
                  <div className="text-gray-400 flex flex-col items-center gap-2">
                    <Video size={48} className="opacity-20" />
                    <p>Chưa có video minh họa cho bài tập này</p>
                  </div>
                )}
              </div>

              {/* Thông tin bài tập */}
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-5 rounded-2xl border border-gray-100">
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Nhóm cơ</p>
                  <p className="text-base font-semibold text-gray-900">{viewExercise.muscleGroup || 'Không xác định'}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Độ khó</p>
                  <p className="text-base font-semibold text-gray-900">{getDifficultyText(viewExercise.difficulty)}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Dụng cụ yêu cầu</p>
                  <p className="text-base font-semibold text-gray-900">{viewExercise.equipmentRequired || 'Không cần dụng cụ (Bodyweight)'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL FORM (THÊM / SỬA) --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          {/* ... [GIỮ NGUYÊN CODE CỦA MODAL THÊM SỬA TRƯỚC ĐÓ] ... */}
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-xl font-black text-gray-900">{currentExercise ? 'Chỉnh sửa bài tập' : 'Thêm bài tập mới'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Tên bài tập</label>
                <input required value={formData.name} onChange={(e)=>setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500 focus:bg-white transition-colors" placeholder="VD: Push Up" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Nhóm cơ</label>
                  <input required value={formData.muscleGroup} onChange={(e)=>setFormData({...formData, muscleGroup: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500 focus:bg-white transition-colors" placeholder="VD: Ngực" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Độ khó</label>
                  <select value={formData.difficulty} onChange={(e)=>setFormData({...formData, difficulty: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500 focus:bg-white transition-colors">
                    <option value="beginner">Dễ (Beginner)</option>
                    <option value="intermediate">Vừa (Intermediate)</option>
                    <option value="advanced">Khó (Advanced)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Dụng cụ (nếu có)</label>
                <input value={formData.equipmentRequired} onChange={(e)=>setFormData({...formData, equipmentRequired: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500 focus:bg-white transition-colors" placeholder="VD: Dumbbell" />
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-bold text-gray-700 mb-1 flex items-center justify-between">
                  Video minh họa
                  {uploading && <span className="text-xs text-blue-600 flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Đang tải lên...</span>}
                </label>
                
                <div className="relative">
                  <input 
                    type="file" 
                    accept="video/mp4,video/x-m4v,video/*" 
                    className="hidden" 
                    id="video-upload" 
                    onChange={handleVideoUpload}
                    disabled={uploading}
                  />
                  <label 
                    htmlFor="video-upload" 
                    className={`flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed rounded-xl cursor-pointer transition-all text-sm font-semibold
                      ${uploading ? 'bg-gray-50 border-gray-200 text-gray-400' : 'border-blue-200 hover:border-blue-400 hover:bg-blue-50 text-blue-600'}
                    `}
                  >
                    <UploadCloud size={20} /> 
                    {uploading ? "Đang xử lý video..." : "Tải video từ thiết bị lên server"}
                  </label>
                </div>

                <div className="flex items-center gap-2 text-gray-400 text-xs font-medium uppercase">
                  <span className="h-px bg-gray-200 flex-1"></span> Hoặc dùng link <span className="h-px bg-gray-200 flex-1"></span>
                </div>

                <input 
                  value={formData.videoUrl} 
                  onChange={(e)=>setFormData({...formData, videoUrl: e.target.value})} 
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500 focus:bg-white transition-colors text-sm" 
                  placeholder="https://..." 
                  disabled={uploading}
                />
              </div>

              <div className="flex gap-3 pt-6 border-t border-gray-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition">Hủy</button>
                <button 
                  type="submit" 
                  disabled={uploading}
                  className={`flex-1 py-3 text-white font-bold rounded-xl transition shadow-lg ${uploading ? 'bg-blue-400 shadow-none cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'}`}
                >
                  {currentExercise ? 'Cập nhật' : 'Thêm bài tập'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Exercises;