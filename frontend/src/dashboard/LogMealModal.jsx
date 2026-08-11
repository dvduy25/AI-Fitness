import React, { useState, useRef, useEffect } from 'react';
import { X, Loader2, Trash2, Search, Sparkles, Utensils, Plus } from 'lucide-react';

export default function LogMealModal({ 
  isOpen, 
  onClose, 
  logForm, 
  setLogForm, 
  submitLogMeal, 
  isLogging,
  availableFoodsList = []
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFoodDropdown, setShowFoodDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowFoodDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isOpen) return null;

  // Chuẩn hóa danh sách món ăn từ Database
  const foodsArray = Array.isArray(availableFoodsList) 
    ? availableFoodsList 
    : (availableFoodsList?.foods || availableFoodsList?.data || []);

  const filteredFoods = foodsArray.filter(food => {
    const foodName = food?.name || food?.foodName || '';
    return foodName.toLowerCase().includes(searchTerm.toLowerCase().trim());
  });

  // Thay đổi khối lượng món ăn (gam)
  const handleQuantityChange = (index, newGrams) => {
    const updatedFoods = [...(logForm.consumedFoods || [])];
    const grams = Math.max(0, parseInt(newGrams) || 0);
    
    updatedFoods[index] = {
      ...updatedFoods[index],
      quantityInGrams: grams
    };

    // Ép logType thành CUSTOM khi có chỉnh sửa
    setLogForm(prev => ({ ...prev, consumedFoods: updatedFoods, logType: 'CUSTOM' }));
  };

  // Xóa 1 món khỏi bữa ăn
  const handleRemoveFood = (index) => {
    const updatedFoods = (logForm.consumedFoods || []).filter((_, i) => i !== index);
    // Ép logType thành CUSTOM khi có chỉnh sửa
    setLogForm(prev => ({ ...prev, consumedFoods: updatedFoods, logType: 'CUSTOM' }));
  };

  // Thêm món mới từ Database vào bữa ăn
  const handleSelectDbFood = (food) => {
    const name = food.name || food.foodName || 'Món ăn';
    const calories = food.caloriesPer100g ?? food.calories ?? 0;
    const protein = food.proteinPer100g ?? food.protein ?? 0;
    const carbs = food.carbsPer100g ?? food.carbs ?? 0;
    const fat = food.fatPer100g ?? food.fat ?? 0;

    const newFoodItem = {
      foodId: food._id || food.id || null,
      foodName: name,
      quantityInGrams: 100, // Mặc định 100g
      calories: calories,
      protein: protein,
      carbs: carbs,
      fat: fat
    };

    // Ép logType thành CUSTOM khi có chỉnh sửa
    setLogForm(prev => ({
      ...prev,
      consumedFoods: [...(prev.consumedFoods || []), newFoodItem],
      logType: 'CUSTOM' 
    }));

    setSearchTerm('');
    setShowFoodDropdown(false);
  };

  const handleClearAllMeals = () => {
    if (window.confirm("Bạn có chắc muốn xóa toàn bộ món ăn trong bữa này?")) {
      // Ép logType thành CUSTOM khi có chỉnh sửa
      setLogForm(prev => ({ ...prev, consumedFoods: [], logType: 'CUSTOM' }));
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-gray-900 w-full max-w-lg rounded-2xl border border-gray-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* HEADER */}
        <div className="flex justify-between items-center p-5 border-b border-gray-800 shrink-0">
          <div className="flex items-center gap-2">
            <Utensils className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-lg text-white">
              {logForm.isOverwrite ? `Chỉnh sửa: ${logForm.mealType}` : `Ghi nhận: ${logForm.mealType}`}
            </h3>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 p-1.5 rounded-full transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* BODY */}
        <div className="p-5 space-y-5 overflow-y-auto custom-scrollbar flex-1">
          
          {/* Danh sách món ăn trong bữa */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Thành phần bữa ăn ({logForm.consumedFoods?.length || 0} món)
              </label>
              {logForm.consumedFoods?.length > 0 && (
                <button 
                  type="button"
                  onClick={handleClearAllMeals}
                  className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Xóa tất cả
                </button>
              )}
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {logForm.consumedFoods && logForm.consumedFoods.length > 0 ? (
                logForm.consumedFoods.map((food, idx) => {
                  const cal = food.calories ? Math.round((food.calories * (food.quantityInGrams || 100)) / 100) : 0;
                  return (
                    <div 
                      key={idx} 
                      className="flex items-center justify-between p-3 bg-gray-950 border border-gray-800 rounded-xl text-sm gap-2"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white truncate">{food.foodName}</p>
                        <p className="text-xs text-gray-500">
                          {cal > 0 ? `~${cal} kcal` : 'Chưa có thông tin calo'}
                        </p>
                      </div>

                      {/* Thay đổi số gam */}
                      <div className="flex items-center gap-1.5 bg-gray-900 border border-gray-700 px-2.5 py-1 rounded-lg">
                        <input 
                          type="number" 
                          min="1"
                          value={food.quantityInGrams || ''} 
                          onChange={(e) => handleQuantityChange(idx, e.target.value)}
                          className="w-14 bg-transparent text-right font-semibold text-emerald-400 text-sm outline-none focus:ring-0"
                        />
                        <span className="text-xs text-gray-400">g</span>
                      </div>

                      {/* Nút xóa món */}
                      <button 
                        type="button"
                        onClick={() => handleRemoveFood(idx)}
                        className="text-gray-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-gray-800 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-6 border border-dashed border-gray-800 rounded-xl text-gray-500 text-xs">
                  Chưa có món ăn nào trong bữa này. Hãy tìm kiếm để thêm món!
                </div>
              )}
            </div>

            {/* Ô tìm kiếm & Thêm món mới từ Database */}
            <div className="relative pt-2" ref={dropdownRef}>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1.5">
                Thêm món vào bữa này:
              </label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-gray-500" />
                <input 
                  type="text"
                  placeholder="Nhập tên món ăn (VD: Ức gà, Trứng, Cơm...)"
                  value={searchTerm}
                  onFocus={() => setShowFoodDropdown(true)}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setShowFoodDropdown(true);
                  }}
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-950 border border-gray-800 rounded-xl text-white text-sm focus:border-emerald-500 outline-none transition-all"
                />
              </div>

              {/* Dropdown kết quả tìm kiếm */}
              {showFoodDropdown && (
                <div className="absolute left-0 right-0 mt-1 bg-gray-900 border border-gray-800 rounded-xl shadow-2xl z-50 max-h-52 overflow-y-auto">
                  {filteredFoods.length > 0 ? (
                    filteredFoods.map((food, index) => {
                      const name = food.name || food.foodName || 'Món ăn';
                      const cal = food.caloriesPer100g ?? food.calories ?? 0;
                      return (
                        <button
                          key={food._id || food.id || index}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleSelectDbFood(food);
                          }}
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-800 border-b border-gray-800/50 last:border-0 flex justify-between items-center transition-colors"
                        >
                          <span className="text-gray-200 font-medium flex items-center gap-2">
                            <Plus className="w-3.5 h-3.5 text-emerald-400" /> {name}
                          </span>
                          <span className="text-xs text-emerald-400 bg-emerald-950/80 border border-emerald-800/50 px-2 py-0.5 rounded">
                            {cal} kcal / 100g
                          </span>
                        </button>
                      );
                    })
                  ) : (
                    <div className="p-3 text-xs text-gray-500 text-center">
                      {searchTerm ? `Không tìm thấy món "${searchTerm}"` : 'Nhập từ khóa để tìm món'}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Ghi chú thêm cho AI */}
            <div className="pt-2">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1.5 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                Ghi chú thêm (Không bắt buộc):
              </label>
              <textarea 
                rows="2" 
                className="w-full p-3 border border-gray-800 rounded-xl bg-gray-950 text-white text-sm focus:ring-1 focus:ring-emerald-500 border-transparent outline-none transition-all resize-none placeholder-gray-600" 
                placeholder="VD: Chiên ít dầu, uống thêm 1 ly nước cam..." 
                value={logForm.extraFoodText || ''} 
                onChange={(e) => setLogForm({...logForm, extraFoodText: e.target.value, logType: 'CUSTOM'})}
              />
            </div>

          </div>
        </div>

        {/* FOOTER */}
        <div className="p-5 border-t border-gray-800 bg-gray-900/50 flex gap-3 shrink-0">
          <button 
            onClick={onClose} 
            type="button"
            className="flex-1 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm font-semibold text-gray-300 hover:bg-gray-700 transition-colors"
          >
            Hủy
          </button>
          
          <button 
            onClick={submitLogMeal} 
            disabled={isLogging} 
            type="button"
            className="flex-1 py-2.5 bg-emerald-600 rounded-xl text-sm font-bold text-white hover:bg-emerald-500 transition-colors flex justify-center items-center gap-2 disabled:opacity-50"
          >
            {isLogging ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              // Sử dụng isOverwrite thay cho mealId cũ
              logForm.isOverwrite ? "Cập nhật bữa ăn" : "Xác nhận & Lưu"
            )}
          </button>
        </div>

      </div>
    </div>
  );
}