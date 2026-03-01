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

  const sql = "SELECT * FROM users WHERE email = ?";
  db.query(sql, [email], async (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(400).json({ message: "User not found" });

    const user = results[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid password" });

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });

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
   FORGOT PASSWORD
===================================== */

exports.forgotPassword = (req, res) => {
  const { email } = req.body;

  if (!email) return res.status(400).json({ message: "Email required." });

  const sql = "SELECT * FROM users WHERE email = ?";
  db.query(sql, [email], async (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(400).json({ message: "User not found." });

    const user = results[0];

    // Generate token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    db.query(
      "UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?",
      [hashedToken, expires, user.id]
    );

    const resetURL = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "Password Reset - StaffSync",
      html: `
        <h3>Password Reset</h3>
        <p>Click the link below to reset your password:</p>
        <a href="${resetURL}">${resetURL}</a>
        <p>This link expires in 15 minutes.</p>
      `,
    });

    res.json({ message: "Reset link sent to your email 📧" });
  });
};

/* =====================================
   RESET PASSWORD
===================================== */

exports.resetPassword = async (req, res) => {
  const { token } = req.params;
  const { newPassword } = req.body;

  if (!newPassword) return res.status(400).json({ message: "New password required." });

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const sql = `
    SELECT * FROM users 
    WHERE reset_token = ? 
    AND reset_token_expires > NOW()
  `;

  db.query(sql, [hashedToken], async (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0)
      return res.status(400).json({ message: "Invalid or expired token." });

    const user = results[0];
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    db.query(
      "UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?",
      [hashedPassword, user.id]
    );

    createNotification(user.id, "Password Reset", "Your password was reset successfully.");

    res.json({ message: "Password reset successful ✅" });
  });
};