// 📄 src/pages/Login.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Dumbbell, ArrowRight } from 'lucide-react';
import api from '../services/api';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/users/login', { email, password });
      
      const userData = response.data.user || response.data.data?.user;
      const token = response.data.token || response.data.data?.token;

      if (!userData || userData.role !== 'admin') {
        setError('Tài khoản của bạn không có quyền quản trị viên!');
        setLoading(false);
        return;
      }

      localStorage.setItem('adminToken', token);
      localStorage.setItem('adminInfo', JSON.stringify(userData));
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Sai email hoặc mật khẩu!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50 font-sans p-4">
      <div className="bg-white p-10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] w-full max-w-md border border-white">
        
        {/* Logo & Tiêu đề */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 text-white mb-4 shadow-lg shadow-blue-200">
            <Dumbbell size={32} />
          </div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">FitAdmin</h1>
          <p className="text-gray-500 mt-2 font-medium">Hệ thống quản trị trung tâm</p>
        </div>

        {/* Thông báo lỗi */}
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm font-medium border border-red-100 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-red-600"></div>
            {error}
          </div>
        )}

        {/* Form đăng nhập */}
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-gray-700 font-semibold mb-2 text-sm">Email quản trị</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input 
                type="email" 
                required
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@fitapp.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-2 text-sm">Mật khẩu</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input 
                type="password" 
                required
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3.5 rounded-xl hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-200 transition-all duration-200 font-bold disabled:bg-blue-300 disabled:shadow-none mt-4"
          >
            {loading ? 'Đang xác thực...' : 'Đăng nhập ngay'}
            {!loading && <ArrowRight size={20} />}
          </button>
        </form>

      </div>
    </div>
  );
};

export default Login;