import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom'; 
import { 
  Bot, Sparkles, Utensils, Target, Flame, Beef, 
  Wheat, Droplet, Clock, AlertTriangle, CheckCircle, Loader2, MessageSquareText,
  Plus, Trash2, Edit2, X, Search, BrainCircuit 
} from 'lucide-react';

import MasterMealEvaluation from './MasterMealEvaluation';
import PremiumRequireModal from './PremiumRequireModal'; 

export default function MealPlanManager() {
  const navigate = useNavigate(); 
  const API_BASE_URL = 'https://ai-fitness-w6fd.onrender.com';

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
  const [showAddFoodModal, setShowAddFoodModal] = useState(false);
  const [showAddMealModal, setShowAddMealModal] = useState(false); 

  const [editData, setEditData] = useState({ mealId: '', itemId: '', foodName: '', quantity: 100 });
  
  const [targetMealId, setTargetMealId] = useState('');
  const [foodDatabase, setFoodDatabase] = useState([]);
  const [searchFoodQuery, setSearchFoodQuery] = useState('');
  const [isLoadingFoods, setIsLoadingFoods] = useState(false);

  const [newMealData, setNewMealData] = useState({ mealType: '', scheduledTime: '12:00' });

  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [isLoadingAd, setIsLoadingAd] = useState(false);

  const getHeaders = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

  useEffect(() => {
    fetchUserData();
    fetchCurrentPlan(); 
  }, []);

  const fetchUserData = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/users/me`, getHeaders());
      setUserData(res.data.data || res.data);
    } catch (err) { console.error("Lỗi tải User:", err); }
  };

  const fetchCurrentPlan = async () => {
    setIsLoadingPlan(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/meals/my-plan`, getHeaders());
      if (res.data && res.data.hasPlan) {
        setGeneratedPlan(res.data.masterMealPlan);
      } else {
        setGeneratedPlan(null);
      }
    } catch (err) {
      setGeneratedPlan(null);
    } finally {
      setIsLoadingPlan(false);
    }
  };

  const fetchFoods = async () => {
    setIsLoadingFoods(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/foods`, getHeaders());
      const foodArray = res.data.data || res.data.foods || res.data || [];
      setFoodDatabase(Array.isArray(foodArray) ? foodArray : []);
    } catch (error) {
      console.error("Lỗi tải thư viện món ăn", error);
    } finally {
      setIsLoadingFoods(false);
    }
  };

  const checkAiAccess = () => {
    if (!userData) return false;
    if (userData.isPremium) return true; 
    if (userData.aiTickets > 0) return true; 
    return false; 
  };

  const handleGeneratePlan = async () => {
    if (!checkAiAccess()) {
      setShowPremiumModal(true);
      return;
    }

    setIsGenerating(true);
    setError(null);
    setSuccessMsg("");

    try {
      const payload = { mealsPerDay: Number(mealsPerDay), notes: customRequest };
      await axios.post(`${API_BASE_URL}/api/ai/generate-meal-plan`, payload, getHeaders());
      
      fetchCurrentPlan();
      setSuccessMsg("AI đã lên thực đơn thành công!");
      fetchUserData(); 
    } catch (err) {
      setError(err.response?.data?.message || "Lỗi khi AI tạo thực đơn. Vui lòng thử lại!");
    } finally {
      setIsGenerating(false);
    }
  };

  // ==========================================
  // TÍNH NĂNG: TẠO LỊCH ĂN THỦ CÔNG
  // ==========================================
  const handleCreateManualPlan = async () => {
    setIsProcessing(true);
    setError(null);
    setSuccessMsg("");
    try {
      const payload = { mealsPerDay: Number(mealsPerDay) };
      const res = await axios.post(`${API_BASE_URL}/api/meals/init-manual`, payload, getHeaders());
      setGeneratedPlan(res.data.masterMealPlan);
      setSuccessMsg("Đã khởi tạo lịch ăn thủ công thành công!");
    } catch (err) {
      setError("Lỗi khởi tạo lịch thủ công. Vui lòng thử lại.");
    } finally {
      setIsProcessing(false);
    }
  };

  // ==========================================
  // TÍNH NĂNG MỚI: XÓA TOÀN BỘ LỊCH ĂN
  // ==========================================
  const handleDeleteEntirePlan = async () => {
    if (!window.confirm("Bạn có chắc muốn xóa TOÀN BỘ lịch ăn không? Hành động này không thể hoàn tác.")) return;
    
    setIsProcessing(true);
    try {
      await axios.delete(`${API_BASE_URL}/api/meals/my-plan`, getHeaders());
      setGeneratedPlan(null);
      setSuccessMsg("Đã xóa toàn bộ lịch ăn.");
    } catch (err) {
      setError("Lỗi khi xóa lịch ăn.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddNewMeal = async () => {
    if (!newMealData.mealType) { alert("Vui lòng nhập tên bữa ăn!"); return; }
    setIsProcessing(true);
    try {
      await axios.post(`${API_BASE_URL}/api/meals/add-meal`, newMealData, getHeaders());
      await fetchCurrentPlan();
      setShowAddMealModal(false);
      setNewMealData({ mealType: '', scheduledTime: '12:00' });
      setSuccessMsg("Đã thêm bữa ăn mới!");
    } catch (error) { alert("Lỗi thêm bữa ăn!"); } finally { setIsProcessing(false); }
  };

  const handleDeleteMeal = async (mealId) => {
    if (!window.confirm("Bạn có chắc muốn xóa toàn bộ bữa ăn này?")) return;
    setIsProcessing(true);
    try {
      await axios.delete(`${API_BASE_URL}/api/meals/meal/${mealId}`, getHeaders());
      await fetchCurrentPlan();
    } catch (error) { alert("Lỗi xóa bữa ăn!"); } finally { setIsProcessing(false); }
  };

  const handleAddFoodToMeal = async (foodId) => {
    try {
      const payload = { mealId: targetMealId, foodId: foodId, quantityInGrams: 100 };
      await axios.post(`${API_BASE_URL}/api/meals/add-food`, payload, getHeaders());
      fetchCurrentPlan();
      setShowAddFoodModal(false);
      setSuccessMsg("Đã thêm món ăn!");
    } catch (error) {
      alert("Không thể thêm món: " + (error.response?.data?.message || "Lỗi server"));
    }
  };

  const handleUpdateFoodQuantity = async () => {
    setIsProcessing(true);
    try {
      const payload = { mealId: editData.mealId, itemId: editData.itemId, newQuantity: Number(editData.quantity) };
      await axios.patch(`${API_BASE_URL}/api/meals/update-food`, payload, getHeaders());
      await fetchCurrentPlan();
      setShowEditGramModal(false);
    } catch (error) { alert("Lỗi cập nhật định lượng!"); } finally { setIsProcessing(false); }
  };

  const handleRemoveFoodFromMeal = async (mealId, itemId) => {
    if (!window.confirm("Xóa món này khỏi bữa ăn?")) return;
    setIsProcessing(true);
    try {
      await axios.delete(`${API_BASE_URL}/api/meals/meal/${mealId}/food/${itemId}`, getHeaders());
      await fetchCurrentPlan();
    } catch (error) { alert("Lỗi xóa món ăn!"); } finally { setIsProcessing(false); }
  };

  const handleWatchAd = async () => {
    setIsLoadingAd(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/api/transactions/virtual-ad`, {}, getHeaders());
      alert(res.data.message);
      fetchUserData();
      setShowPremiumModal(false); 
    } catch (error) {
      alert("Lỗi khi xem quảng cáo!");
    } finally {
      setIsLoadingAd(false);
    }
  };

  const filteredFoods = foodDatabase.filter(f => 
    f.name?.toLowerCase().includes(searchFoodQuery.toLowerCase())
  );

  return (
    <div className="bg-gray-950 min-h-screen !w-full !max-w-none text-gray-200 font-sans selection:bg-blue-500/30 overflow-x-hidden">
      
      {/* HEADER TỔNG */}
      <header className="bg-gray-900/80 backdrop-blur-xl border-b border-gray-800 p-3 sm:p-4 sticky top-0 z-40 w-full shadow-lg">
        <div className="w-full px-2 sm:px-4 md:px-6 lg:px-8 flex flex-row items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg md:text-2xl font-black text-white tracking-tight flex items-center gap-1.5 md:gap-2 truncate">
              <Utensils className="w-6 h-6 md:w-8 md:h-8 text-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.5)] shrink-0" /> 
              Thực Đơn Dinh Dưỡng
            </h1>
          </div>
          
          <div className="flex items-center gap-2 md:gap-4 shrink-0">
            {userData && (
              <div className="flex items-center gap-1.5 md:gap-3 bg-gray-950/50 border border-gray-800 px-3 py-1.5 md:px-4 md:py-2 rounded-xl shadow-inner shrink-0">
                <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
                <span className="text-[10px] md:text-sm font-semibold">
                  {userData.isPremium ? (
                    <span className="text-yellow-400">Premium</span>
                  ) : (
                    <span>Vé AI: <strong className="text-white bg-gray-800 px-1.5 py-0.5 rounded-lg ml-1">{userData.aiTickets}</strong></span>
                  )}
                </span>
              </div>
            )}

            {/* NÚT XÓA TOÀN BỘ LỊCH ĂN */}
            {generatedPlan && (
              <button onClick={handleDeleteEntirePlan} className="p-1.5 md:p-2.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-colors border border-red-500/20" title="Xóa toàn bộ lịch ăn">
                <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* THÔNG BÁO LỖI / THÀNH CÔNG */}
      <div className="w-full px-3 sm:px-4 md:px-6 xl:px-8 mt-4 md:mt-6">
        {error && (
          <div className="p-3 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl mb-4 flex gap-2">
            <AlertTriangle className="w-5 h-5 shrink-0"/> <span className="text-sm">{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="p-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl mb-4 flex gap-2">
            <CheckCircle className="w-5 h-5 shrink-0"/> <span className="text-sm">{successMsg}</span>
          </div>
        )}
      </div>

      <div className="w-full px-3 sm:px-4 md:px-6 xl:px-8 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 xl:gap-8 w-full">
          
          {/* CỘT TRÁI: ĐIỀU KHIỂN AI */}
          <div className="lg:col-span-4 xl:col-span-3 space-y-4 md:space-y-6 lg:sticky lg:top-24 self-start w-full">
            
            {/* Box 1: Mục tiêu Macros */}
            <div className="bg-gradient-to-b from-gray-900 to-gray-950 p-4 rounded-3xl border border-gray-800 shadow-xl w-full">
              <h2 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Target className="w-4 h-4 text-orange-500" /> Mục tiêu dinh dưỡng
              </h2>
              
              <div className="flex items-center gap-4 mb-5 p-3 bg-gray-950/50 rounded-2xl border border-gray-800 shadow-inner">
                <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                  <Flame className="text-orange-500 w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-0.5">Lượng Calo Cần / Ngày</span>
                  <div className="text-xl font-black text-white leading-none">{userData?.targetMacros?.calories || 0} <span className="text-xs font-bold text-orange-500/50">kcal</span></div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="bg-gray-950/50 p-2 md:p-3 rounded-xl border border-gray-800 text-center shadow-inner">
                  <Beef className="w-4 h-4 text-blue-400 mx-auto mb-1 opacity-80" />
                  <div className="text-[9px] md:text-[10px] text-gray-500 font-bold uppercase">Protein</div>
                  <div className="font-black text-white text-sm">{userData?.targetMacros?.protein || 0}g</div>
                </div>
                <div className="bg-gray-950/50 p-2 md:p-3 rounded-xl border border-gray-800 text-center shadow-inner">
                  <Wheat className="w-4 h-4 text-emerald-400 mx-auto mb-1 opacity-80" />
                  <div className="text-[9px] md:text-[10px] text-gray-500 font-bold uppercase">Carbs</div>
                  <div className="font-black text-white text-sm">{userData?.targetMacros?.carbs || 0}g</div>
                </div>
                <div className="bg-gray-950/50 p-2 md:p-3 rounded-xl border border-gray-800 text-center shadow-inner">
                  <Droplet className="w-4 h-4 text-yellow-400 mx-auto mb-1 opacity-80" />
                  <div className="text-[9px] md:text-[10px] text-gray-500 font-bold uppercase">Fat</div>
                  <div className="font-black text-white text-sm">{userData?.targetMacros?.fat || 0}g</div>
                </div>
              </div>
            </div>

            {/* Box 2: PT AI Settings */}
            <div className="bg-gradient-to-b from-gray-900 to-gray-950 p-4 md:p-5 rounded-3xl border border-gray-800 shadow-xl w-full">
              <h2 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <BrainCircuit className="w-4 h-4 text-orange-500" /> Tự động hóa với AI
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
                    <Utensils className="w-4 h-4 text-orange-500"/> Số bữa ăn trong ngày
                  </label>
                  <select 
                    value={mealsPerDay} 
                    onChange={(e) => setMealsPerDay(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-3 md:p-3.5 text-sm md:text-base text-gray-200 outline-none appearance-none cursor-pointer focus:border-orange-500 transition-colors"
                  >
                    <option value={2}>2 bữa (VD: Nhịn ăn gián đoạn)</option>
                    <option value={3}>3 bữa (Sáng - Trưa - Tối)</option>
                    <option value={4}>4 bữa (Thêm 1 bữa phụ)</option>
                    <option value={5}>5 bữa (Chia nhỏ bữa ăn)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
                    <MessageSquareText className="w-4 h-4 text-orange-500"/> Yêu cầu riêng (Dị ứng, sở thích...)
                  </label>
                  <textarea 
                    value={customRequest}
                    onChange={(e) => setCustomRequest(e.target.value)}
                    placeholder="VD: Tôi bị dị ứng đậu phộng, thích ăn ức gà, ngân sách sinh viên rẻ..."
                    className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-3 md:p-4 text-sm text-gray-200 outline-none resize-none focus:border-orange-500 transition-colors placeholder-gray-600"
                    rows="4"
                  />
                </div>
              </div>
              
              <button 
                onClick={handleGeneratePlan}
                disabled={isGenerating}
                className="w-full mt-5 py-3 md:py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white font-black text-base md:text-lg rounded-2xl shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isGenerating ? <><Loader2 className="w-5 h-5 animate-spin" /> Đang thiết kế...</> : <><Sparkles className="w-5 h-5"/> AI TẠO THỰC ĐƠN MỚI</>}
              </button>
            </div>
          </div>

          {/* CỘT PHẢI: HIỂN THỊ THỰC ĐƠN */}
          <div className="lg:col-span-8 xl:col-span-9 w-full">
            <div className="bg-gray-900/50 min-h-[500px] p-3 md:p-6 lg:p-8 rounded-3xl border border-gray-800 shadow-2xl w-full overflow-hidden">
              
              {isLoadingPlan && !isGenerating && (
                <div className="flex flex-col items-center justify-center h-full min-h-[500px] text-gray-400 space-y-3">
                  <Loader2 className="w-10 h-10 animate-spin text-orange-500/50" />
                  <p className="animate-pulse font-medium">Đang tải thực đơn...</p>
                </div>
              )}

              {isGenerating && (
                <div className="flex flex-col items-center justify-center h-full min-h-[500px] text-center space-y-6">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full border-4 border-gray-800 border-t-orange-500 animate-spin"></div>
                    <Bot className="w-8 h-8 text-orange-500 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white mb-2">AI đang tính toán Calo...</h3>
                    <p className="text-sm text-gray-400 max-w-sm mx-auto">Vui lòng chờ khoảng 10-15 giây. AI đang tìm kiếm thực phẩm phù hợp với bạn...</p>
                  </div>
                </div>
              )}

              {/* TRẠNG THÁI CHƯA CÓ LỊCH TRỐNG */}
              {!isLoadingPlan && !isGenerating && !generatedPlan && (
                <div className="flex flex-col items-center justify-center min-h-[500px] text-center border-2 border-dashed border-gray-800 rounded-3xl bg-gray-900/30 px-4">
                  <Utensils className="w-16 h-16 text-gray-600 mb-6" />
                  <h3 className="text-white font-black text-2xl mb-2">Chưa có lộ trình ăn uống</h3>
                  <p className="text-sm text-gray-400 mt-2 max-w-md mx-auto mb-8">Bạn có thể tự tay tạo một lịch ăn trống, hoặc nhờ trợ lý AI thiết kế thực đơn phù hợp nhất với bạn.</p>
                  
                  <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md justify-center">
                    <button 
                      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                      className="px-6 py-4 bg-orange-600 hover:bg-orange-500 text-white rounded-2xl font-bold flex flex-1 items-center justify-center gap-2 transition-all shadow-lg shadow-orange-500/25"
                    >
                      <Sparkles className="w-5 h-5" /> Dùng AI tạo
                    </button>

                    <button 
                      onClick={handleCreateManualPlan}
                      disabled={isProcessing}
                      className="px-6 py-4 bg-gray-800 hover:bg-gray-700 text-white rounded-2xl font-bold flex flex-1 items-center justify-center gap-2 transition-all shadow-lg border border-gray-700"
                    >
                      {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                      Tạo thủ công
                    </button>
                  </div>
                </div>
              )}

              {/* TRẠNG THÁI ĐÃ CÓ THỰC ĐƠN */}
              {!isLoadingPlan && !isGenerating && generatedPlan && (
                <div className={`w-full ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}>
                  
                  <div className="bg-gradient-to-r from-gray-900 to-gray-950 p-4 md:p-6 rounded-3xl border border-orange-900/30 shadow-xl mb-6 md:mb-8 w-full flex justify-between items-center relative overflow-hidden">
                    <div className="absolute -right-6 -top-6 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl pointer-events-none"></div>
                    <div>
                      <h3 className="text-orange-400 font-black flex items-center gap-2 text-lg md:text-xl"><Flame className="w-5 h-5 md:w-6 md:h-6"/> Tổng Nạp Trong Ngày</h3>
                      <p className="text-xs md:text-sm text-gray-400 mt-1 font-medium">Bạn có thể điều chỉnh hoặc thêm món ăn theo ý thích.</p>
                    </div>
                    <div className="text-right z-10">
                      <span className="block text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Calories</span>
                      <span className="text-2xl md:text-4xl font-black text-white">{generatedPlan.dailyTotal?.calories || 0} <span className="text-base md:text-xl font-bold text-orange-500/50">kcal</span></span>
                    </div>
                  </div>

                  {/* Vòng lặp các bữa ăn */}
                  <div className="space-y-6 md:space-y-8 w-full">
                    {generatedPlan.meals?.map((meal, index) => (
                      <div key={index} className="flex gap-3 md:gap-5 group w-full">
                        
                        <div className="flex flex-col items-center shrink-0 w-8 md:w-14">
                          <div className="w-8 h-8 md:w-14 md:h-14 rounded-full border-[3px] md:border-4 border-gray-950 bg-gray-900 text-gray-500 flex items-center justify-center group-hover:text-orange-400 transition-all z-10">
                            <Clock className="w-4 h-4 md:w-5 md:h-5" />
                          </div>
                          {index !== generatedPlan.meals.length - 1 && <div className="w-0.5 bg-gray-800 flex-1 my-1"></div>}
                        </div>
                        
                        <div className="flex-1 w-full pb-6 md:pb-8 min-w-0">
                          <div className="w-full bg-gray-900/80 border border-gray-800 hover:border-gray-700 rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-lg transition-all">
                            
                            <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 border-b border-gray-800/80 pb-4 gap-3">
                              <div>
                                <h4 className="font-black text-lg md:text-xl text-white flex items-center gap-2">
                                  {meal.mealType}
                                </h4>
                                <span className="text-xs md:text-sm font-medium text-orange-500/80 flex items-center gap-1 mt-1">Dự kiến: {meal.scheduledTime}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-base md:text-lg font-black text-white bg-gray-950 px-3 py-1.5 rounded-xl border border-gray-800">
                                  {meal.mealTotal?.calories || 0} <span className="text-xs text-orange-500/50">kcal</span>
                                </span>
                                <button onClick={() => handleDeleteMeal(meal._id)} className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-colors">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                            
                            <div className="space-y-3 w-full">
                              {meal.items && meal.items.length > 0 ? (
                                meal.items.map((item, i) => (
                                  <div key={i} className="flex flex-col lg:flex-row lg:items-center justify-between bg-gray-950/50 p-3 md:p-4 rounded-2xl border border-gray-800/50 hover:border-orange-500/30 transition-all gap-3 w-full">
                                    <div className="flex-1 min-w-0">
                                      <span className="font-bold text-gray-200 text-sm md:text-base block truncate">{item.foodName}</span>
                                      <div className="flex gap-2 mt-2 text-[10px] md:text-xs font-semibold text-gray-500 flex-wrap">
                                        <span className="bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded">Pro: {item.protein}g</span>
                                        <span className="bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded">Carb: {item.carbs}g</span>
                                        <span className="bg-yellow-500/10 text-yellow-400 px-1.5 py-0.5 rounded">Fat: {item.fat}g</span>
                                      </div>
                                    </div>
                                    
                                    <div className="flex items-center justify-between lg:justify-end gap-3 md:gap-5 border-t lg:border-t-0 lg:border-l border-gray-800 pt-3 lg:pt-0 lg:pl-5 w-full lg:w-auto">
                                      <div className="text-center">
                                        <span className="block text-[9px] md:text-[10px] text-gray-500 uppercase mb-0.5">Khối lượng</span>
                                        <span className="text-sm md:text-base font-black text-white">{item.quantityInGrams}g</span>
                                      </div>
                                      <div className="text-center">
                                        <span className="block text-[9px] md:text-[10px] text-gray-500 uppercase mb-0.5">Calo</span>
                                        <span className="text-sm md:text-base font-black text-orange-400">{item.calories}</span>
                                      </div>
                                      <div className="flex gap-1.5 md:gap-2">
                                        <button onClick={() => { setEditData({ mealId: meal._id, itemId: item._id, foodName: item.foodName, quantity: item.quantityInGrams }); setShowEditGramModal(true); }} className="p-2 md:p-2.5 bg-gray-900 text-gray-400 hover:text-blue-400 rounded-lg md:rounded-xl border border-gray-800"><Edit2 className="w-3.5 h-3.5 md:w-4 md:h-4" /></button>
                                        <button onClick={() => handleRemoveFoodFromMeal(meal._id, item._id)} className="p-2 md:p-2.5 bg-gray-900 text-gray-400 hover:text-red-400 rounded-lg md:rounded-xl border border-gray-800"><X className="w-3.5 h-3.5 md:w-4 md:h-4" /></button>
                                      </div>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <p className="text-xs md:text-sm text-gray-500 italic text-center py-4 bg-gray-950/30 rounded-2xl border border-gray-800 border-dashed">Chưa có món ăn. Bấm thêm món nhé!</p>
                              )}

                              <button onClick={() => { setTargetMealId(meal._id); setShowAddFoodModal(true); if (foodDatabase.length === 0) fetchFoods(); }} className="w-full mt-3 py-3 md:py-3.5 border-2 border-dashed border-gray-800 text-gray-400 hover:border-orange-500/50 hover:text-orange-400 hover:bg-orange-500/5 rounded-xl md:rounded-2xl font-bold flex items-center justify-center gap-2 text-xs md:text-sm transition-all">
                                <Plus className="w-4 h-4" /> THÊM MÓN ĂN VÀO BỮA NÀY
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button onClick={() => setShowAddMealModal(true)} className="w-full py-4 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-white rounded-2xl font-bold flex justify-center items-center gap-2 transition-all">
                    <Plus className="w-5 h-5"/> Thêm 1 bữa ăn mới (VD: Bữa xế)
                  </button>
                </div>
              )}
            </div>

            {!isLoadingPlan && generatedPlan && (
              <div className="w-full pb-10 mt-6">
                <button onClick={() => setShowEvaluation(true)} className="w-full py-3.5 md:py-4 bg-gradient-to-r from-orange-600 to-red-500 rounded-2xl text-white font-bold text-sm md:text-base flex justify-center items-center gap-2 shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all">
                  <Sparkles className="w-4 h-4 md:w-5 md:h-5"/> Đánh giá Thực Đơn bằng AI
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* CÁC MODALS (POPUP) */}
      {/* ========================================================= */}

      {/* 1. Modal Thêm Món Ăn (Từ Kho) */}
      {showAddFoodModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 md:p-4 animate-in fade-in">
          <div className="bg-gray-900 w-full max-w-xl rounded-2xl md:rounded-3xl border border-gray-800 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="p-4 md:p-6 border-b border-gray-800 flex justify-between items-center">
              <h3 className="font-black text-white text-base md:text-lg">Thêm Món Ăn</h3>
              <button onClick={() => setShowAddFoodModal(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5 md:w-6 md:h-6"/></button>
            </div>
            <div className="p-3 md:p-4 border-b border-gray-800 bg-gray-950">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4 md:w-5 md:h-5" />
                <input type="text" placeholder="Tìm tên món ăn..." value={searchFoodQuery} onChange={e => setSearchFoodQuery(e.target.value)} className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-9 md:pl-10 pr-3 md:pr-4 py-2.5 md:py-3 text-sm md:text-base text-white focus:border-orange-500 outline-none" />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2 md:p-3 custom-scrollbar space-y-2">
              {isLoadingFoods ? (
                <div className="flex justify-center p-10"><Loader2 className="animate-spin text-orange-500 w-6 h-6 md:w-8 md:h-8"/></div>
              ) : filteredFoods.length > 0 ? (
                filteredFoods.map(f => (
                  <div key={f._id} className="flex justify-between items-center bg-gray-950 p-3 rounded-xl border border-gray-800 hover:border-orange-500/50 transition-colors group gap-2">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-gray-200 text-sm md:text-base truncate">{f.name}</h4>
                      <p className="text-[10px] md:text-xs text-gray-500 mt-1">{f.caloriesPer100g} kcal / 100g</p>
                    </div>
                    <button onClick={() => handleAddFoodToMeal(f._id)} className="text-[10px] md:text-xs font-bold text-orange-500 bg-orange-500/10 px-3 md:px-4 py-2 rounded-lg hover:bg-orange-500/20 transition-colors whitespace-nowrap shrink-0">
                      + Thêm (100g)
                    </button>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center text-gray-500 py-10"><Utensils className="w-8 h-8 md:w-10 md:h-10 mb-3 opacity-20"/><p className="text-sm">Không tìm thấy món ăn.</p></div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. Modal Sửa Số Gram */}
      {showEditGramModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 md:p-4 animate-in fade-in">
          <div className="bg-gray-900 w-full max-w-sm rounded-2xl md:rounded-3xl border border-gray-800 shadow-2xl overflow-hidden">
            <div className="p-4 md:p-5 border-b border-gray-800 flex justify-between items-center">
              <h3 className="font-black text-white text-base md:text-lg">Sửa khối lượng</h3>
              <button onClick={() => setShowEditGramModal(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5"/></button>
            </div>
            <div className="p-4 md:p-5 space-y-4">
              <p className="text-orange-400 text-sm font-bold bg-orange-500/10 p-3 rounded-xl border border-orange-500/20 truncate">{editData.foodName}</p>
              <div>
                <label className="block text-gray-400 text-xs font-bold mb-2 uppercase">Khối lượng ăn (Grams)</label>
                <input type="number" value={editData.quantity} onChange={e => setEditData({...editData, quantity: e.target.value})} className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-white focus:border-orange-500 outline-none" />
              </div>
            </div>
            <div className="p-4 bg-gray-950 border-t border-gray-800 flex gap-3">
              <button onClick={() => setShowEditGramModal(false)} className="flex-1 py-3 bg-gray-800 text-gray-400 rounded-xl hover:text-white font-semibold">Hủy</button>
              <button onClick={handleUpdateFoodQuantity} className="flex-1 py-3 text-white bg-orange-600 rounded-xl hover:bg-orange-500 font-bold flex justify-center items-center">
                {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Lưu lại'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Modal Thêm Bữa Ăn Mới */}
      {showAddMealModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 md:p-4 animate-in fade-in">
          <div className="bg-gray-900 w-full max-w-sm rounded-2xl md:rounded-3xl border border-gray-800 shadow-2xl overflow-hidden">
            <div className="p-4 md:p-5 border-b border-gray-800 flex justify-between items-center">
              <h3 className="font-black text-white text-base md:text-lg">Thêm Bữa Ăn Mới</h3>
              <button onClick={() => setShowAddMealModal(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5"/></button>
            </div>
            <div className="p-4 md:p-5 space-y-4">
              <div>
                <label className="block text-gray-400 text-xs font-bold mb-2 uppercase">Tên Bữa Ăn</label>
                <input type="text" placeholder="VD: Bữa xế chiều, Ăn đêm..." value={newMealData.mealType} onChange={e => setNewMealData({...newMealData, mealType: e.target.value})} className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-white focus:border-orange-500 outline-none" />
              </div>
              <div>
                <label className="block text-gray-400 text-xs font-bold mb-2 uppercase">Giờ dự kiến</label>
                <input type="time" value={newMealData.scheduledTime} onChange={e => setNewMealData({...newMealData, scheduledTime: e.target.value})} className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-white focus:border-orange-500 outline-none cursor-pointer" />
              </div>
            </div>
            <div className="p-4 bg-gray-950 border-t border-gray-800 flex gap-3">
              <button onClick={() => setShowAddMealModal(false)} className="flex-1 py-3 bg-gray-800 text-gray-400 rounded-xl hover:text-white font-semibold">Hủy</button>
              <button onClick={handleAddNewMeal} className="flex-1 py-3 text-white bg-blue-600 rounded-xl hover:bg-blue-500 font-bold flex justify-center items-center">
                {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Tạo bữa ăn'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Modal Đánh giá AI */}
      {showEvaluation && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-3 md:p-4 animate-in fade-in">
          <div className="bg-gray-900 w-full max-w-3xl rounded-2xl md:rounded-3xl border border-gray-800 shadow-2xl overflow-hidden h-[90vh] md:h-[85vh] flex flex-col relative">
            <button onClick={() => setShowEvaluation(false)} className="absolute top-4 right-4 z-[70] p-2 bg-gray-800 text-gray-400 rounded-full hover:text-white hover:bg-gray-700 transition-colors shadow-lg">
              <X className="w-4 h-4 md:w-5 md:h-5"/>
            </button>
            <div className="overflow-y-auto h-full custom-scrollbar">
              <MasterMealEvaluation planData={generatedPlan} targetMacros={userData?.targetMacros} onClose={() => setShowEvaluation(false)} />
            </div>
          </div>
        </div>
      )}

      <PremiumRequireModal 
        isOpen={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
        onWatchAd={handleWatchAd}
        onUpgrade={() => { setShowPremiumModal(false); navigate('/premium'); }}
        isLoadingAd={isLoadingAd}
      />

    </div>
  );
}