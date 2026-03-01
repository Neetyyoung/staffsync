const express = require("express");
const router = express.Router();

const authenticateToken = require("../middleware/authMiddleware");
const authController = require("../controllers/authController");

// Public
router.post("/login", authController.login);

// Protected
router.post("/register", authenticateToken, authController.register);
router.post("/change-password", authenticateToken, authController.changePassword);

router.get("/me", authenticateToken, authController.getCurrentUser);
router.put("/me", authenticateToken, authController.updateMyProfile);

// Admin
router.get("/users", authenticateToken, authController.getAllUsers);
router.put("/users/:id", authenticateToken, authController.updateUser);
router.delete("/users/:id", authenticateToken, authController.deleteUser);

module.exports = router;