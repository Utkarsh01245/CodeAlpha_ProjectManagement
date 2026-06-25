const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const { v4: uuidv4 } = require("uuid");

function mongoose_ok() {
  const mongoose = require("mongoose");
  return mongoose.connection.readyState === 1;
}

let Comment, Task;
try { Comment = require("../models/Comment"); Task = require("../models/Task"); } catch {}

const cStore = () => global.demoStore.comments;
const tStore = () => global.demoStore.tasks;

// ── Get comments for a task ───────────────────────────────────────────────────
router.get("/task/:taskId", protect, async (req, res) => {
  try {
    if (Comment && mongoose_ok()) {
      const comments = await Comment.find({ task: req.params.taskId })
        .populate("author", "username email")
        .sort("createdAt");
      return res.json({ success: true, comments });
    }
    const comments = Object.values(cStore())
      .filter(c => c.task === req.params.taskId)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    res.json({ success: true, comments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Add comment ───────────────────────────────────────────────────────────────
router.post("/", protect, async (req, res) => {
  try {
    const { task: taskId, content } = req.body;
    if (!taskId || !content?.trim())
      return res.status(400).json({ success: false, message: "Task and content required." });

    if (Comment && mongoose_ok()) {
      const comment = await Comment.create({ task: taskId, author: req.user.id, content: content.trim() });
      await comment.populate("author", "username email");

      // Get project id for room broadcast
      const task = await Task.findById(taskId);
      const io = req.app.get("io");
      io.to(`project:${task?.project}`).emit("comment:added", { taskId, comment });
      return res.status(201).json({ success: true, comment });
    }

    // Demo
    const task = tStore()[taskId];
    const id = uuidv4();
    const comment = {
      id, task: taskId, content: content.trim(),
      author: req.user.id, authorName: req.user.username,
      createdAt: new Date().toISOString(),
    };
    cStore()[id] = comment;

    const io = req.app.get("io");
    if (task) io.to(`project:${task.project}`).emit("comment:added", { taskId, comment });
    res.status(201).json({ success: true, comment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Delete comment ────────────────────────────────────────────────────────────
router.delete("/:id", protect, async (req, res) => {
  try {
    if (Comment && mongoose_ok()) {
      const comment = await Comment.findByIdAndDelete(req.params.id);
      const task = await Task.findById(comment?.task);
      const io = req.app.get("io");
      io.to(`project:${task?.project}`).emit("comment:deleted", { taskId: comment?.task, commentId: req.params.id });
      return res.json({ success: true });
    }
    const comment = cStore()[req.params.id];
    delete cStore()[req.params.id];
    const task = comment ? tStore()[comment.task] : null;
    const io = req.app.get("io");
    if (task) io.to(`project:${task.project}`).emit("comment:deleted", { taskId: comment.task, commentId: req.params.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
