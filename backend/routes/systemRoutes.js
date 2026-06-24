const express = require("express");
const router = express.Router();
const systemController = require("../controllers/systemController");

// API công khai để React check trạng thái khi vừa vào web
router.get("/maintenance", systemController.getMaintenanceStatus);

// API bảo mật (Nên thêm middleware check Authen Admin của bạn ở đây)
router.post("/maintenance", systemController.toggleMaintenance);

module.exports = router;