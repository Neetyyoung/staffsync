require("dotenv").config();
const express = require("express");
const cors = require("cors");
require("./config/db");

const authRoutes = require("./routes/authRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const notificationRoutes = require("./routes/notificationRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

/* ===============================
   CORS CONFIGURATION
================================= */

const allowedOrigins = [
  "http://localhost:5173", // local frontend
  "https://staffsync-afrg.onrender.com"
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.use(express.json());

/* ===============================
   ROUTES
================================= */

app.use("/api/auth", authRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/notifications", notificationRoutes);

app.get("/", (req, res) => res.send("Attendance System Running"));
app.get("/api/ping", (req, res) =>
  res.status(200).json({ status: "StaffSync is awake 🚀" })
);

app.listen(PORT, "0.0.0.0", () =>
  console.log(`Server running on port ${PORT}`)
);