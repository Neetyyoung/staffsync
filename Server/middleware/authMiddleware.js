const jwt = require("jsonwebtoken");
const db = require("../config/db");

module.exports = (req, res, next) => {
    console.log("Middleware triggered");

    const authHeader = req.headers.authorization;
    console.log("Auth header:", authHeader);

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        console.log("No or invalid header");
        return res.status(401).json({ message: "No token provided ❌" });
    }

    const token = authHeader.split(" ")[1];
    console.log("Token extracted");

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log("Token verified");

        const sql = "SELECT id, name, email, role, position FROM users WHERE id = ?";

        db.query(sql, [decoded.id], (err, results) => {
            if (err) return res.status(500).json({ error: err.message });

            if (results.length === 0) {
                return res.status(401).json({ message: "User not found" });
            }

            req.user = results[0]; // attach full user object
            next();
        });

    } catch (error) {
        console.log("Invalid token");
        return res.status(403).json({ message: "Invalid or expired token ❌" });
    }
};