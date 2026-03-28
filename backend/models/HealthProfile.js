const mongoose = require("mongoose");

const healthSchema = new mongoose.Schema({

 userId:{
   type:mongoose.Schema.Types.ObjectId,
   ref:"User"
 },

injuries: String,   // chấn thương của người dùng
 diseases: String,  // bệnh lý của người dùng
 dietType: String,  // loại chế độ ăn (ăn chay, keto, giảm cân...)
// Bổ sung vào models/User.js hoặc HealthProfile.js


});

module.exports = mongoose.model("HealthProfile",healthSchema);