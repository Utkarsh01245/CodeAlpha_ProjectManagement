const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const { v4: uuidv4 } = require("uuid");

function mongoose_ok() {
  const mongoose = require("mongoose");
  return mongoose.connection.readyState === 1;
}

let Task, Comment;
try { Task = require("../models/Task"); Comment = require("../models/Comment"); } catch {}

const tStore = () => global.demoStore.tasks;
const cStore = () => global.demoStore.comments;

// ── Get all tasks for a project ───────────────────────────────────────────────
router.get("/project/:projectId", protect, async (req, res) => {
  try {
    if (Task && mongoose_ok()) {
      const tasks = await Task.find({ project: req.params.projectId })
        .populate("assignees", "username email")
        .populate("createdBy", "username")
        .sort("order");
      return res.json({ success: true, tasks });
    }
    const tasks = Object.values(tStore()).filter(t => t.project === req.params.projectId);
    res.json({ success: true, tasks });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Create task ───────────────────────────────────────────────────────────────
router.post("/", protect, async (req, res) => {
  try {
    const { title, description, project, column, priority, dueDate, labels } = req.body;
    if (!title || !project) return res.status(400).json({ success: false, message: "Title and project required." });

    if (Task && mongoose_ok()) {
      const task = await Task.create({
        title, description, project, column: column || "To Do",
        priority: priority || "medium", createdBy: req.user.id,
        dueDate: dueDate || null, labels: labels || [],
      });
      await task.populate("createdBy", "username");
      const io = req.app.get("io");
      io.to(`project:${project}`).emit("task:created", task);
      return res.status(201).json({ success: true, task });
    }

    // Demo
    const id = uuidv4();
    const task = {
      id, title, description: description || "", project,
      column: column || "To Do", priority: priority || "medium",
      createdBy: req.user.id, createdByName: req.user.username,
      assignees: [], labels: labels || [], checklist: [],
      dueDate: dueDate || null, order: Date.now(),
      createdAt: new Date().toISOString(),
    };
    tStore()[id] = task;

    const io = req.app.get("io");
    io.to(`project:${project}`).emit("task:created", task);
    res.status(201).json({ success: true, task });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Update task (title, desc, column, priority, dueDate, etc.) ───────────────
router.put("/:id", protect, async (req, res) => {
  try {
    const updates = req.body;
    if (Task && mongoose_ok()) {
      const task = await Task.findByIdAndUpdate(req.params.id, updates, { new: true })
        .populate("assignees", "username email")
        .populate("createdBy", "username");
      const io = req.app.get("io");
      io.to(`project:${task.project}`).emit("task:updated", task);
      return res.json({ success: true, task });
    }

    const task = tStore()[req.params.id];
    if (!task) return res.status(404).json({ success: false, message: "Task not found." });
    Object.assign(task, updates);

    const io = req.app.get("io");
    io.to(`project:${task.project}`).emit("task:updated", task);
    res.json({ success: true, task });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Move task (change column) ─────────────────────────────────────────────────
router.patch("/:id/move", protect, async (req, res) => {
  try {
    const { column, order } = req.body;
    if (Task && mongoose_ok()) {
      const task = await Task.findByIdAndUpdate(req.params.id, { column, order }, { new: true })
        .populate("assignees", "username email")
        .populate("createdBy", "username");
      const io = req.app.get("io");
      io.to(`project:${task.project}`).emit("task:moved", { taskId: req.params.id, column, order });
      return res.json({ success: true, task });
    }

    const task = tStore()[req.params.id];
    if (!task) return res.status(404).json({ success: false, message: "Task not found." });
    task.column = column; task.order = order || task.order;

    const io = req.app.get("io");
    io.to(`project:${task.project}`).emit("task:moved", { taskId: req.params.id, column, order });
    res.json({ success: true, task });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Assign user ───────────────────────────────────────────────────────────────
router.post("/:id/assign", protect, async (req, res) => {
  try {
    const { userId } = req.body;
    if (Task && mongoose_ok()) {
      const task = await Task.findByIdAndUpdate(
        req.params.id, { $addToSet: { assignees: userId } }, { new: true }
      ).populate("assignees", "username email").populate("createdBy", "username");
      const io = req.app.get("io");
      io.to(`project:${task.project}`).emit("task:updated", task);
      return res.json({ success: true, task });
    }
    const task = tStore()[req.params.id];
    if (task && !task.assignees.includes(userId)) task.assignees.push(userId);
    res.json({ success: true, task });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Checklist item toggle ─────────────────────────────────────────────────────
router.patch("/:id/checklist/:itemIdx", protect, async (req, res) => {
  try {
    const { done } = req.body;
    if (Task && mongoose_ok()) {
      const task = await Task.findById(req.params.id);
      if (task.checklist[req.params.itemIdx]) {
        task.checklist[req.params.itemIdx].done = done;
        await task.save();
        const io = req.app.get("io");
        io.to(`project:${task.project}`).emit("task:updated", task);
        return res.json({ success: true, task });
      }
    }
    const task = tStore()[req.params.id];
    if (task?.checklist?.[req.params.itemIdx]) task.checklist[req.params.itemIdx].done = done;
    res.json({ success: true, task });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Delete task ───────────────────────────────────────────────────────────────
router.delete("/:id", protect, async (req, res) => {
  try {
    if (Task && mongoose_ok()) {
      const task = await Task.findByIdAndDelete(req.params.id);
      await Comment.deleteMany({ task: req.params.id });
      const io = req.app.get("io");
      io.to(`project:${task.project}`).emit("task:deleted", req.params.id);
      return res.json({ success: true });
    }
    const task = tStore()[req.params.id];
    if (task) {
      delete tStore()[req.params.id];
      // delete its comments
      Object.keys(cStore()).forEach(cid => {
        if (cStore()[cid].task === req.params.id) delete cStore()[cid];
      });
      const io = req.app.get("io");
      io.to(`project:${task.project}`).emit("task:deleted", req.params.id);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
