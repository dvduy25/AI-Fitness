import api from "./services/api";
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Crown, CheckCircle2, Zap, Shield, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom'; // Import useNavigate để chuyển trang

export default function PremiumUpgrade() {
  const [packages, setPackages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingId, setLoadingId] = useState(null);
  const navigate = useNavigate(); // Khởi tạo hook chuyển trang
  useEffect(() => {
    // Gọi API lấy danh sách gói (Chỉ lấy gói đang mở bán)
    const fetchPackages = async () => {
      try {
        const token = localStorage.getItem('token'); // Token của USER
        const res = await api.get(`/admin/packages`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setPackages(res.data.data || []);
      } catch (error) {
        console.error("Lỗi tải gói Premium:", error);
      }
    };
    fetchPackages();
  }, []);

  // Hàm xử lý khi User bấm "Nạp ngay" (Sử dụng Thanh Toán Ảo)
  const handleBuy = async (pkg) => {
    setLoadingId(pkg._id);
    try {
      const token = localStorage.getItem('token');
      
      // Gọi API Thanh toán ảo
      const res = await api.post(`/transactions/virtual-payment`, 
        { packageId: pkg._id }, // Gửi ID của gói cước lên
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Xử lý khi thanh toán ảo thành công
      if (res.data.isSuccess) {
        alert(res.data.message); // Hiển thị thông báo "🎉 Nạp VIP ảo thành công!"
        // Chuyển hướng người dùng về trang cá nhân (hoặc trang chủ)
        navigate('/profile'); 
        // Lưu ý: Nếu trang profile của bạn đường dẫn khác, hãy sửa lại (vd: '/dashboard')
      }

    } catch (error) {
      console.error("Lỗi thanh toán:", error);
      alert(error.response?.data?.message || "Lỗi khởi tạo thanh toán. Vui lòng thử lại sau!");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center justify-center p-3 bg-yellow-100 rounded-full mb-4">
            <Crown className="w-8 h-8 text-yellow-600" />
          </div>
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight sm:text-5xl mb-4">
            Nâng Cấp <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 to-yellow-700">Premium</span>
          </h1>
          <p className="text-lg text-gray-500">
            Mở khóa toàn bộ tính năng độc quyền, không giới hạn vé AI và tận hưởng trải nghiệm tuyệt vời nhất.
          </p>
        </div>

        {/* Cột hiển thị gói */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {packages.map((pkg) => (
            <div 
              key={pkg._id} 
              className="relative bg-white border-2 border-gray-100 rounded-3xl p-8 shadow-lg hover:shadow-xl hover:border-yellow-400 transition-all duration-300 flex flex-col"
            >
              {/* Badge (Nếu là gói 1 Năm thì gắn nhãn Hot) */}
              {pkg.months >= 6 && (
                <div className="absolute top-0 right-6 transform -translate-y-1/2">
                  <span className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-white text-xs font-bold uppercase tracking-wider py-1 px-3 rounded-full shadow-sm">
                    Khuyên dùng
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-900">{pkg.name}</h3>
                <p className="mt-4 flex items-baseline text-4xl font-extrabold text-gray-900">
                  {pkg.price.toLocaleString('vi-VN')}
                  <span className="ml-1 text-xl font-medium text-gray-500">đ</span>
                </p>
                <p className="text-sm text-gray-500 mt-1">Sử dụng trong {pkg.months} tháng</p>
              </div>

              {/* Quyền lợi */}
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-start">
                  <CheckCircle2 className="w-5 h-5 text-yellow-500 mr-2 flex-shrink-0" />
                  <span className="text-gray-600">Không có quảng cáo</span>
                </li>
                <li className="flex items-start">
                  <Zap className="w-5 h-5 text-yellow-500 mr-2 flex-shrink-0" />
                  <span className="text-gray-600">Sử dụng AI không giới hạn</span>
                </li>
                <li className="flex items-start">
                  <Shield className="w-5 h-5 text-yellow-500 mr-2 flex-shrink-0" />
                  <span className="text-gray-600">Huy hiệu thành viên VIP</span>
                </li>
              </ul>

              {/* Nút thanh toán */}
              <button
                onClick={() => handleBuy(pkg)}
                disabled={loadingId === pkg._id}
                className={`w-full py-4 rounded-xl font-bold text-lg flex justify-center items-center transition-all shadow-md ${
                  pkg.months >= 6 
                    ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white shadow-yellow-500/30' 
                    : 'bg-gray-900 hover:bg-gray-800 text-white'
                }`}
              >
                {loadingId === pkg._id ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  `Nâng cấp ${pkg.name}`
                )}
              </button>
            </div>
          ))}

          {packages.length === 0 && (
            <div className="col-span-full text-center py-10 text-gray-500">
              Đang tải danh sách gói hoặc chưa có gói nào được mở bán...
            </div>
          )}
        </div>

      </div>
    </div>
  );
}