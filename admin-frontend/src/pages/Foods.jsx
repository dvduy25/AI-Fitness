import React, { useEffect, useState } from 'react';
import { Search, Plus, Pencil, Trash2, Image as ImageIcon, X, UploadCloud, Loader2, Eye, Apple, Sparkles, Star } from 'lucide-react';
import api from '../services/api';

const Foods = () => {
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // State Trợ lý AI
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // State Modal THÊM/SỬA
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentFood, setCurrentFood] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    caloriesPer100g: '',
    proteinPer100g: '',
    carbsPer100g: '',
    fatPer100g: '',
    imageUrl: '',
    rating: 5,
    healthStatus: 'healthy'
  });

  // State Modal XEM CHI TIẾT
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewFood, setViewFood] = useState(null);

  useEffect(() => {
    fetchFoods();
  }, []);

  const fetchFoods = async () => {
    try {
      const response = await api.get('/foods'); 
      setFoods(response.data.data || response.data);
    } catch (error) {
      console.error('Lỗi khi tải danh sách thực phẩm:', error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (food = null) => {
    setAiPrompt(''); // Reset prompt AI
    if (food) {
      setCurrentFood(food);
      setFormData({
        name: food.name,
        caloriesPer100g: food.caloriesPer100g,
        proteinPer100g: food.proteinPer100g,
        carbsPer100g: food.carbsPer100g,
        fatPer100g: food.fatPer100g,
        imageUrl: food.imageUrl || '',
        rating: food.rating || 5,
        healthStatus: food.healthStatus || 'healthy'
      });
    } else {
      setCurrentFood(null);
      setFormData({ 
        name: '', 
        caloriesPer100g: '', 
        proteinPer100g: '', 
        carbsPer100g: '', 
        fatPer100g: '', 
        imageUrl: '',
        rating: 5,
        healthStatus: 'healthy'
      });
    }
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa thực phẩm này không?')) {
      try {
        await api.delete(`/foods/${id}`);
        setFoods(foods.filter(f => f._id !== id));
        alert('Đã xóa thành công!');
      } catch (error) {
        alert('Lỗi khi xóa thực phẩm');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (uploading) {
      alert("Vui lòng chờ ảnh tải lên hoàn tất trước khi lưu!");
      return;
    }
    try {
      if (currentFood) {
        const res = await api.put(`/foods/${currentFood._id}`, formData);
        const updatedFood = res.data.food || res.data;
        setFoods(foods.map(f => f._id === currentFood._id ? updatedFood : f));
        alert('Cập nhật thành công!');
      } else {
        const res = await api.post('/foods', formData);
        const newFood = res.data.food || res.data;
        setFoods([newFood, ...foods]);
        alert('Thêm món mới thành công!');
      }
      setIsModalOpen(false);
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Lỗi khi lưu thực phẩm. Vui lòng kiểm tra lại!';
      alert(errorMsg);
    }
  };

  // Gọi API AI phân tích dinh dưỡng từ Router backend (/ai-suggest)
  const handleAiFill = async () => {
    if (!aiPrompt.trim()) {
      alert('Vui lòng nhập tên món hoặc nhu cầu để AI phân tích!');
      return;
    }

    try {
      setAiLoading(true);
      const res = await api.post('/foods/ai-suggest', { prompt: aiPrompt.trim() });
      const aiResult = res.data?.data;

      if (aiResult) {
        if (aiResult.exists) {
          alert(`⚠️ Hệ thống báo: ${aiResult.message}`);
          return;
        }

        if (aiResult.foodData) {
          setFormData({
            name: aiResult.foodData.name || '',
            caloriesPer100g: aiResult.foodData.caloriesPer100g || '',
            proteinPer100g: aiResult.foodData.proteinPer100g || '',
            carbsPer100g: aiResult.foodData.carbsPer100g || '',
            fatPer100g: aiResult.foodData.fatPer100g || '',
            imageUrl: formData.imageUrl, // Giữ nguyên ảnh đã upload (nếu có)
            rating: aiResult.foodData.rating || 5,
            healthStatus: aiResult.foodData.healthStatus || 'healthy'
          });
          alert(`✨ AI đã điền thành công số liệu món: "${aiResult.foodData.name}"!`);
        }
      }
    } catch (error) {
      console.error("Lỗi AI gợi ý:", error);
      alert("Không thể kết nối với Chuyên gia AI lúc này.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploading(true);
      const uploadData = new FormData();
      uploadData.append('image', file);

      const response = await api.post('/foods/upload-image', uploadData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data && response.data.imageUrl) {
        setFormData({ ...formData, imageUrl: response.data.imageUrl });
      }
    } catch (error) {
      console.error('Lỗi upload ảnh:', error);
      alert('Lỗi khi tải ảnh lên server.');
    } finally {
      setUploading(false);
      e.target.value = null; 
    }
  };

  const handleViewFood = (food) => {
    setViewFood(food);
    setIsViewModalOpen(true);
  };

  const renderHealthBadge = (status) => {
    switch (status) {
      case 'healthy':
        return <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-100 text-xs font-bold">Lành mạnh</span>;
      case 'normal':
        return <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full border border-blue-100 text-xs font-bold">Bình thường</span>;
      case 'restricted':
        return <span className="bg-rose-50 text-rose-700 px-2.5 py-1 rounded-full border border-rose-100 text-xs font-bold">Hạn chế ăn</span>;
      default:
        return null;
    }
  };

  const renderStars = (rating) => {
    return (
      <div className="flex items-center gap-0.5 text-amber-400">
        {[...Array(5)].map((_, i) => (
          <Star key={i} size={14} fill={i < rating ? "currentColor" : "none"} className={i < rating ? "" : "text-gray-200"} />
        ))}
      </div>
    );
  };

  const filteredFoods = foods.filter(food =>
    food.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 font-sans p-4">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Thư viện Thực Phẩm</h1>
          <p className="text-gray-500 mt-1">Quản lý cơ sở dữ liệu dinh dưỡng và phân loại chất lượng (tính trên 100g)</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" placeholder="Tìm thực phẩm..." value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2.5 w-full md:w-64 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-100 outline-none transition"
            />
          </div>
          <button 
            onClick={() => openModal()}
            className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition font-bold shadow-lg shadow-green-100"
          >
            <Plus size={18} /> Thêm món mới
          </button>
        </div>
      </div>

      {/* DANH SÁCH THỰC PHẨM */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-gray-500 gap-2">
            <Loader2 className="animate-spin" size={20} /> Đang tải dữ liệu...
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-center">Hình ảnh</th>
                <th className="px-6 py-4">Tên thực phẩm</th>
                <th className="px-6 py-4">Đánh giá</th>
                <th className="px-6 py-4">Calo (Kcal)</th>
                <th className="px-6 py-4">Macros (P - C - F)</th>
                <th className="px-6 py-4 text-center">Tác vụ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredFoods.map((food) => (
                <tr 
                  key={food._id} 
                  onClick={() => handleViewFood(food)}
                  className="hover:bg-green-50/50 cursor-pointer transition-colors group"
                >
                  <td className="px-6 py-4">
                    <div className="mx-auto w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200 shadow-inner">
                      {food.imageUrl ? (
                        <img 
                          src={food.imageUrl.startsWith('http') ? food.imageUrl : `http://localhost:5000${food.imageUrl}`} 
                          alt={food.name} 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <ImageIcon size={20} className="text-gray-400" />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <span className="font-bold text-gray-800">{food.name}</span>
                      <div>{renderHealthBadge(food.healthStatus)}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">{renderStars(food.rating)}</td>
                  <td className="px-6 py-4 font-black text-orange-600 text-base">{food.caloriesPer100g} <span className="text-xs font-normal text-gray-400">kcal</span></td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2 text-xs font-semibold">
                      <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full border border-blue-100">P: {food.proteinPer100g}g</span>
                      <span className="bg-yellow-50 text-yellow-700 px-2.5 py-1 rounded-full border border-yellow-100">C: {food.carbsPer100g}g</span>
                      <span className="bg-red-50 text-red-700 px-2.5 py-1 rounded-full border border-red-100">F: {food.fatPer100g}g</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); handleViewFood(food); }} className="p-2 text-green-600 hover:bg-green-50 border border-transparent hover:border-green-100 rounded-lg transition" title="Xem"><Eye size={18} /></button>
                      <button onClick={(e) => { e.stopPropagation(); openModal(food); }} className="p-2 text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-100 rounded-lg transition" title="Sửa"><Pencil size={18} /></button>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(food._id); }} className="p-2 text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-lg transition" title="Xóa"><Trash2 size={18} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredFoods.length === 0 && (
                <tr><td colSpan="6" className="px-6 py-12 text-center text-gray-500">Không tìm thấy thực phẩm nào.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL XEM CHI TIẾT */}
      {isViewModalOpen && viewFood && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md" onClick={() => setIsViewModalOpen(false)}>
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Apple className="text-green-600" size={22} />
                <h2 className="text-xl font-black text-gray-900">{viewFood.name}</h2>
              </div>
              <button onClick={() => setIsViewModalOpen(false)} className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition"><X size={20}/></button>
            </div>
            
            <div className="p-6">
              <div className="w-full aspect-square max-h-64 bg-gray-50 rounded-2xl overflow-hidden mb-6 border border-gray-100 flex items-center justify-center shadow-inner relative">
                {viewFood.imageUrl ? (
                  <img 
                    className="w-full h-full object-cover" 
                    src={viewFood.imageUrl.startsWith('http') ? viewFood.imageUrl : `http://localhost:5000${viewFood.imageUrl}`} 
                    alt={viewFood.name}
                  />
                ) : (
                  <div className="text-gray-400 flex flex-col items-center gap-2">
                    <ImageIcon size={48} className="opacity-20" />
                    <p className="text-sm">Chưa có hình ảnh minh họa</p>
                  </div>
                )}
                <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-xl shadow-sm border border-gray-100 flex flex-col items-start gap-0.5">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Đánh giá</span>
                  {renderStars(viewFood.rating)}
                </div>
              </div>

              <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-gray-200/60">
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">Hàm lượng tính trên</p>
                    <p className="text-lg font-black text-gray-800">100g tiêu chuẩn</p>
                  </div>
                  {renderHealthBadge(viewFood.healthStatus)}
                </div>

                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="bg-orange-50/60 p-3 rounded-xl border border-orange-100 col-span-2">
                    <p className="text-xs font-bold text-orange-700 uppercase">Tổng Năng Lượng</p>
                    <p className="text-2xl font-black text-orange-600 mt-0.5">{viewFood.caloriesPer100g} <span className="text-sm font-normal">Kcal</span></p>
                  </div>
                  <div className="bg-blue-50/60 p-3 rounded-xl border border-blue-100">
                    <p className="text-xs font-bold text-blue-700 uppercase">Protein</p>
                    <p className="text-lg font-black text-blue-600 mt-0.5">{viewFood.proteinPer100g}g</p>
                  </div>
                  <div className="bg-yellow-50/60 p-3 rounded-xl border border-yellow-100">
                    <p className="text-xs font-bold text-yellow-700 uppercase">Carbs</p>
                    <p className="text-lg font-black text-yellow-600 mt-0.5">{viewFood.carbsPer100g}g</p>
                  </div>
                  <div className="bg-red-50/60 p-3 rounded-xl border border-red-100 col-span-2">
                    <p className="text-xs font-bold text-red-700 uppercase">Chất béo (Fat)</p>
                    <p className="text-lg font-black text-red-600 mt-0.5">{viewFood.fatPer100g}g</p>
                  </div>
                </div>
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
              <h2 className="text-xl font-black text-gray-900">{currentFood ? 'Chỉnh sửa thực phẩm' : 'Thêm thực phẩm mới'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              
              {/* 🪄 CHỨC NĂNG AI AUTO-FILL (CHỈ KHI THÊM MỚI) */}
              {!currentFood && (
                <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl border border-purple-100/80 space-y-2.5">
                  <div className="flex items-center gap-1.5 text-purple-800 font-bold text-sm">
                    <Sparkles size={16} className="text-purple-600 animate-pulse" />
                    <span>Trợ lý AI Điền Số Liệu Tự Động</span>
                  </div>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      placeholder="VD: Salad cá ngừ hoặc Ức gà áp chảo tương hột..."
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      className="flex-1 px-3 py-2 text-sm bg-white border border-purple-200 rounded-xl outline-none focus:border-purple-500"
                    />
                    <button
                      type="button"
                      disabled={aiLoading}
                      onClick={handleAiFill}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white rounded-xl text-sm font-bold transition flex items-center gap-1 shadow-sm"
                    >
                      {aiLoading ? <Loader2 size={14} className="animate-spin" /> : "Gợi ý"}
                    </button>
                  </div>
                  <p className="text-[11px] text-purple-600/80">AI sẽ tự động tính toán Calo, Macros, Đánh giá và điền vào form.</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Tên thực phẩm</label>
                <input required value={formData.name} onChange={(e)=>setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-green-500 focus:bg-white transition-colors" placeholder="VD: Ức gà luộc" />
              </div>

              {/* RATING SAO INTERACTIVE & HEALTH STATUS */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Đánh giá chất lượng</label>
                  <div className="flex items-center gap-1 h-[42px]">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setFormData({ ...formData, rating: star })}
                        className="text-amber-400 hover:scale-110 transition-all focus:outline-none"
                      >
                        <Star
                          size={22}
                          fill={star <= formData.rating ? "currentColor" : "none"}
                          className={star <= formData.rating ? "text-amber-400" : "text-gray-300"}
                        />
                      </button>
                    ))}
                    <span className="text-xs font-bold text-gray-400 ml-1">({formData.rating}★)</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Phân loại sức khỏe</label>
                  <select 
                    value={formData.healthStatus} 
                    onChange={(e)=>setFormData({...formData, healthStatus: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-green-500 focus:bg-white transition-colors font-semibold text-sm h-[42px]"
                  >
                    <option value="healthy">🥦 Lành mạnh (Healthy)</option>
                    <option value="normal">🍚 Bình thường</option>
                    <option value="restricted">🍔 Hạn chế ăn (Cheat)</option>
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-1">Calo (Kcal/100g)</label>
                  <input type="number" step="0.1" required value={formData.caloriesPer100g} onChange={(e)=>setFormData({...formData, caloriesPer100g: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-green-500 focus:bg-white transition-colors font-semibold text-orange-600" placeholder="VD: 165" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Protein (g)</label>
                  <input type="number" step="0.1" required value={formData.proteinPer100g} onChange={(e)=>setFormData({...formData, proteinPer100g: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-green-500 focus:bg-white transition-colors" placeholder="VD: 31" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Carbs (g)</label>
                  <input type="number" step="0.1" required value={formData.carbsPer100g} onChange={(e)=>setFormData({...formData, carbsPer100g: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-green-500 focus:bg-white transition-colors" placeholder="VD: 0" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-1">Fat (g)</label>
                  <input type="number" step="0.1" required value={formData.fatPer100g} onChange={(e)=>setFormData({...formData, fatPer100g: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-green-500 focus:bg-white transition-colors" placeholder="VD: 3.6" />
                </div>
              </div>

              {/* UPLOAD VÀ PREVIEW ẢNH */}
              <div className="space-y-3">
                <label className="block text-sm font-bold text-gray-700 mb-1 flex items-center justify-between">
                  Hình ảnh minh họa
                  {uploading && <span className="text-xs text-green-600 flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Đang tải...</span>}
                </label>
                
                <div className="relative">
                  <input type="file" accept="image/*" className="hidden" id="image-upload" onChange={handleImageUpload} disabled={uploading} />
                  <label htmlFor="image-upload" className={`flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed rounded-xl cursor-pointer transition-all text-sm font-semibold ${uploading ? 'bg-gray-50 border-gray-200 text-gray-400' : 'border-green-200 hover:border-green-400 hover:bg-green-50 text-green-600'}`}>
                    <UploadCloud size={20} /> 
                    {uploading ? "Đang xử lý..." : "Tải ảnh từ thiết bị lên"}
                  </label>
                </div>

                <div className="flex items-center gap-2 text-gray-400 text-xs font-medium uppercase">
                  <span className="h-px bg-gray-200 flex-1"></span> Hoặc dùng link ảnh <span className="h-px bg-gray-200 flex-1"></span>
                </div>

                <input 
                  value={formData.imageUrl} onChange={(e)=>setFormData({...formData, imageUrl: e.target.value})} 
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-green-500 focus:bg-white transition-colors text-sm" 
                  placeholder="Dán URL hình ảnh tại đây..." disabled={uploading}
                />

                {formData.imageUrl && (
                  <div className="mt-4 relative rounded-xl overflow-hidden bg-gray-50 aspect-video max-h-52 flex items-center justify-center border border-gray-200 shadow-inner group">
                    <img 
                      className="w-full h-full object-contain" 
                      src={formData.imageUrl.startsWith('http') ? formData.imageUrl : `http://localhost:5000${formData.imageUrl}`} 
                      alt="Preview" 
                    />
                    <button 
                      type="button" 
                      onClick={() => setFormData({...formData, imageUrl: ''})} 
                      className="absolute top-3 right-3 p-2 bg-red-500/90 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600 shadow-md"
                      title="Xóa ảnh"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-6 border-t border-gray-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition">Hủy</button>
                <button 
                  type="submit" disabled={uploading || aiLoading}
                  className={`flex-1 py-3 text-white font-bold rounded-xl transition shadow-lg ${uploading || aiLoading ? 'bg-green-400 shadow-none cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 shadow-green-200'}`}
                >
                  {currentFood ? 'Cập nhật' : 'Lưu thực phẩm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Foods;