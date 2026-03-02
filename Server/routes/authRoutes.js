const express = require("express");
const router = express.Router();

const authenticateToken = require("../middleware/authMiddleware");
const authController = require("../controllers/authController");

/* =====================================
   PUBLIC ROUTES
===================================== */

// Login (No authentication required)
router.post("/login", authController.login);


/* =====================================
   AUTHENTICATED USER ROUTES
===================================== */

// Register new user (Admin only - protected inside controller)
router.post("/register", authenticateToken, authController.register);

// Change password (Logged-in user)
router.post("/change-password", authenticateToken, authController.changePassword);

// Get current logged-in user
router.get("/me", authenticateToken, authController.getCurrentUser);

// Update own profile
router.put("/me", authenticateToken, authController.updateMyProfile);


/* =====================================
   ADMIN ROUTES
===================================== */

// Get all users
router.get("/users", authenticateToken, authController.getAllUsers);

// Update user details
router.put("/users/:id", authenticateToken, authController.updateUser);

// Suspend or activate user
router.put(
  "/users/:id/status",
  authenticateToken,
  authController.toggleUserStatus
);

// Delete user
router.delete("/users/:id", authenticateToken, authController.deleteUser);

module.exports = router;