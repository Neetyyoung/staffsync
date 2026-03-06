const express = require("express");
const router = express.Router();

const authenticateToken = require("../middleware/authMiddleware");
const notificationController = require("../controllers/notificationController");

// Get notifications
router.get("/", authenticateToken, notificationController.getMyNotifications);

// Mark all notifications as read
router.post("/mark-all-read", authenticateToken, notificationController.markAllRead);

// Delete all notifications
router.delete("/", authenticateToken, notificationController.clearNotifications);

module.exports = router;