// const Progress  = require("../models/Progress");
// const  MealPlan  = require("../models/MealPlan");

// const mongoose = require("mongoose");

// exports.getWeightStats = async (req, res) => {
//   try {
//     const stats = await Progress.aggregate([
//       { $match: { userId: new mongoose.Types.ObjectId(req.user.id) } },
//       { $group: { _id: { month: { $month: "$date" }, year: { $year: "$date" } }, avgWeight: { $avg: "$weight" } } },
//       { $sort: { "_id.year": 1, "_id.month": 1 } }
//     ]);
//     res.status(200).json(stats);
//   } catch (error) { res.status(500).json({ error: error.message }); }
// };

// exports.getMacroStats = async (req, res) => {
//   try {
//     const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
//     const stats = await MealPlan.find({ userId: req.user.id, date: { $gte: sevenDaysAgo } }).select("date dailyTotal");
//     res.status(200).json(stats);
//   } catch (error) { res.status(500).json({ error: error.message }); }
// };