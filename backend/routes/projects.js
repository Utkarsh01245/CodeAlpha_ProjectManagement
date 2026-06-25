const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const { v4: uuidv4 } = require("uuid");

function mongoose_ok() {
  const mongoose = require("mongoose");
  return mongoose.connection.readyState === 1;
}

let Project, Task;
try { Project = require("../models/Project"); Task = require("../models/Task"); } catch {}

// Helper: demo store shortcuts
const pStore = () => global.demoStore.projects;
const tStore = () => global.demoStore.tasks;

// ── Get all projects for current user ─────────────────────────────────────────
router.get("/", protect, async (req, res) => {
  try {
    const uid = req.user.id;
    if (Project && mongoose_ok()) {
      const projects = await Project.find({ $or: [{ owner: uid }, { members: uid }] })
        .populate("owner", "username email")
        .populate("members", "username email")
        .sort("-createdAt");
      return res.json({ success: true, projects });
    }
    // Demo
    const projects = Object.values(pStore()).filter(
      p => p.owner === uid || (p.members || []).includes(uid)
    );
    res.json({ success: true, projects });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Get single project ────────────────────────────────────────────────────────
router.get("/:id", protect, async (req, res) => {
  try {
    if (Project && mongoose_ok()) {
      const project = await Project.findById(req.params.id)
        .populate("owner", "username email")
        .populate("members", "username email");
      if (!project) return res.status(404).json({ success: false, message: "Project not found." });
      return res.json({ success: true, project });
    }
    const project = pStore()[req.params.id];
    if (!project) return res.status(404).json({ success: false, message: "Project not found." });
    res.json({ success: true, project });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Create project ────────────────────────────────────────────────────────────
router.post("/", protect, async (req, res) => {
  try {
    const { name, description, color, columns } = req.body;
    if (!name) return res.status(400).json({ success: false, message: "Project name required." });

    if (Project && mongoose_ok()) {
      const project = await Project.create({
        name, description, color: color || "#6366f1",
        owner: req.user.id,
        members: [req.user.id],
        columns: columns || ["To Do", "In Progress", "Review", "Done"],
      });
      await project.populate("owner", "username email");
      const io = req.app.get("io");
      io.to(`project:${project._id}`).emit("project:updated", project);
      return res.status(201).json({ success: true, project });
    }

    // Demo
    const id = uuidv4();
    const project = {
      id, name, description: description || "", color: color || "#6366f1",
      owner: req.user.id, ownerName: req.user.username,
      members: [req.user.id],
      columns: columns || ["To Do", "In Progress", "Review", "Done"],
      createdAt: new Date().toISOString(),
    };
    pStore()[id] = project;
    res.status(201).json({ success: true, project });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Update project ────────────────────────────────────────────────────────────
router.put("/:id", protect, async (req, res) => {
  try {
    const { name, description, color, columns } = req.body;
    if (Project && mongoose_ok()) {
      const project = await Project.findByIdAndUpdate(
        req.params.id, { name, description, color, columns }, { new: true }
      ).populate("owner", "username email").populate("members", "username email");
      const io = req.app.get("io");
      io.to(`project:${req.params.id}`).emit("project:updated", project);
      return res.json({ success: true, project });
    }
    const project = pStore()[req.params.id];
    if (!project) return res.status(404).json({ success: false, message: "Not found." });
    Object.assign(project, { name, description, color, columns });
    res.json({ success: true, project });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Delete project ────────────────────────────────────────────────────────────
router.delete("/:id", protect, async (req, res) => {
  try {
    if (Project && mongoose_ok()) {
      await Project.findByIdAndDelete(req.params.id);
      await Task.deleteMany({ project: req.params.id });
      return res.json({ success: true });
    }
    delete pStore()[req.params.id];
    // Delete associated tasks
    Object.keys(tStore()).forEach(tid => {
      if (tStore()[tid].project === req.params.id) delete tStore()[tid];
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Add member ────────────────────────────────────────────────────────────────
router.post("/:id/members", protect, async (req, res) => {
  try {
    const { userId } = req.body;
    if (Project && mongoose_ok()) {
      const project = await Project.findByIdAndUpdate(
        req.params.id,
        { $addToSet: { members: userId } },
        { new: true }
      ).populate("owner", "username email").populate("members", "username email");
      const io = req.app.get("io");
      io.to(`project:${req.params.id}`).emit("project:updated", project);
      return res.json({ success: true, project });
    }
    const project = pStore()[req.params.id];
    if (!project) return res.status(404).json({ success: false, message: "Not found." });
    if (!project.members.includes(userId)) project.members.push(userId);
    res.json({ success: true, project });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Remove member ─────────────────────────────────────────────────────────────
router.delete("/:id/members/:userId", protect, async (req, res) => {
  try {
    if (Project && mongoose_ok()) {
      const project = await Project.findByIdAndUpdate(
        req.params.id,
        { $pull: { members: req.params.userId } },
        { new: true }
      ).populate("owner", "username email").populate("members", "username email");
      return res.json({ success: true, project });
    }
    const project = pStore()[req.params.id];
    if (project) project.members = project.members.filter(m => m !== req.params.userId);
    res.json({ success: true, project });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
