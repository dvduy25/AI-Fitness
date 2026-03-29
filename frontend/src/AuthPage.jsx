import React, { useState } from "react";
import { 
  Mail, Lock, LogIn, Loader2, AlertTriangle, 
  CheckCircle, ArrowRight, Activity, UserPlus, 
  User, Ruler, Weight, Target, ArrowLeft 
} from "lucide-react";

const AuthPage = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true); // Toggle giữa Đăng nhập và Đăng ký
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  // Gom toàn bộ state của cả Login và Register
  const [formData, setFormData] = useState({
    email: "", password: "", name: "", 
    age: "", gender: "male", height: "", weight: "",
    goal: "lose_weight", fitnessLevel: "beginner"
  });
 const API_BASE_URL = 'https://ai-fitness-w6fd.onrender.com';
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setMessage({ text: "", type: "" }); // Xóa thông báo cũ khi chuyển tab
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: "", type: "" });

    // Xác định Endpoint và Payload dựa trên chế độ hiện tại
    const endpoint = isLogin ? "/api/users/login" : "/api/users/register";
    const payload = isLogin 
      ? { email: formData.email, password: formData.password }
      : { 
          ...formData, 
          age: Number(formData.age), 
          height: Number(formData.height), 
          weight: Number(formData.weight) 
        };

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ text: data.message, type: "success" });
        localStorage.setItem("token", data.token);
        
        setTimeout(() => {
            if(onLoginSuccess) onLoginSuccess();
        }, 1500);
      } else {
        setMessage({ text: data.message, type: "error" });
      }
    } catch (error) {
      setMessage({ text: "Lỗi kết nối server! Vui lòng thử lại.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4 relative overflow-hidden font-sans">
      
      {/* Hiệu ứng Background Glow */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Box Form Đăng Nhập / Đăng Ký (To hơn trên Desktop) */}
      <div className={`w-full bg-gray-900/80 backdrop-blur-xl rounded-3xl border border-gray-800 shadow-2xl p-6 sm:p-10 relative z-10 transition-all duration-500 ${isLogin ? 'max-w-md' : 'max-w-2xl'}`}>
        
        {/* Header Logo & Tiêu đề */}
        <div className="text-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="mx-auto w-16 h-16 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 mb-5 transform rotate-3 hover:rotate-0 transition-transform">
            <Activity className="w-8 h-8 text-white -rotate-3 hover:rotate-0 transition-transform" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            {isLogin ? "Chào mừng trở lại!" : "Tạo tài khoản mới"}
          </h2>
          <p className="text-sm text-gray-400 mt-2">
            {isLogin ? "Đăng nhập để tiếp tục lộ trình của bạn" : "Nhập chỉ số cơ thể để AI thiết kế lộ trình riêng cho bạn"}
          </p>
        </div>

        {/* Thông báo lỗi / thành công */}
        {message.text && (
          <div className={`p-4 rounded-xl text-sm flex items-center gap-3 mb-6 animate-in fade-in zoom-in duration-300 border shadow-lg ${
            message.type === "success" 
              ? "bg-emerald-900/30 text-emerald-400 border-emerald-800/50" 
              : "bg-red-900/30 text-red-400 border-red-800/50"
          }`}>
            {message.type === "success" ? <CheckCircle className="w-5 h-5 shrink-0" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}
            <p className="font-medium">{message.text}</p>
          </div>
        )}

        {/* Form Nhập liệu */}
        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* CÁC TRƯỜNG DÀNH RIÊNG CHO ĐĂNG KÝ (Hiển thị dạng Grid 2 cột trên Desktop) */}
          {!isLogin && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-in fade-in slide-in-from-right-8 duration-500">
              <div className="relative group md:col-span-2">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
                </div>
                <input type="text" name="name" placeholder="Họ và tên" required={!isLogin} onChange={handleChange} 
                  className="w-full pl-12 pr-4 py-3.5 bg-gray-950 border border-gray-800 rounded-xl text-gray-200 text-sm focus:border-blue-500 outline-none transition-all placeholder-gray-600" />
              </div>

              <div className="relative group">
                <input type="number" name="age" placeholder="Tuổi (VD: 25)" required={!isLogin} onChange={handleChange} 
                  className="w-full px-4 py-3.5 bg-gray-950 border border-gray-800 rounded-xl text-gray-200 text-sm focus:border-blue-500 outline-none transition-all placeholder-gray-600" />
              </div>
              <div className="relative group">
                <select name="gender" onChange={handleChange} value={formData.gender} className="w-full px-4 py-3.5 bg-gray-950 border border-gray-800 rounded-xl text-gray-200 text-sm focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer">
                  <option value="male">Nam giới</option>
                  <option value="female">Nữ giới</option>
                </select>
              </div>

              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Ruler className="h-4 w-4 text-gray-500" /></div>
                <input type="number" name="height" placeholder="Chiều cao (cm)" required={!isLogin} onChange={handleChange} 
                  className="w-full pl-10 pr-4 py-3.5 bg-gray-950 border border-gray-800 rounded-xl text-gray-200 text-sm focus:border-blue-500 outline-none transition-all placeholder-gray-600" />
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Weight className="h-4 w-4 text-gray-500" /></div>
                <input type="number" name="weight" placeholder="Cân nặng (kg)" required={!isLogin} onChange={handleChange} 
                  className="w-full pl-10 pr-4 py-3.5 bg-gray-950 border border-gray-800 rounded-xl text-gray-200 text-sm focus:border-blue-500 outline-none transition-all placeholder-gray-600" />
              </div>

              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Target className="h-4 w-4 text-gray-500" /></div>
                <select name="goal" onChange={handleChange} value={formData.goal} className="w-full pl-10 pr-4 py-3.5 bg-gray-950 border border-gray-800 rounded-xl text-gray-200 text-sm focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer">
                  <option value="lose_weight">Mục tiêu: Giảm cân</option>
                  <option value="gain_muscle">Mục tiêu: Tăng cơ</option>
                  <option value="maintain">Mục tiêu: Giữ dáng</option>
                </select>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Activity className="h-4 w-4 text-gray-500" /></div>
                <select name="fitnessLevel" onChange={handleChange} value={formData.fitnessLevel} className="w-full pl-10 pr-4 py-3.5 bg-gray-950 border border-gray-800 rounded-xl text-gray-200 text-sm focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer">
                  <option value="beginner">Người mới bắt đầu</option>
                  <option value="intermediate">Đã có kinh nghiệm</option>
                  <option value="advanced">Chuyên nghiệp</option>
                </select>
              </div>
            </div>
          )}

          {/* CÁC TRƯỜNG DÙNG CHUNG (Email & Password) */}
          <div className={`space-y-5 ${!isLogin && 'border-t border-gray-800 pt-5 mt-2'}`}>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
              </div>
              <input type="email" name="email" placeholder="Email của bạn" required onChange={handleChange} 
                className="w-full pl-12 pr-4 py-3.5 bg-gray-950 border border-gray-800 rounded-xl text-gray-200 text-sm focus:border-blue-500 outline-none transition-all placeholder-gray-600" />
            </div>

            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
              </div>
              <input type="password" name="password" placeholder="Mật khẩu" required onChange={handleChange} 
                className="w-full pl-12 pr-4 py-3.5 bg-gray-950 border border-gray-800 rounded-xl text-gray-200 text-sm focus:border-blue-500 outline-none transition-all placeholder-gray-600" />
            </div>
          </div>

          {/* Quên mật khẩu (Chỉ hiện ở Login) */}
          {isLogin && (
            <div className="flex justify-end">
              <button type="button" className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors">
                Quên mật khẩu?
              </button>
            </div>
          )}

          {/* Nút Submit */}
          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-gray-800 disabled:text-gray-500 text-white font-bold text-sm sm:text-base rounded-xl shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 group mt-4"
          >
            {loading ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Đang xử lý...</>
            ) : isLogin ? (
              <><LogIn className="w-5 h-5 group-hover:scale-110 transition-transform" /> Đăng Nhập</>
            ) : (
              <><UserPlus className="w-5 h-5 group-hover:scale-110 transition-transform" /> Tạo Tài Khoản</>
            )}
          </button>
        </form>

        {/* Chuyển đổi Mode Login/Register */}
        <div className="mt-8 pt-6 border-t border-gray-800 text-center">
          <p className="text-sm text-gray-400 flex items-center justify-center gap-2">
            {isLogin ? "Bạn chưa có tài khoản?" : "Đã có tài khoản?"}
            <button 
              type="button"
              onClick={toggleMode} 
              className="text-blue-400 font-bold hover:text-blue-300 hover:underline transition-all inline-flex items-center gap-1"
            >
              {isLogin ? (
                <>Đăng ký ngay <ArrowRight className="w-4 h-4" /></>
              ) : (
                <><ArrowLeft className="w-4 h-4" /> Về Đăng nhập</>
              )}
            </button>
          </p>
        </div>

      </div>
    </div>
  );
};

export default AuthPage;