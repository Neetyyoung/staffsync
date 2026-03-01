const express = require("express");
const router = express.Router();

const authenticateToken = require("../middleware/authMiddleware");
const authController = require("../controllers/authController");

/* =====================================
   PUBLIC ROUTES
===================================== */

// Login
router.post("/login", authController.login);

// Forgot password (user not logged in)
router.post("/forgot-password", authController.forgotPassword);

// Reset password using token
router.post("/reset-password/:token", authController.resetPassword);


/* =====================================
   PROTECTED ROUTES (Logged In)
===================================== */

// Register (Admin only inside controller)
router.post("/register", authenticateToken, authController.register);

// Change password (when logged in)
router.post("/change-password", authenticateToken, authController.changePassword);

// Get current user
router.get("/me", authenticateToken, authController.getCurrentUser);

// Update own profile
router.put("/me", authenticateToken, authController.updateMyProfile);


/* =====================================
   ADMIN ROUTES
===================================== */

// Get all users
router.get("/users", authenticateToken, authController.getAllUsers);

// Update user by ID
router.put("/users/:id", authenticateToken, authController.updateUser);

// Delete user
router.delete("/users/:id", authenticateToken, authController.deleteUser);

module.exports = router;