const express = require("express");
const router = express.Router();
const {
  createContact,
  getUserContacts,
  getAllContacts,
  replyContact,
  editContactReply,
  deleteContactReply
} = require("../controllers/contactController");

const { verifyToken, authorizeRoles } = require("../middleware/authMiddleware");
const { validate, schemas } = require("../middleware/validation");

// ==========================================
// USER
// ==========================================
router.post("/", verifyToken, validate(schemas.contact), createContact);
router.get("/my-history", verifyToken, getUserContacts);

// ==========================================
// ADMIN
// ==========================================
router.get("/admin/all", verifyToken, authorizeRoles("admin"), getAllContacts);
router.put("/admin/:contactId/reply", verifyToken, authorizeRoles("admin"), replyContact);
router.put("/admin/:contactId/reply/edit", verifyToken, authorizeRoles("admin"), editContactReply);
router.put("/admin/:contactId/reply/delete", verifyToken, authorizeRoles("admin"), deleteContactReply);

module.exports = router;
