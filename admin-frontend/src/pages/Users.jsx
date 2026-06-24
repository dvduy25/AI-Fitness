// 📄 src/pages/Users.jsx
import React, { useEffect, useState } from 'react';
import { 
  Search, Plus, Pencil, Trash2, Shield, Crown, 
  User as UserIcon, X, Loader2, Lock, Unlock, 
  Activity, CheckCircle2, AlertCircle
} from 'lucide-react';
import api from '../services/api';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // --- States cho Modal ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const initialFormState = {
    name: '',
    email: '',
    password: '',
    role: 'user',
    isPremium: false,
    goal: '',
    phone: '',
    address: '',
    cccd: ''
  };
  
  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/admin/users');
      setUsers(response.data.data || response.data || []);
    } catch (error) {
      console.error('Lỗi khi tải danh sách User:', error);
    } finally {
      setLoading(false);
    }
  };

  // --- CHỨC NĂNG XỬ LÝ ---

  const openModal = (user = null) => {
    if (user) {
      setCurrentUser(user);
      setFormData({
        name: user.name || '',
        email: user.email || '',
        password: '', 
        role: user.role || 'user',
        isPremium: user.isPremium || false,
        goal: user.goal || '',
        phone: user.phone || '',
        address: user.address || '',
        cccd: user.cccd || ''
      });
    } else {
      setCurrentUser(null);
      setFormData(initialFormState);
    }
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('CẢNH BÁO: Bạn có chắc chắn muốn xóa vĩnh viễn người dùng này?')) {
      try {
        await api.delete(`/admin/users/${id}`);
        setUsers(users.filter(u => u._id !== id));
        alert('Đã xóa người dùng thành công!');
      } catch (error) {
        alert(error.response?.data?.message || 'Lỗi khi xóa người dùng');
      }
    }
  };

  const handleToggleLock = async (user) => {
    const action = user.isLocked ? 'MỞ KHÓA' : 'KHÓA';
    if (window.confirm(`Bạn có chắc chắn muốn ${action} tài khoản ${user.email}?`)) {
      try {
        const res = await api.put(`/admin/users/${user._id}/toggle-lock`);
        setUsers(users.map(u => u._id === user._id ? { ...u, isLocked: res.data.isLocked } : u));
      } catch (error) {
        alert(error.response?.data?.message || `Lỗi khi ${action.toLowerCase()} tài khoản`);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const payload = { ...formData };
    if (currentUser && !payload.password) {
      delete payload.password;
    }

    try {
      if (currentUser) {
        const res = await api.put(`/admin/users/${currentUser._id}`, payload);
        const updatedUser = res.data.user || res.data.data || res.data;
        setUsers(users.map(u => u._id === currentUser._id ? updatedUser : u));
        alert('Cập nhật thông tin thành công!');
      } else {
        if (!payload.password) return alert("Vui lòng nhập mật khẩu khởi tạo cho user mới!");
        const res = await api.post('/admin/users', payload); 
        const newUser = res.data.user || res.data.data || res.data;
        setUsers([newUser, ...users]);
        alert('Tạo người dùng mới thành công!');
      }
      setIsModalOpen(false);
    } catch (error) {
      alert(error.response?.data?.message || 'Lỗi khi lưu thông tin. Vui lòng kiểm tra lại!');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- UI HELPERS ---

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (user.name && user.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const renderRoleTag = (role) => {
    switch(role) {
      case 'admin':
        return <span className="flex items-center gap-1.5 text-xs font-bold text-purple-700 bg-purple-100 px-2.5 py-1.5 rounded-lg w-max"><Shield size={14}/> Admin</span>;
      case 'trainer':
        return <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1.5 rounded-lg w-max"><Activity size={14}/> Trainer</span>;
      default:
        return <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 bg-gray-100 px-2.5 py-1.5 rounded-lg w-max"><UserIcon size={14}/> User</span>;
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center h-full py-20">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
    </div>
  );

  return (
    <div className="space-y-8 font-sans">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Quản lý Người Dùng</h1>
          <p className="text-gray-500 mt-1 text-sm">Quản lý tài khoản, phân quyền, VIP và trạng thái hoạt động</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" placeholder="Tìm theo tên, email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2.5 w-full md:w-64 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition text-sm"
            />
          </div>
          <button onClick={() => openModal()} className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition font-semibold shadow-md text-sm">
            <Plus size={18} /> Cấp tài khoản
          </button>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 font-bold">Người dùng</th>
                <th className="px-6 py-4 font-bold">Vai trò</th>
                <th className="px-6 py-4 font-bold">VIP</th>
                <th className="px-6 py-4 font-bold">Trạng thái</th>
                <th className="px-6 py-4 text-center font-bold">Tác vụ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredUsers.length > 0 ? filteredUsers.map((user) => (
                <tr key={user._id} className={`transition-colors group ${user.isLocked ? 'bg-red-50/30 hover:bg-red-50/60' : 'hover:bg-gray-50'}`}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}&background=random`} alt="avatar" className="w-10 h-10 rounded-full object-cover border border-gray-200" />
                      <div>
                        <div className="font-bold text-gray-900 flex items-center gap-2">
                          {user.name || "Chưa cập nhật tên"}
                          {user.isLocked && <AlertCircle size={14} className="text-red-500" title="Tài khoản đang bị khóa" />}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">{renderRoleTag(user.role)}</td>
                  <td className="px-6 py-4">
                    {user.isPremium ? (
                      <span className="flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-100 px-3 py-1.5 rounded-full w-max">
                        <Crown size={14} /> Kích hoạt
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400 font-medium bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-full w-max">Cơ bản</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {user.isLocked ? (
                      <span className="flex items-center gap-1.5 text-xs font-bold text-red-700 bg-red-100 px-2.5 py-1 rounded-lg w-max"><Lock size={12}/> Đã khóa</span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs font-bold text-green-700 bg-green-100 px-2.5 py-1 rounded-lg w-max"><CheckCircle2 size={12}/> Hoạt động</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openModal(user)} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Chỉnh sửa"><Pencil size={18} /></button>
                      <button onClick={() => handleToggleLock(user)} className={`p-2 rounded-lg transition ${user.isLocked ? 'text-green-600 hover:bg-green-50' : 'text-orange-500 hover:bg-orange-50'}`} title={user.isLocked ? "Mở khóa tài khoản" : "Khóa tài khoản"}>
                        {user.isLocked ? <Unlock size={18} /> : <Lock size={18} />}
                      </button>
                      <button onClick={() => handleDelete(user._id)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Xóa tài khoản"><Trash2 size={18} /></button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="5" className="px-6 py-12 text-center text-gray-500">Không tìm thấy người dùng nào.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODAL THÊM/SỬA --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 my-8">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-xl font-black text-gray-900">{currentUser ? 'Chỉnh sửa Tài Khoản' : 'Cấp tài khoản mới'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Cột 1 */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Họ và Tên</label>
                    <input required value={formData.name} onChange={(e)=>setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm" placeholder="Nhập họ tên..." />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Email đăng nhập</label>
                    <input type="email" required value={formData.email} onChange={(e)=>setFormData({...formData, email: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm disabled:opacity-60 disabled:bg-gray-100" placeholder="email@example.com" disabled={!!currentUser} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Mật khẩu {currentUser && <span className="text-gray-400 font-normal">(Bỏ trống nếu giữ nguyên)</span>}</label>
                    <input type="text" value={formData.password} onChange={(e)=>setFormData({...formData, password: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm" placeholder={currentUser ? "Nhập mật khẩu mới..." : "Mật khẩu khởi tạo..."} required={!currentUser} />
                  </div>
                </div>

                {/* Cột 2 */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Phân quyền</label>
                    <select value={formData.role} onChange={(e)=>setFormData({...formData, role: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm font-semibold text-gray-700">
                      <option value="user">Người dùng cơ bản</option>
                      <option value="trainer">Huấn luyện viên (Trainer)</option>
                      <option value="admin">Quản trị viên (Admin)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Trạng thái VIP (Premium)</label>
                    <select value={formData.isPremium.toString()} onChange={(e)=>setFormData({...formData, isPremium: e.target.value === 'true'})} className={`w-full px-4 py-2.5 border rounded-xl outline-none text-sm font-bold transition-all ${formData.isPremium ? 'bg-amber-50 border-amber-300 text-amber-700 focus:ring-4 focus:ring-amber-500/10' : 'bg-gray-50 border-gray-200 text-gray-700 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'}`}>
                      <option value="false">Tài khoản Cơ bản</option>
                      <option value="true">💎 Đã kích hoạt VIP</option>
                    </select>
                  </div>
                </div>

                {/* Khu vực thông tin bắt buộc cho Trainer */}
                {formData.role === 'trainer' && (
                  <div className="col-span-1 md:col-span-2 mt-2 p-5 bg-emerald-50/50 border border-emerald-100 rounded-2xl">
                    <h3 className="text-sm font-bold text-emerald-800 mb-3 flex items-center gap-2"><Activity size={16}/> Yêu cầu thông tin Trainer</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Số điện thoại *</label>
                        <input required value={formData.phone} onChange={(e)=>setFormData({...formData, phone: e.target.value})} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg outline-none focus:border-emerald-500 text-sm" placeholder="VD: 0987654321" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Số CCCD *</label>
                        <input required value={formData.cccd} onChange={(e)=>setFormData({...formData, cccd: e.target.value})} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg outline-none focus:border-emerald-500 text-sm" placeholder="12 số CCCD" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Địa chỉ *</label>
                        <input required value={formData.address} onChange={(e)=>setFormData({...formData, address: e.target.value})} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg outline-none focus:border-emerald-500 text-sm" placeholder="Thành phố / Tỉnh" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-8 mt-4 border-t border-gray-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-gray-600 font-bold bg-gray-100 hover:bg-gray-200 rounded-xl transition">Hủy bỏ</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 py-3 flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-xl transition shadow-lg shadow-gray-900/20 disabled:bg-gray-400">
                  {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : (currentUser ? 'Lưu thay đổi' : 'Tạo tài khoản')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;