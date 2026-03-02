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
   CORS CONFIGURATION (FIXED)
   - Allows your frontend (localhost)
   - Handles preflight (OPTIONS) correctly
   - Allows Authorization header
================================= */

const allowedOrigins = [
  "http://localhost:5173", // local frontend
  "http://127.0.0.1:5173", // local alternative
  "https://staffsync-afrg.onrender.com", // keep (your current entry)
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow Postman / server-to-server requests (no Origin header)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("Not allowed by CORS: " + origin));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

// Apply CORS
app.use(cors(corsOptions));

// IMPORTANT: handle preflight requests
app.options("*", cors(corsOptions));

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