const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const { validate, schemas } = require("../middleware/validation");
const { logWeight, getWeightHistory } = require("../controllers/weightController");

router.post("/", verifyToken, validate(schemas.weightLog), logWeight);
router.get("/history", verifyToken, getWeightHistory);

module.exports = router;
