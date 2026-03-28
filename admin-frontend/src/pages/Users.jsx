// 📄 src/pages/Users.jsx
import React, { useEffect, useState } from 'react';
import { Search, Plus, Pencil, Trash2, Shield, Crown, User as UserIcon, X, Loader2 } from 'lucide-react';
import api from '../services/api';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // --- States cho Modal ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null); // null = Thêm mới, object = Sửa
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '', // Chỉ dùng khi tạo mới hoặc nếu muốn đổi mật khẩu
    role: 'user',
    isPremium: false,
    goal: ''
  });

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
        password: '', // Để trống, chỉ điền nếu admin muốn set mật khẩu mới
        role: user.role || 'user',
        isPremium: user.isPremium || false,
        goal: user.goal || ''
      });
    } else {
      setCurrentUser(null);
      setFormData({ name: '', email: '', password: '', role: 'user', isPremium: false, goal: '' });
    }
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('CẢNH BÁO: Xóa người dùng sẽ xóa mọi dữ liệu liên quan. Bạn có chắc chắn?')) {
      try {
        await api.delete(`/admin/users/${id}`);
        setUsers(users.filter(u => u._id !== id));
        alert('Đã xóa người dùng thành công!');
      } catch (error) {
        alert(error.response?.data?.message || 'Lỗi khi xóa người dùng');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Tạo object payload, nếu không nhập password thì bỏ qua (khi update)
    const payload = { ...formData };
    if (currentUser && !payload.password) {
      delete payload.password;
    }

    try {
      if (currentUser) {
        // Gọi API Cập nhật
        const res = await api.put(`/admin/users/${currentUser._id}`, payload);
        const updatedUser = res.data.user || res.data.data || res.data;
        setUsers(users.map(u => u._id === currentUser._id ? updatedUser : u));
        alert('Cập nhật thông tin thành công!');
      } else {
        // Gọi API Tạo mới (Lưu ý: Bạn có thể cần tạo endpoint riêng hoặc dùng endpoint đăng ký admin cấp)
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
    if (role === 'admin') return <span className="flex items-center gap-1 text-xs font-bold text-purple-700 bg-purple-100 px-2 py-1 rounded-md w-max"><Shield size={12}/> Admin</span>;
    return <span className="flex items-center gap-1 text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-1 rounded-md w-max"><UserIcon size={12}/> User</span>;
  };

  if (loading) return (
    <div className="flex justify-center items-center h-full py-20">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
    </div>
  );

  return (
    <div className="space-y-8 font-sans">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Quản lý Người Dùng</h1>
          <p className="text-gray-500 mt-1">Quản lý tài khoản, phân quyền và trạng thái VIP</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" placeholder="Tìm theo tên hoặc email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2.5 w-full md:w-64 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-300 outline-none transition"
            />
          </div>
          <button onClick={() => openModal()} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-semibold shadow-sm text-sm">
            <Plus size={18} /> Cấp tài khoản
          </button>
        </div>
      </div>

      {/* --- BẢNG DANH SÁCH --- */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4">Người dùng</th>
              <th className="px-6 py-4">Vai trò</th>
              <th className="px-6 py-4">Trạng thái VIP</th>
              <th className="px-6 py-4">Mục tiêu</th>
              <th className="px-6 py-4 text-center">Tác vụ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredUsers.length > 0 ? filteredUsers.map((user) => (
              <tr key={user._id} className="hover:bg-gray-50/50 transition-colors group">
                <td className="px-6 py-4">
                  <div className="font-semibold text-gray-800">{user.name || "Chưa cập nhật tên"}</div>
                  <div className="text-xs text-gray-500">{user.email}</div>
                </td>
                <td className="px-6 py-4">{renderRoleTag(user.role)}</td>
                <td className="px-6 py-4">
                  {user.isPremium ? (
                    <span className="flex items-center gap-1 text-xs font-bold text-yellow-700 bg-yellow-100 border border-yellow-200 px-3 py-1 rounded-full w-max shadow-sm">
                      <Crown size={14} /> VIP Active
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400 font-medium bg-gray-50 border border-gray-100 px-3 py-1 rounded-full w-max">Cơ bản</span>
                  )}
                </td>
                <td className="px-6 py-4 text-gray-600 capitalize">{user.goal ? user.goal.replace('_', ' ') : 'Chưa cập nhật'}</td>
                <td className="px-6 py-4 text-center">
                  <div className="flex items-center justify-center gap-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openModal(user)} className="p-2 bg-white text-gray-600 hover:text-blue-600 rounded-lg hover:bg-blue-50 border border-gray-100 shadow-sm" title="Sửa quyền/VIP"><Pencil size={16} /></button>
                    <button onClick={() => handleDelete(user._id)} className="p-2 bg-white text-gray-600 hover:text-red-600 rounded-lg hover:bg-red-50 border border-gray-100 shadow-sm" title="Xóa tài khoản"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr><td colSpan="5" className="px-6 py-12 text-center text-gray-500">Không có dữ liệu người dùng.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* --- MODAL THÊM/SỬA --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-xl font-black text-gray-900">{currentUser ? 'Chỉnh sửa Tài Khoản' : 'Cấp tài khoản mới'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Họ và Tên</label>
                <input required value={formData.name} onChange={(e)=>setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500 transition-colors" placeholder="Nguyễn Văn A" />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Email đăng nhập</label>
                <input type="email" required value={formData.email} onChange={(e)=>setFormData({...formData, email: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500 transition-colors" placeholder="email@example.com" disabled={!!currentUser} />
                {currentUser && <p className="text-[10px] text-gray-400 mt-1">Không thể thay đổi email sau khi tạo.</p>}
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Mật khẩu {currentUser && <span className="text-gray-400 font-normal">(Bỏ trống nếu không đổi)</span>}
                </label>
                <input 
                  type="text" 
                  value={formData.password} 
                  onChange={(e)=>setFormData({...formData, password: e.target.value})} 
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500 transition-colors" 
                  placeholder={currentUser ? "Nhập mật khẩu mới..." : "Mật khẩu khởi tạo..."} 
                  required={!currentUser} 
                />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Phân quyền</label>
                  <select value={formData.role} onChange={(e)=>setFormData({...formData, role: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500 font-medium">
                    <option value="user">Người dùng (User)</option>
                    <option value="admin">Quản trị viên (Admin)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Trạng thái VIP</label>
                  <select 
                    value={formData.isPremium.toString()} 
                    onChange={(e)=>setFormData({...formData, isPremium: e.target.value === 'true'})} 
                    className={`w-full px-4 py-2.5 border rounded-xl outline-none font-bold transition-colors ${formData.isPremium ? 'bg-yellow-50 border-yellow-300 text-yellow-700' : 'bg-gray-50 border-gray-200 text-gray-700'}`}
                  >
                    <option value="false">Tài khoản Cơ bản</option>
                    <option value="true">💎 Kích hoạt VIP</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-6 border-t border-gray-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition">Hủy</button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="flex-1 py-3 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition shadow-lg shadow-blue-200 disabled:bg-blue-400"
                >
                  {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : (currentUser ? 'Cập nhật User' : 'Tạo Tài Khoản')}
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