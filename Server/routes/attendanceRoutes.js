const express = require("express");
const router = express.Router();

const attendanceController = require("../controllers/attendanceController");
const authenticateToken = require("../middleware/authMiddleware");

/* =====================================
   EMPLOYEE ROUTES
===================================== */

// Clock in
router.post("/clock-in", authenticateToken, attendanceController.clockIn);

// Clock out
router.post("/clock-out", authenticateToken, attendanceController.clockOut);

// Get today's attendance status
router.get(
  "/today-status",
  authenticateToken,
  attendanceController.getTodayStatus
);

// ✅ Get logged-in user's attendance history
router.get(
  "/history",
  authenticateToken,
  attendanceController.getUserHistory
);

/* =====================================
   ADMIN ROUTES
===================================== */

router.get(
  "/admin/attendance/all",
  authenticateToken,
  attendanceController.getAllAttendance
);

router.get(
  "/admin/attendance/today",
  authenticateToken,
  attendanceController.getTodayAttendance
);

router.get(
  "/admin/attendance/late",
  authenticateToken,
  attendanceController.getLateEmployees
);

router.get(
  "/admin/attendance/summary",
  authenticateToken,
  attendanceController.getAttendanceSummary
);

router.get(
  "/admin/attendance/export",
  authenticateToken,
  attendanceController.exportAttendanceToExcel
);

module.exports = router;