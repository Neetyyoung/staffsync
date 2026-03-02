const bcrypt = require("bcrypt");
const db = require("../config/db");
const jwt = require("jsonwebtoken");

/* =====================================
   HELPER: CREATE NOTIFICATION
   -------------------------------------
   Creates a system notification for a user
===================================== */
const createNotification = (user_id, title, message) => {
  const sql =
    "INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)";
  db.query(sql, [user_id, title, message], () => {});
};

/* =====================================
   LOGIN
   -------------------------------------
   Authenticates user and returns JWT token
   Blocks suspended users
===================================== */
exports.login = (req, res) => {
  const { email, password } = req.body;

  db.query(
    "SELECT * FROM users WHERE email = ?",
    [email],
    async (err, results) => {
      if (err) return res.status(500).json({ error: err.message });

      if (results.length === 0)
        return res.status(400).json({ message: "User not found" });

      const user = results[0];

      // 🔒 Block suspended users
      if (user.status === "suspended") {
        return res.status(403).json({
          message:
            "Your account has been suspended. Contact administrator.",
        });
      }

      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch)
        return res.status(400).json({ message: "Invalid password" });

      // Generate JWT
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
          status: user.status,
        },
        token,
      });
    }
  );
};

/* =====================================
   REGISTER (ADMIN ONLY)
   -------------------------------------
   Creates new user account
===================================== */
exports.register = async (req, res) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Access denied. Admin only." });
  }

  const { name, email, password, position, role } = req.body;

  if (!name || !email || !password || !position) {
    return res.status(400).json({ message: "All fields are required." });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const userRole = role === "admin" ? "admin" : "employee";

    db.query(
      `INSERT INTO users 
       (name, email, password, role, position, status) 
       VALUES (?, ?, ?, ?, ?, 'active')`,
      [name, email, hashedPassword, userRole, position],
      (err, result) => {
        if (err) {
          if (err.code === "ER_DUP_ENTRY")
            return res
              .status(400)
              .json({ message: "Email already registered." });

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
  } catch (error) {
    res.status(500).json({ error: "Registration failed." });
  }
};

/* =====================================
   CHANGE PASSWORD
   -------------------------------------
   Allows logged-in user to update password
===================================== */
exports.changePassword = async (req, res) => {
  const user_id = req.user.id;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: "All fields required." });
  }

  db.query(
    "SELECT password FROM users WHERE id = ?",
    [user_id],
    async (err, results) => {
      if (err) return res.status(500).json({ error: err.message });

      const user = results[0];

      const isMatch = await bcrypt.compare(
        currentPassword,
        user.password
      );

      if (!isMatch)
        return res
          .status(400)
          .json({ message: "Current password incorrect." });

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      db.query(
        "UPDATE users SET password = ? WHERE id = ?",
        [hashedPassword, user_id]
      );

      createNotification(
        user_id,
        "Password Changed",
        "Your password was updated."
      );

      res.json({ message: "Password updated successfully ✅" });
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
   ADMIN: GET ALL USERS
===================================== */
exports.getAllUsers = (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ message: "Access denied." });

  db.query(
    "SELECT id, name, email, role, position, status FROM users",
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results);
    }
  );
};

/* =====================================
   ADMIN: UPDATE USER
===================================== */
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

/* =====================================
   ADMIN: TOGGLE USER STATUS
   -------------------------------------
   Allows admin to suspend or activate user
===================================== */
exports.toggleUserStatus = (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ message: "Access denied." });

  const { id } = req.params;
  const { status } = req.body;

  if (!["active", "suspended"].includes(status)) {
    return res.status(400).json({ message: "Invalid status." });
  }

  db.query(
    "UPDATE users SET status = ? WHERE id = ?",
    [status, id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });

      res.json({ message: "User status updated successfully ✅" });
    }
  );
};

/* =====================================
   ADMIN: DELETE USER
   -------------------------------------
   Prevent deleting the last admin
===================================== */
exports.deleteUser = (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ message: "Access denied." });

  const { id } = req.params;

  // First, check if the user to be deleted is an admin
  db.query("SELECT role FROM users WHERE id = ?", [id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    if (results.length === 0)
      return res.status(404).json({ message: "User not found." });

    const userToDelete = results[0];

    if (userToDelete.role === "admin") {
      // Count total admins
      db.query(
        "SELECT COUNT(*) AS adminCount FROM users WHERE role = 'admin'",
        (err2, countResult) => {
          if (err2)
            return res.status(500).json({ error: err2.message });

          const adminCount = countResult[0].adminCount;

          // 🚫 Prevent deleting last admin
          if (adminCount <= 1) {
            return res.status(400).json({
              message:
                "Cannot delete the last admin account. At least one admin must remain.",
            });
          }

          // Safe to delete
          deleteUserNow(id, res);
        }
      );
    } else {
      // Not an admin, safe to delete
      deleteUserNow(id, res);
    }
  });
};

// Helper function to delete
function deleteUserNow(id, res) {
  db.query("DELETE FROM users WHERE id = ?", [id], (err) => {
    if (err) return res.status(500).json({ error: err.message });

    res.json({ message: "User deleted successfully ✅" });
  });
}