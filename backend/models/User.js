const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },

  // === ẢNH ĐẠI DIỆN ===
  avatar: { 
    type: String, 
    default: "https://ui-avatars.com/api/?name=User&background=random" 
  },

  // === CHỨC NĂNG PHÂN QUYỀN ===
  role: { 
    type: String, 
    enum: ["user", "admin", "trainer"], 
    default: "user" 
  },

  // === THÔNG TIN CÁ NHÂN (Dành cho Trainer) ===
  phone: { type: String },
  address: { type: String },
  cccd: { type: String },

  // === TRẠNG THÁI TÀI KHOẢN ===
  isLocked: { type: Boolean, default: false },

  // ==========================================
  // 🌟 MẠNG XÃ HỘI & TÍCH XANH
  // ==========================================
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  isVerified: { type: Boolean, default: false }, 

  // ==========================================
  // 📏 CHỈ SỐ CƠ THỂ & SỐ ĐO (BODY STATS)
  // ==========================================
  age: Number, 
  gender: { type: String, enum: ["male", "female"], default: "male" },
  height: Number, // Chiều cao (cm)
  weight: Number, // Cân nặng (kg)

  // Số đo vòng
  neck: { type: Number, default: null },  // Vòng cổ (cm)
  waist: { type: Number, default: null }, // Vòng bụng/eo (cm)
  hip: { type: Number, default: null },   // Vòng hông (cm)

  // Kết quả tính toán chỉ số (Dùng truyền trực tiếp cho Avatar 3D)
  bmi: { type: Number, default: null },          // Chỉ số BMI
  bodyFat: { type: Number, default: null },      // Tỷ lệ mỡ (%)
  leanBodyMass: { type: Number, default: null }, // Khối lượng phi mỡ (kg)
  muscleMass: { type: Number, default: null },   // Tỷ lệ cơ bắp (%)

  // ==========================================
  // 🎯 MỤC TIÊU & LỰA CHỌN TẬP LUYỆN
  // ==========================================
  goal: { type: String, enum: ["lose_weight", "gain_muscle", "maintain"] },
  fitnessLevel: { type: String, enum: ["beginner", "intermediate", "advanced"] },
  workoutLocation: { type: String, enum: ["home", "gym"], default: "home" },
  availableEquipment: [{ type: String, enum: ["bodyweight", "dumbbells", "pull_up_bar", "resistance_bands", "none"] }],
  targetMacros: { calories: Number, protein: Number, carbs: Number, fat: Number },

  medicalConditions: [{ type: String }],
  isPremium: { type: Boolean, default: false },
  premiumUntil: { type: Date, default: null },

  aiTickets: { type: Number, default: 0 },
  fcmToken: String 
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);