const { GoogleGenerativeAI } = require("@google/generative-ai");
const User = require("../models/User");
const MealPlan = require("../models/MealPlan");
const DailyDietLog = require("../models/DailyDietLog");
const Food = require("../models/Food");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ==========================================
// HÀM HỖ TRỢ (TIỆN ÍCH)
// ==========================================

// 1. Hàm bóc tách JSON an toàn (Chống lỗi AI trả về kèm markdown hoặc text thừa)
const safeParseJSON = (text) => {
  try {
    const cleanedText = text.replace(/```json/gi, "").replace(/```/g, "").trim();
    return JSON.parse(cleanedText);
  } catch (error) {
    const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (match) return JSON.parse(match[0]);
    throw new Error("Không tìm thấy cấu trúc JSON hợp lệ trong phản hồi của AI.");
  }
};

// 2. Hàm làm tròn TẤT CẢ dữ liệu về số nguyên chuẩn (Loại bỏ hoàn toàn số lẻ)
const formatToInt = (val) => Math.round(Number(val)) || 0;

// 3. Hàm tạo Prompt về Bệnh lý (Medical Conditions)
const getMedicalPrompt = (user) => {
  if (user.medicalConditions && user.medicalConditions.length > 0) {
    return `\n[LƯU Ý QUAN TRỌNG VỀ SỨC KHỎE]: Người dùng này có bệnh lý: ${user.medicalConditions.join(', ')}. Khi điều chỉnh lịch ăn sắp tới, TUYỆT ĐỐI KHÔNG đề xuất hoặc sử dụng thực phẩm gây hại cho bệnh này (ví dụ: tiểu đường hạn chế đường tinh luyện, dạ dày tránh đồ chua cay). Tự động thay thế các nguyên liệu kiêng kỵ bằng thực phẩm an toàn tương đương.`;
  }
  return "";
};

// ==========================================
// 1. LẤY NHẬT KÝ ĂN UỐNG TRONG NGÀY
// ==========================================
exports.getTodayDietLog = async (req, res) => {
  try {
    const userId = req.user.id;
    const { date } = req.query; 

    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    const dietLog = await DailyDietLog.findOne({ userId, date: targetDate });
    const masterPlan = await MealPlan.findOne({ userId });

    if (!dietLog) {
      return res.status(200).json({
        message: "Chưa ghi nhận bữa ăn nào hôm nay.",
        date: targetDate,
        actualDailyTotal: { calories: 0, protein: 0, carbs: 0, fat: 0 },
        consumedMeals: [], 
        adjustedUpcomingMeals: masterPlan ? masterPlan.meals : [], 
        isDayCompleted: false,
        dailyAiSummary: ""
      });
    }

    let upcomingMeals = dietLog.adjustedUpcomingMeals;

    if (upcomingMeals.length === 0 && !dietLog.isDayCompleted && masterPlan) {
      const eatenMealTypes = dietLog.consumedMeals.map(m => m.mealType.toLowerCase());
      upcomingMeals = masterPlan.meals.filter(m => !eatenMealTypes.includes(m.mealType.toLowerCase()));
    }

    res.status(200).json({
      message: "Lấy dữ liệu ăn uống trong ngày thành công",
      date: dietLog.date,
      actualDailyTotal: dietLog.actualDailyTotal,
      consumedMeals: dietLog.consumedMeals,
      adjustedUpcomingMeals: upcomingMeals,
      isDayCompleted: dietLog.isDayCompleted,
      dailyAiSummary: dietLog.dailyAiSummary
    });

  } catch (error) {
    console.error("Lỗi lấy lịch ăn trong ngày:", error);
    res.status(500).json({ message: "Lỗi Server", error: error.message });
  }
};


// ==========================================
// 2. GHI NHẬN BỮA ĂN (TÍCH HỢP AI + BỆNH LÝ)
// ==========================================
exports.logActualMealWithAI = async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      date, 
      mealType, 
      logType = "EXACT", 
      consumedFoods = [], 
      extraFoodText = ""
    } = req.body;

    if (!date || !mealType) {
      return res.status(400).json({ message: "Vui lòng cung cấp ngày và tên bữa ăn!" });
    }

    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    // --- A. XỬ LÝ CHUYỂN NGÀY ---
    let dietLog = await DailyDietLog.findOne({ userId }); 
    
    if (!dietLog) {
      dietLog = new DailyDietLog({ 
        userId, date: targetDate, consumedMeals: [], adjustedUpcomingMeals: [], 
        actualDailyTotal: { calories: 0, protein: 0, carbs: 0, fat: 0 }, pastRecords: [] 
      });
    } else {
      const targetTime = targetDate.getTime();
      const logTime = new Date(dietLog.date).setHours(0,0,0,0);

      if (targetTime > logTime) {
        if (dietLog.actualDailyTotal && dietLog.actualDailyTotal.calories > 0) {
          if (!dietLog.pastRecords) dietLog.pastRecords = [];
          dietLog.pastRecords.push({
            date: dietLog.date, actualDailyTotal: dietLog.actualDailyTotal,
            dailyAiSummary: dietLog.dailyAiSummary || "", isDayCompleted: dietLog.isDayCompleted || false
          });
        }
        dietLog.date = targetDate; dietLog.consumedMeals = []; dietLog.adjustedUpcomingMeals = [];
        dietLog.actualDailyTotal = { calories: 0, protein: 0, carbs: 0, fat: 0 };
        dietLog.isDayCompleted = false; dietLog.dailyAiSummary = "";
      } else if (targetTime < logTime) {
        return res.status(400).json({ message: "Dữ liệu của ngày này đã chốt sổ. Vui lòng ghi nhận cho hôm nay." });
      }
    }

    // --- B. KHỞI TẠO BIẾN ---
    const masterPlan = await MealPlan.findOne({ userId }); 
    const user = await User.findById(userId);
    const target = user.targetMacros || { calories: 2000, protein: 150, carbs: 200, fat: 50 };
    const medicalContext = getMedicalPrompt(user); // Gắn Bệnh lý

    let processedItems = [];
    let newItemsTotal = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    let aiNote = "";

    const addItemToMeal = (item) => {
      const formattedItem = {
        foodId: item.foodId || null,
        foodName: item.foodName,
        quantityInGrams: formatToInt(item.quantityInGrams),
        calories: formatToInt(item.calories),
        protein: formatToInt(item.protein),
        carbs: formatToInt(item.carbs),
        fat: formatToInt(item.fat)
      };
      processedItems.push(formattedItem);
      newItemsTotal.calories += formattedItem.calories;
      newItemsTotal.protein += formattedItem.protein;
      newItemsTotal.carbs += formattedItem.carbs;
      newItemsTotal.fat += formattedItem.fat;
    };

    let plannedMeal = dietLog.adjustedUpcomingMeals.find(m => m.mealType.toLowerCase() === mealType.toLowerCase());
    if (!plannedMeal && masterPlan) {
      plannedMeal = masterPlan.meals.find(m => m.mealType.toLowerCase() === mealType.toLowerCase());
    }

    // --- C. PHÂN LUỒNG XỬ LÝ ---
    if (logType === "EXACT" || logType === "ADD_EXTRA") {
      if (!plannedMeal) return res.status(400).json({ message: `Không tìm thấy bữa ăn '${mealType}' trong lịch trình.` });
      plannedMeal.items.forEach(item => addItemToMeal(item));
      aiNote = logType === "EXACT" ? "Xác nhận đã ăn đúng như lịch trình!" : "Đã ăn theo lịch trình và có nạp thêm món ngoài.";
    }

    if (logType === "CUSTOM" || logType === "ADD_EXTRA") {
      if (consumedFoods && consumedFoods.length > 0) {
        const foodIds = consumedFoods.map(item => item.foodId).filter(id => id); 
        const availableFoods = await Food.find({ _id: { $in: foodIds } });

        for (const item of consumedFoods) {
          if (item.foodId) {
            const foodData = availableFoods.find(f => f._id.toString() === item.foodId);
            if (foodData) {
              const ratio = item.quantityInGrams / 100;
              addItemToMeal({
                foodId: foodData._id, foodName: foodData.name, quantityInGrams: item.quantityInGrams,
                calories: foodData.caloriesPer100g * ratio, protein: foodData.proteinPer100g * ratio,
                carbs: foodData.carbsPer100g * ratio, fat: foodData.fatPer100g * ratio,
              });
            }
          } else if (item.calories !== undefined) {
             addItemToMeal(item); 
          }
        }
      }

      if (extraFoodText && extraFoodText.trim() !== "") {
        const prompt = `Học viên vừa ăn: "${extraFoodText}". ${medicalContext}
        Hãy phân tích và ước lượng số Gram, Calories và Macros (P, C, F) cho món ăn này. 
        Nếu món ăn chứa thành phần vi phạm bệnh lý, hãy đưa ra cảnh báo ở aiNote.
        TRẢ VỀ ĐÚNG CẤU TRÚC JSON SAU (Không giải thích thêm, các chỉ số phải là SỐ NGUYÊN):
        {
          "estimatedItems": [ { "foodName": "...", "quantityInGrams": 150, "calories": 400, "protein": 20, "carbs": 40, "fat": 15 } ], 
          "aiNote": "Nhận xét/cảnh báo ngắn gọn." 
        }`;

        try {
          const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash", generationConfig: { responseMimeType: "application/json" } });
          const result = await model.generateContent(prompt);
          const parsedAiData = safeParseJSON(result.response.text());
          
          if (!aiNote) aiNote = parsedAiData.aiNote || "";
          if (parsedAiData.estimatedItems) {
            parsedAiData.estimatedItems.forEach(aiItem => {
              addItemToMeal({
                foodId: null, foodName: aiItem.foodName + " (AI)", 
                quantityInGrams: aiItem.quantityInGrams, calories: aiItem.calories, 
                protein: aiItem.protein, carbs: aiItem.carbs, fat: aiItem.fat
              });
            });
          }
        } catch (err) {
          console.error("Lỗi AI ước lượng đồ ăn:", err.message);
          return res.status(500).json({ message: "Lỗi AI không thể phân tích món ăn. Vui lòng thử lại!" });
        }
      }
      if (logType === "CUSTOM" && !aiNote) aiNote = "Ghi nhận bữa ăn tùy chỉnh của bạn.";
    }

    if (processedItems.length === 0) return res.status(400).json({ message: "Không có món nào được ghi nhận." });

    newItemsTotal.calories = formatToInt(newItemsTotal.calories);
    newItemsTotal.protein = formatToInt(newItemsTotal.protein);
    newItemsTotal.carbs = formatToInt(newItemsTotal.carbs);
    newItemsTotal.fat = formatToInt(newItemsTotal.fat);

    // --- D. LƯU VÀO NHẬT KÝ ---
    const isExact = (logType === "EXACT");
    const existingMealIndex = dietLog.consumedMeals.findIndex(m => m.mealType.toLowerCase() === mealType.toLowerCase());
    
    if (existingMealIndex > -1) {
      dietLog.consumedMeals[existingMealIndex].items.push(...processedItems);
      dietLog.consumedMeals[existingMealIndex].mealTotal.calories += newItemsTotal.calories;
      dietLog.consumedMeals[existingMealIndex].mealTotal.protein += newItemsTotal.protein;
      dietLog.consumedMeals[existingMealIndex].mealTotal.carbs += newItemsTotal.carbs;
      dietLog.consumedMeals[existingMealIndex].mealTotal.fat += newItemsTotal.fat;
      
      dietLog.consumedMeals[existingMealIndex].mealTotal.calories = formatToInt(dietLog.consumedMeals[existingMealIndex].mealTotal.calories);
      dietLog.consumedMeals[existingMealIndex].mealTotal.protein = formatToInt(dietLog.consumedMeals[existingMealIndex].mealTotal.protein);
      dietLog.consumedMeals[existingMealIndex].mealTotal.carbs = formatToInt(dietLog.consumedMeals[existingMealIndex].mealTotal.carbs);
      dietLog.consumedMeals[existingMealIndex].mealTotal.fat = formatToInt(dietLog.consumedMeals[existingMealIndex].mealTotal.fat);
      
      dietLog.consumedMeals[existingMealIndex].isExactlyAsPlanned = false; 
    } else {
      dietLog.consumedMeals.push({ mealType, aiNote, isExactlyAsPlanned: isExact, items: processedItems, mealTotal: newItemsTotal });
    }

    let newActualTotal = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    dietLog.consumedMeals.forEach(meal => {
      newActualTotal.calories += meal.mealTotal.calories;
      newActualTotal.protein += meal.mealTotal.protein;
      newActualTotal.carbs += meal.mealTotal.carbs;
      newActualTotal.fat += meal.mealTotal.fat;
    });
    
    dietLog.actualDailyTotal = {
      calories: formatToInt(newActualTotal.calories), protein: formatToInt(newActualTotal.protein),
      carbs: formatToInt(newActualTotal.carbs), fat: formatToInt(newActualTotal.fat)
    };

    // --- E. AI AUTO-ADJUST LỊCH SẮP TỚI ---
    let adjustmentNote = "";

    if (masterPlan) {
      const eatenMealTypes = dietLog.consumedMeals.map(m => m.mealType.toLowerCase());
      const upcomingMeals = masterPlan.meals.filter(m => !eatenMealTypes.includes(m.mealType.toLowerCase()));

      if (upcomingMeals.length > 0) {
        if (!isExact) { 
          const remainingCalories = Math.round(target.calories - dietLog.actualDailyTotal.calories);

          if (remainingCalories <= 100) {
            adjustmentNote = "Cảnh báo: Bạn đã nạp đủ hoặc vượt calo hôm nay! Các bữa sắp tới nên giới hạn.";
            dietLog.adjustedUpcomingMeals = upcomingMeals.map(m => ({
              mealType: m.mealType, items: [], mealTotal: { calories: 0, protein: 0, carbs: 0, fat: 0 }
            }));
          } else {
            const adjustPrompt = `Mục tiêu: ${target.calories} kcal. Đã nạp: ${dietLog.actualDailyTotal.calories} kcal. CÒN: ${remainingCalories} kcal.
            Lịch dự kiến: ${JSON.stringify(upcomingMeals.map(m => ({ mealType: m.mealType, items: m.items.map(i => ({ foodName: i.foodName, quantityInGrams: i.quantityInGrams })) })))}
            NHIỆM VỤ: Chia lại 'quantityInGrams', Calories và Macros (P, C, F) của các món sắp tới sao cho tổng khớp ${remainingCalories} kcal. YÊU CẦU CÁC CHỈ SỐ LÀ SỐ NGUYÊN. ${medicalContext}
            TRẢ VỀ ĐÚNG CẤU TRÚC JSON:
            { 
              "adjustedUpcomingMeals": [ 
                { "mealType": "...", "items": [ { "foodName": "...", "quantityInGrams": 0, "calories": 0, "protein": 0, "carbs": 0, "fat": 0 } ], "mealTotal": { "calories": 0, "protein": 0, "carbs": 0, "fat": 0 } }
              ], 
              "adjustmentNote": "Giải thích ngắn" 
            }`;

            try {
              const adjustModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash", generationConfig: { responseMimeType: "application/json" } });
              const adjustResult = await adjustModel.generateContent(adjustPrompt);
              const parsedAdjustData = safeParseJSON(adjustResult.response.text());
              
              adjustmentNote = parsedAdjustData.adjustmentNote || "";
              if (parsedAdjustData.adjustedUpcomingMeals) {
                dietLog.adjustedUpcomingMeals = parsedAdjustData.adjustedUpcomingMeals.map(meal => {
                  let mCal = 0, mPro = 0, mCarb = 0, mFat = 0;
                  const formattedItems = meal.items.map(item => {
                    mCal += formatToInt(item.calories); mPro += formatToInt(item.protein); mCarb += formatToInt(item.carbs); mFat += formatToInt(item.fat);
                    return { ...item, quantityInGrams: formatToInt(item.quantityInGrams), calories: formatToInt(item.calories), protein: formatToInt(item.protein), carbs: formatToInt(item.carbs), fat: formatToInt(item.fat) };
                  });
                  return { mealType: meal.mealType, items: formattedItems, mealTotal: { calories: formatToInt(mCal), protein: formatToInt(mPro), carbs: formatToInt(mCarb), fat: formatToInt(mFat) } };
                });
              }
            } catch (err) { 
              console.error("Lỗi AI Auto-adjust:", err.message); 
              dietLog.adjustedUpcomingMeals = upcomingMeals;
            }
          }
        } else {
          adjustmentNote = "Tuyệt vời! Bạn đang bám sát lộ trình!";
          const currentUpcoming = dietLog.adjustedUpcomingMeals.filter(m => !eatenMealTypes.includes(m.mealType.toLowerCase()));
          dietLog.adjustedUpcomingMeals = currentUpcoming.length > 0 ? currentUpcoming : upcomingMeals;
        }
      } else {
        const excessCalories = formatToInt(dietLog.actualDailyTotal.calories - target.calories);
        if (excessCalories > 0) dietLog.dailyAiSummary = `Bạn đã ăn lố ${excessCalories} kcal. Hãy tích cực vận động nhé.`;
        else if (excessCalories < 0) dietLog.dailyAiSummary = `Bạn còn dư ${Math.abs(excessCalories)} kcal. Bám sát mục tiêu rất tốt.`;
        else dietLog.dailyAiSummary = `Đạt chuẩn 100%. Quá xuất sắc!`;
        
        dietLog.isDayCompleted = true; dietLog.adjustedUpcomingMeals = []; 
      }
    }

    await dietLog.save();

    res.status(200).json({
      message: "Ghi nhận đồ ăn thành công!", aiNote, adjustmentNote, actualDailyTotal: dietLog.actualDailyTotal,
      adjustedUpcomingMeals: dietLog.adjustedUpcomingMeals, isDayCompleted: dietLog.isDayCompleted || false, dailyAiSummary: dietLog.dailyAiSummary || ""
    });

  } catch (error) {
    console.error("Lỗi hệ thống:", error);
    res.status(500).json({ message: "Lỗi Server", error: error.message });
  }
};


// ==========================================
// 3. XÓA BỮA ĂN ĐÃ NẠP VÀ TÍNH TOÁN LẠI LỊCH
// ==========================================
exports.deleteConsumedMeal = async (req, res) => {
  try {
    const userId = req.user.id;
    const { mealId } = req.params; 

    const dietLog = await DailyDietLog.findOne({ userId, "consumedMeals._id": mealId });
    if (!dietLog) return res.status(404).json({ message: "Không tìm thấy bữa ăn này!" });

    const deletedMeal = dietLog.consumedMeals.find(m => m._id.toString() === mealId);
    dietLog.consumedMeals = dietLog.consumedMeals.filter((meal) => meal._id.toString() !== mealId);

    let newActualTotal = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    dietLog.consumedMeals.forEach(meal => {
      newActualTotal.calories += meal.mealTotal.calories;
      newActualTotal.protein += meal.mealTotal.protein;
      newActualTotal.carbs += meal.mealTotal.carbs;
      newActualTotal.fat += meal.mealTotal.fat;
    });
    
    dietLog.actualDailyTotal = {
      calories: formatToInt(newActualTotal.calories), protein: formatToInt(newActualTotal.protein),
      carbs: formatToInt(newActualTotal.carbs), fat: formatToInt(newActualTotal.fat)
    };
    dietLog.isDayCompleted = false; dietLog.dailyAiSummary = "";

    const masterPlan = await MealPlan.findOne({ userId });
    const user = await User.findById(userId);
    const target = user.targetMacros || { calories: 2000, protein: 150, carbs: 200, fat: 50 };
    const medicalContext = getMedicalPrompt(user);
    
    let adjustmentNote = "Đã xóa bữa ăn. Lịch trình đã được khôi phục.";

    if (masterPlan) {
      const eatenMealTypes = dietLog.consumedMeals.map(m => m.mealType.toLowerCase());
      const upcomingMeals = masterPlan.meals.filter(m => !eatenMealTypes.includes(m.mealType.toLowerCase()));
      const remainingCalories = Math.round(target.calories - dietLog.actualDailyTotal.calories);

      if (upcomingMeals.length > 0) {
        const adjustPrompt = `Mục tiêu: ${target.calories} kcal. Đã nạp: ${dietLog.actualDailyTotal.calories} kcal. CÒN DƯ: ${remainingCalories} kcal.
        Lịch dự kiến: ${JSON.stringify(upcomingMeals.map(m => ({ mealType: m.mealType, items: m.items.map(i => ({ foodName: i.foodName, quantityInGrams: i.quantityInGrams })) })))}
        NHIỆM VỤ: Chia lại 'quantityInGrams', Calories và Macros (P, C, F) của các món sắp tới sao cho tổng khớp ${remainingCalories} kcal. YÊU CẦU SỐ NGUYÊN. ${medicalContext}
        TRẢ VỀ ĐÚNG CẤU TRÚC JSON:
        { 
          "adjustedUpcomingMeals": [ 
            { "mealType": "...", "items": [ { "foodName": "...", "quantityInGrams": 0, "calories": 0, "protein": 0, "carbs": 0, "fat": 0 } ], "mealTotal": { "calories": 0, "protein": 0, "carbs": 0, "fat": 0 } }
          ], 
          "adjustmentNote": "Giải thích ngắn" 
        }`;

        try {
          const adjustModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash", generationConfig: { responseMimeType: "application/json" } });
          const adjustResult = await adjustModel.generateContent(adjustPrompt);
          const parsedAdjustData = safeParseJSON(adjustResult.response.text());
          
          adjustmentNote = parsedAdjustData.adjustmentNote || "Đã phân bổ lại calo sau khi xóa.";
          if (parsedAdjustData.adjustedUpcomingMeals) {
             dietLog.adjustedUpcomingMeals = parsedAdjustData.adjustedUpcomingMeals.map(meal => {
                let mCal = 0, mPro = 0, mCarb = 0, mFat = 0;
                const formattedItems = meal.items.map(item => {
                  mCal += formatToInt(item.calories); mPro += formatToInt(item.protein); mCarb += formatToInt(item.carbs); mFat += formatToInt(item.fat);
                  return { ...item, quantityInGrams: formatToInt(item.quantityInGrams), calories: formatToInt(item.calories), protein: formatToInt(item.protein), carbs: formatToInt(item.carbs), fat: formatToInt(item.fat) };
                });
                return { mealType: meal.mealType, items: formattedItems, mealTotal: { calories: formatToInt(mCal), protein: formatToInt(mPro), carbs: formatToInt(mCarb), fat: formatToInt(mFat) } };
              });
          }
        } catch (err) { 
          console.error("Lỗi AI Auto-adjust khi xóa:", err.message); 
          dietLog.adjustedUpcomingMeals = upcomingMeals;
        }
      } else {
         dietLog.adjustedUpcomingMeals = [];
      }
    }

    await dietLog.save();

    res.status(200).json({
      message: `Đã xóa ${deletedMeal.mealType} thành công!`, adjustmentNote,
      actualDailyTotal: dietLog.actualDailyTotal, adjustedUpcomingMeals: dietLog.adjustedUpcomingMeals,
      isDayCompleted: dietLog.isDayCompleted
    });

  } catch (error) {
    console.error("Lỗi xóa bữa ăn đã nạp:", error);
    res.status(500).json({ message: "Lỗi Server khi xóa bữa ăn!" });
  }
};


// ==========================================
// 4. SỬA BỮA ĂN ĐÃ NẠP & TÍNH TOÁN LẠI LỊCH
// ==========================================
exports.editConsumedMeal = async (req, res) => {
  try {
    const userId = req.user.id;
    const { mealId } = req.params;
    const { consumedFoods = [], extraFoodText = "" } = req.body;

    const dietLog = await DailyDietLog.findOne({ userId, "consumedMeals._id": mealId });
    if (!dietLog) return res.status(404).json({ message: "Không tìm thấy bữa ăn này trong nhật ký!" });

    const mealIndex = dietLog.consumedMeals.findIndex(m => m._id.toString() === mealId);
    if (mealIndex === -1) return res.status(404).json({ message: "Không tìm thấy bữa ăn." });

    const user = await User.findById(userId);
    const medicalContext = getMedicalPrompt(user);

    let processedItems = [];
    let newItemsTotal = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    let aiNote = "Đã chỉnh sửa bữa ăn.";

    const addItemToMeal = (item) => {
      const formattedItem = {
        foodId: item.foodId || null, foodName: item.foodName,
        quantityInGrams: formatToInt(item.quantityInGrams), calories: formatToInt(item.calories),
        protein: formatToInt(item.protein), carbs: formatToInt(item.carbs), fat: formatToInt(item.fat)
      };
      processedItems.push(formattedItem);
      newItemsTotal.calories += formattedItem.calories; newItemsTotal.protein += formattedItem.protein;
      newItemsTotal.carbs += formattedItem.carbs; newItemsTotal.fat += formattedItem.fat;
    };

    if (consumedFoods && consumedFoods.length > 0) {
      const foodIds = consumedFoods.map(item => item.foodId).filter(id => id); 
      const availableFoods = await Food.find({ _id: { $in: foodIds } });

      for (const item of consumedFoods) {
        if (item.foodId) {
          const foodData = availableFoods.find(f => f._id.toString() === item.foodId);
          if (foodData) {
            const ratio = item.quantityInGrams / 100;
            addItemToMeal({
              foodId: foodData._id, foodName: foodData.name, quantityInGrams: item.quantityInGrams,
              calories: foodData.caloriesPer100g * ratio, protein: foodData.proteinPer100g * ratio,
              carbs: foodData.carbsPer100g * ratio, fat: foodData.fatPer100g * ratio,
            });
          }
        } else if (item.calories !== undefined) { addItemToMeal(item); }
      }
    }

    if (extraFoodText && extraFoodText.trim() !== "") {
      const prompt = `Học viên cập nhật bữa ăn thành: "${extraFoodText}". ${medicalContext}
      Hãy phân tích và ước lượng số Gram, Calories và Macros (P, C, F). Cảnh báo nếu phạm luật bệnh lý.
      TRẢ VỀ ĐÚNG CẤU TRÚC JSON SAU (YÊU CẦU SỐ NGUYÊN):
      {
        "estimatedItems": [ { "foodName": "...", "quantityInGrams": 150, "calories": 400, "protein": 20, "carbs": 40, "fat": 15 } ], 
        "aiNote": "Nhận xét ngắn gọn." 
      }`;

      try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash", generationConfig: { responseMimeType: "application/json" } });
        const result = await model.generateContent(prompt);
        const parsedAiData = safeParseJSON(result.response.text());
        
        aiNote = parsedAiData.aiNote || aiNote;
        if (parsedAiData.estimatedItems) {
          parsedAiData.estimatedItems.forEach(aiItem => {
            addItemToMeal({
              foodId: null, foodName: aiItem.foodName + " (AI Edit)", quantityInGrams: aiItem.quantityInGrams,
              calories: aiItem.calories, protein: aiItem.protein, carbs: aiItem.carbs, fat: aiItem.fat
            });
          });
        }
      } catch (err) {
        return res.status(500).json({ message: "Lỗi AI không thể phân tích cập nhật. Vui lòng thử lại!" });
      }
    }

    if (processedItems.length === 0) return res.status(400).json({ message: "Dữ liệu sửa đổi trống." });

    dietLog.consumedMeals[mealIndex].items = processedItems;
    dietLog.consumedMeals[mealIndex].mealTotal = {
      calories: formatToInt(newItemsTotal.calories), protein: formatToInt(newItemsTotal.protein),
      carbs: formatToInt(newItemsTotal.carbs), fat: formatToInt(newItemsTotal.fat)
    };
    dietLog.consumedMeals[mealIndex].isExactlyAsPlanned = false;
    dietLog.consumedMeals[mealIndex].aiNote = aiNote;

    let newActualTotal = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    dietLog.consumedMeals.forEach(meal => {
      newActualTotal.calories += meal.mealTotal.calories; newActualTotal.protein += meal.mealTotal.protein;
      newActualTotal.carbs += meal.mealTotal.carbs; newActualTotal.fat += meal.mealTotal.fat;
    });
    
    dietLog.actualDailyTotal = {
      calories: formatToInt(newActualTotal.calories), protein: formatToInt(newActualTotal.protein),
      carbs: formatToInt(newActualTotal.carbs), fat: formatToInt(newActualTotal.fat)
    };
    dietLog.isDayCompleted = false;

    // --- C. AI AUTO-ADJUST LẠI LỊCH SẮP TỚI ---
    const masterPlan = await MealPlan.findOne({ userId });
    const target = user.targetMacros || { calories: 2000, protein: 150, carbs: 200, fat: 50 };
    let adjustmentNote = "Đã cập nhật bữa ăn. Lịch trình sắp tới đã được điều chỉnh theo lượng calo mới.";

    if (masterPlan) {
      const eatenMealTypes = dietLog.consumedMeals.map(m => m.mealType.toLowerCase());
      const upcomingMeals = masterPlan.meals.filter(m => !eatenMealTypes.includes(m.mealType.toLowerCase()));
      const remainingCalories = Math.round(target.calories - dietLog.actualDailyTotal.calories);

      if (upcomingMeals.length > 0) {
        if (remainingCalories <= 100) {
          adjustmentNote = "Cảnh báo: Bạn đã nạp đủ hoặc vượt calo sau khi sửa đổi! Các bữa sắp tới nên giới hạn.";
          dietLog.adjustedUpcomingMeals = upcomingMeals.map(m => ({
            mealType: m.mealType, items: [], mealTotal: { calories: 0, protein: 0, carbs: 0, fat: 0 }
          }));
        } else {
          const adjustPrompt = `Mục tiêu: ${target.calories} kcal. Đã nạp: ${dietLog.actualDailyTotal.calories} kcal. CÒN: ${remainingCalories} kcal.
          Lịch dự kiến: ${JSON.stringify(upcomingMeals.map(m => ({ mealType: m.mealType, items: m.items.map(i => ({ foodName: i.foodName, quantityInGrams: i.quantityInGrams })) })))}
          NHIỆM VỤ: Chia lại 'quantityInGrams', Calories và Macros (P, C, F) của các món sắp tới sao cho tổng khớp ${remainingCalories} kcal. ${medicalContext}
          TRẢ VỀ ĐÚNG CẤU TRÚC JSON (YÊU CẦU SỐ NGUYÊN):
          { 
            "adjustedUpcomingMeals": [ 
              { "mealType": "...", "items": [ { "foodName": "...", "quantityInGrams": 0, "calories": 0, "protein": 0, "carbs": 0, "fat": 0 } ], "mealTotal": { "calories": 0, "protein": 0, "carbs": 0, "fat": 0 } }
            ], 
            "adjustmentNote": "Giải thích ngắn" 
          }`;

          try {
            const adjustModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash", generationConfig: { responseMimeType: "application/json" } });
            const adjustResult = await adjustModel.generateContent(adjustPrompt);
            const parsedAdjustData = safeParseJSON(adjustResult.response.text());
            
            adjustmentNote = parsedAdjustData.adjustmentNote || adjustmentNote;
            if (parsedAdjustData.adjustedUpcomingMeals) {
              dietLog.adjustedUpcomingMeals = parsedAdjustData.adjustedUpcomingMeals.map(meal => {
                let mCal = 0, mPro = 0, mCarb = 0, mFat = 0;
                const formattedItems = meal.items.map(item => {
                  mCal += formatToInt(item.calories); mPro += formatToInt(item.protein); mCarb += formatToInt(item.carbs); mFat += formatToInt(item.fat);
                  return { ...item, quantityInGrams: formatToInt(item.quantityInGrams), calories: formatToInt(item.calories), protein: formatToInt(item.protein), carbs: formatToInt(item.carbs), fat: formatToInt(item.fat) };
                });
                return { mealType: meal.mealType, items: formattedItems, mealTotal: { calories: formatToInt(mCal), protein: formatToInt(mPro), carbs: formatToInt(mCarb), fat: formatToInt(mFat) } };
              });
            }
          } catch (err) { 
            console.error("Lỗi AI Auto-adjust khi sửa:", err.message); 
            dietLog.adjustedUpcomingMeals = upcomingMeals;
          }
        }
      } else { dietLog.adjustedUpcomingMeals = []; }
    }

    await dietLog.save();

    res.status(200).json({
      message: `Cập nhật thành công bữa ${dietLog.consumedMeals[mealIndex].mealType}!`,
      aiNote, adjustmentNote, actualDailyTotal: dietLog.actualDailyTotal, adjustedUpcomingMeals: dietLog.adjustedUpcomingMeals
    });

  } catch (error) {
    console.error("Lỗi sửa bữa ăn:", error);
    res.status(500).json({ message: "Lỗi Server khi sửa bữa ăn!" });
  }
};


// ==========================================
// 5. ĐỒNG BỘ LẠI LỊCH TRÌNH SẮP TỚI KHI ĐỔI LỊCH ĂN (MASTER PLAN)
// ==========================================
exports.syncDietLogWithNewPlan = async (req, res) => {
  try {
    const userId = req.user.id;
    const targetDate = new Date();
    targetDate.setHours(0, 0, 0, 0);

    const dietLog = await DailyDietLog.findOne({ userId, date: targetDate });
    
    if (!dietLog) {
      return res.status(200).json({ message: "Hôm nay chưa có nhật ký ăn uống, hệ thống sẽ tự động dùng lịch mới khi bạn ghi nhận bữa ăn đầu tiên." });
    }

    const masterPlan = await MealPlan.findOne({ userId });
    if (!masterPlan) return res.status(404).json({ message: "Không tìm thấy Lịch ăn (Master Plan) mới của người dùng." });

    const user = await User.findById(userId);
    const target = user.targetMacros || { calories: 2000, protein: 150, carbs: 200, fat: 50 };
    const medicalContext = getMedicalPrompt(user);

    const eatenMealTypes = dietLog.consumedMeals.map(m => m.mealType.toLowerCase());
    const upcomingMeals = masterPlan.meals.filter(m => !eatenMealTypes.includes(m.mealType.toLowerCase()));

    let adjustmentNote = "Đã đồng bộ lại các bữa ăn sắp tới theo lịch trình mới.";
    const remainingCalories = Math.round(target.calories - dietLog.actualDailyTotal.calories);

    if (upcomingMeals.length > 0) {
      const adjustPrompt = `Mục tiêu: ${target.calories} kcal. Đã nạp: ${dietLog.actualDailyTotal.calories} kcal. CÒN: ${remainingCalories} kcal.
      Lịch MỚI dự kiến: ${JSON.stringify(upcomingMeals.map(m => ({ mealType: m.mealType, items: m.items.map(i => ({ foodName: i.foodName, quantityInGrams: i.quantityInGrams })) })))}
      NHIỆM VỤ: Lịch ăn của người dùng vừa bị thay đổi. Hãy điều chỉnh lượng Gram, Calories, Macros của các món sắp tới sao cho vừa vặn với số Calo CÒN LẠI (${remainingCalories} kcal). ${medicalContext}
      TRẢ VỀ ĐÚNG CẤU TRÚC JSON (YÊU CẦU SỐ NGUYÊN):
      {
        "adjustedUpcomingMeals": [ 
          { "mealType": "...", "items": [ { "foodName": "...", "quantityInGrams": 0, "calories": 0, "protein": 0, "carbs": 0, "fat": 0 } ], "mealTotal": { "calories": 0, "protein": 0, "carbs": 0, "fat": 0 } }
        ],
        "adjustmentNote": "Đã tính toán lại lịch mới của bạn."
      }`;

      try {
        const adjustModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash", generationConfig: { responseMimeType: "application/json" } });
        const adjustResult = await adjustModel.generateContent(adjustPrompt);
        const parsedAdjustData = safeParseJSON(adjustResult.response.text());
        
        adjustmentNote = parsedAdjustData.adjustmentNote || adjustmentNote;
        if (parsedAdjustData.adjustedUpcomingMeals) {
          dietLog.adjustedUpcomingMeals = parsedAdjustData.adjustedUpcomingMeals.map(meal => {
            let mCal = 0, mPro = 0, mCarb = 0, mFat = 0;
            const formattedItems = meal.items.map(item => {
              mCal += formatToInt(item.calories); mPro += formatToInt(item.protein); mCarb += formatToInt(item.carbs); mFat += formatToInt(item.fat);
              return { ...item, quantityInGrams: formatToInt(item.quantityInGrams), calories: formatToInt(item.calories), protein: formatToInt(item.protein), carbs: formatToInt(item.carbs), fat: formatToInt(item.fat) };
            });
            return { mealType: meal.mealType, items: formattedItems, mealTotal: { calories: formatToInt(mCal), protein: formatToInt(mPro), carbs: formatToInt(mCarb), fat: formatToInt(mFat) } };
          });
        }
      } catch (err) {
        console.error("Lỗi AI Auto-adjust khi đồng bộ lịch mới:", err.message);
        dietLog.adjustedUpcomingMeals = upcomingMeals;
      }
    } else { dietLog.adjustedUpcomingMeals = []; }

    await dietLog.save();

    res.status(200).json({
      message: "Đồng bộ với Lịch ăn mới thành công!",
      adjustmentNote, adjustedUpcomingMeals: dietLog.adjustedUpcomingMeals
    });

  } catch (error) {
    console.error("Lỗi đồng bộ lịch trình:", error);
    res.status(500).json({ message: "Lỗi Server khi đồng bộ lịch!" });
  }
};


// ==========================================
// 6. LẤY LỊCH SỬ ĂN UỐNG (THỐNG KÊ BIỂU ĐỒ)
// ==========================================
exports.getCalorieHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const dietLog = await DailyDietLog.findOne({ userId });
    
    if (!dietLog) return res.status(200).json({ historyData: [] });

    let historyData = [];

    // 1. Quét lịch sử các ngày cũ trong pastRecords
    if (dietLog.pastRecords && dietLog.pastRecords.length > 0) {
      const past = dietLog.pastRecords.map(record => ({
        date: new Date(record.date).toISOString().split('T')[0],
        calories: record.actualDailyTotal?.calories || 0,
        protein: record.actualDailyTotal?.protein || 0,
        carbs: record.actualDailyTotal?.carbs || 0,
        fat: record.actualDailyTotal?.fat || 0
      }));
      historyData.push(...past);
    }

    // 2. Lấy thêm số liệu của ngày hôm nay (hiện tại)
    if (dietLog.date && dietLog.actualDailyTotal) {
      historyData.push({
        date: new Date(dietLog.date).toISOString().split('T')[0],
        calories: dietLog.actualDailyTotal.calories || 0,
        protein: dietLog.actualDailyTotal.protein || 0,
        carbs: dietLog.actualDailyTotal.carbs || 0,
        fat: dietLog.actualDailyTotal.fat || 0
      });
    }

    // 3. Sắp xếp lại theo thời gian TĂNG DẦN (Cũ -> Mới) để vẽ biểu đồ
    historyData.sort((a, b) => new Date(a.date) - new Date(b.date));

    res.status(200).json({ historyData });

  } catch (error) {
    console.error("Lỗi lấy thống kê ăn uống:", error);
    res.status(500).json({ message: "Lỗi Server khi lấy lịch sử!", error: error.message });
  }
};