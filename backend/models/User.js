const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  
  // === ẢNH ĐẠI DIỆN ===
  avatar: { 
    type: String, 
    default: "https://ui-avatars.com/api/?name=User&background=random" // URL ảnh mặc định nếu user chưa upload
  },
  
  // === THÊM CHỨC NĂNG PHÂN QUYỀN Ở ĐÂY ===
  role: { 
    type: String, 
    enum: ["user", "admin", "trainer"], 
    default: "user" 
  },

  age: Number, 
  gender: String, 
  height: Number, 
  weight: Number,
  goal: { type: String, enum: ["lose_weight", "gain_muscle", "maintain"] },
  fitnessLevel: { type: String, enum: ["beginner", "intermediate", "advanced"] },
  workoutLocation: { type: String, enum: ["home", "gym"], default: "home" },
  availableEquipment: [{ type: String, enum: ["bodyweight", "dumbbells", "pull_up_bar", "resistance_bands", "none"] }],
  targetMacros: { calories: Number, protein: Number, carbs: Number, fat: Number },
  
  medicalConditions: [{ type: String }],
  isPremium: { type: Boolean, default: false },
  premiumUntil: { type: Date, default: null },
  
  // Số vé dùng AI kiếm được từ việc xem quảng cáo
  aiTickets: { type: Number, default: 0 },

  fcmToken: String // Dùng để gửi thông báo về điện thoại sau này
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);