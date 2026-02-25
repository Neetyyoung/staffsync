const express = require("express");
const router = express.Router();

const attendanceController = require("../controllers/attendanceController");
const authenticateToken = require("../middleware/authMiddleware");

// Employee routes
router.post("/clock-in", authenticateToken, attendanceController.clockIn);
router.post("/clock-out", authenticateToken, attendanceController.clockOut);

// 🔐 Admin routes
router.get("/admin/attendance/all", authenticateToken, attendanceController.getAllAttendance);
router.get("/admin/attendance/today", authenticateToken, attendanceController.getTodayAttendance);
router.get("/admin/attendance/late", authenticateToken, attendanceController.getLateEmployees);
router.get("/admin/attendance/summary", authenticateToken, attendanceController.getAttendanceSummary);
router.get(
  "/admin/attendance/export",
  authenticateToken,
  attendanceController.exportAttendanceToExcel
);
module.exports = router;