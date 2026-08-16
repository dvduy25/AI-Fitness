import api from "./services/api";
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
  Bot, Sparkles, Utensils, Target, Flame, Beef, 
  Wheat, Droplet, Clock, AlertTriangle, CheckCircle, Loader2, MessageSquareText,
  Plus, Trash2, Edit2, X, Search, BrainCircuit,
  ArrowLeft, BookmarkPlus, Library
} from 'lucide-react';

import MasterMealEvaluation from './MasterMealEvaluation';
import PremiumRequireModal from './PremiumRequireModal'; 

export default function MealPlanManager() {
  const navigate = useNavigate(); 

  const [userData, setUserData] = useState(null);
  const [mealsPerDay, setMealsPerDay] = useState(3);
  const [customRequest, setCustomRequest] = useState(""); 
  
  const [isLoadingPlan, setIsLoadingPlan] = useState(true); 
  const [isGenerating, setIsGenerating] = useState(false);  
  const [generatedPlan, setGeneratedPlan] = useState(null);
  
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");

  const [showEvaluation, setShowEvaluation] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [showEditGramModal, setShowEditGramModal] = useState(false);
  const [showAddMealModal, setShowAddMealModal] = useState(false);
  const [showAddFoodModal, setShowAddFoodModal] = useState(false);

  // --- STATE CHO TÍNH NĂNG SỬA TÊN & GIỜ BỮA ĂN ---
  const [showEditMealModal, setShowEditMealModal] = useState(false);
  const [editMealData, setEditMealData] = useState({ mealId: '', mealType: '', scheduledTime: '' });

  const [selectedFoodDetail, setSelectedFoodDetail] = useState(null);

  const [editItemData, setEditItemData] = useState({ mealId: '', itemId: '', foodName: '', grams: 100 });
  const [newMealData, setNewMealData] = useState({ mealType: '', scheduledTime: '12:00' });
  
  const [targetMealForFood, setTargetMealForFood] = useState('');
  const [foodDatabase, setFoodDatabase] = useState([]);
  const [searchFoodQuery, setSearchFoodQuery] = useState('');
  const [isLoadingFoods, setIsLoadingFoods] = useState(false);

  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [isLoadingAd, setIsLoadingAd] = useState(false);

  // --- STATE CHO TÍNH NĂNG KHO LƯU TRỮ (LIBRARY) ---
  const [showLibraryModal, setShowLibraryModal] = useState(false);
  const [libraryItems, setLibraryItems] = useState([]);
  const [isLibraryLoading, setIsLibraryLoading] = useState(false);

  // --- STATE CHO TÍNH NĂNG KIỂM TRA ĐỘ LỆCH CALO/MACRO ---
  const [deviationData, setDeviationData] = useState(null);

  const getHeaders = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

  useEffect(() => {
    fetchUserData();
    fetchCurrentPlan(); 
    fetchFoods(); 
  }, []);

  // Tự động kiểm tra độ lệch dinh dưỡng mỗi khi lịch ăn có sự thay đổi
  useEffect(() => {
    if (generatedPlan) {
      fetchPlanDeviation();
    } else {
      setDeviationData(null);
    }
  }, [generatedPlan]);

  const fetchUserData = async () => {
    try {
      const res = await api.get(`/users/me`, getHeaders());
      setUserData(res.data);
    } catch (err) { console.error("Lỗi tải User:", err); }
  };

  const fetchCurrentPlan = async () => {
    setIsLoadingPlan(true);
    try {
      const res = await api.get(`/meal-plan/my-plan`, getHeaders());
      if (res.data && res.data.hasPlan === true) {
        setGeneratedPlan(res.data.masterMealPlan || res.data.data);
      } else { setGeneratedPlan(null); }
    } catch (err) { setGeneratedPlan(null); } finally { setIsLoadingPlan(false); }
  };

  const fetchFoods = async () => {
    setIsLoadingFoods(true);
    try {
      const res = await api.get(`/foods`, getHeaders());
      const mappedFoods = res.data.map(food => ({
        _id: food._id,
        name: food.name,
        imageUrl: food.imageUrl || "",
        baseUnit: food.baseUnit || "100g",
        protein: food.proteinPer100g || 0,
        carbs: food.carbsPer100g || 0,
        fat: food.fatPer100g || 0,
        calories: food.caloriesPer100g || 0
      }));
      setFoodDatabase(mappedFoods);
    } catch (error) { 
      console.error("Lỗi tải thực phẩm", error); 
    } finally { 
      setIsLoadingFoods(false); 
    }
  };

  const fetchPlanDeviation = async () => {
    try {
      const res = await api.get(`/meal-plan/check-deviation`, getHeaders());
      if (res.data && res.data.success) {
        setDeviationData(res.data.data || res.data);
      } else {
        setDeviationData(null);
      }
    } catch (err) {
      console.error("Lỗi kiểm tra độ lệch lịch ăn:", err);
      setDeviationData(null);
    }
  };

  const checkAiAccess = () => {
    if (!userData) return false;
    if (userData.isPremium) return true; 
    if (userData.aiTickets > 0) return true; 
    return false; 
  };

  const handleWatchAd = async () => {
    setIsLoadingAd(true);
    try {
      const res = await api.post(`/transactions/virtual-ad`, {}, getHeaders());
      alert(res.data.message); 
      fetchUserData(); 
      setShowPremiumModal(false); 
    } catch (error) {
      alert(error.response?.data?.message || "Lỗi xem quảng cáo!");
    } finally {
      setIsLoadingAd(false);
    }
  };

  const handleGeneratePlan = async () => {
    if (!checkAiAccess()) {
      setShowPremiumModal(true);
      return;
    }

    setIsGenerating(true); setError(null); setSuccessMsg("");
    try {
      const payload = { mealsPerDay, customRequest };
      const res = await api.post(`/ai/generate-meal-plan`, payload, getHeaders());
      setGeneratedPlan(res.data.masterMealPlan);
      setSuccessMsg("AI đã tạo thành công lộ trình dinh dưỡng!");
      fetchUserData(); 
    } catch (err) {
      setError(err.response?.data?.message || "Lỗi tạo lịch ăn. Thử lại sau.");
    } finally { setIsGenerating(false); }
  };

  // --- HÀM MỚI: TỰ ĐỘNG CÂN BẰNG GRAM BẰNG AI ---
  const handleAutoBalanceGrams = async () => {
    if (!checkAiAccess()) {
      setShowPremiumModal(true);
      return;
    }
    
    setIsProcessing(true);
    setError(null);
    setSuccessMsg("");
    
    try {
      // Gọi endpoint cân bằng tự động của bạn (điều chỉnh đường dẫn cho phù hợp với Backend)
      const res = await api.post(`/ai/adjust-meal-plan-by-ai`, {}, getHeaders());
      setGeneratedPlan(res.data.masterMealPlan || res.data.plan);
      setSuccessMsg("AI đã cân bằng lại định lượng thành công!");
      fetchUserData(); // Cập nhật lại số vé AI
      fetchPlanDeviation(); // Kiểm tra lại độ lệch sau khi cân bằng
    } catch (err) {
      setError(err.response?.data?.message || "Lỗi khi cân bằng bằng AI.");
      setTimeout(() => setError(""), 3000);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGoHome = () => navigate('/home');

  const handleSaveToLibrary = async () => {
    if (!generatedPlan) return alert("Chưa có thực đơn để lưu!");
    try {
      setIsProcessing(true);
      const res = await api.post(`/library/save-master`, 
        { type: 'diet' }, 
        getHeaders()
      );
      if (res.data.success) {
        setSuccessMsg("Đã lưu thực đơn vào kho thành công!");
        setTimeout(() => setSuccessMsg(""), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Lỗi khi lưu vào kho!");
      setTimeout(() => setError(""), 3000);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenLibrary = async () => {
    try {
      setIsLibraryLoading(true);
      setShowLibraryModal(true);
      const res = await api.get(`/library?type=diet`, getHeaders());
      setLibraryItems(res.data.library || []);
    } catch (error) {
      setError("Không thể tải kho lưu trữ!");
      setTimeout(() => setError(""), 3000);
    } finally {
      setIsLibraryLoading(false);
    }
  };

  const handleApplyFromLibrary = async (libraryId) => {
    if (!window.confirm("Thực đơn từ kho sẽ GHI ĐÈ lên thực đơn hiện tại. Bạn có chắc chắn?")) return;
    try {
      setIsLibraryLoading(true);
      const res = await api.post(`/meal-plan/apply-library`, 
        { libraryId }, 
        getHeaders()
      );
      if (res.data.success) {
        setGeneratedPlan(res.data.plan);
        setShowLibraryModal(false);
        setSuccessMsg("Đã áp dụng thực đơn từ kho thành công!");
        setTimeout(() => setSuccessMsg(""), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Lỗi khi áp dụng thực đơn!");
      setTimeout(() => setError(""), 3000);
    } finally {
      setIsLibraryLoading(false);
    }
  };

  const handleCreateManualPlan = async () => {
    setIsProcessing(true);
    setError(null);
    setSuccessMsg("");
    try {
      const payload = { mealsPerDay: Number(mealsPerDay) };
      const res = await api.post(`/meal-plan/init-manual`, payload, getHeaders());
      setGeneratedPlan(res.data.masterMealPlan);
      setSuccessMsg("Đã khởi tạo lịch ăn thủ công thành công!");
    } catch (err) {
      setError("Lỗi khởi tạo lịch thủ công. Vui lòng thử lại.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteEntirePlan = async () => {
    if (!window.confirm("Bạn có chắc muốn xóa TOÀN BỘ lịch ăn không? Hành động này không thể hoàn tác.")) return;
    
    setIsProcessing(true);
    try {
      await api.delete(`/meal-plan/my-plan`, getHeaders());
      setGeneratedPlan(null);
      setSuccessMsg("Đã xóa toàn bộ lịch ăn.");
    } catch (err) {
      setError("Lỗi khi xóa lịch ăn.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEvaluatePlanClick = () => {
    if (!checkAiAccess()) {
      setShowPremiumModal(true);
      return;
    }
    setShowEvaluation(true);
  };

  const handleAddMeal = async () => {
    if (!newMealData.mealType) return alert("Vui lòng nhập tên bữa ăn!");
    setIsProcessing(true);
    try {
      const res = await api.post(`/meal-plan/meal`, newMealData, getHeaders());
      setGeneratedPlan(res.data.masterMealPlan);
      setShowAddMealModal(false); setNewMealData({ mealType: '', scheduledTime: '12:00' });
    } catch (error) { alert("Lỗi thêm bữa ăn!"); } finally { setIsProcessing(false); }
  };

  const handleDeleteMeal = async (mealId) => {
    if (!window.confirm("Xóa toàn bộ bữa ăn này?")) return;
    setIsProcessing(true);
    try {
      const res = await api.delete(`/meal-plan/meal/${mealId}`, getHeaders());
      setGeneratedPlan(res.data.masterMealPlan);
    } catch (error) { alert("Lỗi xóa bữa ăn!"); } finally { setIsProcessing(false); }
  };

  // --- SỬA TÊN & GIỜ BỮA ĂN ---
  const handleOpenEditMeal = (meal) => {
    setEditMealData({
      mealId: meal._id,
      mealType: meal.mealType || '',
      scheduledTime: meal.scheduledTime || '12:00'
    });
    setShowEditMealModal(true);
  };

  const handleUpdateMeal = async () => {
    if (!editMealData.mealType.trim()) return alert("Tên bữa ăn không được để trống!");
    setIsProcessing(true);
    try {
      const res = await api.put(`/meal-plan/update-meal`, editMealData, getHeaders());
      setGeneratedPlan(res.data.masterMealPlan);
      setShowEditMealModal(false);
    } catch (error) {
      alert(error.response?.data?.message || "Lỗi cập nhật bữa ăn!");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddFoodToMeal = async (foodId) => {
    setIsProcessing(true);
    try {
      const payload = { mealId: targetMealForFood, foodId: foodId, quantityInGrams: 100 };
      const res = await api.post(`/meal-plan/item`, payload, getHeaders());
      setGeneratedPlan(res.data.masterMealPlan);
      setShowAddFoodModal(false); 
      setSearchFoodQuery('');
    } catch (error) { alert("Lỗi thêm món ăn!"); } finally { setIsProcessing(false); }
  };

  const handleUpdateGrams = async () => {
    setIsProcessing(true);
    try {
      const res = await api.patch(`/meal-plan/item`, {
        mealId: editItemData.mealId, itemId: editItemData.itemId, newQuantity: Number(editItemData.grams)
      }, getHeaders());
      setGeneratedPlan(res.data.masterMealPlan); setShowEditGramModal(false);
    } catch (error) { alert("Lỗi cập nhật định lượng!"); } finally { setIsProcessing(false); }
  };

  const handleRemoveFood = async (mealId, itemId) => {
    if (!window.confirm("Bạn có chắc muốn xóa món này?")) return;
    setIsProcessing(true);
    try {
      const res = await api.delete(`/meal-plan/item/${mealId}/${itemId}`, getHeaders());
      setGeneratedPlan(res.data.masterMealPlan);
    } catch (error) { alert("Lỗi xóa món ăn!"); } finally { setIsProcessing(false); }
  };

  const filteredFoods = foodDatabase.filter(food => 
    food.name.toLowerCase().includes(searchFoodQuery.toLowerCase())
  );

  // Danh sách bữa ăn hiển thị theo thứ tự giờ ăn tăng dần (bữa chưa đặt giờ xếp cuối)
  const sortedMeals = [...(generatedPlan?.meals || [])].sort((a, b) => {
    const timeA = a.scheduledTime || "99:99";
    const timeB = b.scheduledTime || "99:99";
    return timeA.localeCompare(timeB);
  });

  return (
    <div className="bg-gray-950 min-h-screen text-gray-200 pb-12">
      {/* HEADER TỔNG CÓ THÊM NÚT BACK */}
      <header className="bg-gray-900 border-b border-gray-800 p-5 sticky top-0 z-20 shadow-md">
        <div className="w-full px-4 md:px-8 lg:px-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={handleGoHome} className="p-2 bg-gray-800 text-gray-400 hover:text-white rounded-full transition-colors shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                <Bot className="w-6 h-6 text-emerald-400" /> AI Dinh Dưỡng
              </h1>
              <p className="text-sm text-gray-400 mt-1 hidden sm:block">
                Tự động lên thực đơn chuẩn Macro dựa trên chỉ số cơ thể của bạn.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {userData && (
              <div className="flex items-center gap-3 bg-gray-950 border border-gray-800 px-4 py-2 rounded-xl">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-medium">
                  {userData.isPremium ? (
                    <span className="text-yellow-400">Premium</span>
                  ) : (
                    <span>Vé AI: <strong className="text-white">{userData.aiTickets}</strong></span>
                  )}
                </span>
              </div>
            )}

            {generatedPlan && (
              <button 
                onClick={handleDeleteEntirePlan} 
                className="p-2 md:p-2.5 bg-red-900/30 text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-colors border border-red-800/50" 
                title="Xóa toàn bộ lịch ăn"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* THÔNG BÁO TỔNG */}
      <div className="w-full px-4 md:px-8 lg:px-12 mt-4 space-y-3">
        {error && (
          <div className="p-3 bg-red-900/30 text-red-400 border border-red-800/50 rounded-xl text-sm flex items-center gap-2 shadow-lg animate-in fade-in duration-300">
            <AlertTriangle className="w-4 h-4 shrink-0" /> <p>{error}</p>
          </div>
        )}
        {successMsg && (
          <div className="p-3 bg-green-900/30 text-green-400 border border-green-800/50 rounded-xl text-sm flex items-center gap-2 shadow-lg animate-in fade-in duration-300">
            <CheckCircle className="w-4 h-4 shrink-0" /> <p>{successMsg}</p>
          </div>
        )}
      </div>

      <div className="w-full px-4 md:px-8 lg:px-12 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* CỘT TRÁI (THIẾT LẬP AI & MỤC TIÊU CHUẨN) */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-gray-900 p-5 rounded-2xl border border-gray-800 shadow-lg">
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-4 flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-400" /> Mục tiêu Macro của bạn
              </h2>
              
              <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 mb-4 flex items-center justify-between">
                <span className="text-gray-400 font-medium flex items-center gap-1.5"><Flame className="w-4 h-4 text-orange-500"/> Tổng Calo</span>
                <span className="text-xl font-black text-orange-400">{Math.round(userData?.targetMacros?.calories || 0)} <span className="text-sm text-gray-500 font-normal">kcal</span></span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-gray-950 p-2 rounded-xl border border-gray-800">
                  <span className="block text-xs text-gray-500 mb-1 flex justify-center"><Beef className="w-3 h-3 text-blue-400"/></span>
                  <span className="text-sm font-bold text-blue-400">{Math.round(userData?.targetMacros?.protein || 0)}g</span>
                </div>
                <div className="bg-gray-950 p-2 rounded-xl border border-gray-800">
                  <span className="block text-xs text-gray-500 mb-1 flex justify-center"><Wheat className="w-3 h-3 text-yellow-400"/></span>
                  <span className="text-sm font-bold text-yellow-400">{Math.round(userData?.targetMacros?.carbs || 0)}g</span>
                </div>
                <div className="bg-gray-950 p-2 rounded-xl border border-gray-800">
                  <span className="block text-xs text-gray-500 mb-1 flex justify-center"><Droplet className="w-3 h-3 text-red-400"/></span>
                  <span className="text-sm font-bold text-red-400">{Math.round(userData?.targetMacros?.fat || 0)}g</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-900 p-5 rounded-2xl border border-gray-800 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
              
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-4 flex items-center gap-2">
                <Utensils className="w-4 h-4 text-emerald-400" /> Tùy chỉnh lịch ăn
              </h2>

              <div className="space-y-5 relative z-10">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">Bạn muốn ăn mấy bữa 1 ngày?</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[3, 4, 5, 6].map(num => (
                      <button
                        key={num}
                        onClick={() => setMealsPerDay(num)}
                        className={`py-3 rounded-xl font-bold border transition-all ${
                          mealsPerDay === num 
                            ? 'bg-emerald-900/40 border-emerald-500 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]' 
                            : 'bg-gray-950 border-gray-800 text-gray-500 hover:border-gray-600 hover:text-gray-300'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                    <MessageSquareText className="w-4 h-4 text-gray-400"/> Yêu cầu đặc biệt
                  </label>
                  <textarea
                    value={customRequest}
                    onChange={(e) => setCustomRequest(e.target.value)}
                    placeholder="VD: Không thích ăn cá, ưu tiên thịt bò và gà..."
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-sm text-gray-200 focus:border-emerald-500 outline-none resize-none"
                    rows="3"
                  />
                </div>
              </div>

              <button 
                onClick={handleGeneratePlan}
                className="w-full mt-6 py-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-800 text-white font-bold text-lg rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
              >
                {isGenerating ? <><Loader2 className="w-5 h-5 animate-spin" /> Đang phân tích...</> : <><Sparkles className="w-5 h-5" /> TẠO LỊCH ĂN AI</>}
              </button>
            </div>
          </div>

          {/* CỘT PHẢI (KẾT QUẢ HIỂN THỊ KÈM CẢNH BÁO ĐỘ LỆCH THỦ CÔNG) */}
          <div className="lg:col-span-8">
            <div className="bg-gray-900 min-h-[500px] p-4 md:p-6 rounded-2xl border border-gray-800 shadow-lg space-y-4">
              
              {isLoadingPlan && !isGenerating && (
                <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-gray-400 space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-500/50" />
                  <p className="animate-pulse">Đang tải dữ liệu thực đơn...</p>
                </div>
              )}

              {isGenerating && (
                <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center space-y-5">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full border-4 border-gray-800 border-t-emerald-500 animate-spin"></div>
                    <Bot className="w-8 h-8 text-emerald-500 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white mb-2">AI đang soạn thực đơn...</h3>
                  </div>
                </div>
              )}

              {/* TRẠNG THÁI TRỐNG: NÚT TẠO THỦ CÔNG & CHỌN TỪ KHO */}
              {!isLoadingPlan && !isGenerating && !generatedPlan && (
                <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center border-2 border-dashed border-gray-800 rounded-xl bg-gray-900/50 py-10">
                  <div className="p-4 bg-gray-800 rounded-full mb-3"><Utensils className="w-8 h-8 text-gray-500" /></div>
                  <h3 className="text-gray-300 font-bold text-lg">Chưa có lịch ăn nào</h3>
                  <p className="text-sm text-gray-500 mt-2 max-w-sm mb-4">
                    Tạo khung lịch ăn trống theo số bữa bạn đã chọn ở bên trái, sau đó tự do thêm món ăn nhé, hoặc chọn từ kho thực đơn.
                  </p>
                  
                  <div className="flex flex-col sm:flex-row justify-center mt-2 gap-3">
                    <button 
                      onClick={handleCreateManualPlan} 
                      disabled={isProcessing} 
                      className="px-6 md:px-8 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all"
                    >
                      {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                      Tạo lịch thủ công
                    </button>
                    
                    <button 
                      onClick={handleOpenLibrary}
                      disabled={isProcessing}
                      className="px-6 md:px-8 py-3.5 bg-orange-600/20 hover:bg-orange-600/30 text-orange-400 font-bold rounded-xl shadow-lg border border-orange-500/30 flex items-center gap-2 transition-all"
                    >
                      <Library className="w-5 h-5" /> Chọn từ kho
                    </button>
                  </div>
                </div>
              )}

              {/* TRẠNG THÁI CÓ LỊCH ĂN */}
              {!isLoadingPlan && !isGenerating && generatedPlan && (
                <div className={`space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}>
                  
                  {/* HEADER TỔNG KẾT BỮA ĂN (TÍCH HỢP NÚT KHO & TỔNG MACRO) */}
                  <div className="bg-gray-950 p-4 rounded-xl border border-emerald-900/50 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                    <div> 
                      <h3 className="text-emerald-400 font-bold flex items-center gap-2 text-lg">
                        <CheckCircle className="w-5 h-5"/> Lịch ăn của bạn
                      </h3>
                      <p className="text-sm text-gray-400 mt-1">Tổng cộng <strong className="text-white">{generatedPlan?.meals?.length || 0}</strong> bữa ăn.</p>
                    </div>
                    
                    <div className="flex flex-col md:flex-row gap-3 items-center">
                      <div className="flex items-center gap-2 md:mr-2">
                        <button onClick={handleSaveToLibrary} disabled={!generatedPlan || isProcessing} className="flex items-center gap-2 px-3 py-2 bg-gray-900 text-yellow-400 border border-yellow-500/30 rounded-lg hover:bg-gray-800 transition-colors text-sm font-semibold">
                          <BookmarkPlus className="w-4 h-4" /> Lưu vào kho
                        </button>
                        <button onClick={handleOpenLibrary} className="flex items-center gap-2 px-3 py-2 bg-gray-900 text-orange-400 border border-orange-500/30 rounded-lg hover:bg-gray-800 transition-colors text-sm font-semibold">
                          <Library className="w-4 h-4" /> Chọn từ kho
                        </button>
                      </div>

                      <div className="flex gap-4 items-center bg-gray-900 p-3 rounded-xl border border-gray-800 w-full md:w-auto justify-center">
                        <div className="text-center px-3 border-r border-gray-700">
                          <span className="block text-[10px] text-gray-500 uppercase font-bold tracking-wider">Tổng Calo</span>
                          <span className="text-xl font-black text-white">{Math.round(generatedPlan?.dailyTotal?.calories || 0)} <span className="text-xs font-normal text-gray-500">kcal</span></span>
                        </div>
                        <div className="flex gap-3 text-xs font-semibold">
                          <span className="text-blue-400 flex flex-col items-center">P <span className="text-white">{Math.round(generatedPlan?.dailyTotal?.protein || 0)}g</span></span>
                          <span className="text-yellow-400 flex flex-col items-center">C <span className="text-white">{Math.round(generatedPlan?.dailyTotal?.carbs || 0)}g</span></span>
                          <span className="text-red-400 flex flex-col items-center">F <span className="text-white">{Math.round(generatedPlan?.dailyTotal?.fat || 0)}g</span></span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* BANNER HIỂN THỊ ĐỘ LỆCH DINH DƯỠNG THỜI GIAN THỰC (TÍCH HỢP NÚT AUTO BALANCE) */}
                  {deviationData && (
                    <div className={`p-4 rounded-xl border text-sm flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md transition-all ${
                      deviationData.isDeviated 
                        ? 'bg-amber-950/40 border-amber-500/40 text-amber-300' 
                        : 'bg-emerald-950/30 border-emerald-500/30 text-emerald-400'
                    }`}>
                      <div className="flex items-start gap-3">
                        <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${deviationData.isDeviated ? 'text-amber-400' : 'text-emerald-400'}`} />
                        <div>
                          <h4 className="font-bold mb-0.5">{deviationData.isDeviated ? "Cảnh báo chênh lệch dinh dưỡng thủ công!" : "Lịch ăn đạt tiêu chuẩn dinh dưỡng!"}</h4>
                          <p className="text-gray-400 text-xs sm:text-sm">{deviationData.message}</p>
                        </div>
                      </div>
                      
                      {deviationData.isDeviated && (
                        <button 
                          onClick={handleAutoBalanceGrams}
                          disabled={isProcessing}
                          className="shrink-0 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white rounded-xl font-bold shadow-lg hover:scale-[1.02] transition-transform text-sm"
                        >
                          {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                          AI Cân Bằng Nhanh
                        </button>
                      )}
                    </div>
                  )}

                  {/* TIMELINE DANH SÁCH BỮA ĂN (ĐÃ SẮP XẾP THEO GIỜ ĂN TĂNG DẦN) */}
                  <div className="relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-700 before:to-transparent pt-4 pb-4">
                    {sortedMeals.map((meal, index) => (
                      <div key={meal._id || index} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group mb-8 last:mb-0">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-gray-900 bg-gray-800 text-gray-400 z-10 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                          <Clock className="w-4 h-4" />
                        </div>
                        
                        <div className="w-[calc(100%-3rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl bg-gray-950 border border-gray-800 shadow-md">
                          <div className="flex items-center justify-between mb-3 border-b border-gray-800 pb-3">
                            <div>
                              <h4 className="font-bold text-white text-base md:text-lg">{meal.mealType}</h4>
                              <span className="text-xs text-gray-500">{meal.scheduledTime || "Chưa đặt giờ"}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="bg-orange-500/10 text-orange-400 text-sm font-bold px-3 py-1 rounded-lg">
                                {Math.round(meal.mealTotal?.calories || 0)} kcal
                              </span>
                              <button onClick={() => handleOpenEditMeal(meal)} className="text-gray-500 hover:text-blue-400 p-1.5 hover:bg-gray-800 rounded-md transition-colors" title="Sửa tên / giờ bữa ăn">
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDeleteMeal(meal._id)} className="text-gray-500 hover:text-red-400 p-1.5 hover:bg-gray-800 rounded-md transition-colors" title="Xóa bữa ăn">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          
                          {/* DANH SÁCH MÓN ĂN TRONG BỮA */}
                          <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                            {meal.items?.length > 0 ? meal.items.map((item, i) => (
                              <div key={i} className="flex justify-between items-start text-sm bg-gray-900/40 p-3 rounded-xl border border-gray-800/50">
                                <div className="pr-2">
                                  <span 
                                    onClick={() => {
                                      const originalFood = foodDatabase.find(f => f.name === item.foodName);
                                      if (originalFood) {
                                        setSelectedFoodDetail(originalFood);
                                      } else {
                                        setSelectedFoodDetail({
                                          name: item.foodName,
                                          calories: item.calories,
                                          protein: item.protein,
                                          carbs: item.carbs,
                                          fat: item.fat,
                                          baseUnit: `${item.quantityInGrams}g`
                                        });
                                      }
                                    }}
                                    className="font-medium text-gray-200 block cursor-pointer hover:text-emerald-400 hover:underline transition-all"
                                    title="Nhấn để xem ảnh và chi tiết"
                                  >
                                    {item.foodName}
                                  </span>
                                  <span className="text-xs text-gray-500">{item.quantityInGrams}g</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="text-right shrink-0">
                                    <span className="font-semibold text-emerald-400 block">{Math.round(item.calories)} kcal</span>
                                    <span className="text-[10px] text-gray-500">P:{Math.round(item.protein)} C:{Math.round(item.carbs)} F:{Math.round(item.fat)}</span>
                                  </div>
                                  <div className="flex flex-col gap-1 border-l border-gray-800 pl-2 ml-1">
                                    <button onClick={() => { setEditItemData({ mealId: meal._id, itemId: item._id, foodName: item.foodName, grams: item.quantityInGrams }); setShowEditGramModal(true); }} className="text-gray-500 hover:text-blue-400"><Edit2 className="w-3.5 h-3.5" /></button>
                                    <button onClick={() => handleRemoveFood(meal._id, item._id)} className="text-gray-500 hover:text-red-400"><X className="w-4 h-4" /></button>
                                  </div>
                                </div>
                              </div>
                            )) : (
                              <p className="text-xs text-gray-500 italic text-center py-2">Chưa có món ăn nào.</p>
                            )}
                          </div>
                          
                          <button 
                            onClick={() => { setTargetMealForFood(meal._id); setShowAddFoodModal(true); }}
                            className="w-full mt-3 py-2 border border-dashed border-gray-700 text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg text-sm flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <Plus className="w-4 h-4" /> Thêm món ăn
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-center mt-6">
                    <button onClick={() => setShowAddMealModal(true)} className="px-6 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white font-medium rounded-full flex items-center gap-2">
                      <Plus className="w-5 h-5" /> Tạo thêm bữa ăn
                    </button>
                  </div>

                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* NÚT AI ĐÁNH GIÁ TỔNG QUAN */}
      {!isLoadingPlan && generatedPlan && (
        <div className="w-full px-4 md:px-8 lg:px-12 pb-10 mt-6">
          <button onClick={handleEvaluatePlanClick} className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-500 rounded-2xl text-white font-bold flex justify-center items-center gap-2 shadow-lg hover:scale-[1.02] transition-transform">
            <BrainCircuit className="w-6 h-6" /> AI Phân tích & Đánh giá lịch ăn này
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* CÁC MODALS (POPUP) HIỂN THỊ */}
      {/* ========================================================= */}
      
      {/* MODAL 1: CHỈNH SỬA SỐ GRAM */}
      {showEditGramModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-gray-900 w-full max-w-sm rounded-2xl border border-gray-800 overflow-hidden">
            <div className="p-5 border-b border-gray-800 flex justify-between items-center">
              <h3 className="font-bold text-white">Chỉnh sửa định lượng</h3>
              <button onClick={() => setShowEditGramModal(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6">
              <p className="text-emerald-400 font-semibold mb-6 text-center text-lg">{editItemData.foodName}</p>
              <div className="flex justify-center items-end gap-1 mb-6">
                <input 
                  type="number" value={editItemData.grams} 
                  onChange={(e) => setEditItemData({...editItemData, grams: e.target.value})}
                  className="w-24 bg-transparent text-4xl font-black text-white text-center border-b-2 border-emerald-500 focus:outline-none"
                />
                <span className="text-gray-400 font-medium mb-1">Grams</span>
              </div>
              <input 
                type="range" min="10" max="1000" step="10" value={editItemData.grams}
                onChange={(e) => setEditItemData({...editItemData, grams: e.target.value})}
                className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>
            <div className="p-4 bg-gray-950 flex gap-3">
              <button onClick={() => setShowEditGramModal(false)} className="flex-1 py-3 text-gray-400 bg-gray-800 rounded-xl">Hủy</button>
              <button onClick={handleUpdateGrams} className="flex-1 py-3 text-white bg-emerald-600 rounded-xl flex justify-center items-center">
                {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Lưu lại'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: THÊM BỮA MỚI */}
      {showAddMealModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-gray-900 w-full max-w-sm rounded-2xl border border-gray-800 overflow-hidden">
            <div className="p-5 border-b border-gray-800 flex justify-between items-center">
              <h3 className="font-bold text-white">Thêm bữa ăn</h3>
              <button onClick={() => setShowAddMealModal(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-400 block mb-2">Tên bữa ăn</label>
                <input type="text" value={newMealData.mealType} onChange={(e) => setNewMealData({...newMealData, mealType: e.target.value})} className="w-full p-3 bg-gray-950 border border-gray-700 rounded-xl text-white outline-none" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-400 block mb-2">Giờ ăn dự kiến</label>
                <input type="time" value={newMealData.scheduledTime} onChange={(e) => setNewMealData({...newMealData, scheduledTime: e.target.value})} className="w-full p-3 bg-gray-950 border border-gray-700 rounded-xl text-white outline-none" />
              </div>
            </div>
            <div className="p-4 bg-gray-950 flex gap-3">
              <button onClick={() => setShowAddMealModal(false)} className="flex-1 py-3 bg-gray-800 text-gray-400 rounded-xl">Hủy</button>
              <button onClick={handleAddMeal} className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl flex justify-center items-center">
                {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Tạo bữa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2.5: SỬA TÊN & GIỜ BỮA ĂN */}
      {showEditMealModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-gray-900 w-full max-w-sm rounded-2xl border border-gray-800 overflow-hidden">
            <div className="p-5 border-b border-gray-800 flex justify-between items-center">
              <h3 className="font-bold text-white">Sửa bữa ăn</h3>
              <button onClick={() => setShowEditMealModal(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-400 block mb-2">Tên bữa ăn</label>
                <input
                  type="text"
                  value={editMealData.mealType}
                  onChange={(e) => setEditMealData({ ...editMealData, mealType: e.target.value })}
                  className="w-full p-3 bg-gray-950 border border-gray-700 rounded-xl text-white outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-400 block mb-2">Giờ ăn dự kiến</label>
                <input
                  type="time"
                  value={editMealData.scheduledTime}
                  onChange={(e) => setEditMealData({ ...editMealData, scheduledTime: e.target.value })}
                  className="w-full p-3 bg-gray-950 border border-gray-700 rounded-xl text-white outline-none"
                />
              </div>
            </div>
            <div className="p-4 bg-gray-950 flex gap-3">
              <button onClick={() => setShowEditMealModal(false)} className="flex-1 py-3 bg-gray-800 text-gray-400 rounded-xl">Hủy</button>
              <button onClick={handleUpdateMeal} className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl flex justify-center items-center">
                {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Lưu lại'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: TÌM & THÊM MÓN ĂN */}
      {showAddFoodModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-gray-900 w-full max-w-md rounded-2xl border border-gray-800 shadow-2xl overflow-hidden h-[80vh] flex flex-col">
            <div className="p-5 border-b border-gray-800 flex justify-between items-center bg-gray-800/50">
              <h3 className="font-bold text-white">Thêm món ăn vào bữa</h3>
              <button onClick={() => setShowAddFoodModal(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 border-b border-gray-800 bg-gray-900">
              <div className="relative">
                <Search className="w-5 h-5 text-gray-500 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input 
                  type="text" placeholder="Gõ tên món ăn để tìm..." value={searchFoodQuery}
                  onChange={(e) => setSearchFoodQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-950 border border-gray-700 rounded-xl text-white focus:border-emerald-500 outline-none" 
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 custom-scrollbar space-y-2">
              {isLoadingFoods ? (
                <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-emerald-500"/></div>
              ) : filteredFoods.length > 0 ? (
                filteredFoods.map((food, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => setSelectedFoodDetail(food)}
                    className="flex justify-between items-center bg-gray-950 p-3 rounded-xl border border-gray-800 hover:border-emerald-500/50 transition-colors group cursor-pointer" 
                  >
                    <div className="flex items-center gap-3">
                      {food.imageUrl ? (
                        <img src={food.imageUrl} alt={food.name} className="w-12 h-12 rounded-lg object-cover border border-gray-800" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-gray-800 flex items-center justify-center border border-gray-700">
                          <Utensils className="w-6 h-6 text-gray-500"/>
                        </div>
                      )}
                      <div>
                        <h4 className="font-medium text-gray-200 group-hover:text-emerald-400 transition-colors">{food.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-semibold text-emerald-400">{Math.round(food.calories)} kcal <span className="text-[10px] text-gray-500 font-normal">/ {food.baseUnit}</span></span>
                          <span className="text-[10px] text-gray-500">(P:{Math.round(food.protein)} C:{Math.round(food.carbs)} F:{Math.round(food.fat)})</span>
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={(e) => { e.stopPropagation(); handleAddFoodToMeal(food._id); }}
                      className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      + Thêm
                    </button>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-gray-500">
                  <Utensils className="w-10 h-10 mb-2 opacity-20" />
                  <p className="text-sm">Không tìm thấy món ăn.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: XEM CHI TIẾT MÓN ĂN VÀ ẢNH */}
      {selectedFoodDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
          <div className="bg-gray-900 w-full max-w-sm rounded-3xl border border-gray-800 shadow-2xl overflow-hidden relative">
            
            <button 
              onClick={() => setSelectedFoodDetail(null)}
              className="absolute top-3 right-3 p-2 bg-black/50 text-white rounded-full hover:bg-black/80 z-10 transition-colors"
            >
              <X className="w-5 h-5"/>
            </button>
            
            {selectedFoodDetail.imageUrl ? (
              <img src={selectedFoodDetail.imageUrl} alt={selectedFoodDetail.name} className="w-full h-48 object-cover" />
            ) : (
              <div className="w-full h-48 bg-gray-800 flex items-center justify-center border-b border-gray-800">
                <Utensils className="w-12 h-12 text-gray-600" />
              </div>
            )}
            
            <div className="p-6">
              <h3 className="text-xl font-black text-white mb-1">{selectedFoodDetail.name}</h3>
              <p className="text-emerald-400 font-bold mb-6 flex items-center gap-1.5">
                <Flame className="w-4 h-4" /> 
                {Math.round(selectedFoodDetail.calories)} kcal 
                <span className="text-gray-500 font-normal text-sm">/ {selectedFoodDetail.baseUnit || "100g"}</span>
              </p>
              
              <div className="grid grid-cols-3 gap-3 text-center mb-6">
                <div className="bg-gray-950 p-3 rounded-2xl border border-gray-800">
                  <span className="block text-xs text-gray-500 mb-1 flex justify-center"><Beef className="w-3 h-3 text-blue-400"/></span>
                  <span className="font-bold text-blue-400">{Math.round(selectedFoodDetail.protein)}g</span>
                </div>
                <div className="bg-gray-950 p-3 rounded-2xl border border-gray-800">
                  <span className="block text-xs text-gray-500 mb-1 flex justify-center"><Wheat className="w-3 h-3 text-yellow-400"/></span>
                  <span className="font-bold text-yellow-400">{Math.round(selectedFoodDetail.carbs)}g</span>
                </div>
                <div className="bg-gray-950 p-3 rounded-2xl border border-gray-800">
                  <span className="block text-xs text-gray-500 mb-1 flex justify-center"><Droplet className="w-3 h-3 text-red-400"/></span>
                  <span className="font-bold text-red-400">{Math.round(selectedFoodDetail.fat)}g</span>
                </div>
              </div>

              {selectedFoodDetail._id ? (
                <button 
                  onClick={() => {
                    handleAddFoodToMeal(selectedFoodDetail._id);
                    setSelectedFoodDetail(null);
                  }}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex justify-center items-center gap-2"
                >
                  {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Plus className="w-5 h-5" /> Thêm vào bữa ăn</>}
                </button>
              ) : (
                <button 
                  onClick={() => setSelectedFoodDetail(null)}
                  className="w-full py-3.5 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl"
                >
                  Đóng
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: KHO LƯU TRỮ (LIBRARY) THÊM MỚI */}
      {showLibraryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowLibraryModal(false)}>
          <div className="bg-gray-900 border border-gray-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-800/50">
              <h3 className="font-bold text-lg text-white flex items-center gap-2"><Library className="w-5 h-5 text-orange-400"/> Kho Thực Đơn</h3>
              <button onClick={() => setShowLibraryModal(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5"/></button>
            </div>
            <div className="p-4 overflow-y-auto custom-scrollbar flex-1 space-y-3">
              {isLibraryLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-orange-500"/></div>
              ) : libraryItems.length > 0 ? (
                libraryItems.map(item => (
                  <div key={item._id} className="bg-gray-800 border border-gray-700 p-4 rounded-xl flex justify-between items-center hover:border-orange-500/50 transition-colors">
                    <div className="min-w-0 pr-2">
                      <p className="font-bold text-gray-200 truncate">{item.title || item.dietData?.title || "Thực đơn lưu trữ"}</p>
                      <p className="text-xs text-gray-400 mt-1">{new Date(item.createdAt).toLocaleDateString('vi-VN')}</p>
                    </div>
                    <button onClick={() => handleApplyFromLibrary(item._id)} className="px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white text-sm font-bold rounded-lg transition-colors shrink-0">
                      Áp dụng
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500 py-8">Kho lưu trữ của bạn đang trống.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 🌟 MODAL 6: ĐÁNH GIÁ THỰC ĐƠN BẰNG AI */}
      {showEvaluation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-gray-900 w-full max-w-3xl rounded-3xl border border-gray-800 shadow-2xl overflow-hidden h-[85vh] flex flex-col relative">
            
            <button 
              onClick={() => setShowEvaluation(false)}
              className="absolute top-4 right-4 z-[60] p-2 bg-gray-800 text-gray-400 rounded-full hover:text-white hover:bg-gray-700 transition-colors hidden md:block"
            >
              <X className="w-5 h-5"/>
            </button>
            
            <div className="overflow-y-auto h-full custom-scrollbar">
              <MasterMealEvaluation 
                planData={generatedPlan} 
                targetMacros={userData?.targetMacros} 
                onClose={() => setShowEvaluation(false)} 
              />
            </div>
          </div>
        </div>
      )}

      {/* 🌟 MODAL 7: YÊU CẦU PREMIUM / VÉ AI */}
      <PremiumRequireModal 
        isOpen={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
        onWatchAd={handleWatchAd}
        onUpgrade={() => {
          setShowPremiumModal(false);
          navigate('/premium'); 
        }}
        isLoadingAd={isLoadingAd}
      />
    </div>
  );
}