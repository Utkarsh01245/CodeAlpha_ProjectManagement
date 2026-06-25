require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");
const mongoose = require("mongoose");
const rateLimit = require("express-rate-limit");

const authRoutes = require("./routes/auth");
const projectRoutes = require("./routes/projects");
const taskRoutes = require("./routes/tasks");
const commentRoutes = require("./routes/comments");
const userRoutes = require("./routes/users");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST", "PUT", "DELETE"] },
});

// ── Security ──────────────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: "*" }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));

// ── Static ────────────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, "../frontend/public")));

// ── API Routes ────────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/users", userRoutes);

// ── Frontend Pages ────────────────────────────────────────────────────────────
app.get("/", (req, res) =>
  res.sendFile(path.join(__dirname, "../frontend/public/index.html"))
);
app.get("/dashboard", (req, res) =>
  res.sendFile(path.join(__dirname, "../frontend/public/dashboard.html"))
);
app.get("/project/:id", (req, res) =>
  res.sendFile(path.join(__dirname, "../frontend/public/project.html"))
);

// ── MongoDB ───────────────────────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/codealpha_pm")
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.log("⚠️  MongoDB offline — running in demo mode:", err.message));

// ── In-memory demo store (when MongoDB is offline) ────────────────────────────
global.demoStore = {
  users: {},       // { id: user }
  projects: {},    // { id: project }
  tasks: {},       // { id: task }
  comments: {},    // { id: comment }
};

// ── Socket.io — Real-time updates ─────────────────────────────────────────────
io.on("connection", (socket) => {
  // Join a project room for scoped real-time updates
  socket.on("join-project", (projectId) => {
    socket.join(`project:${projectId}`);
  });

  socket.on("leave-project", (projectId) => {
    socket.leave(`project:${projectId}`);
  });

  socket.on("disconnect", () => {});
});

// Attach io to app so routes can emit events
app.set("io", io);

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🚀 CodeAlpha PM Server → http://localhost:${PORT}`);
});

module.exports = { app, io };
