const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");

const SECRET = process.env.JWT_SECRET || "codealpha_pm_secret";
const genToken = (id, username, email) =>
  jwt.sign({ id, username, email }, SECRET, { expiresIn: "7d" });

let User;
try { User = require("../models/User"); } catch { User = null; }

// ── Register ──────────────────────────────────────────────────────────────────
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password)
      return res.status(400).json({ success: false, message: "All fields required." });
    if (password.length < 6)
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters." });

    if (User && mongoose_ok()) {
      const exists = await User.findOne({ $or: [{ email }, { username }] });
      if (exists) return res.status(400).json({ success: false, message: "Username or email already taken." });
      const user = await User.create({ username, email, password });
      return res.status(201).json({ success: true, token: genToken(user._id, user.username, user.email), user: { id: user._id, username: user.username, email: user.email } });
    }

    // Demo mode
    const store = global.demoStore.users;
    const exists = Object.values(store).find(u => u.email === email || u.username === username);
    if (exists) return res.status(400).json({ success: false, message: "Username or email already taken." });
    const id = uuidv4();
    const hashed = await bcrypt.hash(password, 12);
    store[id] = { id, username, email, password: hashed };
    res.status(201).json({ success: true, token: genToken(id, username, email), user: { id, username, email } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Login ─────────────────────────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: "Email and password required." });

    if (User && mongoose_ok()) {
      const user = await User.findOne({ email }).select("+password");
      if (!user || !(await user.comparePassword(password)))
        return res.status(401).json({ success: false, message: "Invalid credentials." });
      return res.json({ success: true, token: genToken(user._id, user.username, user.email), user: { id: user._id, username: user.username, email: user.email } });
    }

    // Demo mode
    const store = global.demoStore.users;
    const user = Object.values(store).find(u => u.email === email);
    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(401).json({ success: false, message: "Invalid credentials." });
    res.json({ success: true, token: genToken(user.id, user.username, user.email), user: { id: user.id, username: user.username, email: user.email } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Verify ────────────────────────────────────────────────────────────────────
router.get("/verify", (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ success: false });
  try {
    const user = jwt.verify(token, SECRET);
    res.json({ success: true, user });
  } catch {
    res.status(401).json({ success: false });
  }
});

// ── Search users (for inviting to project) ───────────────────────────────────
router.get("/search", require("../middleware/auth").protect, async (req, res) => {
  const q = req.query.q?.toLowerCase();
  if (!q) return res.json({ success: true, users: [] });

  if (User && mongoose_ok()) {
    const users = await User.find({ $or: [{ username: new RegExp(q, "i") }, { email: new RegExp(q, "i") }] }).limit(5).select("username email");
    return res.json({ success: true, users });
  }

  const users = Object.values(global.demoStore.users)
    .filter(u => u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
    .map(u => ({ id: u.id, username: u.username, email: u.email }))
    .slice(0, 5);
  res.json({ success: true, users });
});

function mongoose_ok() {
  const mongoose = require("mongoose");
  return mongoose.connection.readyState === 1;
}

module.exports = router;
