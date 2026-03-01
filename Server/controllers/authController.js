const bcrypt = require("bcrypt");
const db = require("../config/db");
const jwt = require("jsonwebtoken");

/* =====================================
   HELPER: CREATE NOTIFICATION
===================================== */

const createNotification = (user_id, title, message) => {
  const sql = `INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)`;
  db.query(sql, [user_id, title, message], () => {});
};

/* =====================================
   LOGIN
===================================== */

exports.login = (req, res) => {
  const { email, password } = req.body;

  db.query("SELECT * FROM users WHERE email = ?", [email], async (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0)
      return res.status(400).json({ message: "User not found" });

    const user = results[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch)
      return res.status(400).json({ message: "Invalid password" });

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    createNotification(user.id, "Login", "You signed in successfully.");

    res.json({
      message: "Login successful ✅",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        position: user.position,
      },
      token,
    });
  });
};

/* =====================================
   REGISTER (ADMIN ONLY)
===================================== */

exports.register = async (req, res) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Access denied. Admin only." });
  }

  const { name, email, password, position, role } = req.body;

  if (!name || !email || !password || !position) {
    return res.status(400).json({ message: "All fields are required." });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const userRole = role === "admin" ? "admin" : "employee";

  db.query(
    `INSERT INTO users (name, email, password, role, position) VALUES (?, ?, ?, ?, ?)`,
    [name, email, hashedPassword, userRole, position],
    (err, result) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY")
          return res.status(400).json({ message: "Email already registered." });

        return res.status(500).json({ error: err.message });
      }

      createNotification(
        result.insertId,
        "Account Created",
        "Your account has been created."
      );

      res.json({ message: "User created successfully ✅" });
    }
  );
};

/* =====================================
   CHANGE PASSWORD (LOGGED IN USER)
===================================== */

exports.changePassword = async (req, res) => {
  const user_id = req.user.id;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: "All fields required." });
  }

  db.query("SELECT password FROM users WHERE id = ?", [user_id], async (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    const user = results[0];
    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch)
      return res.status(400).json({ message: "Current password incorrect." });

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    db.query("UPDATE users SET password = ? WHERE id = ?", [
      hashedPassword,
      user_id,
    ]);

    createNotification(
      user_id,
      "Password Changed",
      "Your password was updated."
    );

    res.json({ message: "Password updated successfully ✅" });
  });
};

/* =====================================
   GET CURRENT USER
===================================== */

exports.getCurrentUser = (req, res) => {
  res.json({ user: req.user });
};

/* =====================================
   UPDATE MY PROFILE
===================================== */

exports.updateMyProfile = (req, res) => {
  const user_id = req.user.id;
  const { name, email, position } = req.body;

  db.query(
    "UPDATE users SET name = ?, email = ?, position = ? WHERE id = ?",
    [name, email, position, user_id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });

      createNotification(
        user_id,
        "Profile Updated",
        "You updated your profile."
      );

      res.json({ message: "Profile updated successfully ✅" });
    }
  );
};

/* =====================================
   ADMIN USER MANAGEMENT
===================================== */

exports.getAllUsers = (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ message: "Access denied." });

  db.query(
    "SELECT id, name, email, role, position FROM users",
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results);
    }
  );
};

exports.updateUser = (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ message: "Access denied." });

  const { id } = req.params;
  const { name, email, role, position } = req.body;

  db.query(
    "UPDATE users SET name = ?, email = ?, role = ?, position = ? WHERE id = ?",
    [name, email, role, position, id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });

      createNotification(
        id,
        "Profile Updated",
        "Your account was updated by admin."
      );

      res.json({ message: "User updated successfully ✅" });
    }
  );
};

exports.deleteUser = (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ message: "Access denied." });

  const { id } = req.params;

  db.query("DELETE FROM users WHERE id = ?", [id], (err) => {
    if (err) return res.status(500).json({ error: err.message });

    res.json({ message: "User deleted successfully ✅" });
  });
};