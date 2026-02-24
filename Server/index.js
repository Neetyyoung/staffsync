require("dotenv").config();
const express = require("express");
require("./config/db");

const authRoutes = require("./routes/authRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

// 🔥 THIS MUST COME BEFORE ROUTES
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/attendance", attendanceRoutes);
//TEST ROUTE
app.get("/", (req, res) => {
    res.send("Attendance System Running");
});
app.get("/api/ping", (req, res) => {
  res.status(200).json({ status: "StaffSync is awake 🚀" });
});
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    
});