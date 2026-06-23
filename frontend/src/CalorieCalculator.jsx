import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Search, Loader2, Plus, Trash2, Info, ChevronRight, Calculator, Clock } from 'lucide-react';

const API_BASE_URL = 'https://ai-fitness-w6fd.onrender.com';

const CalorieCalculator = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchResult, setSearchResult] = useState(null);
  const [mealItems, setMealItems] = useState([]);
  const [errorText, setErrorText] = useState('');

  // --- STATE CHO GỢI Ý (AUTOCOMPLETE) ---
  const [suggestions, setSuggestions] = useState([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const dropdownRef = useRef(null);

  // 1. Tự động gọi API gợi ý khi gõ (Debounce 500ms)
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

  // 2. Click ra ngoài để đóng dropdown gợi ý
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 3. Xử lý khi click chọn một mục gợi ý
  const handleSelectSuggestion = (foodName) => {
    setSearchQuery(foodName);
    setShowSuggestions(false);
    handleSearch(foodName); 
  };

  // 4. Hàm tìm kiếm chính (Quét DB, nếu không thấy mới kích hoạt AI)
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
        setErrorText('Lỗi kết nối máy chủ. Vui lòng kiểm tra lại mạng hoặc đợi server khởi động lại.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 5. Thêm món ăn hiện tại vào bảng tính toán khối lượng
  const addToCalculator = () => {
    if (!searchResult) return;
    const newItem = { ...searchResult, id: Date.now(), quantityInGrams: 100 };
    setMealItems(prev => [...prev, newItem]);
    setSearchResult(null);
    setSearchQuery('');
  };

  // 6. Xóa món ăn khỏi danh sách tính toán
  const removeItem = (idToRemove) => {
    setMealItems(prev => prev.filter(item => item.id !== idToRemove));
  };

  // 7. Cập nhật số gram tiêu thụ thực tế
  const updateGrams = (id, newGrams) => {
    setMealItems(prev => prev.map(item => 
      item.id === id ? { ...item, quantityInGrams: Number(newGrams) || 0 } : item
    ));
  };

  // 8. Tính tổng giá trị dinh dưỡng của bữa ăn dựa trên gram tương ứng
  const totals = mealItems.reduce((acc, item) => {
    const ratio = item.quantityInGrams / 100;
    return {
      calories: acc.calories + (item.caloriesPer100g * ratio),
      protein: acc.protein + (item.proteinPer100g * ratio),
      carbs: acc.carbs + (item.carbsPer100g * ratio),
      fat: acc.fat + (item.fatPer100g * ratio),
    };
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

  return (
    <div className="min-h-screen bg-gray-950 p-4 md:p-8 flex justify-center selection:bg-emerald-500/30 selection:text-emerald-200">
      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        
        {/* ========================================== */}
        {/* PHẦN TRÁI: TÌM KIẾM MÓN ĂN & GỢI Ý */}
        {/* ========================================== */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl relative backdrop-blur-md">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500">
              <Search className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Tìm & Phân Tích Món Ăn</h2>
              <p className="text-sm text-gray-400">Ưu tiên cơ sở dữ liệu & Phân tích thông minh bằng AI</p>
            </div>
          </div>

          {/* Hộp tìm kiếm kết hợp gợi ý thả xuống */}
          <div className="relative mb-6" ref={dropdownRef}>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                  placeholder="VD: Phở bò, 1 bát cơm trắng..." 
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-gray-500 text-base"
                />
                {isSuggesting && (
                  <div className="absolute right-3 top-3.5">
                    <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
                  </div>
                )}
              </div>
              <button 
                onClick={() => handleSearch()}
                disabled={isLoading}
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[100px] shadow-lg shadow-emerald-500/10 active:scale-95"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Tìm'}
              </button>
            </div>

            {/* DROPDOWN GỢI Ý KHÔNG CHẠY QUA AI */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-50 w-full mt-2 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <ul className="max-h-60 overflow-y-auto divide-y divide-gray-700/50">
                  {suggestions.map((item) => (
                    <li 
                      key={item._id || item.name} 
                      onClick={() => handleSelectSuggestion(item.name)}
                      className="px-4 py-3 hover:bg-gray-700/60 cursor-pointer flex items-center justify-between group transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Clock className="w-4 h-4 text-gray-500 group-hover:text-emerald-400 shrink-0 transition-colors" />
                        <span className="text-gray-200 group-hover:text-white font-medium truncate">{item.name}</span>
                      </div>
                      <span className="text-xs text-gray-400 bg-gray-900/60 border border-gray-700 px-2 py-1 rounded-md shrink-0 font-mono">
                        {item.caloriesPer100g} kcal
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Thông báo lỗi kết nối hoặc không tìm thấy */}
          {errorText && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm mb-6 flex items-start gap-2.5 animate-in fade-in duration-200">
              <Info className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="leading-relaxed">{errorText}</p>
            </div>
          )}

          {/* THÔNG TIN CHI TIẾT MÓN ĂN VỪA TÌM THẤY */}
          {searchResult && (
            <div className="bg-gray-850 border border-emerald-500/20 rounded-xl p-5 animate-in fade-in slide-in-from-bottom-4 duration-300 shadow-inner">
              <div className="flex justify-between items-start gap-4 mb-4">
                <div className="min-w-0">
                  <h3 className="font-bold text-lg text-emerald-400 truncate">{searchResult.name}</h3>
                  {searchResult.isAiEstimated ? (
                    <span className="text-[11px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-md mt-1.5 inline-block font-medium">
                      🤖 Dữ liệu ước lượng bởi AI
                    </span>
                  ) : (
                    <span className="text-[11px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-md mt-1.5 inline-block font-medium">
                      ✓ Dữ liệu gốc hệ thống
                    </span>
                  )}
                </div>
                <span className="text-xs font-medium text-gray-400 bg-gray-900 px-2.5 py-1 rounded-lg border border-gray-800 shrink-0">
                  Mẫu: 100g
                </span>
              </div>

              <div className="grid grid-cols-4 gap-3 text-center mb-5">
                <div className="bg-gray-900/50 rounded-xl py-3 border border-gray-800">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1">Calo</div>
                  <div className="font-bold text-lg text-white font-mono">{searchResult.caloriesPer100g}</div>
                </div>
                <div className="bg-gray-900/50 rounded-xl py-3 border border-gray-800">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1">Đạm</div>
                  <div className="font-bold text-lg text-emerald-400 font-mono">{searchResult.proteinPer100g}g</div>
                </div>
                <div className="bg-gray-900/50 rounded-xl py-3 border border-gray-800">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1">Tinh bột</div>
                  <div className="font-bold text-lg text-blue-400 font-mono">{searchResult.carbsPer100g}g</div>
                </div>
                <div className="bg-gray-900/50 rounded-xl py-3 border border-gray-800">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1">Béo</div>
                  <div className="font-bold text-lg text-yellow-400 font-mono">{searchResult.fatPer100g}g</div>
                </div>
              </div>

              <button 
                onClick={addToCalculator}
                className="w-full bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/30 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <Plus className="w-5 h-5" /> Thêm vào danh sách ăn
              </button>
            </div>
          )}
        </div>

        {/* ========================================== */}
        {/* PHẦN PHẢI: BẢNG TÍNH & TỔNG KẾT DINH DƯỠNG */}
        {/* ========================================== */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl flex flex-col h-full min-h-[520px]">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Nhật Ký Khối Lượng</h2>
              <p className="text-sm text-gray-400">Tùy biến trọng lượng thực tế tiêu thụ</p>
            </div>
          </div>

          {/* Danh sách các món ăn đã chọn */}
          <div className="flex-1 overflow-y-auto max-h-[280px] pr-1 space-y-3 mb-6 custom-scrollbar">
            {mealItems.length === 0 ? (
              <div className="h-full min-h-[180px] flex flex-col items-center justify-center text-gray-500 border-2 border-dashed border-gray-800 rounded-xl p-6 text-center">
                <ChevronRight className="w-7 h-7 mb-2 opacity-30 animate-pulse" />
                <p className="text-sm font-medium text-gray-400">Chưa chọn món ăn nào</p>
                <p className="text-xs text-gray-500 mt-1 max-w-[240px]">Gõ tìm kiếm và click thêm món ăn ở bảng bên trái</p>
              </div>
            ) : (
              mealItems.map((item) => (
                <div key={item.id} className="bg-gray-800/60 border border-gray-700/70 rounded-xl p-3.5 flex items-center justify-between gap-4 group hover:border-gray-600 transition-colors animate-in fade-in duration-200">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-gray-200 truncate group-hover:text-white transition-colors">{item.name}</h4>
                    <p className="text-xs font-semibold text-gray-400 mt-1 font-mono">
                      {Math.round(item.caloriesPer100g * (item.quantityInGrams / 100))} kcal
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center bg-gray-900 border border-gray-700 focus-within:border-emerald-500/50 rounded-xl overflow-hidden transition-colors">
                      <input 
                        type="number" 
                        value={item.quantityInGrams || ''}
                        onChange={(e) => updateGrams(item.id, e.target.value)}
                        min="0"
                        placeholder="0"
                        className="w-16 bg-transparent text-white text-center py-2 font-bold font-mono focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <span className="text-gray-500 pr-3 text-xs font-semibold select-none">g</span>
                    </div>
                    <button 
                      onClick={() => removeItem(item.id)}
                      className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all active:scale-90"
                      title="Xóa món ăn"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* KHỐI TỔNG KẾT DINH DƯỠNG TOÀN DIỆN */}
          <div className="bg-gray-950 border border-gray-800/80 rounded-xl p-5 mt-auto shadow-inner">
            <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">Giá trị tổng kết bữa ăn</h3>
            <div className="flex items-baseline justify-between mb-4 border-b border-gray-800 pb-4">
              <span className="text-sm font-medium text-gray-400">Tổng năng lượng</span>
              <div className="text-right">
                <span className="text-3xl font-black text-white font-mono tracking-tight">{Math.round(totals.calories)}</span>
                <span className="text-gray-400 text-xs font-bold ml-1">kcal</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-gray-900/40 rounded-lg py-2 border border-gray-800/60">
                <p className="text-gray-500 font-medium mb-1">Protein</p>
                <p className="font-bold text-emerald-400 font-mono text-sm">{totals.protein.toFixed(1)}g</p>
              </div>
              <div className="bg-gray-900/40 rounded-lg py-2 border border-gray-800/60">
                <p className="text-gray-500 font-medium mb-1">Carbs</p>
                <p className="font-bold text-blue-400 font-mono text-sm">{totals.carbs.toFixed(1)}g</p>
              </div>
              <div className="bg-gray-900/40 rounded-lg py-2 border border-gray-800/60">
                <p className="text-gray-500 font-medium mb-1">Fat</p>
                <p className="font-bold text-yellow-400 font-mono text-sm">{totals.fat.toFixed(1)}g</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default CalorieCalculator;