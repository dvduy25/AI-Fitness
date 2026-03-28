// 📄 src/pages/Foods.jsx
import React, { useEffect, useState } from 'react';
import { Search, Plus, Pencil, Trash2, Image as ImageIcon, X, UploadCloud, Loader2 } from 'lucide-react';
import api from '../services/api';

const Foods = () => {
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // State cho Modal và Form
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentFood, setCurrentFood] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    caloriesPer100g: '',
    proteinPer100g: '',
    carbsPer100g: '',
    fatPer100g: '',
    imageUrl: ''
  });

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

  // --- CHỨC NĂNG XỬ LÝ ---

  const openModal = (food = null) => {
    if (food) {
      setCurrentFood(food);
      setFormData({
        name: food.name,
        caloriesPer100g: food.caloriesPer100g,
        proteinPer100g: food.proteinPer100g,
        carbsPer100g: food.carbsPer100g,
        fatPer100g: food.fatPer100g,
        imageUrl: food.imageUrl || ''
      });
    } else {
      setCurrentFood(null);
      setFormData({ name: '', caloriesPer100g: '', proteinPer100g: '', carbsPer100g: '', fatPer100g: '', imageUrl: '' });
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
      alert('Lỗi khi lưu thực phẩm. Vui lòng kiểm tra lại!');
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploading(true);
      const uploadData = new FormData();
      uploadData.append('image', file); // Chú ý: Backend phải cấu hình nhận field 'image'

      // Bạn cần đảm bảo đã tạo route POST /foods/upload-image bên backend giống như upload-video
      const response = await api.post('/foods/upload-image', uploadData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data && response.data.imageUrl) {
        setFormData({ ...formData, imageUrl: response.data.imageUrl });
      }
    } catch (error) {
      console.error('Lỗi upload ảnh:', error);
      alert('Lỗi khi tải ảnh lên server. Hãy chắc chắn file là hình ảnh.');
    } finally {
      setUploading(false);
      e.target.value = null; 
    }
  };

  const filteredFoods = foods.filter(food =>
    food.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return (
    <div className="flex justify-center items-center h-full py-20">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600"></div>
    </div>
  );

  return (
    <div className="space-y-8 font-sans">
      {/* Header & Thanh công cụ */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Thư viện Thực Phẩm</h1>
          <p className="text-gray-500 mt-1">Quản lý cơ sở dữ liệu dinh dưỡng (tính trên 100g)</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text"
              placeholder="Tìm thực phẩm..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2.5 w-full md:w-64 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-green-100 focus:border-green-300 outline-none transition"
            />
          </div>
          <button 
            onClick={() => openModal()}
            className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition font-semibold shadow-sm text-sm"
          >
            <Plus size={18} />
            Thêm món mới
          </button>
        </div>
      </div>

      {/* Bảng dữ liệu */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
            <tr>
              <th scope="col" className="px-6 py-4">Hình ảnh</th>
              <th scope="col" className="px-6 py-4">Tên thực phẩm</th>
              <th scope="col" className="px-6 py-4">Calo (Kcal)</th>
              <th scope="col" className="px-6 py-4">Macros (P - C - F)</th>
              <th scope="col" className="px-6 py-4 text-center">Tác vụ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredFoods.length > 0 ? filteredFoods.map((food) => (
              <tr key={food._id} className="hover:bg-gray-50/50 transition-colors group">
                <td className="px-6 py-4">
                  <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200">
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
                <td className="px-6 py-4 font-semibold text-gray-800">{food.name}</td>
                <td className="px-6 py-4 font-bold text-orange-600">{food.caloriesPer100g}</td>
                <td className="px-6 py-4">
                  <div className="flex gap-2 text-xs font-medium">
                    <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-md border border-blue-100">P: {food.proteinPer100g}g</span>
                    <span className="bg-yellow-50 text-yellow-700 px-2 py-1 rounded-md border border-yellow-100">C: {food.carbsPer100g}g</span>
                    <span className="bg-red-50 text-red-700 px-2 py-1 rounded-md border border-red-100">F: {food.fatPer100g}g</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="flex items-center justify-center gap-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openModal(food)} className="p-2 bg-white text-gray-600 hover:text-green-600 rounded-lg hover:bg-green-50 border border-gray-100 shadow-sm"><Pencil size={16} /></button>
                    <button onClick={() => handleDelete(food._id)} className="p-2 bg-white text-gray-600 hover:text-red-600 rounded-lg hover:bg-red-50 border border-gray-100 shadow-sm"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr><td colSpan="5" className="px-6 py-12 text-center text-gray-500">Không tìm thấy thực phẩm nào.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* --- MODAL FORM (THÊM / SỬA) --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-xl font-black text-gray-900">{currentFood ? 'Chỉnh sửa thực phẩm' : 'Thêm thực phẩm mới'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Tên thực phẩm</label>
                <input required value={formData.name} onChange={(e)=>setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-green-500 focus:bg-white transition-colors" placeholder="VD: Ức gà luộc" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Calo (Kcal/100g)</label>
                  <input type="number" step="0.1" required value={formData.caloriesPer100g} onChange={(e)=>setFormData({...formData, caloriesPer100g: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-green-500 focus:bg-white transition-colors" placeholder="VD: 165" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Protein (g)</label>
                  <input type="number" step="0.1" required value={formData.proteinPer100g} onChange={(e)=>setFormData({...formData, proteinPer100g: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-green-500 focus:bg-white transition-colors" placeholder="VD: 31" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Carbs (g)</label>
                  <input type="number" step="0.1" required value={formData.carbsPer100g} onChange={(e)=>setFormData({...formData, carbsPer100g: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-green-500 focus:bg-white transition-colors" placeholder="VD: 0" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Fat (g)</label>
                  <input type="number" step="0.1" required value={formData.fatPer100g} onChange={(e)=>setFormData({...formData, fatPer100g: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-green-500 focus:bg-white transition-colors" placeholder="VD: 3.6" />
                </div>
              </div>

              {/* KHU VỰC UPLOAD ẢNH CHÍNH */}
              <div className="space-y-3">
                <label className="block text-sm font-bold text-gray-700 mb-1 flex items-center justify-between">
                  Hình ảnh minh họa
                  {uploading && <span className="text-xs text-green-600 flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Đang tải lên...</span>}
                </label>
                
                <div className="relative">
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    id="image-upload" 
                    onChange={handleImageUpload}
                    disabled={uploading}
                  />
                  <label 
                    htmlFor="image-upload" 
                    className={`flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed rounded-xl cursor-pointer transition-all text-sm font-semibold
                      ${uploading ? 'bg-gray-50 border-gray-200 text-gray-400' : 'border-green-200 hover:border-green-400 hover:bg-green-50 text-green-600'}
                    `}
                  >
                    <UploadCloud size={20} /> 
                    {uploading ? "Đang xử lý ảnh..." : "Tải ảnh từ thiết bị lên server"}
                  </label>
                </div>

                <div className="flex items-center gap-2 text-gray-400 text-xs font-medium uppercase">
                  <span className="h-px bg-gray-200 flex-1"></span> Hoặc dùng link ảnh <span className="h-px bg-gray-200 flex-1"></span>
                </div>

                <input 
                  value={formData.imageUrl} 
                  onChange={(e)=>setFormData({...formData, imageUrl: e.target.value})} 
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-green-500 focus:bg-white transition-colors text-sm" 
                  placeholder="https://..." 
                  disabled={uploading}
                />
              </div>

              <div className="flex gap-3 pt-6 border-t border-gray-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition">Hủy</button>
                <button 
                  type="submit" 
                  disabled={uploading}
                  className={`flex-1 py-3 text-white font-bold rounded-xl transition shadow-lg ${uploading ? 'bg-green-400 shadow-none cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 shadow-green-200'}`}
                >
                  {currentFood ? 'Cập nhật' : 'Thêm thực phẩm'}
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