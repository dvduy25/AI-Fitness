import React, { useEffect, useState } from 'react';
import { Plus, Search, Pencil, Trash2, Video, X, UploadCloud, Loader2, Eye, PlayCircle, Sparkles, Wand2, Star } from 'lucide-react';
import api from '../services/api';

const Exercises = () => {
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // AI State
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // State Modal THÊM/SỬA
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentExercise, setCurrentExercise] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    muscleGroup: '',
    level: 'beginner',
    equipmentRequired: '',
    videoUrl: '',
    description: '',
    effectiveness: 5 // Mặc định 5 sao
  });

  // State Modal XEM CHI TIẾT
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

  const openModal = (ex = null) => {
    if (ex) {
      setCurrentExercise(ex);
      setFormData({
        name: ex.name,
        muscleGroup: ex.muscleGroup,
        level: ex.level || 'beginner',
        equipmentRequired: ex.equipmentRequired || '',
        videoUrl: ex.videoUrl || '',
        description: ex.description || '',
        effectiveness: ex.effectiveness || 5
      });
    } else {
      setCurrentExercise(null);
      setFormData({ name: '', muscleGroup: '', level: 'beginner', equipmentRequired: '', videoUrl: '', description: '', effectiveness: 5 });
      setAiPrompt(''); // Reset ô nhập AI
    }
    setIsModalOpen(true);
  };

  // 🌟 HÀM GỌI TRỢ LÝ AI
  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    try {
      const res = await api.post('/exercises/ai-check-suggest', { prompt: aiPrompt });
      const { exists, message, exerciseData } = res.data.data;
      
      if (exists) {
        alert(`⚠️ AI Thông báo: ${message}`);
      } else {
        alert(`✨ AI Thông báo: ${message}`);
        // Tự động điền dữ liệu AI tạo ra vào form
        setFormData({
          ...formData,
          name: exerciseData.name || '',
          muscleGroup: exerciseData.muscleGroup || '',
          level: exerciseData.level || 'beginner',
          equipmentRequired: exerciseData.equipmentRequired || 'Không cần dụng cụ',
          description: exerciseData.description || '',
          effectiveness: exerciseData.effectiveness || 5
        });
      }
    } catch (error) {
      alert("Lỗi AI: " + (error.response?.data?.message || "Không thể kết nối đến AI"));
    } finally {
      setAiLoading(false);
    }
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
        setExercises(exercises.map(ex => ex._id === currentExercise._id ? res.data.exercise : ex));
        alert('Cập nhật thành công!');
      } else {
        const res = await api.post('/exercises', formData);
        setExercises([res.data.exercise, ...exercises]);
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
      alert('Lỗi khi tải video lên server. Hãy chắc chắn file không quá nặng.');
    } finally {
      setUploading(false);
      e.target.value = null; 
    }
  };

  const handleViewExercise = (ex) => {
    setViewExercise(ex);
    setIsViewModalOpen(true);
  };

  const getEmbedUrl = (url) => {
    if (!url) return '';
    if (url.includes('youtube.com/watch?v=')) return url.replace('watch?v=', 'embed/');
    if (url.includes('youtu.be/')) return url.replace('youtu.be/', 'youtube.com/embed/');
    return url;
  };

  const getLevelText = (level) => {
    switch (level) {
      case 'beginner': return 'Dễ';
      case 'intermediate': return 'Vừa';
      case 'advanced': return 'Khó';
      default: return level;
    }
  };

  const renderLevelTag = (level) => {
    const tags = {
      'beginner': { text: 'Dễ', color: 'bg-green-50 text-green-700 border-green-100' },
      'intermediate': { text: 'Vừa', color: 'bg-yellow-50 text-yellow-700 border-yellow-100' },
      'advanced': { text: 'Khó', color: 'bg-red-50 text-red-700 border-red-100' },
    };
    const tag = tags[level] || { text: level, color: 'bg-gray-50 text-gray-700' };
    return <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${tag.color}`}>{tag.text}</span>;
  };

  const filteredExercises = exercises.filter(ex =>
    ex.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 font-sans p-4">
      {/* HEADER */}
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
            <Plus size={18} /> Thêm mới
          </button>
        </div>
      </div>

      {/* DANH SÁCH BÀI TẬP */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-gray-500 gap-2">
            <Loader2 className="animate-spin" size={20} /> Đang tải dữ liệu...
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-center">Video</th>
                <th className="px-6 py-4">Tên bài tập</th>
                <th className="px-6 py-4">Nhóm cơ</th>
                <th className="px-6 py-4">Độ khó</th>
                <th className="px-6 py-4">Hiệu quả</th>
                <th className="px-6 py-4 text-center">Tác vụ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredExercises.map((ex) => (
                <tr 
                  key={ex._id} 
                  onClick={() => handleViewExercise(ex)}
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
                  <td className="px-6 py-5">{renderLevelTag(ex.level)}</td>
                  <td className="px-6 py-5 text-yellow-500 flex mt-3 gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={14} fill={i < (ex.effectiveness || 5) ? "currentColor" : "none"} className={i < (ex.effectiveness || 5) ? "" : "text-gray-300"} />
                    ))}
                  </td>
                  <td className="px-6 py-5 text-center">
                    <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); handleViewExercise(ex); }} className="p-2 text-green-600 hover:bg-green-50 border border-transparent hover:border-green-100 rounded-lg transition" title="Xem"><Eye size={18} /></button>
                      <button onClick={(e) => { e.stopPropagation(); openModal(ex); }} className="p-2 text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-100 rounded-lg transition" title="Sửa"><Pencil size={18} /></button>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(ex._id); }} className="p-2 text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-lg transition" title="Xóa"><Trash2 size={18} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredExercises.length === 0 && (
                <tr><td colSpan="6" className="px-6 py-12 text-center text-gray-500">Không tìm thấy bài tập nào.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL XEM CHI TIẾT */}
      {isViewModalOpen && viewExercise && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md" onClick={() => setIsViewModalOpen(false)}>
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-5 border-b border-gray-100">
              <h2 className="text-xl font-black text-gray-900">{viewExercise.name}</h2>
              <button onClick={() => setIsViewModalOpen(false)} className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition"><X size={20}/></button>
            </div>
            
            <div className="p-6">
              <div className="w-full aspect-video bg-gray-900 rounded-2xl overflow-hidden mb-6 shadow-inner flex items-center justify-center">
                {viewExercise.videoUrl ? (
                  viewExercise.videoUrl.includes('youtube.com') || viewExercise.videoUrl.includes('youtu.be') ? (
                    <iframe className="w-full h-full" src={getEmbedUrl(viewExercise.videoUrl)} title={viewExercise.name} frameBorder="0" allowFullScreen></iframe>
                  ) : (
                    <video className="w-full h-full object-contain" controls autoPlay src={viewExercise.videoUrl.startsWith('http') ? viewExercise.videoUrl : `http://localhost:5000${viewExercise.videoUrl}`}></video>
                  )
                ) : (
                  <div className="text-gray-400 flex flex-col items-center gap-2">
                    <Video size={48} className="opacity-20" />
                    <p>Chưa có video minh họa</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-5 rounded-2xl border border-gray-100">
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Nhóm cơ</p>
                  <p className="text-base font-semibold text-gray-900">{viewExercise.muscleGroup || 'Không xác định'}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Độ khó</p>
                  <p className="text-base font-semibold text-gray-900">{getLevelText(viewExercise.level)}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Dụng cụ</p>
                  <p className="text-base font-semibold text-gray-900">{viewExercise.equipmentRequired || 'Không cần'}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Độ hiệu quả</p>
                  <div className="flex gap-1 text-yellow-500 mt-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={18} fill={i < (viewExercise.effectiveness || 5) ? "currentColor" : "none"} className={i < (viewExercise.effectiveness || 5) ? "" : "text-gray-300"} />
                    ))}
                  </div>
                </div>
                {viewExercise.description && (
                  <div className="col-span-2 mt-2">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Mô tả chi tiết</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{viewExercise.description}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FORM THÊM/SỬA */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h2 className="text-xl font-black text-gray-900">{currentExercise ? 'Chỉnh sửa bài tập' : 'Thêm bài tập mới'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition"><X size={20}/></button>
            </div>
            
            <div className="p-6">
              {/* ✨ TÍNH NĂNG AI (Chỉ hiện khi Thêm Mới) */}
              {!currentExercise && (
                <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 mb-6 shadow-sm">
                  <label className="text-sm font-bold text-indigo-900 mb-2 flex items-center gap-2">
                    <Sparkles size={16} className="text-indigo-600" /> Trợ lý AI tạo giáo án tự động
                  </label>
                  <div className="flex gap-2 mt-2">
                    <input
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder="VD: Nhập 'Hít đất' hoặc 'Ngực'..."
                      className="flex-1 px-4 py-2 text-sm bg-white border border-indigo-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={handleAIGenerate}
                      disabled={aiLoading || !aiPrompt.trim()}
                      className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 shadow-md shadow-indigo-200 transition"
                    >
                      {aiLoading ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                      AI Soạn
                    </button>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
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
                    <select value={formData.level} onChange={(e)=>setFormData({...formData, level: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500 focus:bg-white transition-colors">
                      <option value="beginner">Dễ (Beginner)</option>
                      <option value="intermediate">Vừa (Intermediate)</option>
                      <option value="advanced">Khó (Advanced)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Dụng cụ</label>
                    <input value={formData.equipmentRequired} onChange={(e)=>setFormData({...formData, equipmentRequired: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500 focus:bg-white transition-colors" placeholder="VD: Dumbbell" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Hiệu quả (Số Sao)</label>
                    <select value={formData.effectiveness} onChange={(e)=>setFormData({...formData, effectiveness: Number(e.target.value)})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500 focus:bg-white transition-colors text-yellow-600 font-bold">
                      <option value={5}>⭐⭐⭐⭐⭐ (5 Sao)</option>
                      <option value={4}>⭐⭐⭐⭐ (4 Sao)</option>
                      <option value={3}>⭐⭐⭐ (3 Sao)</option>
                      <option value={2}>⭐⭐ (2 Sao)</option>
                      <option value={1}>⭐ (1 Sao)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Mô tả chi tiết</label>
                  <textarea 
                    value={formData.description} 
                    onChange={(e)=>setFormData({...formData, description: e.target.value})} 
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500 focus:bg-white transition-colors resize-none" 
                    placeholder="Nhập hướng dẫn thực hiện..."
                    rows="3"
                  ></textarea>
                </div>

                <div className="space-y-3">
                  <label className="block text-sm font-bold text-gray-700 mb-1 flex items-center justify-between">
                    Video minh họa
                    {uploading && <span className="text-xs text-blue-600 flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Đang tải...</span>}
                  </label>
                  
                  <div className="relative">
                    <input type="file" accept="video/mp4,video/x-m4v,video/*" className="hidden" id="video-upload" onChange={handleVideoUpload} disabled={uploading} />
                    <label htmlFor="video-upload" className={`flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed rounded-xl cursor-pointer transition-all text-sm font-semibold ${uploading ? 'bg-gray-50 border-gray-200 text-gray-400' : 'border-blue-200 hover:border-blue-400 hover:bg-blue-50 text-blue-600'}`}>
                      <UploadCloud size={20} /> 
                      {uploading ? "Đang xử lý..." : "Tải lên từ thiết bị"}
                    </label>
                  </div>

                  <div className="flex items-center gap-2 text-gray-400 text-xs font-medium uppercase">
                    <span className="h-px bg-gray-200 flex-1"></span> Hoặc dùng link <span className="h-px bg-gray-200 flex-1"></span>
                  </div>

                  <input 
                    value={formData.videoUrl} onChange={(e)=>setFormData({...formData, videoUrl: e.target.value})} 
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500 focus:bg-white transition-colors text-sm" 
                    placeholder="Dán link Youtube hoặc URL video..." disabled={uploading}
                  />

                  {/* ✨ KHU VỰC HIỂN THỊ XEM TRƯỚC VIDEO (PREVIEW) */}
                  {formData.videoUrl && (
                    <div className="mt-4 relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center border border-gray-200 shadow-inner group">
                      {formData.videoUrl.includes('youtube.com') || formData.videoUrl.includes('youtu.be') ? (
                        <iframe className="w-full h-full" src={getEmbedUrl(formData.videoUrl)} title="Video Preview" frameBorder="0" allowFullScreen></iframe>
                      ) : (
                        <video className="w-full h-full object-contain" controls src={formData.videoUrl.startsWith('http') ? formData.videoUrl : `http://localhost:5000${formData.videoUrl}`}></video>
                      )}
                      
                      {/* Nút xóa video nhanh khi hover */}
                      <button 
                        type="button" 
                        onClick={() => setFormData({...formData, videoUrl: ''})} 
                        className="absolute top-3 right-3 p-2 bg-red-500/90 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600 shadow-md backdrop-blur-sm"
                        title="Xóa video này"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-6 border-t border-gray-100">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition">Hủy</button>
                  <button 
                    type="submit" disabled={uploading}
                    className={`flex-1 py-3 text-white font-bold rounded-xl transition shadow-lg ${uploading ? 'bg-blue-400 shadow-none cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'}`}
                  >
                    {currentExercise ? 'Cập nhật' : 'Lưu bài tập'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Exercises;