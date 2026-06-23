import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Search, Loader2, Plus, Trash2, Info, ChevronRight, Calculator, Clock, Save, Activity } from 'lucide-react';

const API_BASE_URL = 'https://ai-fitness-w6fd.onrender.com';

const CalorieCalculator = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchResult, setSearchResult] = useState(null);
  const [mealItems, setMealItems] = useState([]);
  const [errorText, setErrorText] = useState('');

  // --- STATE PHỤC VỤ ĐỒNG BỘ NHẬT KÝ ---
  const [selectedMealType, setSelectedMealType] = useState('Bữa Sáng');
  const [saveMode, setSaveMode] = useState('add'); 
  const [isSavingLog, setIsSavingLog] = useState(false);
  const [saveStatusText, setSaveStatusText] = useState({ type: '', msg: '' });

  // --- STATE CHO GỢI Ý (AUTOCOMPLETE) ---
  const [suggestions, setSuggestions] = useState([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchQuery.trim().length < 2) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      setIsSuggesting(true);
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(`${API_BASE_URL}/api/foods/suggest-food`, {
          params: { query: searchQuery },
          headers: { "Authorization": `Bearer ${token}` }
        });
        
        if (response.data && response.data.data) {
          setSuggestions(response.data.data);
          setShowSuggestions(true);
        }
      } catch (error) {
        console.error("Lỗi khi tải gợi ý:", error);
      } finally {
        setIsSuggesting(false);
      }
    };

    const delayDebounceFn = setTimeout(() => {
      fetchSuggestions();
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectSuggestion = (foodName) => {
    setSearchQuery(foodName);
    setShowSuggestions(false);
    handleSearch(foodName); 
  };

  const handleSearch = async (queryToSearch = searchQuery) => {
    if (!queryToSearch.trim()) return;
    
    setIsLoading(true);
    setErrorText('');
    setSearchResult(null);
    setShowSuggestions(false); 

    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_BASE_URL}/api/ai/search-food`, {
        params: { query: queryToSearch }, 
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      const resData = response.data;
      
      if (resData.data) {
        setSearchResult({
          ...resData.data,
          isAiEstimated: resData.source === 'ai_estimated'
        });
      } else {
        setErrorText(resData.message || 'Không tìm thấy món ăn, vui lòng thử lại tên khác.');
      }
    } catch (error) {
      console.error(error);
      if (error.response) {
        setErrorText(error.response.data.message || 'Không tìm thấy món ăn hoặc có lỗi từ máy chủ.');
      } else {
        setErrorText('Lỗi kết nối máy chủ. Vui lòng kiểm tra lại mạng.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const addToCalculator = () => {
    if (!searchResult) return;
    const newItem = { ...searchResult, id: Date.now(), quantityInGrams: 100 };
    setMealItems(prev => [...prev, newItem]);
    setSearchResult(null);
    setSearchQuery('');
  };

  const removeItem = (idToRemove) => {
    setMealItems(prev => prev.filter(item => item.id !== idToRemove));
  };

  const updateGrams = (id, newGrams) => {
    setMealItems(prev => prev.map(item => 
      item.id === id ? { ...item, quantityInGrams: Number(newGrams) || 0 } : item
    ));
  };

  const totals = mealItems.reduce((acc, item) => {
    const ratio = item.quantityInGrams / 100;
    return {
      calories: acc.calories + (item.caloriesPer100g * ratio),
      protein: acc.protein + (item.proteinPer100g * ratio),
      carbs: acc.carbs + (item.carbsPer100g * ratio),
      fat: acc.fat + (item.fatPer100g * ratio),
    };
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

  const handleSaveToDailyLog = async () => {
    if (mealItems.length === 0) return;

    setIsSavingLog(true);
    setSaveStatusText({ type: '', msg: '' });

    try {
      const token = localStorage.getItem("token");
      
      const formattedItems = mealItems.map(item => ({
        foodId: item._id || null,
        foodName: item.name,
        quantityInGrams: item.quantityInGrams,
        calories: Math.round(item.caloriesPer100g * (item.quantityInGrams / 100)),
        protein: Number((item.proteinPer100g * (item.quantityInGrams / 100)).toFixed(1)),
        carbs: Number((item.carbsPer100g * (item.quantityInGrams / 100)).toFixed(1)),
        fat: Number((item.fatPer100g * (item.quantityInGrams / 100)).toFixed(1))
      }));

      const payload = {
        mealType: selectedMealType,
        mode: saveMode, 
        items: formattedItems,
        mealTotal: {
          calories: Math.round(totals.calories),
          protein: Number(totals.protein.toFixed(1)),
          carbs: Number(totals.carbs.toFixed(1)),
          fat: Number(totals.fat.toFixed(1))
        }
      };

      const response = await axios.post(`${API_BASE_URL}/api/diet/log-meal`, payload, {
        headers: { "Authorization": `Bearer ${token}` }
      });

      setSaveStatusText({ type: 'success', msg: response.data.message || 'Lưu nhật ký thành công!' });
      setMealItems([]); 
    } catch (error) {
      console.error("Lỗi đồng bộ lịch ăn:", error);
      const errMsg = error.response?.data?.message || 'Không thể kết nối lưu nhật ký ăn uống.';
      setSaveStatusText({ type: 'error', msg: errMsg });
    } finally {
      setIsSavingLog(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-200 p-4 md:p-8 flex justify-center selection:bg-emerald-500/30 selection:text-emerald-200">
      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* ========================================== */}
        {/* PHẦN TRÁI: TÌM KIẾM MÓN ĂN & GỢI Ý (Lấy 5 cột) */}
        {/* ========================================== */}
        <div className="lg:col-span-5 bg-gray-900/80 border border-gray-800 rounded-3xl p-6 shadow-2xl relative backdrop-blur-xl">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3.5 bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 rounded-2xl text-emerald-400 shadow-inner border border-emerald-500/20">
              <Search className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">Tìm Món Ăn</h2>
              <p className="text-sm text-gray-500 mt-1">Phân tích dinh dưỡng thông minh bằng AI</p>
            </div>
          </div>

          <div className="relative mb-8" ref={dropdownRef}>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                  placeholder="VD: Phở bò, 1 bát cơm trắng..." 
                  className="w-full bg-gray-950 border border-gray-800 text-white rounded-2xl px-5 py-4 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder:text-gray-600 text-base shadow-inner"
                />
                {isSuggesting && (
                  <div className="absolute right-4 top-4">
                    <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
                  </div>
                )}
              </div>
              <button 
                onClick={() => handleSearch()}
                disabled={isLoading}
                className="bg-emerald-500 hover:bg-emerald-400 text-gray-950 px-6 py-4 rounded-2xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[110px] shadow-lg shadow-emerald-500/20 active:scale-95"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Tra Cứu'}
              </button>
            </div>

            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-50 w-full mt-3 bg-gray-900 border border-gray-700/50 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl">
                <ul className="max-h-64 overflow-y-auto divide-y divide-gray-800/50 custom-scrollbar">
                  {suggestions.map((item) => (
                    <li 
                      key={item._id || item.name} 
                      onClick={() => handleSelectSuggestion(item.name)}
                      className="px-5 py-3.5 hover:bg-gray-800 cursor-pointer flex items-center justify-between group transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Clock className="w-4 h-4 text-gray-600 group-hover:text-emerald-400 shrink-0" />
                        <span className="text-gray-300 group-hover:text-white font-medium truncate">{item.name}</span>
                      </div>
                      <span className="text-xs text-emerald-400/80 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg shrink-0 font-mono">
                        {item.caloriesPer100g} kcal
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {errorText && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm mb-6 flex items-start gap-3">
              <Info className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="leading-relaxed">{errorText}</p>
            </div>
          )}

          {searchResult && (
            <div className="bg-gradient-to-b from-gray-800/50 to-gray-900/50 border border-gray-700/50 rounded-3xl p-6 shadow-inner animate-in slide-in-from-bottom-4 duration-300">
              <div className="flex justify-between items-start gap-4 mb-6">
                <div className="min-w-0">
                  <h3 className="font-bold text-xl text-white truncate">{searchResult.name}</h3>
                  {searchResult.isAiEstimated ? (
                    <span className="text-[11px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-1 rounded-lg mt-2 inline-flex items-center gap-1.5 font-medium">
                      <Activity className="w-3 h-3" /> Dữ liệu ước lượng AI
                    </span>
                  ) : (
                    <span className="text-[11px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-lg mt-2 inline-flex items-center gap-1.5 font-medium">
                      ✓ Dữ liệu gốc hệ thống
                    </span>
                  )}
                </div>
                <span className="text-xs font-semibold text-gray-400 bg-gray-950 px-3 py-1.5 rounded-xl border border-gray-800 shrink-0">
                  Mẫu 100g
                </span>
              </div>

              <div className="grid grid-cols-4 gap-3 text-center mb-6">
                <div className="bg-gray-950/50 rounded-2xl py-3.5 border border-gray-800/50">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Calo</div>
                  <div className="font-bold text-xl text-white font-mono">{searchResult.caloriesPer100g}</div>
                </div>
                <div className="bg-emerald-950/20 rounded-2xl py-3.5 border border-emerald-900/30">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-1">Đạm</div>
                  <div className="font-bold text-xl text-emerald-400 font-mono">{searchResult.proteinPer100g}<span className="text-sm">g</span></div>
                </div>
                <div className="bg-blue-950/20 rounded-2xl py-3.5 border border-blue-900/30">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-blue-600 mb-1">Carb</div>
                  <div className="font-bold text-xl text-blue-400 font-mono">{searchResult.carbsPer100g}<span className="text-sm">g</span></div>
                </div>
                <div className="bg-yellow-950/20 rounded-2xl py-3.5 border border-yellow-900/30">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-yellow-600 mb-1">Béo</div>
                  <div className="font-bold text-xl text-yellow-400 font-mono">{searchResult.fatPer100g}<span className="text-sm">g</span></div>
                </div>
              </div>

              <button 
                onClick={addToCalculator}
                className="w-full bg-gray-800 hover:bg-gray-700 text-white border border-gray-700 hover:border-gray-600 py-3.5 rounded-2xl font-bold transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" /> Thêm vào khẩu phần ăn
              </button>
            </div>
          )}
        </div>

        {/* ========================================== */}
        {/* PHẦN PHẢI: BẢNG TÍNH & ĐỒNG BỘ LỊCH ĂN (Lấy 7 cột) */}
        {/* ========================================== */}
        <div className="lg:col-span-7 bg-gray-900/80 border border-gray-800 rounded-3xl p-6 shadow-2xl flex flex-col h-full min-h-[600px] backdrop-blur-xl">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="p-3.5 bg-gradient-to-br from-blue-500/20 to-blue-500/5 rounded-2xl text-blue-400 shadow-inner border border-blue-500/20">
                <Calculator className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">Nhật Ký Tính Toán</h2>
                <p className="text-sm text-gray-500 mt-1">Điều chỉnh trọng lượng thực tế</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-1">Tổng năng lượng</div>
              <div className="flex items-baseline justify-end gap-1">
                <span className="text-4xl font-black text-white font-mono tracking-tighter">{Math.round(totals.calories)}</span>
                <span className="text-gray-500 font-medium">kcal</span>
              </div>
            </div>
          </div>

          {/* Danh sách món ăn tính toán */}
          <div className="overflow-y-auto max-h-[300px] pr-2 space-y-3 mb-6 custom-scrollbar flex-1">
            {mealItems.length === 0 ? (
              <div className="h-full min-h-[200px] flex flex-col items-center justify-center text-gray-500 border-2 border-dashed border-gray-800 rounded-3xl p-8 text-center bg-gray-950/30">
                <div className="p-4 bg-gray-900 rounded-full mb-4 opacity-50">
                  <ChevronRight className="w-8 h-8 animate-pulse text-gray-600" />
                </div>
                <p className="text-base font-medium text-gray-400">Khẩu phần ăn đang trống</p>
                <p className="text-sm text-gray-600 mt-2">Tìm kiếm và thêm món ăn từ cột bên trái để bắt đầu tính toán.</p>
              </div>
            ) : (
              mealItems.map((item) => {
                // Tính toán Macro cho từng món dựa trên grams
                const ratio = item.quantityInGrams / 100;
                const itemKcal = Math.round(item.caloriesPer100g * ratio);
                const itemP = (item.proteinPer100g * ratio).toFixed(1);
                const itemC = (item.carbsPer100g * ratio).toFixed(1);
                const itemF = (item.fatPer100g * ratio).toFixed(1);

                return (
                  <div key={item.id} className="bg-gray-950/50 border border-gray-800/80 rounded-2xl p-4 flex items-center justify-between gap-4 group hover:border-gray-700 transition-colors">
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-gray-200 truncate group-hover:text-white text-lg">{item.name}</h4>
                        <span className="text-sm font-bold text-gray-300 font-mono bg-gray-900 px-2.5 py-1 rounded-lg border border-gray-800">
                          {itemKcal} <span className="text-[10px] text-gray-500">kcal</span>
                        </span>
                      </div>
                      
                      {/* HIỂN THỊ MACRO CỦA TỪNG MÓN Ở ĐÂY */}
                      <div className="flex gap-2">
                        <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-md">
                          <span className="text-[10px] text-emerald-600 font-bold">P</span>
                          <span className="text-xs text-emerald-400 font-mono font-medium">{itemP}g</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 px-2 py-1 rounded-md">
                          <span className="text-[10px] text-blue-600 font-bold">C</span>
                          <span className="text-xs text-blue-400 font-mono font-medium">{itemC}g</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/20 px-2 py-1 rounded-md">
                          <span className="text-[10px] text-yellow-600 font-bold">F</span>
                          <span className="text-xs text-yellow-400 font-mono font-medium">{itemF}g</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center bg-gray-900 border border-gray-700 rounded-xl overflow-hidden focus-within:border-emerald-500/50 transition-colors">
                        <input 
                          type="number" 
                          value={item.quantityInGrams || ''}
                          onChange={(e) => updateGrams(item.id, e.target.value)}
                          min="0"
                          className="w-16 sm:w-20 bg-transparent text-white text-center py-2.5 font-bold font-mono focus:outline-none"
                        />
                        <span className="text-gray-500 pr-3 text-sm font-semibold select-none">g</span>
                      </div>
                      <button 
                        onClick={() => removeItem(item.id)}
                        className="p-2.5 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                        title="Xóa món"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* KHỐI TỔNG KẾT DINH DƯỠNG (Đẹp hơn) */}
          <div className="bg-gray-950 border border-gray-800 rounded-2xl p-5 shadow-inner mb-6 flex-shrink-0">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 text-center">Tổng Macro Của Bữa Ăn</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Protein</p>
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl py-2">
                  <p className="font-bold text-lg text-emerald-400 font-mono">{totals.protein.toFixed(1)}<span className="text-xs ml-0.5 text-emerald-600/80">g</span></p>
                </div>
              </div>
              <div>
                <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Carbs</p>
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl py-2">
                  <p className="font-bold text-lg text-blue-400 font-mono">{totals.carbs.toFixed(1)}<span className="text-xs ml-0.5 text-blue-600/80">g</span></p>
                </div>
              </div>
              <div>
                <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Fat</p>
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl py-2">
                  <p className="font-bold text-lg text-yellow-400 font-mono">{totals.fat.toFixed(1)}<span className="text-xs ml-0.5 text-yellow-600/80">g</span></p>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================== */}
          {/* KHỐI ĐỒNG BỘ: THÊM HOẶC THAY THẾ VÀO LỊCH ĂN */}
          {/* ========================================== */}
          <div className="bg-gray-800/40 border border-gray-700/50 rounded-2xl p-5 mt-auto flex-shrink-0">
            <div className="flex flex-col sm:flex-row items-end gap-4">
              <div className="flex-1 w-full space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Bữa ăn</label>
                    <select 
                      value={selectedMealType} 
                      onChange={(e) => setSelectedMealType(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 text-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="Bữa Sáng">Bữa Sáng</option>
                      <option value="Bữa Trưa">Bữa Trưa</option>
                      <option value="Bữa Tối">Bữa Tối</option>
                      <option value="Bữa Phụ">Bữa Phụ</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Hành động</label>
                    <select 
                      value={saveMode} 
                      onChange={(e) => setSaveMode(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 text-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="add"> Thêm vào bữa</option>
                      <option value="replace"> Ghi đè bữa này</option>
                    </select>
                  </div>
                </div>
              </div>

              <button
                onClick={handleSaveToDailyLog}
                disabled={isSavingLog || mealItems.length === 0}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 text-white px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 h-[42px] mb-[2px]"
              >
                {isSavingLog ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Lưu Nhật Ký
              </button>
            </div>

            {saveStatusText.msg && (
              <div className={`mt-4 p-3 rounded-xl border text-center text-sm font-medium animate-in fade-in ${
                saveStatusText.type === 'success' 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                  : 'bg-red-500/10 border-red-500/30 text-red-400'
              }`}>
                {saveStatusText.msg}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default CalorieCalculator;