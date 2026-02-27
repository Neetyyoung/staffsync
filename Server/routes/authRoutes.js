const express = require("express");
const router = express.Router();

const authenticateToken = require("../middleware/authMiddleware");
const authController = require("../controllers/authController");

router.post("/register", authenticateToken, authController.register);
router.post("/login", authController.login);
router.post("/change-password", authenticateToken, authController.changePassword);
router.get("/me", authenticateToken, authController.getCurrentUser);

router.get("/users", authenticateToken, authController.getAllUsers);
router.put("/users/:id", authenticateToken, authController.updateUser);
router.delete("/users/:id", authenticateToken, authController.deleteUser);

module.exports = router;