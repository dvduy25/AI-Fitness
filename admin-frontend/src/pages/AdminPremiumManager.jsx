import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Edit2, Plus, Trash2, ShieldCheck, CheckCircle2, X, Loader2 } from 'lucide-react';

export default function AdminPremiumManager() {
  const [packages, setPackages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ packageId: '', name: '', price: 0, months: 1, isActive: true });
  const [editId, setEditId] = useState(null);

  const API_BASE_URL = 'http://localhost:5000/api'; // Thay bằng URL Backend của bạn

  const fetchPackages = async () => {
    try {
      const res = await api.get('/admin/packages');
      setPackages(res.data.data);
    } catch (error) {
      console.error("Lỗi lấy danh sách gói:", error);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (editId) {
        await api.put(`/admin/packages/${editId}`, formData);
      } else {
        await api.post(`/admin/packages`, formData);
      }
      
      setShowModal(false);
      setFormData({ packageId: '', name: '', price: 0, months: 1, isActive: true });
      setEditId(null);
      fetchPackages();
    } catch (error) {
      alert("Có lỗi xảy ra: " + (error.response?.data?.message || error.message));
    } finally {
      setIsLoading(false);
    }
  };

  const openEdit = (pkg) => {
    setFormData(pkg);
    setEditId(pkg._id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xóa gói này?")) return;
    try {
      await api.delete(`/admin/packages/${id}`);
      fetchPackages();
    } catch (error) {
      alert("Xóa thất bại!");
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-300">
      
      {/* Header Widget */}
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-blue-600" /> Quản lý Gói Premium
          </h2>
          <p className="text-gray-500 mt-1 text-sm">Thêm, sửa, xóa hoặc thay đổi giá bán các gói VIP.</p>
        </div>
        <button 
          onClick={() => { setEditId(null); setFormData({ packageId: '', name: '', price: 0, months: 1, isActive: true }); setShowModal(true); }}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-2 shadow-sm transition-colors"
        >
          <Plus className="w-5 h-5" /> Thêm Gói Mới
        </button>
      </div>

      {/* Danh sách Gói */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {packages.map((pkg) => (
          <div 
            key={pkg._id} 
            className={`bg-white rounded-2xl p-6 relative shadow-sm transition-all ${
              pkg.isActive 
                ? 'border-2 border-blue-100 hover:border-blue-300' 
                : 'border border-gray-200 opacity-70 bg-gray-50'
            }`}
          >
            {!pkg.isActive && (
              <span className="absolute top-4 right-4 text-[10px] font-bold bg-gray-200 text-gray-500 px-2 py-1 rounded uppercase tracking-wider">
                Bị Ẩn
              </span>
            )}
            
            <p className="text-xs text-blue-600 font-bold uppercase mb-2 tracking-wide">{pkg.packageId}</p>
            <h3 className="text-xl font-bold text-gray-900 mb-2">{pkg.name}</h3>
            <p className="text-3xl font-black text-gray-900 mb-1">
              {pkg.price.toLocaleString('vi-VN')} <span className="text-sm text-gray-500 font-medium">VNĐ</span>
            </p>
            <p className="text-sm text-gray-500 font-medium mb-6 bg-blue-50 text-blue-700 inline-block px-3 py-1 rounded-lg">
              + {pkg.months} Tháng Premium
            </p>
            
            <div className="flex gap-2">
              <button 
                onClick={() => openEdit(pkg)} 
                className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-semibold flex justify-center items-center gap-2 transition-colors"
              >
                <Edit2 className="w-4 h-4" /> Sửa
              </button>
              <button 
                onClick={() => handleDelete(pkg._id)} 
                className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {packages.length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-500 bg-white border border-gray-100 rounded-2xl shadow-sm">
            Chưa có gói Premium nào. Hãy bấm "Thêm Gói Mới" để tạo.
          </div>
        )}
      </div>

      {/* Modal Thêm / Sửa */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-2xl border border-gray-100 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-bold text-gray-900 text-lg">{editId ? 'Sửa Gói Premium' : 'Thêm Gói Mới'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-5 h-5"/>
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Mã Gói (ID)</label>
                <input 
                  type="text" required 
                  value={formData.packageId} 
                  onChange={e => setFormData({...formData, packageId: e.target.value})} 
                  className="w-full bg-white border border-gray-200 rounded-xl p-3 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all" 
                  placeholder="VD: 1_MONTH" 
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Tên Gói</label>
                <input 
                  type="text" required 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  className="w-full bg-white border border-gray-200 rounded-xl p-3 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all" 
                  placeholder="VD: Premium 1 Tháng" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Giá tiền (VNĐ)</label>
                  <input 
                    type="number" required min="0"
                    value={formData.price} 
                    onChange={e => setFormData({...formData, price: Number(e.target.value)})} 
                    className="w-full bg-white border border-gray-200 rounded-xl p-3 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Số tháng (+)</label>
                  <input 
                    type="number" required min="1"
                    value={formData.months} 
                    onChange={e => setFormData({...formData, months: Number(e.target.value)})} 
                    className="w-full bg-white border border-gray-200 rounded-xl p-3 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all" 
                  />
                </div>
              </div>
              
              <div className="pt-2">
                <label className="flex items-center gap-3 cursor-pointer p-3 border border-gray-200 rounded-xl bg-gray-50/50 hover:bg-gray-50 transition-colors">
                  <input 
                    type="checkbox" 
                    checked={formData.isActive} 
                    onChange={e => setFormData({...formData, isActive: e.target.checked})} 
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" 
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-gray-900">Đang mở bán</span>
                    <span className="text-xs text-gray-500">Hiển thị gói này cho User mua</span>
                  </div>
                </label>
              </div>

              <button 
                type="submit" 
                disabled={isLoading} 
                className="w-full mt-2 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold rounded-xl flex justify-center items-center gap-2 shadow-md shadow-blue-500/20 transition-all"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle2 className="w-5 h-5" /> Lưu Cấu Hình</>}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}