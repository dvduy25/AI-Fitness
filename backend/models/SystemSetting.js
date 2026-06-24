const mongoose = require('mongoose');

const SystemSettingSchema = new mongoose.Schema({
  key: { type: String, default: "system_notification" }, // Khóa cố định để dễ tìm kiếm
  type: { 
    type: String, 
    enum: ["NORMAL", "MAINTENANCE"], 
    default: "NORMAL" 
  }, // NORMAL = Thông báo thường, MAINTENANCE = Bảo trì
  message: { type: String, default: "" }, // Nội dung thông báo hiển thị cho User
  isActive: { type: Boolean, default: false } // Bật/Tắt thông báo
}, { timestamps: true });

module.exports = mongoose.model('SystemSetting', SystemSettingSchema);