const express = require("express");
const router = express.Router();
const authenticateToken = require("../middleware/authMiddleware");
const authController = require("../controllers/authController");

router.post("/register", authController.register);
router.post("/login", authController.login);
router.get("/me", authenticateToken, authController.getCurrentUser);
module.exports = router;
