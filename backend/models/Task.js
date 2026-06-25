const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema({
  title:       { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, default: "", maxlength: 2000 },
  project:     { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
  column:      { type: String, required: true, default: "To Do" },
  priority:    { type: String, enum: ["low", "medium", "high", "urgent"], default: "medium" },
  assignees:   [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  dueDate:     { type: Date, default: null },
  labels:      [{ type: String }],
  order:       { type: Number, default: 0 },
  checklist: [{
    text:      { type: String },
    done:      { type: Boolean, default: false },
  }],
}, { timestamps: true });

module.exports = mongoose.model("Task", taskSchema);
