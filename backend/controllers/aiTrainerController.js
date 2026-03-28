const { GoogleGenerativeAI } = require("@google/generative-ai");
const User = require("../models/User");
const Exercise = require("../models/Exercise");
const Food = require("../models/Food");
const MealPlan = require("../models/MealPlan"); 
const MasterWorkoutPlan = require("../models/WorkoutPlan"); 
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Các hàm phụ trợ dịch thuật ngữ cho AI hiểu rõ hơn
const translateGoal = (goal) => {
  const map = { lose_weight: "Giảm cân / Giảm mỡ", gain_muscle: "Tăng cơ bắp", maintain: "Duy trì vóc dáng" };
  return map[goal] || "Cải thiện sức khỏe";
};

const translateLevel = (level) => {
  const map = { beginner: "Người mới bắt đầu (Cần tập nhẹ, chú trọng kỹ thuật)", intermediate: "Trung bình (Đã có nền tảng)", advanced: "Nâng cao (Cần cường độ cao)" };
  return map[level] || "Người mới bắt đầu";
};

const translateEquipment = (equipments) => {
  if (!equipments || equipments.length === 0) return "Không có dụng cụ";
  const map = { bodyweight: "Trọng lượng cơ thể", dumbbells: "Tạ đơn", pull_up_bar: "Xà đơn", resistance_bands: "Dây kháng lực", none: "Không cần dụng cụ" };
  return equipments.map(e => map[e] || e).join(", ");
};

// =========================================================================
// 1. API TẠO LỊCH TẬP (WORKOUT PLAN)
// =========================================================================
exports.generatePTWorkoutPlan = async (req, res) => {
  try {
    const userId = req.user.id; 
    const { customAvailability } = req.body; 

    // 1. Lấy Context người dùng
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "Không tìm thấy thông tin người dùng!" });

    // Trích xuất bệnh lý trực tiếp từ user
    const medicalInfo = user.medicalConditions && user.medicalConditions.length > 0 
      ? user.medicalConditions.join(", ") 
      : "Không có";
    
    // 2. Lọc Bài tập
    let exerciseQuery = { level: { $in: [user.fitnessLevel, "beginner"] } };
    if (user.workoutLocation === "home") {
      exerciseQuery.equipmentRequired = { $in: [...(user.availableEquipment || []), "none"] };
    }
    const availableExercises = await Exercise.find(exerciseQuery).select("_id name muscleGroup");
    const exerciseString = availableExercises.map(ex => `ID: ${ex._id} | ${ex.name} (${ex.muscleGroup})`).join("\n");

    // 3. Xử lý lịch rảnh
    const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    let weeklyAvailabilityContext = daysOfWeek.map(day => {
        let freeTime = (customAvailability && customAvailability[day]) ? customAvailability[day] : "Thời gian linh hoạt (Tự xếp lịch)";
        return `- ${day}: ${freeTime}`;
    }).join("\n");

    // 4. Khởi tạo Thông số Thể chất cho Prompt
    const physicalProfile = `
      - Tuổi: ${user.age || "Chưa rõ"} | Giới tính: ${user.gender || "Chưa rõ"}
      - Chiều cao: ${user.height ? user.height + " cm" : "Chưa rõ"} | Cân nặng: ${user.weight ? user.weight + " kg" : "Chưa rõ"}
      - Trình độ: ${translateLevel(user.fitnessLevel)}
      - Mục tiêu: ${translateGoal(user.goal)}
      - Nơi tập: ${user.workoutLocation === "gym" ? "Phòng Gym (Có đầy đủ máy móc)" : "Tại nhà"}
      - Dụng cụ có sẵn: ${translateEquipment(user.availableEquipment)}
      - Bệnh lý / Vấn đề sức khỏe: ${medicalInfo}
    `;

    // 5. Prompt cho AI
    const prompt = `
      Bạn là Huấn luyện viên Cá nhân chuyên nghiệp. Hãy tạo MỘT LỊCH TẬP CỐ ĐỊNH 7 NGÀY/TUẦN thật phù hợp với học viên sau:
      
      HỒ SƠ THỂ CHẤT & MỤC TIÊU:
      ${physicalProfile}
      
      LỊCH RẢNH CỦA HỌC VIÊN TRONG TUẦN:
      ${weeklyAvailabilityContext}
      
      NHIỆM VỤ ĐẶC BIỆT VỀ LỊCH TẬP:
      1. BẮT BUỘC trả về mảng "weeklyWorkouts" gồm ĐÚNG 7 PHẦN TỬ tương ứng 7 ngày trong tuần.
      2. QUAN TRỌNG NHẤT: BẮT BUỘC PHẢI CÓ TỪ 1 ĐẾN 3 NGÀY NGHỈ (Rest Day) tùy theo trình độ.
      3. Đối với ngày nghỉ: Đặt "isRestDay": true, mảng "exercises" rỗng [], "durationEstimated": 0.
      4. BẢO VỆ SỨC KHỎE: Dựa vào [Bệnh lý / Vấn đề sức khỏe: ${medicalInfo}] để chọn bài tập. TUYỆT ĐỐI NÉ các bài tập gây hại cho bệnh lý của họ (ví dụ: đau lưng thì cấm tập Deadlift nặng, đau gối cấm Squat nhảy...).
      5. Điều chỉnh "sets", "reps", "restTimeInSeconds" và viết "aiNotes" dựa trên mục tiêu, tuổi và bệnh lý.
      
      CHỈ DÙNG ID bài tập từ danh sách dưới đây. Cấm tự bịa ID:
      \n${exerciseString}

      TRẢ VỀ ĐÚNG ĐỊNH DẠNG JSON SAU (KHÔNG MARKDOWN THỪA):
      {
        "weeklyWorkouts": [
          {
            "dayOfWeek": "Monday",
            "title": "Push Day / Ngực - Vai - Tay sau",
            "scheduledTime": "17:00",
            "isRestDay": false,
            "durationEstimated": 60,
            "exercises": [ { "exerciseId": "ID_TỪ_DANH_SÁCH", "sets": 3, "reps": "10-12", "restTimeInSeconds": 90, "aiNotes": "Nhắc nhở kỹ thuật..." } ]
          }
        ]
      }
    `;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash", generationConfig: { responseMimeType: "application/json" } });
    const result = await model.generateContent(prompt);
    const parsedData = JSON.parse(result.response.text().replace(/```json/g, "").replace(/```/g, "").trim());

    let processedWorkouts = [];
    if (parsedData.weeklyWorkouts && parsedData.weeklyWorkouts.length > 0) {
      for (const dailyWorkout of parsedData.weeklyWorkouts) {
        let validExercises = [];
        if (!dailyWorkout.isRestDay && dailyWorkout.exercises) {
          validExercises = dailyWorkout.exercises.filter(ex => ex.exerciseId && ex.exerciseId.length === 24); 
        }
        processedWorkouts.push({
          dayOfWeek: dailyWorkout.dayOfWeek,
          title: dailyWorkout.isRestDay ? "Rest Day (Ngày Nghỉ)" : dailyWorkout.title,
          scheduledTime: dailyWorkout.scheduledTime || "",
          isRestDay: dailyWorkout.isRestDay || false,
          durationEstimated: dailyWorkout.durationEstimated || 0,
          exercises: validExercises
        });
      }
    }

    let savedMasterWorkout = await MasterWorkoutPlan.findOneAndUpdate(
      { userId: userId }, { $set: { weeklySchedule: processedWorkouts } }, { new: true, upsert: true }
    );

    res.status(200).json({ message: "Đã tạo thành công lịch tập 7 ngày!", masterWorkoutPlan: savedMasterWorkout });

  } catch (error) {
    console.error("Lỗi Controller Workout:", error);
    res.status(500).json({ message: "Lỗi tạo PT Workout Plan", error: error.message });
  }
};


// =========================================================================
// 2. API TẠO LỊCH ĂN (MEAL PLAN)
// =========================================================================
exports.generatePTMealPlan = async (req, res) => {
  try {
    const userId = req.user.id; 
    const { mealsPerDay = 3, mealPreferences = {}, customRequest = "" } = req.body; 
    const validMealsPerDay = Math.min(Math.max(parseInt(mealsPerDay) || 3, 3), 6);

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "Không tìm thấy thông tin người dùng!" });
    
    // Trích xuất bệnh lý trực tiếp từ user
    const medicalInfo = user.medicalConditions && user.medicalConditions.length > 0 
      ? user.medicalConditions.join(", ") 
      : "Không có";

    const target = {
        calories: user.targetMacros?.calories || 2000, 
        protein: user.targetMacros?.protein || 150,
        carbs: user.targetMacros?.carbs || 200,
        fat: user.targetMacros?.fat || 50
    };

    const availableFoods = await Food.find().select("_id name caloriesPer100g proteinPer100g carbsPer100g fatPer100g");
    const foodString = availableFoods.map(f => 
      `ID: ${f._id} | ${f.name} (${f.caloriesPer100g} kcal/100g, P: ${f.proteinPer100g}g, C: ${f.carbsPer100g}g, F: ${f.fatPer100g}g)`
    ).join("\n");

    let foodPreferencePrompt = "";
    if (mealPreferences && Object.keys(mealPreferences).length > 0) {
        let totalSelectedProtein = 0, totalSelectedCarbs = 0, totalSelectedFat = 0;
        let totalFoodsSelected = 0, lockedMealsCount = 0;
        foodPreferencePrompt = "- QUY TẮC THÉP VỀ BỮA ĂN (CẤM LÀM SAI):\n";
        
        for (const [mealType, foodInput] of Object.entries(mealPreferences)) {
            const foodIdsArray = Array.isArray(foodInput) ? foodInput : [foodInput];
            let foundFoods = [];
            
            for (const foodId of foodIdsArray) {
                if (foodId && foodId.trim() !== "") {
                    const selectedFood = availableFoods.find(f => f._id.toString() === foodId.trim());
                    if (selectedFood) {
                        foundFoods.push(`"${selectedFood.name}" (ID: ${selectedFood._id})`);
                        totalSelectedProtein += selectedFood.proteinPer100g || 0;
                        totalSelectedCarbs += selectedFood.carbsPer100g || 0;
                        totalSelectedFat += selectedFood.fatPer100g || 0;
                        totalFoodsSelected++;
                    }
                }
            }

            if (foundFoods.length > 0) {
                lockedMealsCount++;
                foodPreferencePrompt += `  + Bữa "${mealType}": CHỈ ĐƯỢC PHÉP DÙNG DUY NHẤT các món [${foundFoods.join(", ")}]. TUYỆT ĐỐI KHÔNG ĐƯỢC THÊM BẤT KỲ MÓN NÀO KHÁC.\n`;
            }
        }

        if (lockedMealsCount > 0) {
            const totalMacros = totalSelectedProtein + totalSelectedCarbs + totalSelectedFat;
            if (totalMacros > 0) {
                if ((totalSelectedProtein / totalMacros) < 0.1) return res.status(400).json({ message: "Lịch ăn cố định thiếu hụt Đạm trầm trọng!" });
                if ((totalSelectedCarbs / totalMacros) < 0.05) return res.status(400).json({ message: "Lịch ăn cố định thiếu hụt Tinh bột trầm trọng!" });
            }
            if (lockedMealsCount >= (validMealsPerDay / 2) && (totalFoodsSelected / lockedMealsCount) < 1.5) {
                 return res.status(400).json({ message: "Bạn đang chọn quá ít món ăn cho các bữa cố định. Hãy mix đa dạng ít nhất 2-3 món nhé!" });
            }
        }
    }

    const dietProfile = `
      - Tuổi: ${user.age || "Chưa rõ"} | Giới tính: ${user.gender || "Chưa rõ"}
      - Chiều cao: ${user.height ? user.height + " cm" : "Chưa rõ"} | Cân nặng: ${user.weight ? user.weight + " kg" : "Chưa rõ"}
      - Mục tiêu: ${translateGoal(user.goal)}
      - Bệnh lý / Vấn đề sức khỏe: ${medicalInfo}
    `;

    const prompt = `
      Bạn là Huấn luyện viên Dinh dưỡng và Bác sĩ Y Khoa. Hãy tạo một LỊCH ĂN CỐ ĐỊNH (Master Plan) an toàn cho học viên.
      
      HỒ SƠ THỂ CHẤT, Y TẾ & MỤC TIÊU:
      ${dietProfile}
      - Macro mục tiêu: ~${target.calories} kcal (P: ${target.protein}g, C: ${target.carbs}g, F: ${target.fat}g).
      - Số bữa ăn yêu cầu: BẮT BUỘC CHIA THÀNH ĐÚNG ${validMealsPerDay} BỮA.
      
      YÊU CẦU ĐẶC BIỆT TỪ HỌC VIÊN:
      "${customRequest || "Không có yêu cầu gì đặc biệt, hãy thiết kế đồ ăn khoa học, dễ tìm và tối ưu nhất theo mục tiêu."}"

      ${foodPreferencePrompt}
      
      NHIỆM VỤ ĐẶC BIỆT VỀ LỊCH ĂN:
      1. Đặt tên "mealType" phù hợp với văn hóa.
      2. Tuân thủ tuyệt đối QUY TẮC THÉP VỀ BỮA ĂN (nếu có).
      3. BẢO VỆ SỨC KHỎE: Dựa vào [Bệnh lý: ${medicalInfo}], TUYỆT ĐỐI KHÔNG đưa vào thực đơn những thực phẩm cấm kỵ hoặc gây hại (ví dụ: tiểu đường cấm đường, gout cấm nội tạng/hải sản, dạ dày cấm chua/cay).
      4. Tự tính toán "quantityInGrams" sao cho TỔNG lượng calo xấp xỉ ${target.calories} kcal.
      
      CHỈ DÙNG ID món ăn từ danh sách dưới đây:
      \n${foodString}

      TRẢ VỀ ĐÚNG ĐỊNH DẠNG JSON SAU (KHÔNG MARKDOWN THỪA):
      {
        "meals": [
          { "mealType": "Tên Bữa Ăn", "scheduledTime": "HH:mm", "items": [ { "foodId": "ID", "quantityInGrams": 200 } ] }
        ]
      }
    `;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash", generationConfig: { responseMimeType: "application/json" } });
    const result = await model.generateContent(prompt);
    const parsedData = JSON.parse(result.response.text().replace(/```json/g, "").replace(/```/g, "").trim());

    let aiCalculatedCalories = 0;
    for (const meal of parsedData.meals) {
      for (const item of meal.items) {
        const foodData = availableFoods.find(f => f._id.toString() === item.foodId);
        if (foodData) aiCalculatedCalories += (foodData.caloriesPer100g * (item.quantityInGrams / 100));
      }
    }

    let scaleFactor = 1;
    if (aiCalculatedCalories > 0) scaleFactor = target.calories / aiCalculatedCalories;

    let dailyTotal = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    const processedMeals = [];

    for (const meal of parsedData.meals) {
      let mealTotal = { calories: 0, protein: 0, carbs: 0, fat: 0 };
      const processedItems = [];

      for (const item of meal.items) {
        const foodData = availableFoods.find(f => f._id.toString() === item.foodId);
        if (foodData) {
          let exactGrams = Number(item.quantityInGrams) * scaleFactor;
          let finalGrams = Math.round(exactGrams / 10) * 10;
          if (finalGrams < 10) finalGrams = 10;

          const ratio = finalGrams / 100;
          const calcItem = {
            foodId: foodData._id, 
            foodName: foodData.name, 
            quantityInGrams: finalGrams, 
            calories: Math.round(foodData.caloriesPer100g * ratio),
            protein: Math.round((foodData.proteinPer100g * ratio) * 10) / 10,
            carbs: Math.round((foodData.carbsPer100g * ratio) * 10) / 10,
            fat: Math.round((foodData.fatPer100g * ratio) * 10) / 10,
          };
          
          mealTotal.calories += calcItem.calories; 
          mealTotal.protein += calcItem.protein; 
          mealTotal.carbs += calcItem.carbs; 
          mealTotal.fat += calcItem.fat;
          
          processedItems.push(calcItem);
        }
      }
      
      dailyTotal.calories += mealTotal.calories; 
      dailyTotal.protein += mealTotal.protein; 
      dailyTotal.carbs += mealTotal.carbs; 
      dailyTotal.fat += mealTotal.fat;

      if (processedItems.length > 0) {
        processedMeals.push({ mealType: meal.mealType, scheduledTime: meal.scheduledTime, items: processedItems, mealTotal });
      }
    }

    let savedMealPlan = await MealPlan.findOneAndUpdate(
      { userId: userId }, { $set: { dailyTotal: dailyTotal, meals: processedMeals } }, { new: true, upsert: true } 
    );

    res.status(200).json({ 
      message: `Đã tạo thành công lộ trình dinh dưỡng!`, 
      targetMacros: target, 
      masterMealPlan: savedMealPlan 
    });

  } catch (error) {
    console.error("Lỗi Controller Meal:", error);
    res.status(500).json({ message: "Lỗi tạo PT Meal Plan", error: error.message });
  }
};