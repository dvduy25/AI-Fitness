import React, { useState, useEffect } from 'react';
import api from "./services/api";
import { 
  User, Crown, Ticket, Zap, Target, Activity, 
  MapPin, Save, Loader2, Mail, Weight, Ruler, HeartPulse,
  CheckCircle, AlertTriangle, Camera, Calculator, Lock, Percent, Bone,
  Edit, X
} from 'lucide-react';

export default function UserProfile() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isEditing, setIsEditing] = useState(false); // State quản lý chế độ Sửa/Xem
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");

  const [userData, setUserData] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '', age: '', gender: 'male', height: '', weight: '',
    goal: 'lose_weight', fitnessLevel: 'beginner',
    workoutLocation: 'home', availableEquipment: [],
    medicalConditionsStr: '',
    calories: '', protein: '', carbs: '', fat: '',
    neck: '', waist: '', hip: '', 
    bodyFat: '', bmi: '', leanBodyMass: '', muscleMass: ''
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
          : (typeof user.medicalConditions === 'string' ? user.medicalConditions : ''),
        
        calories: user.targetMacros?.calories || '',
        protein: user.targetMacros?.protein || '',
        carbs: user.targetMacros?.carbs || '',
        fat: user.targetMacros?.fat || '',
        
        neck: user.neck || '',
        waist: user.waist || '',
        hip: user.hip || '',
        bodyFat: user.bodyFat || '',
        bmi: user.bmi || '',
        leanBodyMass: user.leanBodyMass || '',
        muscleMass: user.muscleMass || ''
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

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const imageForm = new FormData();
    imageForm.append('avatar', file);

    setIsUploadingAvatar(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      };
      
      const res = await api.post('/users/avatar', imageForm, config);
      const newAvatarUrl = res.data?.avatarUrl || res.data?.data?.avatar || res.data?.user?.avatar;
      
      if (newAvatarUrl) {
        setUserData(prev => ({ ...prev, avatar: newAvatarUrl }));
        setSuccessMsg("Cập nhật ảnh đại diện thành công!");
      }
    } catch (err) {
      setError("Có lỗi khi tải lên ảnh đại diện. Vui lòng thử lại.");
    } finally {
      setIsUploadingAvatar(false);
      setTimeout(() => setSuccessMsg(""), 4000);
    }
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
        name: formData.name,
        age: Number(formData.age) || 0,
        gender: formData.gender,
        height: Number(formData.height) || 0,
        weight: Number(formData.weight) || 0,
        goal: formData.goal,
        fitnessLevel: formData.fitnessLevel,
        workoutLocation: formData.workoutLocation,
        availableEquipment: formData.availableEquipment,
        medicalConditions: medicalArray,
        neck: Number(formData.neck) || 0,
        waist: Number(formData.waist) || 0,
        hip: Number(formData.hip) || 0
      };

      const res = await api.put(`/users/me`, payload, config);
      const updatedUser = res.data?.data || res.data?.user || res.data || {};
      
      if (updatedUser && (updatedUser.email || updatedUser._id)) {
        setUserData(updatedUser); 
        setFormData(prev => ({
          ...prev,
          calories: updatedUser.targetMacros?.calories || '',
          protein: updatedUser.targetMacros?.protein || '',
          carbs: updatedUser.targetMacros?.carbs || '',
          fat: updatedUser.targetMacros?.fat || '',
          bodyFat: updatedUser.bodyFat || '',
          bmi: updatedUser.bmi || '',
          leanBodyMass: updatedUser.leanBodyMass || '',
          muscleMass: updatedUser.muscleMass || ''
        }));
        
        // Thoát chế độ sửa khi lưu thành công
        setIsEditing(false);
      } else {
        await fetchProfile();
      }
      
      setSuccessMsg("Cập nhật thành công! Hệ thống đã tính toán lại chỉ số cho bạn.");
      setTimeout(() => setSuccessMsg(""), 5000);
      
    } catch (err) {
      let errorText = "Có lỗi xảy ra khi lưu thông tin.";
      if (err.response?.data) {
        if (typeof err.response.data.message === 'string') errorText = err.response.data.message;
        else if (Array.isArray(err.response.data.errors)) errorText = err.response.data.errors[0]?.msg || errorText;
        else if (typeof err.response.data.error === 'string') errorText = err.response.data.error;
      }
      setError(errorText);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    // Khôi phục lại dữ liệu ban đầu
    fetchProfile();
    setIsEditing(false);
    setError(null);
  };

  const getPremiumDate = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d.toLocaleDateString('vi-VN');
  };

  const getBMIStatus = (bmi) => {
    if (!bmi) return null;
    let status = "";
    let colorClass = "";
    
    if (bmi < 18.5) { status = "Thiếu cân"; colorClass = "text-blue-400 border-blue-500/30 bg-blue-900/20"; }
    else if (bmi < 24.9) { status = "Bình thường"; colorClass = "text-green-400 border-green-500/30 bg-green-900/20"; }
    else if (bmi < 29.9) { status = "Thừa cân"; colorClass = "text-yellow-400 border-yellow-500/30 bg-yellow-900/20"; }
    else { status = "Béo phì"; colorClass = "text-red-400 border-red-500/30 bg-red-900/20"; }
    
    return { value: bmi, status, colorClass };
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

  const currentBMIInfo = getBMIStatus(formData.bmi);

  // Map dữ liệu để hiển thị đẹp hơn
  const goalMap = { lose_weight: 'Giảm cân / Giảm mỡ', gain_muscle: 'Tăng cân / Tăng cơ', maintain: 'Duy trì vóc dáng' };
  const fitnessLevelMap = { beginner: 'Người mới bắt đầu', intermediate: 'Đã có kinh nghiệm', advanced: 'Chuyên nghiệp' };
  const locationMap = { home: 'Tại nhà', gym: 'Phòng Gym' };

  return (
    <div className="bg-gray-950 min-h-screen text-gray-200 pb-12">
      <header className="bg-gray-900 border-b border-gray-800 p-5 sticky top-0 z-20 shadow-md">
        <div className="w-full px-4 md:px-8 lg:px-12 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Hồ sơ cá nhân</h1>
            <p className="text-sm text-gray-400 mt-1 flex items-center gap-1.5">
              {isEditing ? "Cập nhật thông tin của bạn" : "Quản lý thông tin và chỉ số cơ thể"}
            </p>
          </div>
          
          {/* NÚT CHỈNH SỬA / HỦY */}
          {!isEditing ? (
            <button 
              onClick={() => setIsEditing(true)} 
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors text-sm flex items-center gap-2 shadow-lg shadow-blue-600/20"
            >
              <Edit className="w-4 h-4" /> Chỉnh sửa
            </button>
          ) : (
            <button 
              onClick={handleCancelEdit} 
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-xl transition-colors text-sm flex items-center gap-2"
            >
              <X className="w-4 h-4" /> Hủy sửa
            </button>
          )}
        </div>
      </header>

      <div className="w-full px-4 md:px-8 lg:px-12 mt-4 space-y-3">
        {error && (
          <div className="p-3 bg-red-900/30 text-red-400 border border-red-800/50 rounded-xl text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" /> <span className="flex-1">{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="p-3 bg-green-900/30 text-green-400 border border-green-800/50 rounded-xl text-sm flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" /> <span className="flex-1">{successMsg}</span>
          </div>
        )}
      </div>

      <div className="w-full px-4 md:px-8 lg:px-12 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* ========================================== */}
          {/* CỘT TRÁI: HIỂN THỊ HOẶC FORM NHẬP LIỆU     */}
          {/* ========================================== */}
          <div className="lg:col-span-8 space-y-6">
            
            {isEditing ? (
              // ------------------------------------------
              // CHẾ ĐỘ CHỈNH SỬA (EDIT MODE)
              // ------------------------------------------
              <>
                <div className="bg-gray-900 p-5 md:p-6 rounded-2xl border border-gray-800 shadow-lg">
                  <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2 border-b border-gray-800 pb-3">
                    <User className="w-5 h-5 text-blue-400" /> Cập nhật thông tin
                  </h2>
                  
                  <div className="flex justify-center mb-8">
                    <div className="relative">
                      <div className="w-24 h-24 rounded-full bg-gray-950 border-2 border-blue-500 overflow-hidden flex items-center justify-center">
                        {userData?.avatar ? (
                          <img src={userData.avatar} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-12 h-12 text-gray-600" />
                        )}
                      </div>
                      <label className="absolute bottom-0 right-0 p-2 bg-blue-600 rounded-full cursor-pointer hover:bg-blue-500 transition-colors shadow-lg shadow-blue-900/50">
                        {isUploadingAvatar ? (
                          <Loader2 className="w-4 h-4 text-white animate-spin" />
                        ) : (
                          <Camera className="w-4 h-4 text-white" />
                        )}
                        <input 
                          type="file" accept="image/jpeg, image/png, image/webp" 
                          className="hidden" onChange={handleAvatarUpload} disabled={isUploadingAvatar}
                        />
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Họ và tên</label>
                      <input type="text" name="name" value={formData.name || ''} onChange={handleInputChange} className="w-full bg-gray-950 border border-gray-700 rounded-xl p-3 text-white focus:border-blue-500 outline-none transition-colors" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1 flex items-center gap-1"><Mail className="w-3 h-3"/> Email</label>
                      <input type="email" value={userData?.email || ''} disabled className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-gray-500 cursor-not-allowed opacity-70" />
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

                    <div className="md:col-span-2 mt-2 border-t border-gray-800 pt-5">
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                        <HeartPulse className="w-4 h-4 text-red-400"/> Bệnh lý / Tình trạng sức khỏe
                      </label>
                      <textarea 
                        name="medicalConditionsStr" value={formData.medicalConditionsStr || ''} onChange={handleInputChange} 
                        placeholder="VD: Đau dạ dày, Thoát vị đĩa đệm, Tiểu đường, Gout... (Cách nhau bởi dấu phẩy)"
                        className="w-full bg-gray-950 border border-gray-700 rounded-xl p-3 text-white focus:border-red-500/50 outline-none transition-colors resize-none placeholder-gray-600" rows="2"
                      />
                    </div>
                  </div>
                </div>

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
                              key={eq.id} type="button" onClick={() => handleEquipmentToggle(eq.id)}
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

                <div className="bg-gray-900 p-5 md:p-6 rounded-2xl border border-gray-800 shadow-lg relative">
                  <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2 border-b border-gray-800 pb-3">
                    <Calculator className="w-5 h-5 text-purple-400" /> Nhập số đo các vòng
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Cổ (cm)</label>
                      <input type="number" name="neck" value={formData.neck || ''} onChange={handleInputChange} className="w-full bg-gray-950 border border-gray-700 rounded-xl p-3 text-white focus:border-purple-500 outline-none transition-colors" placeholder="Vòng cổ..." />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Eo (cm)</label>
                      <input type="number" name="waist" value={formData.waist || ''} onChange={handleInputChange} className="w-full bg-gray-950 border border-gray-700 rounded-xl p-3 text-white focus:border-purple-500 outline-none transition-colors" placeholder="Vòng eo..." />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Hông (cm) {formData.gender === 'female' && '*'}</label>
                      <input type="number" name="hip" value={formData.hip || ''} onChange={handleInputChange} placeholder={formData.gender === 'male' ? "Bỏ qua (chỉ dành cho Nữ)" : "Vòng hông..."} className="w-full bg-gray-950 border border-gray-700 rounded-xl p-3 text-white focus:border-purple-500 outline-none transition-colors" />
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button 
                    onClick={handleCancelEdit} disabled={isSaving}
                    className="w-1/3 py-4 bg-gray-800 hover:bg-gray-700 text-white font-bold text-lg rounded-2xl transition-all"
                  >
                    Hủy
                  </button>
                  <button 
                    onClick={handleSaveProfile} disabled={isSaving}
                    className="w-2/3 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-lg rounded-2xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
                  >
                    {isSaving ? <><Loader2 className="w-5 h-5 animate-spin" /> Đang cập nhật...</> : <><Save className="w-5 h-5" /> Lưu Thay Đổi</>}
                  </button>
                </div>
              </>
            ) : (
              // ------------------------------------------
              // CHẾ ĐỘ CHỈ XEM (READ-ONLY MODE)
              // ------------------------------------------
              <>
                <div className="bg-gray-900 p-6 md:p-8 rounded-2xl border border-gray-800 shadow-lg">
                  <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                    <div className="w-28 h-28 shrink-0 rounded-full bg-gray-950 border-2 border-blue-500 overflow-hidden flex items-center justify-center">
                      {userData?.avatar ? (
                        <img src={userData.avatar} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-12 h-12 text-gray-600" />
                      )}
                    </div>
                    <div className="flex-1 text-center md:text-left">
                      <h2 className="text-2xl font-bold text-white mb-1">{formData.name || "Chưa cập nhật tên"}</h2>
                      <p className="text-gray-400 flex items-center justify-center md:justify-start gap-2 mb-4">
                        <Mail className="w-4 h-4" /> {userData?.email}
                      </p>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-950 p-4 rounded-xl border border-gray-800">
                        <div>
                          <span className="block text-[11px] text-gray-500 uppercase font-bold mb-1">Tuổi</span>
                          <span className="text-white font-semibold">{formData.age || '--'}</span>
                        </div>
                        <div>
                          <span className="block text-[11px] text-gray-500 uppercase font-bold mb-1">Giới tính</span>
                          <span className="text-white font-semibold">{formData.gender === 'male' ? 'Nam' : 'Nữ'}</span>
                        </div>
                        <div>
                          <span className="block text-[11px] text-gray-500 uppercase font-bold mb-1">Cao</span>
                          <span className="text-white font-semibold">{formData.height ? `${formData.height} cm` : '--'}</span>
                        </div>
                        <div>
                          <span className="block text-[11px] text-gray-500 uppercase font-bold mb-1">Nặng</span>
                          <span className="text-white font-semibold">{formData.weight ? `${formData.weight} kg` : '--'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {formData.medicalConditionsStr && (
                    <div className="mt-6 pt-5 border-t border-gray-800">
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide flex items-center gap-1 mb-2">
                        <HeartPulse className="w-4 h-4 text-red-400" /> Tình trạng sức khỏe
                      </h3>
                      <p className="text-white bg-red-900/10 border border-red-900/30 p-3 rounded-xl">
                        {formData.medicalConditionsStr}
                      </p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Mục tiêu & Tập luyện */}
                  <div className="bg-gray-900 p-5 rounded-2xl border border-gray-800 shadow-lg">
                    <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wide flex items-center gap-2 mb-4 border-b border-gray-800 pb-3">
                      <Target className="w-4 h-4 text-emerald-400" /> Mục tiêu & Tập luyện
                    </h2>
                    <ul className="space-y-4">
                      <li>
                        <span className="block text-[11px] text-gray-500 uppercase font-bold">Mục tiêu</span>
                        <span className="text-white font-medium">{goalMap[formData.goal] || '--'}</span>
                      </li>
                      <li>
                        <span className="block text-[11px] text-gray-500 uppercase font-bold">Trình độ</span>
                        <span className="text-white font-medium">{fitnessLevelMap[formData.fitnessLevel] || '--'}</span>
                      </li>
                      <li>
                        <span className="block text-[11px] text-gray-500 uppercase font-bold">Địa điểm tập</span>
                        <span className="text-white font-medium">{locationMap[formData.workoutLocation] || '--'}</span>
                      </li>
                      <li>
                        <span className="block text-[11px] text-gray-500 uppercase font-bold mb-1">Dụng cụ hiện có</span>
                        <div className="flex flex-wrap gap-2">
                          {formData.availableEquipment.length > 0 ? (
                            equipmentOptions
                              .filter(eq => formData.availableEquipment.includes(eq.id))
                              .map(eq => (
                                <span key={eq.id} className="px-2 py-1 bg-gray-800 text-gray-300 text-xs rounded-md">
                                  {eq.label}
                                </span>
                              ))
                          ) : (
                            <span className="text-gray-500 italic text-sm">Chưa cập nhật</span>
                          )}
                        </div>
                      </li>
                    </ul>
                  </div>

                  {/* Số đo các vòng */}
                  <div className="bg-gray-900 p-5 rounded-2xl border border-gray-800 shadow-lg">
                    <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wide flex items-center gap-2 mb-4 border-b border-gray-800 pb-3">
                      <Calculator className="w-4 h-4 text-purple-400" /> Số đo các vòng
                    </h2>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-3 bg-gray-950 rounded-xl border border-gray-800">
                        <span className="text-gray-400">Vòng Cổ</span>
                        <span className="text-white font-bold">{formData.neck ? `${formData.neck} cm` : '--'}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-gray-950 rounded-xl border border-gray-800">
                        <span className="text-gray-400">Vòng Eo</span>
                        <span className="text-white font-bold">{formData.waist ? `${formData.waist} cm` : '--'}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-gray-950 rounded-xl border border-gray-800">
                        <span className="text-gray-400">Vòng Hông</span>
                        <span className="text-white font-bold">{formData.hip ? `${formData.hip} cm` : '--'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

          </div>

          {/* ========================================== */}
          {/* CỘT PHẢI: CHỈ HIỂN THỊ KẾT QUẢ TÍNH TOÁN   */}
          {/* ========================================== */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* TRẠNG THÁI TÀI KHOẢN */}
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

            {/* CHỈ SỐ BMI */}
            {currentBMIInfo && (
              <div className={`p-5 rounded-2xl border ${currentBMIInfo.colorClass} shadow-lg transition-colors`}>
                <div className="flex justify-between items-start mb-1">
                  <h2 className="text-sm font-bold uppercase tracking-wide opacity-80">Chỉ số BMI</h2>
                  <Lock className="w-3 h-3 opacity-50" />
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <span className="text-4xl font-black">{currentBMIInfo.value}</span>
                    <span className="ml-2 font-bold opacity-90">{currentBMIInfo.status}</span>
                  </div>
                </div>
              </div>
            )}

            {/* BẢNG PHÂN TÍCH CƠ THỂ */}
            <div className="bg-gray-900 p-5 rounded-2xl border border-purple-900/30 shadow-lg relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>
              
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-wide">
                  <Activity className="w-4 h-4 text-purple-500" /> Phân tích cơ thể
                </h2>
                <Lock className="w-3 h-3 text-gray-500 opacity-50" />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-950 border border-gray-800 rounded-xl">
                  <div className="flex items-center gap-3">
                    <Percent className="w-4 h-4 text-pink-400" />
                    <span className="text-gray-400 text-sm font-medium">Lượng mỡ (Body Fat)</span>
                  </div>
                  <div className="text-pink-400 font-bold text-lg">{formData.bodyFat ? `${formData.bodyFat}%` : '--'}</div>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-950 border border-gray-800 rounded-xl">
                  <div className="flex items-center gap-3">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    <span className="text-gray-400 text-sm font-medium">Tỷ lệ cơ (Muscle)</span>
                  </div>
                  <div className="text-emerald-400 font-bold text-lg">{formData.muscleMass ? `${formData.muscleMass}%` : '--'}</div>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-950 border border-gray-800 rounded-xl">
                  <div className="flex items-center gap-3">
                    <Bone className="w-4 h-4 text-blue-400" />
                    <span className="text-gray-400 text-sm font-medium">Khối lượng phi mỡ</span>
                  </div>
                  <div className="text-blue-400 font-bold text-lg">{formData.leanBodyMass ? `${formData.leanBodyMass} kg` : '--'}</div>
                </div>
              </div>
            </div>

            {/* BẢNG TÍNH MACROS */}
            <div className="bg-gray-900 p-5 rounded-2xl border border-blue-900/30 shadow-lg relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
              
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-wide">
                  <Zap className="w-4 h-4 text-yellow-500" /> Macros đề xuất
                </h2>
                <Lock className="w-3 h-3 text-gray-500 opacity-50" />
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-gray-800 pb-3">
                  <span className="text-gray-400 font-medium text-sm">Tổng Calo / Ngày</span>
                  <div className="flex items-center gap-1">
                    <span className="text-yellow-500 font-black text-xl">{formData.calories || '--'}</span>
                    <span className="text-sm font-normal text-gray-500">kcal</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-2 pt-2">
                  <div className="bg-gray-950 p-2 rounded-xl border border-gray-800 flex flex-col items-center justify-center">
                    <span className="block text-[10px] text-gray-500 font-bold mb-1 uppercase tracking-wider">Protein</span>
                    <div className="flex items-center gap-1 w-full justify-center">
                      <span className="text-blue-400 font-bold text-lg">{formData.protein || '--'}</span>
                      <span className="text-xs text-gray-500">g</span>
                    </div>
                  </div>

                  <div className="bg-gray-950 p-2 rounded-xl border border-gray-800 flex flex-col items-center justify-center">
                    <span className="block text-[10px] text-gray-500 font-bold mb-1 uppercase tracking-wider">Carbs</span>
                    <div className="flex items-center gap-1 w-full justify-center">
                      <span className="text-yellow-400 font-bold text-lg">{formData.carbs || '--'}</span>
                      <span className="text-xs text-gray-500">g</span>
                    </div>
                  </div>

                  <div className="bg-gray-950 p-2 rounded-xl border border-gray-800 flex flex-col items-center justify-center">
                    <span className="block text-[10px] text-gray-500 font-bold mb-1 uppercase tracking-wider">Fat</span>
                    <div className="flex items-center gap-1 w-full justify-center">
                      <span className="text-red-400 font-bold text-lg">{formData.fat || '--'}</span>
                      <span className="text-xs text-gray-500">g</span>
                    </div>
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