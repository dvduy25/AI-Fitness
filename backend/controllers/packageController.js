const PremiumPackage = require('../models/PremiumPackage');

// Lấy danh sách tất cả các gói (Dành cho cả User xem và Admin quản lý)
exports.getAllPackages = async (req, res) => {
  try {
    // Admin lấy tất cả, User chỉ lấy gói isActive = true
    const filter = req.user?.role === 'admin' ? {} : { isActive: true };
    const packages = await PremiumPackage.find(filter).sort({ price: 1 });
    res.status(200).json({ data: packages });
  } catch (error) {
    res.status(500).json({ message: "Lỗi lấy danh sách gói Premium!" });
  }
};

// Thêm gói mới (Chỉ Admin)
exports.createPackage = async (req, res) => {
  try {
    const newPackage = new PremiumPackage(req.body);
    await newPackage.save();
    res.status(201).json({ message: "Tạo gói thành công!", data: newPackage });
  } catch (error) {
    res.status(500).json({ message: "Lỗi tạo gói", error: error.message });
  }
};

// Cập nhật gói (Chỉ Admin chỉnh giá, tên, bật/tắt)
exports.updatePackage = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedPackage = await PremiumPackage.findByIdAndUpdate(id, req.body, { new: true });
    res.status(200).json({ message: "Cập nhật thành công!", data: updatedPackage });
  } catch (error) {
    res.status(500).json({ message: "Lỗi cập nhật", error: error.message });
  }
};

// Xóa gói (Chỉ Admin)
exports.deletePackage = async (req, res) => {
  try {
    await PremiumPackage.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Đã xóa gói!" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi xóa", error: error.message });
  }
};