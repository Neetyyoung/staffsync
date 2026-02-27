const bcrypt = require("bcrypt");
const db = require("../config/db");
const jwt = require("jsonwebtoken");

// =====================
// REGISTER (ADMIN ONLY)
// =====================
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

        const sql = `
            INSERT INTO users (name, email, password, role, position)
            VALUES (?, ?, ?, ?, ?)
        `;

        db.query(sql, [name, email, hashedPassword, userRole, position], (err) => {
            if (err) {
                if (err.code === "ER_DUP_ENTRY") {
                    return res.status(400).json({ message: "Email already registered." });
                }
                return res.status(500).json({ message: "Server error." });
            }

            return res.json({ message: "User created successfully ✅" });
        });

    } catch (error) {
        res.status(500).json({ error: "Registration failed" });
    }
};

// =====================
// GET ALL USERS (ADMIN)
// =====================
exports.getAllUsers = (req, res) => {
    if (req.user.role !== "admin") {
        return res.status(403).json({ message: "Access denied." });
    }

    const sql = "SELECT id, name, email, role, position FROM users ORDER BY id DESC";

    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
};

// =====================
// UPDATE USER (ADMIN)
// =====================
exports.updateUser = (req, res) => {
    if (req.user.role !== "admin") {
        return res.status(403).json({ message: "Access denied." });
    }

    const { id } = req.params;
    const { name, position, role } = req.body;

    const sql = `
        UPDATE users
        SET name = ?, position = ?, role = ?
        WHERE id = ?
    `;

    db.query(sql, [name, position, role, id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "User updated successfully ✅" });
    });
};

// =====================
// DELETE USER (ADMIN)
// =====================
exports.deleteUser = (req, res) => {
    if (req.user.role !== "admin") {
        return res.status(403).json({ message: "Access denied." });
    }

    const { id } = req.params;

    const sql = "DELETE FROM users WHERE id = ?";

    db.query(sql, [id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "User deleted successfully ✅" });
    });
};

// =====================
// LOGIN
// =====================
exports.login = (req, res) => {
    const { email, password } = req.body;

    const sql = "SELECT * FROM users WHERE email = ?";

    db.query(sql, [email], async (err, results) => {
        if (err) return res.status(500).json({ error: err.message });

        if (results.length === 0) {
            return res.status(400).json({ message: "User not found" });
        }

        const user = results[0];
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({ message: "Invalid password" });
        }

        const token = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.json({
            message: "Login successful ✅",
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                position: user.position
            },
            token
        });
    });
};

// =====================
// CHANGE PASSWORD
// =====================
exports.changePassword = async (req, res) => {
    const user_id = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "All fields required." });
    }

    const sql = "SELECT password FROM users WHERE id = ?";

    db.query(sql, [user_id], async (err, results) => {
        if (err) return res.status(500).json({ error: err.message });

        const user = results[0];
        const isMatch = await bcrypt.compare(currentPassword, user.password);

        if (!isMatch) {
            return res.status(400).json({ message: "Current password incorrect." });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        db.query("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, user_id], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Password updated successfully ✅" });
        });
    });
};

// =====================
// GET CURRENT USER
// =====================
exports.getCurrentUser = (req, res) => {
    res.json({ user: req.user });
};