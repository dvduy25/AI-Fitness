import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Search, Loader2, Plus, Trash2, Info, ChevronRight, Calculator, Clock, Save } from 'lucide-react';

const API_BASE_URL = 'https://ai-fitness-w6fd.onrender.com';

const CalorieCalculator = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchResult, setSearchResult] = useState(null);
  const [mealItems, setMealItems] = useState([]);
  const [errorText, setErrorText] = useState('');

  // --- STATE PHỤC VỤ ĐỒNG BỘ NHẬT KÝ ---
  const [selectedMealType, setSelectedMealType] = useState('Sáng');
  const [saveMode, setSaveMode] = useState('add'); // 'add' = Cộng dồn, 'replace' = Thay thế hoàn toàn bữa đó
  const [isSavingLog, setIsSavingLog] = useState(false);
  const [saveStatusText, setSaveStatusText] = useState({ type: '', msg: '' });

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

  // 4. Hàm tìm kiếm chính
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

  // 5. Thêm món ăn hiện tại vào danh sách tính toán
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

  // 9. CHỨC NĂNG MỚI: ĐỒNG BỘ LƯU VÀO LỊCH ĂN HÔM NAY (API BACKEND)
  const handleSaveToDailyLog = async () => {
    if (mealItems.length === 0) return;

    setIsSavingLog(true);
    setSaveStatusText({ type: '', msg: '' });

    try {
      const token = localStorage.getItem("token");
      
      // Khớp cấu trúc danh sách items theo đúng format Schema MongoDB của bạn
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
        mode: saveMode, // 'add' hoặc 'replace'
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
      setMealItems([]); // Xóa sạch bảng tính sau khi lưu thành công
    } catch (error) {
      console.error("Lỗi đồng bộ lịch ăn:", error);
      const errMsg = error.response?.data?.message || 'Không thể kết nối lưu nhật ký ăn uống.';
      setSaveStatusText({ type: 'error', msg: errMsg });
    } finally {
      setIsSavingLog(false);
    }
  };

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

            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-50 w-full mt-2 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl overflow-hidden">
                <ul className="max-h-60 overflow-y-auto divide-y divide-gray-700/50">
                  {suggestions.map((item) => (
                    <li 
                      key={item._id || item.name} 
                      onClick={() => handleSelectSuggestion(item.name)}
                      className="px-4 py-3 hover:bg-gray-700/60 cursor-pointer flex items-center justify-between group transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Clock className="w-4 h-4 text-gray-500 group-hover:text-emerald-400 shrink-0 select-none" />
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

          {errorText && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm mb-6 flex items-start gap-2.5">
              <Info className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="leading-relaxed">{errorText}</p>
            </div>
          )}

          {searchResult && (
            <div className="bg-gray-850 border border-emerald-500/20 rounded-xl p-5 shadow-inner">
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
                className="w-full bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/30 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" /> Thêm vào danh sách ăn
              </button>
            </div>
          )}
        </div>

        {/* ========================================== */}
        {/* PHẦN PHẢI: BẢNG TÍNH & ĐỒNG BỘ LỊCH ĂN */}
        {/* ========================================== */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl flex flex-col h-full min-h-[580px]">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Nhật Ký Khối Lượng</h2>
              <p className="text-sm text-gray-400">Tùy biến trọng lượng thực tế tiêu thụ</p>
            </div>
          </div>

          {/* Danh sách món ăn tính toán */}
          <div className="overflow-y-auto max-h-[220px] pr-1 space-y-3 mb-4 custom-scrollbar">
            {mealItems.length === 0 ? (
              <div className="min-h-[140px] flex flex-col items-center justify-center text-gray-500 border-2 border-dashed border-gray-800 rounded-xl p-6 text-center">
                <ChevronRight className="w-7 h-7 mb-2 opacity-30 animate-pulse" />
                <p className="text-sm font-medium text-gray-400">Chưa chọn món ăn nào</p>
                <p className="text-xs text-gray-500 mt-1">Gõ tìm kiếm và click thêm món ăn ở bảng bên trái</p>
              </div>
            ) : (
              mealItems.map((item) => (
                <div key={item.id} className="bg-gray-800/60 border border-gray-700/70 rounded-xl p-3 flex items-center justify-between gap-4 group">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-gray-200 truncate group-hover:text-white">{item.name}</h4>
                    <p className="text-xs font-semibold text-gray-400 mt-1 font-mono">
                      {Math.round(item.caloriesPer100g * (item.quantityInGrams / 100))} kcal
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">
                      <input 
                        type="number" 
                        value={item.quantityInGrams || ''}
                        onChange={(e) => updateGrams(item.id, e.target.value)}
                        min="0"
                        className="w-16 bg-transparent text-white text-center py-2 font-bold font-mono focus:outline-none"
                      />
                      <span className="text-gray-500 pr-3 text-xs font-semibold select-none">g</span>
                    </div>
                    <button 
                      onClick={() => removeItem(item.id)}
                      className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
                      title="Xóa món"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* KHỐI TỔNG KẾT DINH DƯỠNG */}
          <div className="bg-gray-950 border border-gray-800/80 rounded-xl p-4 shadow-inner mb-4">
            <div className="flex items-baseline justify-between mb-3 border-b border-gray-800 pb-3">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tổng năng lượng</span>
              <div className="text-right">
                <span className="text-2xl font-black text-white font-mono tracking-tight">{Math.round(totals.calories)}</span>
                <span className="text-gray-400 text-xs font-bold ml-1">kcal</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-gray-900/40 rounded-lg py-1.5 border border-gray-800/60">
                <p className="text-gray-500 font-medium mb-0.5">Protein</p>
                <p className="font-bold text-emerald-400 font-mono">{totals.protein.toFixed(1)}g</p>
              </div>
              <div className="bg-gray-900/40 rounded-lg py-1.5 border border-gray-800/60">
                <p className="text-gray-500 font-medium mb-0.5">Carbs</p>
                <p className="font-bold text-blue-400 font-mono">{totals.carbs.toFixed(1)}g</p>
              </div>
              <div className="bg-gray-900/40 rounded-lg py-1.5 border border-gray-800/60">
                <p className="text-gray-500 font-medium mb-0.5">Fat</p>
                <p className="font-bold text-yellow-400 font-mono">{totals.fat.toFixed(1)}g</p>
              </div>
            </div>
          </div>

          {/* ========================================== */}
          {/* KHỐI ĐỒNG BỘ: THÊM HOẶC THAY THẾ VÀO LỊCH ĂN */}
          {/* ========================================== */}
          {mealItems.length > 0 && (
            <div className="bg-gray-900/90 border border-blue-500/20 rounded-xl p-4 mt-auto space-y-4 animate-in fade-in duration-300">
              <div className="flex items-center justify-between gap-4">
                {/* 1. Chọn bữa ăn trong ngày */}
                <div className="flex-1">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Áp dụng cho bữa</label>
                  <select 
                    value={selectedMealType} 
                    onChange={(e) => setSelectedMealType(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 text-gray-200 rounded-lg p-2 text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="Sáng">🌅 Bữa Sáng</option>
                    <option value="Trưa">☀️ Bữa Trưa</option>
                    <option value="Tối">🌙 Bữa Tối</option>
                    <option value="Phụ">🍇 Bữa Phụ</option>
                  </select>
                </div>

                {/* 2. Chọn Chế độ: Thêm mới hay Ghi đè */}
                <div className="flex-1">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Hành động</label>
                  <select 
                    value={saveMode} 
                    onChange={(e) => setSaveMode(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 text-gray-200 rounded-lg p-2 text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="add">➕ Cộng dồn vào bữa</option>
                    <option value="replace">🔄 Ghi đè (Thay thế bữa)</option>
                  </select>
                </div>
              </div>

              {/* Nút lưu đồng bộ */}
              <button
                onClick={handleSaveToDailyLog}
                disabled={isSavingLog}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/10 active:scale-95"
              >
                {isSavingLog ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Xác nhận lưu nhật ký ăn hôm nay
              </button>
            </div>
          )}

          {/* Feedback thông báo thành công / thất bại */}
          {saveStatusText.msg && (
            <div className={`mt-3 p-3 rounded-xl border text-center text-xs font-semibold ${
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
  );
};

export default CalorieCalculator;