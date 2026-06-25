const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");

// ── Get current user profile ──────────────────────────────────────────────────
router.get("/me", protect, async (req, res) => {
  res.json({ success: true, user: { id: req.user.id, username: req.user.username, email: req.user.email } });
});

module.exports = router;
