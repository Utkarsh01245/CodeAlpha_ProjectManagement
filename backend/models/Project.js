const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true, maxlength: 60 },
  description: { type: String, default: "", maxlength: 500 },
  color:       { type: String, default: "#6366f1" },
  owner:       { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  members:     [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  columns: {
    type: [String],
    default: ["To Do", "In Progress", "Review", "Done"],
  },
}, { timestamps: true });

module.exports = mongoose.model("Project", projectSchema);
