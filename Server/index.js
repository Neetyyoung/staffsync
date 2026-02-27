require("dotenv").config();
const express = require("express");
require("./config/db");

const authRoutes = require("./routes/authRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const notificationRoutes = require("./routes/notificationRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/notifications", notificationRoutes);

app.get("/", (req, res) => res.send("Attendance System Running"));
app.get("/api/ping", (req, res) => res.status(200).json({ status: "StaffSync is awake 🚀" }));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));