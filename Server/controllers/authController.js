const bcrypt = require("bcrypt");
const db = require("../config/db");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

/* =====================================
   EMAIL TRANSPORTER
===================================== */

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

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
    if (results.length === 0) return res.status(400).json({ message: "User not found" });

    const user = results[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid password" });

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });

    createNotification(user.id, "Login", "You signed in successfully.");

    res.json({
      message: "Login successful ✅",
      user: { id: user.id, name: user.name, email: user.email, role: user.role, position: user.position },
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
        if (err.code === "ER_DUP_ENTRY") return res.status(400).json({ message: "Email already registered." });
        return res.status(500).json({ error: err.message });
      }

      createNotification(result.insertId, "Account Created", "Your account has been created.");
      res.json({ message: "User created successfully ✅" });
    }
  );
};

/* =====================================
   CHANGE PASSWORD (LOGGED IN)
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
    if (!isMatch) return res.status(400).json({ message: "Current password incorrect." });

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    db.query("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, user_id]);

    createNotification(user_id, "Password Changed", "Your password was updated.");
    res.json({ message: "Password updated successfully ✅" });
  });
};

/* =====================================
   FORGOT PASSWORD
===================================== */

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email)
      return res.status(400).json({ message: "Email required." });

    const sql = "SELECT * FROM users WHERE email = ?";

    db.query(sql, [email], async (err, results) => {
      if (err) return res.status(500).json({ error: err.message });

      if (results.length === 0)
        return res.status(400).json({ message: "User not found." });

      const user = results[0];

      const resetToken = crypto.randomBytes(32).toString("hex");
      const hashedToken = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");

      const expires = new Date(Date.now() + 15 * 60 * 1000);

      db.query(
        "UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?",
        [hashedToken, expires, user.id],
        async (updateErr) => {
          if (updateErr)
            return res.status(500).json({ error: updateErr.message });

          try {
            const resetURL = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

            await transporter.sendMail({
              from: process.env.EMAIL_USER,
              to: user.email,
              subject: "Password Reset - StaffSync",
              html: `
                <h3>Password Reset</h3>
                <p>Click below:</p>
                <a href="${resetURL}">${resetURL}</a>
                <p>Expires in 15 minutes.</p>
              `,
            });

            res.json({ message: "Reset link sent 📧" });

          } catch (mailError) {
            console.error("MAIL ERROR:", mailError);
            return res.status(500).json({
              message: "Email service failed.",
            });
          }
        }
      );
    });

  } catch (error) {
    console.error("Forgot Password Crash:", error);
    res.status(500).json({ message: "Server error." });
  }
};
/* =====================================
   RESET PASSWORD
===================================== */

exports.resetPassword = async (req, res) => {
  const { token } = req.params;
  const { newPassword } = req.body;

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  db.query(
    `SELECT * FROM users WHERE reset_token = ? AND reset_token_expires > NOW()`,
    [hashedToken],
    async (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      if (results.length === 0) return res.status(400).json({ message: "Invalid or expired token." });

      const user = results[0];
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      db.query(
        "UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?",
        [hashedPassword, user.id]
      );

      createNotification(user.id, "Password Reset", "Your password was reset.");
      res.json({ message: "Password reset successful ✅" });
    }
  );
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

      createNotification(user_id, "Profile Updated", "You updated your profile.");
      res.json({ message: "Profile updated successfully ✅" });
    }
  );
};

/* =====================================
   ADMIN USER MANAGEMENT
===================================== */

exports.getAllUsers = (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ message: "Access denied." });

  db.query("SELECT id, name, email, role, position FROM users", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
};

exports.updateUser = (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ message: "Access denied." });

  const { id } = req.params;
  const { name, email, role, position } = req.body;

  db.query(
    "UPDATE users SET name = ?, email = ?, role = ?, position = ? WHERE id = ?",
    [name, email, role, position, id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });

      createNotification(id, "Profile Updated", "Your account was updated by admin.");
      res.json({ message: "User updated successfully ✅" });
    }
  );
};

exports.deleteUser = (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ message: "Access denied." });

  const { id } = req.params;
  db.query("DELETE FROM users WHERE id = ?", [id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "User deleted successfully ✅" });
  });
};