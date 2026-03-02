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

  /**
   * ✅ FIX: Prevent double response
   * If latitude/longitude is missing and you choose to return success,
   * you MUST exit the function after sending res.json().
   */
  if (!latitude || !longitude) {
    const notifySql = `
      INSERT INTO notifications (user_id, title, message)
      VALUES (?, 'Clock In', 'You clocked in successfully.')
    `;

    return db.query(notifySql, [user_id], () => {
      return res.json({ message: "Clock-in recorded successfully" });
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

  /**
   * ✅ FIX: Prevent double response
   * Return immediately after sending a response.
   */
  if (!latitude || !longitude) {
    const notifySql = `
      INSERT INTO notifications (user_id, title, message)
      VALUES (?, 'Clock Out', 'You clocked out successfully.')
    `;

    return db.query(notifySql, [user_id], () => {
      return res.json({ message: "Clock-out recorded successfully" });
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
// ADMIN - VIEW ALL (Filter + Pagination)
// =====================
exports.getAllAttendance = (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Access denied. Admins only." });
  }

  const { page = 1, limit = 10, date, position, name } = req.query;
  const offset = (page - 1) * limit;

  let sql = `
    SELECT 
      attendance.id,
      users.name,
      users.position,
      attendance.clock_in,
      attendance.clock_out,
      attendance.status
    FROM attendance
    JOIN users ON attendance.user_id = users.id
    WHERE 1=1
  `;

  const params = [];

  if (date) {
    sql += " AND DATE(attendance.clock_in) = ?";
    params.push(date);
  }

  if (position) {
    sql += " AND users.position = ?";
    params.push(position);
  }

  if (name) {
    sql += " AND users.name LIKE ?";
    params.push(`%${name}%`);
  }

  sql += " ORDER BY attendance.clock_in DESC LIMIT ? OFFSET ?";
  params.push(parseInt(limit), parseInt(offset));

  db.query(sql, params, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    return res.json({
      page: parseInt(page),
      limit: parseInt(limit),
      results,
    });
  });
};

// =====================
// ADMIN - TODAY
// =====================
exports.getTodayAttendance = (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Access denied. Admins only." });
  }

  const sql = `
    SELECT 
      users.name,
      users.position,
      attendance.clock_in,
      attendance.clock_out,
      attendance.status
    FROM attendance
    JOIN users ON attendance.user_id = users.id
    WHERE DATE(attendance.clock_in) = CURDATE()
    ORDER BY attendance.clock_in DESC
  `;

  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    return res.json(results);
  });
};

// =====================
// ADMIN - LATE EMPLOYEES
// =====================
exports.getLateEmployees = (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Access denied. Admins only." });
  }

  const sql = `
    SELECT 
      users.name,
      users.position,
      attendance.clock_in
    FROM attendance
    JOIN users ON attendance.user_id = users.id
    WHERE attendance.status = 'Late'
    AND DATE(attendance.clock_in) = CURDATE()
  `;

  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    return res.json(results);
  });
};

// =====================
// ADMIN - SUMMARY
// =====================
exports.getAttendanceSummary = (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Access denied. Admins only." });
  }

  const sql = `
    SELECT 
      COUNT(*) AS total_today,
      SUM(CASE WHEN status = 'Late' THEN 1 ELSE 0 END) AS late_today,
      SUM(CASE WHEN clock_out IS NULL THEN 1 ELSE 0 END) AS not_clocked_out
    FROM attendance
    WHERE DATE(clock_in) = CURDATE()
  `;

  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    return res.json(results[0]);
  });
};

// =====================
// ADMIN - EXPORT ATTENDANCE TO EXCEL (FILTER + SUMMARY + LOGO + FILENAME)
// =====================
exports.exportAttendanceToExcel = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admins only." });
    }

    const { date } = req.query;

    let sql = `
      SELECT 
        users.name,
        users.position,
        attendance.clock_in,
        attendance.clock_out,
        attendance.status
      FROM attendance
      JOIN users ON attendance.user_id = users.id
      WHERE 1=1
    `;

    const params = [];

    if (date) {
      sql += " AND DATE(attendance.clock_in) = ?";
      params.push(date);
    }

    sql += " ORDER BY attendance.clock_in DESC";

    db.query(sql, params, async (err, results) => {
      if (err) return res.status(500).json({ error: err.message });

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Attendance");

      const logoPath = path.join(__dirname, "../assets/logo.png");

      if (fs.existsSync(logoPath)) {
        const logoId = workbook.addImage({
          filename: logoPath,
          extension: "png",
        });

        worksheet.addImage(logoId, {
          tl: { col: 0, row: 0 },
          ext: { width: 120, height: 60 },
        });
      }

      worksheet.addRow([]);
      worksheet.addRow([]);
      worksheet.addRow([]);

      const titleText = date
        ? `Attendance Report (${date})`
        : "Attendance Report (All Records)";
      const titleRow = worksheet.addRow([titleText]);
      titleRow.font = { bold: true, size: 14 };
      worksheet.mergeCells(`A4:E4`);

      worksheet.addRow([]);

      worksheet.columns = [
        { header: "Name", key: "name", width: 22 },
        { header: "Position", key: "position", width: 20 },
        { header: "Clock In", key: "clock_in", width: 25 },
        { header: "Clock Out", key: "clock_out", width: 25 },
        { header: "Status", key: "status", width: 14 },
      ];

      const headerRow = worksheet.getRow(6);
      headerRow.font = { bold: true };

      results.forEach((row) => {
        worksheet.addRow({
          name: row.name,
          position: row.position,
          clock_in: row.clock_in,
          clock_out: row.clock_out,
          status: row.status,
        });
      });

      const totalRecords = results.length;
      const totalLate = results.filter((r) => r.status === "Late").length;
      const totalOnTime = results.filter((r) => r.status === "On Time").length;

      worksheet.addRow([]);
      const summaryTitle = worksheet.addRow(["SUMMARY"]);
      summaryTitle.font = { bold: true };
      worksheet.mergeCells(`A${summaryTitle.number}:E${summaryTitle.number}`);

      const r1 = worksheet.addRow(["Total Records", totalRecords]);
      const r2 = worksheet.addRow(["Total On Time", totalOnTime]);
      const r3 = worksheet.addRow(["Total Late", totalLate]);

      [r1, r2, r3].forEach((r) => {
        r.getCell(1).font = { bold: true };
      });

      const today = new Date().toISOString().slice(0, 10);
      const fileDate = date || today;
      const filename = `attendance_${fileDate}.xlsx`;

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader("Content-Disposition", `attachment; filename=${filename}`);

      await workbook.xlsx.write(res);
      res.end();
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to export attendance" });
  }
};

// =====================================
// GET TODAY'S ATTENDANCE STATUS
// =====================================
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