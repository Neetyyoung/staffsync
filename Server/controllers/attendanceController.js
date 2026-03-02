const db = require("../config/db");
const ExcelJS = require("exceljs");
const path = require("path");
const fs = require("fs");

// =======================
// OFFICE LOCATION CONFIG
// =======================
const OFFICE_LAT = 5.848864439722045;
const OFFICE_LNG = 0.6102520623942992;
const ALLOWED_RADIUS = 100; // meters

// Haversine Formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const toRad = (angle) => angle * (Math.PI / 180);

  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lon2 - lon1);

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) *
      Math.cos(φ2) *
      Math.sin(Δλ / 2) *
      Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// =====================
// CLOCK IN
// =====================
exports.clockIn = (req, res) => {
  const user_id = req.user.id;
  const { latitude, longitude } = req.body;

  // 🔒 Strict undefined check (0 is valid latitude)
  if (latitude === undefined || longitude === undefined) {
    return res.status(400).json({
      message: "Latitude and longitude are required",
    });
  }

  const distance = calculateDistance(
    latitude,
    longitude,
    OFFICE_LAT,
    OFFICE_LNG
  );

  if (distance > ALLOWED_RADIUS) {
    return res.status(403).json({
      message: "You are outside the allowed work location",
      distance: Math.round(distance) + " meters",
    });
  }

  const todayCheckSql = `
    SELECT * FROM attendance 
    WHERE user_id = ? 
    AND DATE(clock_in) = CURDATE()
  `;

  db.query(todayCheckSql, [user_id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    if (results.length > 0) {
      return res.status(400).json({
        message: "User already clocked in today",
      });
    }

    const attendanceSql = `
      INSERT INTO attendance (user_id, clock_in, status)
      VALUES (?, NOW(), 'On Time')
    `;

    db.query(attendanceSql, [user_id], (err2) => {
      if (err2) return res.status(500).json({ error: err2.message });

      return res.json({
        message: "Clock-in recorded successfully",
      });
    });
  });
};

// =====================
// CLOCK OUT
// =====================
exports.clockOut = (req, res) => {
  const user_id = req.user.id;
  const { latitude, longitude } = req.body;

  if (latitude === undefined || longitude === undefined) {
    return res.status(400).json({
      message: "Latitude and longitude are required",
    });
  }

  const distance = calculateDistance(
    latitude,
    longitude,
    OFFICE_LAT,
    OFFICE_LNG
  );

  if (distance > ALLOWED_RADIUS) {
    return res.status(403).json({
      message: "You are outside the allowed work location",
      distance: Math.round(distance) + " meters",
    });
  }

  const findSql = `
    SELECT * FROM attendance 
    WHERE user_id = ? 
    AND DATE(clock_in) = CURDATE()
  `;

  db.query(findSql, [user_id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    if (results.length === 0) {
      return res.status(400).json({
        message: "No clock-in record found for today",
      });
    }

    const record = results[0];

    if (record.clock_out !== null) {
      return res.status(400).json({
        message: "User already clocked out today",
      });
    }

    const updateSql = `
      UPDATE attendance
      SET clock_out = NOW()
      WHERE id = ?
    `;

    db.query(updateSql, [record.id], (err2) => {
      if (err2) return res.status(500).json({ error: err2.message });

      return res.json({
        message: "Clock-out recorded successfully",
      });
    });
  });
};

// =====================
// GET TODAY STATUS
// =====================
exports.getTodayStatus = (req, res) => {
  const user_id = req.user.id;

  const sql = `
    SELECT clock_in, clock_out 
    FROM attendance 
    WHERE user_id = ? 
    AND DATE(clock_in) = CURDATE()
  `;

  db.query(sql, [user_id], (err, results) => {
    if (err) return res.status(500).json({ message: err.message });

    if (results.length === 0) {
      return res.json({
        clock_in: null,
        clock_out: null,
      });
    }

    return res.json(results[0]);
  });
};