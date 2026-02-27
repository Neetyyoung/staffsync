const express = require("express");
const router = express.Router();

const authenticateToken = require("../middleware/authMiddleware");
const notificationController = require("../controllers/notificationController");

router.get("/", authenticateToken, notificationController.getMyNotifications);
router.post("/mark-all-read", authenticateToken, notificationController.markAllRead);

module.exports = router;