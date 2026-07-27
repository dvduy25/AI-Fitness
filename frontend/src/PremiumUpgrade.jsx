import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from "./services/api";
import { 
  Crown, CheckCircle2, Zap, Shield, Loader2, Bot, 
  Sparkles, ArrowLeft, Dumbbell, Utensils, Star, Flame
} from 'lucide-react';

export default function PremiumUpgrade() {
  const [packages, setPackages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingId, setLoadingId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await api.get(`/admin/packages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPackages(res.data?.data || res.data || []);
    } catch (error) {
      console.error("Lỗi tải gói Premium:", error);
    }  finally {
      setIsLoading(false);
    }
  };

  const handleBuy = async (pkg) => {
    setLoadingId(pkg._id);
    const token = localStorage.getItem('token');
    const config = { headers: { Authorization: `Bearer ${token}` } };

    try {
      // 1. Thử gọi API thanh toán thật trước
      const realPaymentRes = await api.post(`/transactions/payment/create-url`, { packageId: pkg._id }, config);
      
      const payUrl = realPaymentRes.data?.payUrl || realPaymentRes.data?.paymentUrl || realPaymentRes.data?.url;
      if (payUrl) {
        window.location.href = payUrl; // Chuyển sang cổng thanh toán thật (MoMo, VNPay...)
        return;
      }
    } catch (realErr) {
      console.warn("Cổng thanh toán thật chưa cấu hình hoặc báo lỗi, chuyển sang cơ chế thanh toán ảo (Dev Mode)...");
    }

    // 2. Fallback: Thanh toán Ảo (Môi trường Dev / Testing)
    try {
      const res = await api.post(`/transactions/virtual-payment`, { packageId: pkg._id }, config);
      
      if (res.data?.isSuccess || res.data?.success) {
        alert(res.data?.message || "🎉 Nạp VIP ảo thành công! Mở khóa toàn bộ tính năng Bot HLV AI.");
        navigate('/profile'); 
      }
    } catch (error) {
      console.error("Lỗi thanh toán:", error);
      alert(error.response?.data?.message || "Không thể thực hiện thanh toán. Vui lòng thử lại sau!");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 py-10 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      
      {/* Nút Quay lại */}
      <div className="max-w-7xl mx-auto mb-6">
        <button 
          onClick={() => navigate('/profile')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-gray-300 hover:text-white rounded-xl border border-gray-800 transition-colors text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" /> Quay lại Hồ sơ
        </button>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* HEADER SECTION */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-full mb-4">
            <Crown className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">Gói Hội Viên VIP</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-4">
            Nâng Cấp <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500">Premium</span>
          </h1>
          
          <p className="text-base sm:text-lg text-gray-400 leading-relaxed">
            Mở khóa trọn bộ sức mạnh <strong className="text-amber-400 font-semibold">Trợ Lý Bot HLV AI</strong>, tự động lập thực đơn dinh dưỡng và thiết kế lịch tập chuẩn cá nhân hóa.
          </p>
        </div>

        {/* DANH SÁCH GÓI CƯỚC */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-10 h-10 text-amber-400 animate-spin mb-3" />
            <p className="text-gray-400 text-sm">Đang tải danh sách gói cước...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
            {packages.map((pkg) => {
              const isBestSeller = pkg.months >= 6;
              
              return (
                <div 
                  key={pkg._id} 
                  className={`relative bg-gray-900 rounded-3xl p-7 border flex flex-col justify-between transition-all duration-300 shadow-xl ${
                    isBestSeller 
                      ? 'border-amber-500/60 bg-gradient-to-b from-amber-950/20 via-gray-900 to-gray-900 shadow-amber-500/10 md:-translate-y-2' 
                      : 'border-gray-800 hover:border-gray-700'
                  }`}
                >
                  {/* Badge Phổ biến nhất */}
                  {isBestSeller && (
                    <div className="absolute -top-3.5 left-1/2 transform -translate-x-1/2">
                      <span className="bg-gradient-to-r from-amber-500 to-yellow-500 text-gray-950 text-[11px] font-black uppercase tracking-wider py-1 px-4 rounded-full shadow-lg flex items-center gap-1">
                        <Flame className="w-3.5 h-3.5 fill-current" /> Phổ biến nhất
                      </span>
                    </div>
                  )}

                  <div>
                    {/* Thông tin gói */}
                    <div className="mb-6 text-center border-b border-gray-800/80 pb-6">
                      <h3 className="text-xl font-bold text-white mb-2">{pkg.name}</h3>
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-3xl sm:text-4xl font-extrabold text-amber-400">
                          {pkg.price?.toLocaleString('vi-VN')}
                        </span>
                        <span className="text-sm font-bold text-gray-400">đ</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-2 font-medium bg-gray-950/60 inline-block px-3 py-1 rounded-full border border-gray-800">
                        Thời hạn: {pkg.months} tháng
                      </p>
                    </div>

                    {/* MỞ KHÓA TÍNH NĂNG BOT HLV AI */}
                    <div className="mb-6 p-3 bg-gradient-to-r from-amber-500/10 to-amber-500/5 rounded-2xl border border-amber-500/30">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-amber-500/20 rounded-xl text-amber-400">
                          <Bot className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="block text-xs font-bold text-amber-300 uppercase tracking-wide">Đặc quyền Premium</span>
                          <span className="text-xs text-gray-300 font-semibold">Mở khóa Bot HLV AI 24/7</span>
                        </div>
                      </div>
                    </div>

                    {/* Quyền lợi */}
                    <ul className="space-y-3.5 mb-8 text-xs text-gray-300">
                      <li className="flex items-start gap-2.5">
                        <Zap className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <span>Trò chuyện & tư vấn cùng AI Coach không giới hạn</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <Utensils className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <span>Tự động tính Macros & gợi ý thực đơn món ăn Việt</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <Dumbbell className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <span>Thiết kế giáo án tập luyện theo mục tiêu riêng</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <Shield className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <span>Không chứa quảng cáo, trải nghiệm mượt mà</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <Star className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <span>Gắn huy hiệu VIP khẳng định đẳng cấp</span>
                      </li>
                    </ul>
                  </div>

                  {/* Nút thanh toán */}
                  <button
                    onClick={() => handleBuy(pkg)}
                    disabled={loadingId === pkg._id}
                    className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg ${
                      isBestSeller 
                        ? 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-gray-950 shadow-amber-500/20 hover:shadow-amber-500/30' 
                        : 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-700'
                    }`}
                  >
                    {loadingId === pkg._id ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" /> Nâng cấp {pkg.name}
                      </>
                    )}
                  </button>
                </div>
              );
            })}

            {packages.length === 0 && (
              <div className="col-span-full text-center py-12 bg-gray-900 rounded-3xl border border-gray-800 text-gray-400">
                Chưa có gói cước nào được mở bán. Vui lòng quay lại sau!
              </div>
            )}
          </div>
        )}

        {/* CÁC ĐẶC QUYỀN CỦA BOT HLV AI */}
        <div className="mt-20 max-w-4xl mx-auto bg-gray-900/60 border border-gray-800 rounded-3xl p-6 sm:p-8 backdrop-blur-sm">
          <h2 className="text-xl font-bold text-white text-center mb-6 flex items-center justify-center gap-2">
            <Bot className="w-6 h-6 text-amber-400" /> Trợ Lý Bot HLV AI Mang Lại Cho Bạn Điều Gì?
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
            <div className="p-4 bg-gray-950/60 rounded-2xl border border-gray-800/80">
              <div className="w-10 h-10 bg-amber-500/10 text-amber-400 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-sm mb-1">Phản Hồi Tức Thì 24/7</h3>
              <p className="text-xs text-gray-400">Giải đáp mọi thắc mắc bài tập, dinh dưỡng ngay lập tức mà không cần chờ đợi.</p>
            </div>

            <div className="p-4 bg-gray-950/60 rounded-2xl border border-gray-800/80">
              <div className="w-10 h-10 bg-amber-500/10 text-amber-400 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Utensils className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-sm mb-1">Dinh Dưỡng Chuẩn Cá Nhân</h3>
              <p className="text-xs text-gray-400">Gợi ý món ăn Việt Nam chuẩn Calories và Macros phù hợp với thể trạng của bạn.</p>
            </div>

            <div className="p-4 bg-gray-950/60 rounded-2xl border border-gray-800/80">
              <div className="w-10 h-10 bg-amber-500/10 text-amber-400 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Dumbbell className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-sm mb-1">Giáo Án Đa Dạng</h3>
              <p className="text-xs text-gray-400">Thiết kế lịch tập linh hoạt theo dụng cụ sẵn có (Gym, Tại nhà, Bodyweight).</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}