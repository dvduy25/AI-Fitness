import api from "./services/api";
import React, { useState, useEffect } from 'react';
// Thêm CheckCircle vào dòng import này ở đầu file Profile.jsx
import { CheckCircle } from 'lucide-react';
import axios from 'axios';
import { 
  User, Crown, Ticket, Zap, Target, Activity, 
  MapPin, Save, Loader2, Mail, Weight, Ruler, HeartPulse 
} from 'lucide-react';

export default function UserProfile() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");

  const [userData, setUserData] = useState(null);
  const [formData, setFormData] = useState({
    name: '', age: '', gender: 'male', height: '', weight: '',
    goal: 'lose_weight', fitnessLevel: 'beginner',
    workoutLocation: 'home', availableEquipment: [],
    medicalConditionsStr: '' 
  });


  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await api.get(`/users/me`, config);
      
      const user = res.data?.data || res.data?.user || res.data || {};
      
      setUserData(user);
      
      setFormData({
        name: user.name || '',
        age: user.age || '',
        gender: user.gender || 'male',
        height: user.height || '',
        weight: user.weight || '',
        goal: user.goal || 'lose_weight',
        fitnessLevel: user.fitnessLevel || 'beginner',
        workoutLocation: user.workoutLocation || 'home',
        availableEquipment: Array.isArray(user.availableEquipment) ? user.availableEquipment : [],
        medicalConditionsStr: Array.isArray(user.medicalConditions) 
          ? user.medicalConditions.join(', ') 
          : (typeof user.medicalConditions === 'string' ? user.medicalConditions : '')
      });
    } catch (err) {
      setError("Không thể tải thông tin cá nhân. Vui lòng tải lại trang.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEquipmentToggle = (item) => {
    setFormData(prev => {
      const currentEq = Array.isArray(prev.availableEquipment) ? prev.availableEquipment : [];
      const isSelected = currentEq.includes(item);
      let newEquipment = [];
      
      if (item === 'none') {
        newEquipment = isSelected ? [] : ['none'];
      } else {
        newEquipment = isSelected 
          ? currentEq.filter(e => e !== item)
          : [...currentEq.filter(e => e !== 'none'), item];
      }
      return { ...prev, availableEquipment: newEquipment };
    });
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setError(null);
    setSuccessMsg("");
    
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      const medicalArray = (formData.medicalConditionsStr || '')
        .split(',')
        .map(item => item.trim())
        .filter(item => item !== '');

      const payload = {
        ...formData,
        age: Number(formData.age) || 0,
        height: Number(formData.height) || 0,
        weight: Number(formData.weight) || 0,
        medicalConditions: medicalArray 
      };

      delete payload.medicalConditionsStr; 

      const res = await api.put(`/users/me`, payload, config);
      
      const updatedUser = res.data?.data || res.data?.user || res.data || {};
      
      // ✅ LỚP BẢO VỆ 1: Tránh trường hợp API trả về thiếu Data làm sập UI
      // Nếu API trả về user đầy đủ thì cập nhật ngay, nếu không thì gọi lại hàm fetchProfile()
      if (updatedUser && (updatedUser.email || updatedUser._id)) {
        setUserData(updatedUser); 
      } else {
        await fetchProfile();
      }
      
      setSuccessMsg("Cập nhật thành công! AI đã tính toán lại lộ trình cho bạn.");
      setTimeout(() => setSuccessMsg(""), 4000);
      
    } catch (err) {
      // ✅ LỚP BẢO VỆ 2: Ép kiểu Error về String để React không bị crash (Sập trang)
      let errorText = "Có lỗi xảy ra khi lưu thông tin.";
      if (err.response?.data) {
        if (typeof err.response.data.message === 'string') {
          errorText = err.response.data.message;
        } else if (Array.isArray(err.response.data.errors)) { // Bắt lỗi validation backend
          errorText = err.response.data.errors[0]?.msg || errorText;
        } else if (typeof err.response.data.error === 'string') {
          errorText = err.response.data.error;
        } else if (typeof err.response.data.message === 'object') {
          errorText = JSON.stringify(err.response.data.message);
        }
      }
      setError(errorText);
    } finally {
      setIsSaving(false);
    }
  };

  // ✅ LỚP BẢO VỆ 3: Xử lý Date an toàn, chống crash "Invalid time value"
  const getPremiumDate = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d.toLocaleDateString('vi-VN');
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
        <p className="text-gray-400 font-medium">Đang tải hồ sơ...</p>
      </div>
    );
  }

  const equipmentOptions = [
    { id: 'bodyweight', label: 'Cơ thể (Không tạ)' },
    { id: 'dumbbells', label: 'Tạ đơn' },
    { id: 'pull_up_bar', label: 'Xà đơn' },
    { id: 'resistance_bands', label: 'Dây kháng lực' },
    { id: 'none', label: 'Không có gì' }
  ];

  return (
    <div className="bg-gray-950 min-h-screen text-gray-200 pb-12">
      {/* HEADER TỔNG */}
      <header className="bg-gray-900 border-b border-gray-800 p-5 sticky top-0 z-20 shadow-md">
        <div className="w-full px-4 md:px-8 lg:px-12 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Hồ sơ cá nhân</h1>
            <p className="text-sm text-gray-400 mt-1 flex items-center gap-1.5">
              Cập nhật chỉ số để hệ thống tính toán lại lộ trình
            </p>
          </div>
        </div>
      </header>

      {/* THÔNG BÁO */}
      <div className="w-full px-4 md:px-8 lg:px-12 mt-4 space-y-3">
        {error && (
          <div className="p-3 bg-red-900/30 text-red-400 border border-red-800/50 rounded-xl text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> {error}
          </div>
        )}
        {successMsg && (
          <div className="p-3 bg-green-900/30 text-green-400 border border-green-800/50 rounded-xl text-sm flex items-center gap-2">
            <CheckCircle className="w-4 h-4" /> {successMsg}
          </div>
        )}
      </div>

      <div className="w-full px-4 md:px-8 lg:px-12 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* CỘT TRÁI (THÔNG TIN FORM) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* THÔNG TIN CƠ BẢN */}
            <div className="bg-gray-900 p-5 md:p-6 rounded-2xl border border-gray-800 shadow-lg">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2 border-b border-gray-800 pb-3">
                <User className="w-5 h-5 text-blue-400" /> Thông tin cơ bản
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Họ và tên</label>
                  <input type="text" name="name" value={formData.name || ''} onChange={handleInputChange} className="w-full bg-gray-950 border border-gray-700 rounded-xl p-3 text-white focus:border-blue-500 outline-none transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1 flex items-center gap-1"><Mail className="w-3 h-3"/> Email (Không thể đổi)</label>
                  <input type="email" value={userData?.email || ''} disabled className="w-full bg-gray-900 border border-gray-800 rounded-xl p-3 text-gray-500 cursor-not-allowed" />
                </div>

                <div className="grid grid-cols-3 gap-3 md:col-span-2">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Tuổi</label>
                    <input type="number" name="age" value={formData.age || ''} onChange={handleInputChange} className="w-full bg-gray-950 border border-gray-700 rounded-xl p-3 text-white focus:border-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1 flex items-center gap-1"><Ruler className="w-3 h-3"/> Cao (cm)</label>
                    <input type="number" name="height" value={formData.height || ''} onChange={handleInputChange} className="w-full bg-gray-950 border border-gray-700 rounded-xl p-3 text-white focus:border-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1 flex items-center gap-1"><Weight className="w-3 h-3"/> Nặng (kg)</label>
                    <input type="number" name="weight" value={formData.weight || ''} onChange={handleInputChange} className="w-full bg-gray-950 border border-gray-700 rounded-xl p-3 text-white focus:border-blue-500 outline-none" />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Giới tính</label>
                  <div className="flex gap-4">
                    <label className={`flex-1 p-3 rounded-xl border text-center cursor-pointer font-medium transition-colors ${formData.gender === 'male' ? 'bg-blue-900/20 border-blue-500 text-blue-400' : 'bg-gray-950 border-gray-700 text-gray-400 hover:bg-gray-800'}`}>
                      <input type="radio" name="gender" value="male" checked={formData.gender === 'male'} onChange={handleInputChange} className="hidden" /> Nam
                    </label>
                    <label className={`flex-1 p-3 rounded-xl border text-center cursor-pointer font-medium transition-colors ${formData.gender === 'female' ? 'bg-pink-900/20 border-pink-500 text-pink-400' : 'bg-gray-950 border-gray-700 text-gray-400 hover:bg-gray-800'}`}>
                      <input type="radio" name="gender" value="female" checked={formData.gender === 'female'} onChange={handleInputChange} className="hidden" /> Nữ
                    </label>
                  </div>
                </div>

                {/* BỆNH LÝ & SỨC KHỎE */}
                <div className="md:col-span-2 mt-2 border-t border-gray-800 pt-5">
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                    <HeartPulse className="w-4 h-4 text-red-400"/> Bệnh lý / Tình trạng sức khỏe y tế
                  </label>
                  <textarea 
                    name="medicalConditionsStr" 
                    value={formData.medicalConditionsStr || ''} 
                    onChange={handleInputChange} 
                    placeholder="VD: Đau dạ dày, Thoát vị đĩa đệm, Tiểu đường, Gout... (Các bệnh cách nhau bởi dấu phẩy)"
                    className="w-full bg-gray-950 border border-gray-700 rounded-xl p-3 text-white focus:border-red-500/50 outline-none transition-colors resize-none placeholder-gray-600"
                    rows="2"
                  />
                  <p className="text-[11px] text-gray-500 mt-1.5 italic font-medium">
                    * AI sẽ đọc thông tin này để tự động LỌC BỎ các món ăn và bài tập gây hại cho sức khỏe của bạn.
                  </p>
                </div>

              </div>
            </div>

            {/* MỤC TIÊU & TẬP LUYỆN */}
            <div className="bg-gray-900 p-5 md:p-6 rounded-2xl border border-gray-800 shadow-lg">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2 border-b border-gray-800 pb-3">
                <Target className="w-5 h-5 text-emerald-400" /> Mục tiêu & Tập luyện
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Mục tiêu thể hình</label>
                  <select name="goal" value={formData.goal || 'lose_weight'} onChange={handleInputChange} className="w-full bg-gray-950 border border-gray-700 rounded-xl p-3 text-white focus:border-emerald-500 outline-none appearance-none">
                    <option value="lose_weight">Giảm cân / Giảm mỡ</option>
                    <option value="gain_muscle">Tăng cân / Tăng cơ</option>
                    <option value="maintain">Duy trì vóc dáng</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1"><Activity className="w-3 h-3"/> Trình độ hiện tại</label>
                  <select name="fitnessLevel" value={formData.fitnessLevel || 'beginner'} onChange={handleInputChange} className="w-full bg-gray-950 border border-gray-700 rounded-xl p-3 text-white focus:border-emerald-500 outline-none appearance-none">
                    <option value="beginner">Người mới bắt đầu</option>
                    <option value="intermediate">Đã có kinh nghiệm (Trung bình)</option>
                    <option value="advanced">Chuyên nghiệp (Nâng cao)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1"><MapPin className="w-3 h-3"/> Địa điểm tập</label>
                  <select name="workoutLocation" value={formData.workoutLocation || 'home'} onChange={handleInputChange} className="w-full bg-gray-950 border border-gray-700 rounded-xl p-3 text-white focus:border-emerald-500 outline-none appearance-none">
                    <option value="home">Tại nhà</option>
                    <option value="gym">Phòng Gym</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Dụng cụ hiện có</label>
                  <div className="flex flex-wrap gap-2">
                    {equipmentOptions.map(eq => {
                      const availableEq = Array.isArray(formData.availableEquipment) ? formData.availableEquipment : [];
                      const isSelected = availableEq.includes(eq.id);
                      return (
                        <button 
                          key={eq.id} type="button"
                          onClick={() => handleEquipmentToggle(eq.id)}
                          className={`px-4 py-2 text-sm font-medium rounded-full border transition-all ${isSelected ? 'bg-emerald-900/30 border-emerald-500 text-emerald-400 shadow-md' : 'bg-gray-950 border-gray-700 text-gray-400 hover:bg-gray-800'}`}
                        >
                          {eq.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* NÚT LƯU */}
            <button 
              onClick={handleSaveProfile} disabled={isSaving}
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-lg rounded-2xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
            >
              {isSaving ? <><Loader2 className="w-5 h-5 animate-spin" /> Đang cập nhật...</> : <><Save className="w-5 h-5" /> Lưu Thay Đổi</>}
            </button>

          </div>

          {/* CỘT PHẢI (TRẠNG THÁI & MACROS) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* THẺ TRẠNG THÁI TÀI KHOẢN */}
            <div className="bg-gray-900 p-5 rounded-2xl border border-gray-800 shadow-lg">
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-4">Trạng thái tài khoản</h2>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-gray-950 border border-yellow-900/50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-yellow-500/20 rounded-lg text-yellow-500">
                      <Crown className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-white font-bold">{userData?.isPremium ? 'Gói Premium' : 'Gói Cơ bản'}</p>
                      {userData?.isPremium && userData?.premiumUntil && getPremiumDate(userData.premiumUntil) && (
                        <p className="text-xs text-yellow-400">Đến: {getPremiumDate(userData.premiumUntil)}</p>
                      )}
                    </div>
                  </div>
                  {!userData?.isPremium && <button className="text-xs font-bold text-yellow-500 bg-yellow-500/10 px-3 py-1.5 rounded-lg border border-yellow-500/30 hover:bg-yellow-500/20">Nâng cấp</button>}
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-950 border border-purple-900/50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400">
                      <Ticket className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-white font-bold">Vé dùng AI</p>
                      <p className="text-xs text-purple-400">Xem QC để nhận thêm</p>
                    </div>
                  </div>
                  <span className="text-xl font-black text-white">{userData?.aiTickets || 0}</span>
                </div>
              </div>
            </div>

            {/* BẢNG TÍNH MACROS TỰ ĐỘNG BỞI AI */}
            <div className="bg-gray-900 p-5 rounded-2xl border border-blue-900/30 shadow-lg relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
              
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-500" /> Tỉ lệ Macros đề xuất
                </h2>
              </div>
              <p className="text-xs text-blue-300/80 mb-5 italic bg-blue-900/10 p-2 rounded-lg border border-blue-900/30">
                Chỉ số này do Hệ thống tự động tính toán dựa trên Chiều cao, Cân nặng và Mục tiêu bạn vừa lưu.
              </p>

              <div className="space-y-4">
                <div className="flex justify-between items-end border-b border-gray-800 pb-3">
                  <span className="text-gray-400 font-medium">Tổng Calo / Ngày</span>
                  <span className="text-2xl font-black text-yellow-500">{userData?.targetMacros?.calories || 0} <span className="text-sm font-normal text-gray-500">kcal</span></span>
                </div>
                
                <div className="grid grid-cols-3 gap-2 text-center pt-2">
                  <div className="bg-gray-950 p-3 rounded-xl border border-gray-800">
                    <span className="block text-xs text-gray-500 font-semibold mb-1 uppercase">Protein</span>
                    <span className="text-lg font-bold text-blue-400">{userData?.targetMacros?.protein || 0}g</span>
                  </div>
                  <div className="bg-gray-950 p-3 rounded-xl border border-gray-800">
                    <span className="block text-xs text-gray-500 font-semibold mb-1 uppercase">Carbs</span>
                    <span className="text-lg font-bold text-yellow-400">{userData?.targetMacros?.carbs || 0}g</span>
                  </div>
                  <div className="bg-gray-950 p-3 rounded-xl border border-gray-800">
                    <span className="block text-xs text-gray-500 font-semibold mb-1 uppercase">Fat</span>
                    <span className="text-lg font-bold text-red-400">{userData?.targetMacros?.fat || 0}g</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}