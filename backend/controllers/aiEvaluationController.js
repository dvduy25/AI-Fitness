const User = require("../models/User");
const MealPlan = require("../models/MealPlan");
const MasterWorkoutPlan = require("../models/WorkoutPlan");
const DailyDietLog = require("../models/DailyDietLog");
const WorkoutLog = require("../models/WorkoutLog");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Khởi tạo Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ==========================================
// 1. AI ĐÁNH GIÁ LỊCH ĂN (MASTER MEAL PLAN)
// ==========================================
exports.evaluateMasterMealPlan = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // 1. Lấy thông tin user & lịch ăn
    const user = await User.findById(userId);
    const mealPlan = await MealPlan.findOne({ userId });

    if (!user || !mealPlan) {
      return res.status(404).json({ message: "Không tìm thấy người dùng hoặc bạn chưa có Lịch ăn gốc (Master Meal Plan)." });
    }

    const diseases = user.medicalConditions && user.medicalConditions.length > 0 
      ? user.medicalConditions.join(", ") 
      : "Không có bệnh lý nền";

    const goalText = user.goal === 'lose_weight' ? 'Giảm cân' : user.goal === 'gain_muscle' ? 'Tăng cơ' : 'Duy trì';

    // 2. Format dữ liệu lịch ăn cho AI đọc
    const planText = mealPlan.meals.map(m => {
      const itemsText = m.items.map(i => `- ${i.foodName}: ${i.quantityInGrams}g (${i.calories} kcal)`).join("\n");
      return `Bữa: ${m.mealType} (Lúc ${m.scheduledTime || 'Không rõ'} - ${m.mealTotal.calories} kcal)\n${itemsText}`;
    }).join("\n\n");

    // 3. Prompt cực mạnh cho Gemini đóng vai Bác sĩ Dinh dưỡng
    const prompt = `Bạn là một Bác sĩ Dinh dưỡng chuyên nghiệp và AI Fitness Coach.
Nhiệm vụ: Đánh giá LỊCH ĂN CỐ ĐỊNH (Master Meal Plan) của người dùng xem có phù hợp với THỂ TRẠNG, MỤC TIÊU và đặc biệt là BỆNH LÝ của họ không.

THÔNG TIN NGƯỜI DÙNG:
- Tuổi: ${user.age}, Giới tính: ${user.gender}, Cao: ${user.height}cm, Nặng: ${user.weight}kg
- Mục tiêu: ${goalText}
- Tình trạng bệnh lý / Y tế: ${diseases}
- Macro mục tiêu mỗi ngày: ${mealPlan.dailyTotal.calories} kcal (Đạm: ${mealPlan.dailyTotal.protein}g, Tinh bột: ${mealPlan.dailyTotal.carbs}g, Béo: ${mealPlan.dailyTotal.fat}g)

CHI TIẾT LỊCH ĂN:
${planText}

YÊU CẦU ĐẦU RA (ĐỊNH DẠNG JSON CHUẨN MỰC):
{
  "score": 8.5, // Thang điểm 10 cho độ phù hợp
  "overview": "Đánh giá tổng quan 1-2 câu",
  "medicalWarnings": ["Cảnh báo 1 liên quan đến bệnh lý (nếu có)", "Cảnh báo 2..."],
  "strengths": ["Ưu điểm 1 của lịch ăn", "Ưu điểm 2..."],
  "improvements": ["Điểm cần cải thiện 1", "Món ăn nên thay thế do bệnh lý..."]
}`;

    // 4. Gọi Gemini
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash", generationConfig: { responseMimeType: "application/json" } });
    const result = await model.generateContent(prompt);
    const aiData = JSON.parse(result.response.text());

    res.status(200).json({ success: true, data: aiData });
  } catch (error) {
    console.error("Lỗi AI đánh giá lịch ăn:", error);
    res.status(500).json({ message: "Lỗi hệ thống khi phân tích lịch ăn." });
  }
};


// ==========================================
// 2. AI ĐÁNH GIÁ LỊCH TẬP (MASTER WORKOUT PLAN)
// ==========================================
exports.evaluateMasterWorkoutPlan = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // 1. Lấy thông tin user & lịch tập (Populate exerciseId để lấy tên bài tập)
    const user = await User.findById(userId);
    const workoutPlan = await MasterWorkoutPlan.findOne({ userId }).populate("weeklySchedule.exercises.exerciseId");

    if (!user || !workoutPlan) {
      return res.status(404).json({ message: "Không tìm thấy người dùng hoặc bạn chưa có Lịch tập gốc (Master Workout Plan)." });
    }

    const diseases = user.medicalConditions && user.medicalConditions.length > 0 
      ? user.medicalConditions.join(", ") 
      : "Không có bệnh lý nền";
      
    const goalText = user.goal === 'lose_weight' ? 'Giảm cân' : user.goal === 'gain_muscle' ? 'Tăng cơ' : 'Duy trì';

    // 2. Format dữ liệu lịch tập cho AI đọc
    const planText = workoutPlan.weeklySchedule.map(day => {
      if (day.isRestDay) return `${day.dayOfWeek}: Nghỉ ngơi`;
      
      const exercisesText = day.exercises.map(ex => {
        // Đề phòng exerciseId bị null/xóa
        const exName = ex.exerciseId ? (ex.exerciseId.name || ex.exerciseId.exerciseName || "Bài tập không xác định") : "Bài tập tùy chỉnh";
        return `- ${exName}: ${ex.sets} hiệp x ${ex.reps} (Nghỉ ${ex.restTimeInSeconds}s)`;
      }).join("\n");
      
      return `${day.dayOfWeek} - ${day.title} (Ước tính: ${day.durationEstimated} phút):\n${exercisesText}`;
    }).join("\n\n");

    // 3. Prompt cực mạnh cho Gemini đóng vai Bác sĩ Y học Thể thao & PT
    const prompt = `Bạn là một Chuyên gia Vật lý trị liệu, Bác sĩ Y học Thể thao và Huấn luyện viên cá nhân cấp cao.
Nhiệm vụ: Đánh giá LỊCH TẬP XUYÊN SUỐT (Master Workout Plan) của người dùng xem có an toàn và hiệu quả dựa trên BỆNH LÝ và THỂ TRẠNG của họ không.

THÔNG TIN NGƯỜI DÙNG:
- Trình độ: ${user.fitnessLevel}
- Nơi tập: ${user.workoutLocation}
- Dụng cụ có sẵn: ${user.availableEquipment.join(", ")}
- Mục tiêu: ${goalText}
- Tình trạng bệnh lý / Y tế (QUAN TRỌNG NHẤT): ${diseases}

CHI TIẾT LỊCH TẬP HÀNG TUẦN:
${planText}

YÊU CẦU ĐẦU RA (ĐỊNH DẠNG JSON CHUẨN MỰC):
{
  "safetyScore": 8.0, // Thang điểm 10 về mức độ an toàn (tránh chấn thương/bệnh lý)
  "effectivenessScore": 8.5, // Thang điểm 10 về hiệu quả đạt mục tiêu
  "overview": "Đánh giá tổng quan 1-2 câu",
  "medicalWarnings": ["Cảnh báo cực kỳ quan trọng về bài tập nào đó rủi ro cho bệnh lý của họ", "Lưu ý an toàn..."],
  "strengths": ["Ưu điểm 1", "Ưu điểm 2..."],
  "adjustments": ["Bài tập cần thay thế do rủi ro", "Điều chỉnh thời gian nghỉ / số hiệp..."]
}`;

    // 4. Gọi Gemini
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash", generationConfig: { responseMimeType: "application/json" } });
    const result = await model.generateContent(prompt);
    const aiData = JSON.parse(result.response.text());

    res.status(200).json({ success: true, data: aiData });
  } catch (error) {
    console.error("Lỗi AI đánh giá lịch tập:", error);
    res.status(500).json({ message: "Lỗi hệ thống khi phân tích lịch tập." });
  }
};

// ==========================================
// 3. AI ĐÁNH GIÁ NHẬT KÝ ĂN UỐNG HẰNG NGÀY
// ==========================================
exports.evaluateDietWithGemini = async (req, res) => {
  try {
    const userId = req.user.id;
    // Mặc định lấy ngày hôm nay, hoặc truyền từ query (?date=YYYY-MM-DD)
    const queryDate = req.query.date ? new Date(req.query.date) : new Date();
    queryDate.setHours(0, 0, 0, 0);

    // 1. Lấy thông tin User và Mục tiêu
    const user = await User.findById(userId);
    if (!user || !user.targetMacros) {
      return res.status(400).json({ message: "Chưa có mục tiêu dinh dưỡng trong hồ sơ." });
    }

    // 2. Lấy Nhật ký ăn uống thực tế hôm nay
    const dietLog = await DailyDietLog.findOne({
      userId,
      date: {
        $gte: queryDate,
        $lt: new Date(queryDate.getTime() + 24 * 60 * 60 * 1000)
      }
    });

    if (!dietLog || dietLog.consumedMeals.length === 0) {
      return res.status(200).json({
        hasData: false,
        message: "Bạn chưa ghi nhận bữa ăn nào trong ngày này để AI có thể đánh giá."
      });
    }

    // 3. Xử lý dữ liệu món ăn thành dạng Text cho Gemini dễ đọc
    const mealsText = dietLog.consumedMeals.map(meal => {
      const items = meal.items.map(i => `- ${i.foodName}: ${i.quantityInGrams}g (${i.calories} kcal, Đạm: ${i.protein}g, Béo: ${i.fat}g)`).join("\n");
      return `Bữa ${meal.mealType} (${meal.mealTotal.calories} kcal):\n${items}`;
    }).join("\n\n");

    // 4. CHUẨN BỊ PROMPT CHO GEMINI
    const prompt = `Bạn là một chuyên gia dinh dưỡng và huấn luyện viên cá nhân (AI Fitness Coach). 
Nhiệm vụ của bạn là đánh giá các bữa ăn trong ngày của người dùng, so sánh thực tế với mục tiêu và đưa ra nhận xét, giải pháp cá nhân hóa.

THÔNG TIN NGƯỜI DÙNG:
- Mục tiêu: ${user.goal === 'lose_weight' ? 'Giảm cân/Giảm mỡ' : user.goal === 'gain_muscle' ? 'Tăng cơ' : 'Duy trì vóc dáng'}
- Mục tiêu cần đạt (Target): ${user.targetMacros.calories} kcal, Đạm: ${user.targetMacros.protein}g, Tinh bột: ${user.targetMacros.carbs}g, Béo: ${user.targetMacros.fat}g
- Thực tế đã nạp (Actual): ${dietLog.actualDailyTotal.calories} kcal, Đạm: ${dietLog.actualDailyTotal.protein}g, Tinh bột: ${dietLog.actualDailyTotal.carbs}g, Béo: ${dietLog.actualDailyTotal.fat}g

CHI TIẾT CÁC MÓN ĐÃ ĂN HÔM NAY:
${mealsText}

YÊU CẦU ĐẦU RA (OUTPUT FORMAT BẮT BUỘC LÀ JSON):
{
  "evaluation": {
    "overallStatus": "good" | "warning" | "danger", 
    "calories": "Nhận xét ngắn gọn về lượng Calo nạp vào",
    "protein": "Nhận xét lượng Đạm",
    "carbs": "Nhận xét lượng Tinh bột",
    "fat": "Nhận xét lượng Chất béo"
  },
  "solutions": [
    "Lời khuyên 1 (ví dụ: Bạn ăn hơi nhiều đồ chiên ở bữa trưa, hãy bù đắp bằng việc...)",
    "Lời khuyên 2 (ví dụ: Bạn thiếu đạm để tăng cơ, ngày mai nên bổ sung món...)"
  ]
}`;

    // 5. Gọi Gemini (Dùng model gemini-2.5-flash vì nó cực nhanh và xử lý JSON cực tốt)
    const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        generationConfig: { 
            responseMimeType: "application/json" // Yêu cầu Gemini ép kiểu trả về JSON chuẩn 100%
        }
    });

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // Parse JSON từ Gemini trả về
    const aiData = JSON.parse(responseText);

    // 6. Trả kết quả về cho Frontend
    res.status(200).json({
      hasData: true,
      data: {
        goal: user.goal,
        metrics: {
          actual: dietLog.actualDailyTotal,
          target: user.targetMacros
        },
        evaluation: aiData.evaluation,
        solutions: aiData.solutions
      }
    });

  } catch (error) {
    console.error("Lỗi Gemini đánh giá bữa ăn:", error);
    res.status(500).json({ message: "Đã xảy ra lỗi khi AI phân tích dữ liệu!" });
  }
};


// ==========================================
// 4. AI ĐÁNH GIÁ SỰ TIẾN BỘ CỦA TỪNG BÀI TẬP
// ==========================================
exports.evaluateExerciseProgress = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentLogId, exerciseId } = req.body;

    // 1. Lấy dữ liệu bài tập của buổi hôm nay
    const currentLog = await WorkoutLog.findOne({ _id: currentLogId, userId })
      .populate("exercises.exerciseId", "name muscleGroup");

    if (!currentLog) return res.status(404).json({ message: "Không tìm thấy nhật ký tập hôm nay." });

    const currentExerciseData = currentLog.exercises.find(
      ex => ex.exerciseId._id.toString() === exerciseId
    );

    if (!currentExerciseData) return res.status(404).json({ message: "Không tìm thấy bài tập này trong hôm nay." });

    // 2. Tìm buổi tập GẦN NHẤT TRƯỚC ĐÓ có chứa bài tập này
    const previousLog = await WorkoutLog.findOne({
      userId,
      date: { $lt: currentLog.date }, // Ngày phải bé hơn ngày hiện tại
      "exercises.exerciseId": exerciseId // Buổi đó phải có tập bài này
    })
    .sort({ date: -1 }) // Lấy buổi gần nhất
    .populate("exercises.exerciseId", "name");

    // Nếu chưa từng tập bài này trước đây
    if (!previousLog) {
      return res.status(200).json({ 
        exerciseName: currentExerciseData.exerciseId.name,
        evaluation: `Bạn vừa hoàn thành bài **${currentExerciseData.exerciseId.name}** lần đầu tiên trên hệ thống! Hãy cố gắng duy trì form chuẩn và tăng dần mức tạ ở các buổi sau nhé.` 
      });
    }

    const previousExerciseData = previousLog.exercises.find(
      ex => ex.exerciseId._id.toString() === exerciseId
    );

    // 3. Chuẩn bị dữ liệu dạng Text cho AI hiểu
    const formatSets = (sets) => {
      return sets.map(s => `Hiệp ${s.setNumber}: ${s.weight}kg x ${s.reps} reps`).join("\n");
    };

    const exerciseName = currentExerciseData.exerciseId.name;
    const currentStats = formatSets(currentExerciseData.setsPerformed);
    const previousStats = formatSets(previousExerciseData.setsPerformed);
    const prevDate = new Date(previousLog.date).toLocaleDateString('vi-VN');

    // 4. Gọi AI Prompt
    const prompt = `
      Bạn là một huấn luyện viên thể hình cá nhân (PT) chuyên nghiệp.
      Hãy phân tích sự tiến bộ của học viên đối với bài tập: "${exerciseName}".
      
      Dữ liệu lần tập trước (Ngày ${prevDate}):
      ${previousStats}

      Dữ liệu lần tập hôm nay:
      ${currentStats}

      Yêu cầu trả lời bằng tiếng Việt, định dạng Markdown, chia làm 3 phần ngắn gọn, súc tích:
      1. 📊 Đánh giá: So sánh tổng volume (tạ x số lần), mức tạ tối đa. Học viên có đang tiến bộ không?
      2. 💡 Nhận xét: Khen ngợi hoặc chỉ ra dấu hiệu chững tạ / quá sức.
      3. 🎯 Giải pháp cho buổi tới: Đưa ra lời khuyên cụ thể (Ví dụ: Giữ nguyên tạ nhưng tăng thêm 2 reps, hoặc tăng thêm 2.5kg tạ...).
    `;

    // 5. GỌI GEMINI AI THỰC TẾ
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    const aiResponse = result.response.text();

    res.status(200).json({ 
      exerciseName,
      previousDate: prevDate,
      evaluation: aiResponse 
    });

  } catch (error) {
    console.error("Lỗi AI đánh giá bài tập:", error);
    res.status(500).json({ message: "Lỗi hệ thống khi phân tích bài tập." });
  }
};