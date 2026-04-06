const mongoose = require("mongoose");

const savedLibrarySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  originalPostId: { type: mongoose.Schema.Types.ObjectId, ref: "Post" },
  
  type: { type: String, enum: ["workout", "diet"], required: true },
  title: { type: String, required: true }, 

  workoutData: { type: mongoose.Schema.Types.Mixed }, // Dữ liệu lịch tập copy về
  dietData: { type: mongoose.Schema.Types.Mixed }     // Dữ liệu thực đơn copy về

}, { timestamps: true });

module.exports = mongoose.model("SavedLibrary", savedLibrarySchema);