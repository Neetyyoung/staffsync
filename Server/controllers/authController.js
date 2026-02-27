const bcrypt = require("bcrypt");
const db = require("../config/db");
const jwt = require("jsonwebtoken");

// =====================
// REGISTER (ADMIN ONLY)
// =====================
exports.register = async (req, res) => {

    // 🔐 Only Admin Can Create Accounts
    if (!req.user || req.user.role !== "admin") {
        return res.status(403).json({
            message: "Access denied. Admin only."
        });
    }

    const { name, email, password, position, role } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({
            message: "Name, email and password are required"
        });
    }

    if (!position || position.trim() === "") {
        return res.status(400).json({
            message: "Job title is required"
        });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        // Default role is employee if not provided
        const userRole = role === "admin" ? "admin" : "employee";

        const sql = `
            INSERT INTO users (name, email, password, role, position)
            VALUES (?, ?, ?, ?, ?)
        `;

        db.query(
            sql,
            [name, email, hashedPassword, userRole, position],
            (err, result) => {

                if (err) {
                    if (err.code === "ER_DUP_ENTRY") {
                        return res.status(400).json({
                            message: "Email already registered. Please use another email."
                        });
                    }

                    return res.status(500).json({
                        message: "Server error. Please try again."
                    });
                }

                return res.json({
                    message: "User created successfully ✅",
                    role: userRole
                });
            }
        );

    } catch (error) {
        res.status(500).json({ error: "Registration failed" });
    }
};

// =====================
// LOGIN
// =====================
exports.login = (req, res) => {
    const { email, password } = req.body;

    const sql = "SELECT * FROM users WHERE email = ?";

    db.query(sql, [email], async (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

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
// GET CURRENT USER
// =====================
exports.getCurrentUser = (req, res) => {

    if (!req.user) {
        return res.status(401).json({
            message: "Unauthorized"
        });
    }

    return res.json({
        user: req.user
    });
};