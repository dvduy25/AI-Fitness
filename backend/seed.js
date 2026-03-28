require("dotenv").config();
const mongoose = require("mongoose");

const Exercise = require("./models/Exercise");
const Food = require("./models/Food");

// ==========================================
// 1. DATA BÀI TẬP (Phân loại theo nhóm cơ)
// ==========================================
const sampleExercises = [
  // Ngực (Chest)
  { name: "Hít đất (Push Up)", muscleGroup: "Ngực", level: "beginner", equipmentRequired: "bodyweight" },
  { name: "Hít đất dốc lên (Incline Push Up)", muscleGroup: "Ngực", level: "beginner", equipmentRequired: "bodyweight" },
  { name: "Đẩy tạ đòn ghế bằng (Bench Press)", muscleGroup: "Ngực", level: "intermediate", equipmentRequired: "barbell" },
  { name: "Đẩy tạ đơn ghế dốc lên (Incline Dumbbell Press)", muscleGroup: "Ngực", level: "intermediate", equipmentRequired: "dumbbells" },
  { name: "Ép ngực với cáp (Cable Crossover)", muscleGroup: "Ngực", level: "intermediate", equipmentRequired: "cable_machine" },
  { name: "Bơm ngực xà kép (Chest Dips)", muscleGroup: "Ngực", level: "advanced", equipmentRequired: "dip_station" },

  // Lưng (Back)
  { name: "Kéo xà đơn (Pull Up)", muscleGroup: "Lưng", level: "intermediate", equipmentRequired: "pull_up_bar" },
  { name: "Kéo xà đơn ngửa tay (Chin Up)", muscleGroup: "Lưng", level: "intermediate", equipmentRequired: "pull_up_bar" },
  { name: "Kéo cáp xô xuống (Lat Pulldown)", muscleGroup: "Lưng", level: "beginner", equipmentRequired: "cable_machine" },
  { name: "Chèo thuyền tạ đòn (Barbell Row)", muscleGroup: "Lưng", level: "advanced", equipmentRequired: "barbell" },
  { name: "Chèo thuyền tạ đơn (Dumbbell Row)", muscleGroup: "Lưng", level: "intermediate", equipmentRequired: "dumbbells" },
  { name: "Deadlift cơ bản", muscleGroup: "Lưng", level: "advanced", equipmentRequired: "barbell" },

  // Chân & Mông (Legs & Glutes)
  { name: "Squat cơ bản (Bodyweight Squat)", muscleGroup: "Chân", level: "beginner", equipmentRequired: "bodyweight" },
  { name: "Gánh tạ đòn (Barbell Squat)", muscleGroup: "Chân", level: "intermediate", equipmentRequired: "barbell" },
  { name: "Chùng chân (Lunges)", muscleGroup: "Chân", level: "beginner", equipmentRequired: "bodyweight" },
  { name: "Đạp đùi (Leg Press)", muscleGroup: "Chân", level: "beginner", equipmentRequired: "machine" },
  { name: "Nâng tạ đùi sau (Romanian Deadlift - RDL)", muscleGroup: "Chân", level: "intermediate", equipmentRequired: "barbell" },
  { name: "Squat kiểu Bulgaria (Bulgarian Split Squat)", muscleGroup: "Chân", level: "advanced", equipmentRequired: "dumbbells" },
  { name: "Đẩy hông (Hip Thrust)", muscleGroup: "Mông", level: "intermediate", equipmentRequired: "barbell" },

  // Vai (Shoulders)
  { name: "Đẩy tạ đơn qua đầu (Dumbbell Shoulder Press)", muscleGroup: "Vai", level: "intermediate", equipmentRequired: "dumbbells" },
  { name: "Đẩy tạ đòn qua đầu (Overhead Press)", muscleGroup: "Vai", level: "advanced", equipmentRequired: "barbell" },
  { name: "Dang tạ hai bên (Lateral Raise)", muscleGroup: "Vai", level: "beginner", equipmentRequired: "dumbbells" },
  { name: "Nâng tạ ra trước (Front Raise)", muscleGroup: "Vai", level: "beginner", equipmentRequired: "dumbbells" },
  { name: "Kéo cáp ngang mặt (Face Pull)", muscleGroup: "Vai", level: "intermediate", equipmentRequired: "cable_machine" },

  // Tay (Arms: Biceps & Triceps)
  { name: "Cuốn tạ tay (Dumbbell Bicep Curl)", muscleGroup: "Tay", level: "beginner", equipmentRequired: "dumbbells" },
  { name: "Cuốn tạ đòn (Barbell Curl)", muscleGroup: "Tay", level: "intermediate", equipmentRequired: "barbell" },
  { name: "Cuốn tạ hình búa (Hammer Curl)", muscleGroup: "Tay", level: "beginner", equipmentRequired: "dumbbells" },
  { name: "Kéo cáp tay sau (Tricep Pushdown)", muscleGroup: "Tay", level: "beginner", equipmentRequired: "cable_machine" },
  { name: "Đẩy tạ đơn sau gáy (Overhead Tricep Extension)", muscleGroup: "Tay", level: "intermediate", equipmentRequired: "dumbbells" },

  // Bụng & Lõi (Core)
  { name: "Gập bụng (Crunch)", muscleGroup: "Bụng", level: "beginner", equipmentRequired: "bodyweight" },
  { name: "Đo ván (Plank)", muscleGroup: "Bụng", level: "beginner", equipmentRequired: "bodyweight" },
  { name: "Nâng chân (Hanging Leg Raise)", muscleGroup: "Bụng", level: "intermediate", equipmentRequired: "pull_up_bar" },
  { name: "Xoay người kiểu Nga (Russian Twist)", muscleGroup: "Bụng", level: "beginner", equipmentRequired: "bodyweight" },
  { name: "Lăn bánh xe (Ab Wheel Rollout)", muscleGroup: "Bụng", level: "advanced", equipmentRequired: "ab_wheel" },

  // Cardio & Toàn thân
  { name: "Nhảy dây (Jump Rope)", muscleGroup: "Toàn thân", level: "beginner", equipmentRequired: "jump_rope" },
  { name: "Chạy bộ nâng cao đùi (High Knees)", muscleGroup: "Toàn thân", level: "beginner", equipmentRequired: "bodyweight" },
  { name: "Burpees", muscleGroup: "Toàn thân", level: "advanced", equipmentRequired: "bodyweight" },
  { name: "Leo núi tại chỗ (Mountain Climbers)", muscleGroup: "Toàn thân", level: "beginner", equipmentRequired: "bodyweight" }
];

// ==========================================
// 2. DATA ĐỒ ĂN (Tính trên 100 gram)
// ==========================================
const sampleFoods = [
  // Nguồn Protein (Thịt, Cá, Trứng, Đậu)
  { name: "Ức gà luộc", caloriesPer100g: 165, proteinPer100g: 31, carbsPer100g: 0, fatPer100g: 3.6 },
  { name: "Đùi gà nướng (bỏ da)", caloriesPer100g: 175, proteinPer100g: 24, carbsPer100g: 0, fatPer100g: 8 },
  { name: "Thịt bò thăn", caloriesPer100g: 250, proteinPer100g: 26, carbsPer100g: 0, fatPer100g: 15 },
  { name: "Thịt lợn nạc vai", caloriesPer100g: 143, proteinPer100g: 21, carbsPer100g: 0, fatPer100g: 6 },
  { name: "Cá hồi áp chảo", caloriesPer100g: 206, proteinPer100g: 22, carbsPer100g: 0, fatPer100g: 13 },
  { name: "Cá ngừ ngâm nước", caloriesPer100g: 116, proteinPer100g: 26, carbsPer100g: 0, fatPer100g: 1 },
  { name: "Cá rô phi phi lê", caloriesPer100g: 96, proteinPer100g: 20, carbsPer100g: 0, fatPer100g: 1.7 },
  { name: "Tôm luộc", caloriesPer100g: 99, proteinPer100g: 24, carbsPer100g: 0.2, fatPer100g: 0.3 },
  { name: "Mực luộc", caloriesPer100g: 92, proteinPer100g: 15.6, carbsPer100g: 3, fatPer100g: 1.4 },
  { name: "Trứng gà luộc", caloriesPer100g: 155, proteinPer100g: 13, carbsPer100g: 1.1, fatPer100g: 11 },
  { name: "Lòng trắng trứng", caloriesPer100g: 52, proteinPer100g: 11, carbsPer100g: 0.7, fatPer100g: 0.2 },
  { name: "Đậu hũ non", caloriesPer100g: 61, proteinPer100g: 6.5, carbsPer100g: 1.3, fatPer100g: 3.7 },
  { name: "Sữa tươi không đường", caloriesPer100g: 50, proteinPer100g: 3.3, carbsPer100g: 4.8, fatPer100g: 1.5 },
  { name: "Bột Whey Protein (1 muỗng ~30g, quy ra 100g)", caloriesPer100g: 370, proteinPer100g: 80, carbsPer100g: 8, fatPer100g: 2 },

  // Nguồn Tinh bột (Carbs)
  { name: "Cơm trắng", caloriesPer100g: 130, proteinPer100g: 2.7, carbsPer100g: 28, fatPer100g: 0.3 },
  { name: "Cơm gạo lứt", caloriesPer100g: 111, proteinPer100g: 2.6, carbsPer100g: 23, fatPer100g: 0.9 },
  { name: "Khoai lang luộc", caloriesPer100g: 86, proteinPer100g: 1.6, carbsPer100g: 20, fatPer100g: 0.1 },
  { name: "Khoai tây luộc", caloriesPer100g: 87, proteinPer100g: 1.9, carbsPer100g: 20, fatPer100g: 0.1 },
  { name: "Yến mạch (chưa nấu)", caloriesPer100g: 389, proteinPer100g: 16.9, carbsPer100g: 66, fatPer100g: 6.9 },
  { name: "Bánh mì đen (Lúa mạch đen)", caloriesPer100g: 259, proteinPer100g: 9, carbsPer100g: 48, fatPer100g: 3.3 },
  { name: "Bún tươi", caloriesPer100g: 110, proteinPer100g: 1.7, carbsPer100g: 24, fatPer100g: 0 },
  { name: "Phở lứt", caloriesPer100g: 120, proteinPer100g: 2.5, carbsPer100g: 25, fatPer100g: 0.5 },
  { name: "Bắp (Ngô) ngọt luộc", caloriesPer100g: 86, proteinPer100g: 3.2, carbsPer100g: 19, fatPer100g: 1.2 },

  // Nguồn Rau củ (Vitamin & Chất xơ)
  { name: "Súp lơ xanh (Bông cải xanh) luộc", caloriesPer100g: 35, proteinPer100g: 2.4, carbsPer100g: 7, fatPer100g: 0.4 },
  { name: "Rau muống luộc", caloriesPer100g: 19, proteinPer100g: 3.2, carbsPer100g: 3.1, fatPer100g: 0 },
  { name: "Cải bó xôi (Rau bina) luộc", caloriesPer100g: 23, proteinPer100g: 3, carbsPer100g: 3.8, fatPer100g: 0.3 },
  { name: "Cải bắp luộc", caloriesPer100g: 22, proteinPer100g: 1.1, carbsPer100g: 5.1, fatPer100g: 0.1 },
  { name: "Cà rốt luộc", caloriesPer100g: 35, proteinPer100g: 0.8, carbsPer100g: 8.2, fatPer100g: 0.2 },
  { name: "Bí đỏ luộc", caloriesPer100g: 20, proteinPer100g: 0.7, carbsPer100g: 4.9, fatPer100g: 0.1 },
  { name: "Cà chua sống", caloriesPer100g: 18, proteinPer100g: 0.9, carbsPer100g: 3.9, fatPer100g: 0.2 },
  { name: "Dưa leo (Dưa chuột)", caloriesPer100g: 15, proteinPer100g: 0.6, carbsPer100g: 3.6, fatPer100g: 0.1 },

  // Trái cây & Nguồn Chất béo (Fats)
  { name: "Chuối", caloriesPer100g: 89, proteinPer100g: 1.1, carbsPer100g: 23, fatPer100g: 0.3 },
  { name: "Táo", caloriesPer100g: 52, proteinPer100g: 0.3, carbsPer100g: 14, fatPer100g: 0.2 },
  { name: "Cam", caloriesPer100g: 47, proteinPer100g: 0.9, carbsPer100g: 12, fatPer100g: 0.1 },
  { name: "Đu đủ", caloriesPer100g: 43, proteinPer100g: 0.5, carbsPer100g: 11, fatPer100g: 0.1 },
  { name: "Quả bơ (Avocado)", caloriesPer100g: 160, proteinPer100g: 2, carbsPer100g: 8.5, fatPer100g: 15 },
  { name: "Hạnh nhân (Almonds)", caloriesPer100g: 579, proteinPer100g: 21, carbsPer100g: 22, fatPer100g: 50 },
  { name: "Hạt óc chó", caloriesPer100g: 654, proteinPer100g: 15, carbsPer100g: 14, fatPer100g: 65 },
  { name: "Bơ đậu phộng nguyên chất", caloriesPer100g: 588, proteinPer100g: 25, carbsPer100g: 20, fatPer100g: 50 },
  { name: "Dầu ô liu", caloriesPer100g: 884, proteinPer100g: 0, carbsPer100g: 0, fatPer100g: 100 }
];

async function seedDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("🔌 Đã kết nối Database thành công!");

    await Exercise.deleteMany({});
    await Food.deleteMany({});
    console.log("🧹 Đã dọn dẹp sạch Database cũ...");

    await Exercise.insertMany(sampleExercises);
    await Food.insertMany(sampleFoods);
    
    console.log(`✅ Bơm thành công ${sampleExercises.length} bài tập và ${sampleFoods.length} món ăn!`);
    process.exit(); 
  } catch (error) {
    console.error("❌ Lỗi bơm dữ liệu:", error);
    process.exit(1);
  }
}

seedDB();