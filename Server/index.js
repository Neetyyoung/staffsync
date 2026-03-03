require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
require("./config/db");

const authRoutes = require("./routes/authRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const notificationRoutes = require("./routes/notificationRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

/* ===============================
   CORS CONFIGURATION (FIXED)
================================= */

const allowedOrigins = [
  "http://localhost:5173",
  "https://staffsync-afrg.onrender.com",
];

// Proper CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // allow temporarily to prevent block
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

// Apply CORS middleware
app.use(cors(corsOptions));

// 🔥 IMPORTANT: Handle preflight requests properly
app.options("*", cors(corsOptions));

app.use(express.json());

/* ===============================
   ROUTES
================================= */

app.use("/uploads", express.static(path.join(__dirname, "uploads")));
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