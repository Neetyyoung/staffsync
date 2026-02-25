// ================================
// Load Environment Variables
// ================================
require("dotenv").config();

// ================================
// Import Required Packages
// ================================
const express = require("express");
const cors = require("cors"); // 🔥 Needed to allow frontend requests

// ================================
// Initialize Database Connection
// ================================
require("./config/db");

// ================================
// Import Route Files
// ================================
const authRoutes = require("./routes/authRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");

// ================================
// Create Express App
// ================================
const app = express();
const PORT = process.env.PORT || 3000;

// ================================
// Middleware Section (ORDER MATTERS)
// ================================

// 🔥 Enable CORS so frontend (localhost:5173) can talk to backend
app.use(cors({
  origin: [
    "http://localhost:5173", // React local development
    "https://your-vercel-url.vercel.app" // Future production frontend
  ],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

// 🔥 Allow JSON body parsing (must come before routes)
app.use(express.json());

// ================================
// Routes
// ================================
app.use("/api/auth", authRoutes);
app.use("/api/attendance", attendanceRoutes);

// ================================
// Test Routes
// ================================

// Basic health check
app.get("/", (req, res) => {
  res.send("Attendance System Running");
});

// API ping route to test if backend is awake
app.get("/api/ping", (req, res) => {
  res.status(200).json({ status: "StaffSync is awake 🚀" });
});

// ================================
// Start Server
// ================================
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});