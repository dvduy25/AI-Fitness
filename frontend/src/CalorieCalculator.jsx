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

  // --- STATE MỚI CHO GỢI Ý ---
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
        // Lưu ý: Nên gọi một API RIÊNG chỉ tìm trong Database để gợi ý (không gọi AI ở bước này)
        // Ví dụ: /api/ai/suggest-food
        const response = await axios.get(`${API_BASE_URL}/api/ai/suggest-food`, {
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

    // Đợi 500ms sau khi người dùng ngừng gõ mới gọi API
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

  // 3. Xử lý khi click vào một gợi ý
  const handleSelectSuggestion = (foodName) => {
    setSearchQuery(foodName);
    setShowSuggestions(false);
    // Tự động kích hoạt hàm tìm kiếm chính
    handleSearch(foodName); 
  };

  // 4. Hàm tìm kiếm chính (Tìm & Phân tích bằng AI nếu cần)
  const handleSearch = async (queryToSearch = searchQuery) => {
    if (!queryToSearch.trim()) return;
    
    setIsLoading(true);
    setErrorText('');
    setSearchResult(null);
    setShowSuggestions(false); // Ẩn gợi ý khi đang search thật

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

  // 5. Thêm món vào bảng
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


  return (
    <div className="min-h-screen bg-gray-950 p-4 md:p-8 flex justify-center">
      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        
        {/* ========================================== */}
        {/* PHẦN TRÁI: TÌM KIẾM MÓN ĂN */}
        {/* ========================================== */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500">
              <Search className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Tìm & Phân Tích Món Ăn</h2>
              <p className="text-sm text-gray-400">Được hỗ trợ bởi AI Fitness</p>
            </div>
          </div>

          {/* Wrapper chứa input và dropdown gợi ý */}
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
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-gray-500"
                />
                {isSuggesting && (
                  <div className="absolute right-3 top-3.5">
                    <Loader2 className="w-5 h-5 text-gray-500 animate-spin" />
                  </div>
                )}
              </div>
              <button 
                onClick={() => handleSearch()}
                disabled={isLoading}
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[100px]"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Tìm'}
              </button>
            </div>

            {/* DROPDOWN GỢI Ý */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-50 w-full mt-2 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                <ul className="max-h-60 overflow-y-auto">
                  {suggestions.map((item) => (
                    <li 
                      key={item._id || item.name} 
                      onClick={() => handleSelectSuggestion(item.name)}
                      className="px-4 py-3 hover:bg-gray-700 cursor-pointer border-b border-gray-700/50 last:border-0 flex items-center justify-between group transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Clock className="w-4 h-4 text-gray-500 group-hover:text-emerald-400 transition-colors" />
                        <span className="text-gray-200 group-hover:text-white font-medium">{item.name}</span>
                      </div>
                      <span className="text-xs text-gray-500 bg-gray-900 px-2 py-1 rounded-md">
                        {item.caloriesPer100g} kcal/100g
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* ... (Phần Error và Hiển thị kết quả search giữ nguyên như cũ) ... */}
          {errorText && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm mb-6 flex items-start gap-2">
              <Info className="w-5 h-5 shrink-0" />
              <p>{errorText}</p>
            </div>
          )}

          {searchResult && (
            <div className="bg-gray-800 border border-emerald-500/30 rounded-xl p-5 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-lg text-emerald-400">{searchResult.name}</h3>
                  {searchResult.isAiEstimated && (
                    <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded-md mt-1 inline-block">
                      Dữ liệu ước lượng bởi AI
                    </span>
                  )}
                </div>
                <span className="text-sm text-gray-400">Mặc định: 100g</span>
              </div>

              <div className="grid grid-cols-4 gap-3 text-center mb-5">
                <div className="bg-gray-900 rounded-lg py-3 px-1 border border-gray-700">
                  <div className="text-xs text-gray-400 mb-1">Calories</div>
                  <div className="font-bold text-white">{searchResult.caloriesPer100g}</div>
                </div>
                <div className="bg-gray-900 rounded-lg py-3 px-1 border border-gray-700">
                  <div className="text-xs text-gray-400 mb-1">Protein</div>
                  <div className="font-bold text-emerald-400">{searchResult.proteinPer100g}g</div>
                </div>
                <div className="bg-gray-900 rounded-lg py-3 px-1 border border-gray-700">
                  <div className="text-xs text-gray-400 mb-1">Carbs</div>
                  <div className="font-bold text-blue-400">{searchResult.carbsPer100g}g</div>
                </div>
                <div className="bg-gray-900 rounded-lg py-3 px-1 border border-gray-700">
                  <div className="text-xs text-gray-400 mb-1">Fat</div>
                  <div className="font-bold text-yellow-400">{searchResult.fatPer100g}g</div>
                </div>
              </div>

              <button 
                onClick={addToCalculator}
                className="w-full bg-emerald-500/20 hover:bg-emerald-500 hover:text-white text-emerald-400 border border-emerald-500 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" /> Thêm vào Bảng tính
              </button>
            </div>
          )}
        </div>

        {/* ========================================== */}
        {/* PHẦN PHẢI: BẢNG TÍNH & TỔNG KẾT (Giữ nguyên) */}
        {/* ========================================== */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl flex flex-col h-full min-h-[500px]">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Bảng Tính Bữa Ăn</h2>
              <p className="text-sm text-gray-400">Điều chỉnh số lượng thực tế</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-3 mb-6">
            {mealItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-500 border-2 border-dashed border-gray-800 rounded-xl p-8">
                <ChevronRight className="w-8 h-8 mb-2 opacity-50" />
                <p>Chưa có món ăn nào được chọn</p>
                <p className="text-sm mt-1">Hãy tìm kiếm và thêm món ăn từ bên trái</p>
              </div>
            ) : (
              mealItems.map((item) => (
                <div key={item.id} className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-200 line-clamp-1">{item.name}</h4>
                    <p className="text-xs text-gray-500 mt-1">
                      {Math.round(item.caloriesPer100g * (item.quantityInGrams / 100))} kcal
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex items-center bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
                      <input 
                        type="number" 
                        value={item.quantityInGrams}
                        onChange={(e) => updateGrams(item.id, e.target.value)}
                        min="0"
                        className="w-16 bg-transparent text-white text-center py-2 focus:outline-none"
                      />
                      <span className="text-gray-400 pr-3 text-sm">g</span>
                    </div>
                    <button 
                      onClick={() => removeItem(item.id)}
                      className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="bg-gray-950 border border-gray-800 rounded-xl p-5 mt-auto">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Tổng Dinh Dưỡng</h3>
            <div className="flex items-end justify-between mb-4 border-b border-gray-800 pb-4">
              <span className="text-gray-300 font-medium">Calories</span>
              <div className="text-right">
                <span className="text-3xl font-black text-white">{Math.round(totals.calories)}</span>
                <span className="text-gray-500 ml-1">kcal</span>
              </div>
            </div>
            <div className="flex justify-between items-center text-sm">
              <div className="text-center">
                <p className="text-gray-500 mb-1">Protein</p>
                <p className="font-bold text-emerald-400">{totals.protein.toFixed(1)}g</p>
              </div>
              <div className="h-8 w-px bg-gray-800"></div>
              <div className="text-center">
                <p className="text-gray-500 mb-1">Carbs</p>
                <p className="font-bold text-blue-400">{totals.carbs.toFixed(1)}g</p>
              </div>
              <div className="h-8 w-px bg-gray-800"></div>
              <div className="text-center">
                <p className="text-gray-500 mb-1">Fat</p>
                <p className="font-bold text-yellow-400">{totals.fat.toFixed(1)}g</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default CalorieCalculator;