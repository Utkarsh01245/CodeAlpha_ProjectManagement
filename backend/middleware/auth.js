const jwt = require("jsonwebtoken");

const protect = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ success: false, message: "No token provided." });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || "codealpha_pm_secret");
    next();
  } catch {
    res.status(401).json({ success: false, message: "Invalid or expired token." });
  }
};

module.exports = { protect };
