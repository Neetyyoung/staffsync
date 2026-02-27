const db = require("../config/db");

// GET notifications for logged-in user
exports.getMyNotifications = (req, res) => {
  const user_id = req.user.id;

  const sql = `
    SELECT id, title, message, is_read, created_at
    FROM notifications
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 30
  `;

  db.query(sql, [user_id], (err, results) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json(results);
  });
};

// Mark all as read
exports.markAllRead = (req, res) => {
  const user_id = req.user.id;

  const sql = `
    UPDATE notifications
    SET is_read = 1
    WHERE user_id = ?
  `;

  db.query(sql, [user_id], (err) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json({ message: "All notifications marked as read ✅" });
  });
};