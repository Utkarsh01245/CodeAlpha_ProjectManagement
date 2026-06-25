# ◈ Taskify — Project Management Tool
### CodeAlpha Full Stack Development Internship — Task 3

A full-stack collaborative project management app inspired by Trello/Asana, with Kanban boards, task assignment, comments, real-time WebSocket updates, and JWT authentication.

---

## ✅ Task 3 Requirements — All Implemented

| # | Requirement | Status | Details |
|---|---|:---:|---|
| 1 | **Create group projects** | ✅ Done | Create projects with name, description, color |
| 2 | **Assign tasks** | ✅ Done | Assign tasks to any project member |
| 3 | **Comment on tasks** | ✅ Done | Per-task comment thread with delete |
| 4 | **Communicate within tasks** | ✅ Done | Real-time comments via Socket.io |
| 5 | **Full-stack with auth** | ✅ Done | JWT + bcrypt + protected routes |
| 6 | **Project boards & task cards** | ✅ Done | Drag-and-drop Kanban board |
| 7 | **Backend: users, projects, tasks, comments** | ✅ Done | Full MongoDB / in-memory models |
| 8 | **Notifications (Bonus)** | ✅ Done | Toast notifications for all events |
| 9 | **Real-time updates via WebSockets (Bonus)** | ✅ Done | Socket.io — live task/comment sync |

---

## 🛠 Tech Stack

**Backend:** Node.js, Express.js, Socket.io, MongoDB + Mongoose, JWT, bcryptjs, express-rate-limit, Helmet

**Frontend:** HTML5, CSS3, Vanilla JavaScript, Socket.io Client, Google Fonts (Inter + Plus Jakarta Sans)

---

## 📁 Project Structure

```
CodeAlpha_ProjectManagement/
│
├── README.md
├── .gitignore
│
├── backend/
│   ├── server.js              # Express + Socket.io + routes
│   ├── package.json
│   ├── .env.example
│   ├── middleware/
│   │   └── auth.js            # JWT protect middleware
│   ├── models/
│   │   ├── User.js            # username, email, bcrypt password
│   │   ├── Project.js         # name, description, color, members, columns
│   │   ├── Task.js            # title, desc, column, priority, assignees, checklist, dueDate
│   │   └── Comment.js         # task, author, content
│   └── routes/
│       ├── auth.js            # register, login, verify, user search
│       ├── projects.js        # CRUD + member add/remove
│       ├── tasks.js           # CRUD + move + assign + checklist
│       ├── comments.js        # add, list, delete
│       └── users.js           # /me profile
│
└── frontend/
    └── public/
        ├── index.html         # Landing page + Auth modal
        ├── dashboard.html     # My Projects grid
        ├── project.html       # Kanban board for a project
        ├── css/
        │   ├── style.css      # Global styles, navbar, hero, modals
        │   └── board.css      # Board, columns, task cards, drag states
        └── js/
            ├── auth.js        # Register / Login / redirect
            ├── dashboard.js   # Load & create projects
            └── board.js       # Full Kanban: drag & drop, tasks, comments, sockets
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js v16+
- MongoDB (optional — app runs in demo mode without it)

### 1. Clone
```bash
git clone https://github.com/YOUR_USERNAME/CodeAlpha_ProjectManagement
cd CodeAlpha_ProjectManagement/backend
```

### 2. Install
```bash
npm install
```

### 3. Configure
```bash
cp .env.example .env
# Edit .env — set MongoDB URI and JWT secret
```

### 4. Run
```bash
npm start        # production
npm run dev      # development (nodemon)
```

### 5. Open
```
http://localhost:4000
```

---

## 📱 Features Walkthrough

### Authentication
- Register with username + email + password (bcrypt hashed)
- Login returns a JWT stored in localStorage
- All API routes protected with JWT middleware

### Dashboard
- Shows all projects you own or are a member of
- Create a new project with name, description, and a color theme
- One-click to open any project board

### Kanban Board
- Four default columns: **To Do → In Progress → Review → Done**
- Drag and drop tasks between columns (updates backend live)
- Column task count badges update automatically

### Task Cards
- Title, description, priority (Low/Medium/High/Urgent), due date
- Assign multiple team members — shown as avatar stack
- Labels (comma-separated tags)
- Checklist with progress bar
- Overdue dates highlighted in red

### Task Modal (Click any card)
- Edit all task properties
- Add/check/remove checklist items
- Per-task comment section with timestamps
- Delete task button

### Team Collaboration
- Invite members by searching username/email
- Remove members from the project
- Assignee picker shows all current members
- Member avatars in navbar

### Real-Time (Socket.io)
| Event | Who sees it |
|---|---|
| Task created | All users in the project room |
| Task updated | All users — board re-renders instantly |
| Task moved (drag) | All users — column updates live |
| Task deleted | All users — card disappears |
| Comment added | Other users viewing same task |
| Comment deleted | Other users viewing same task |
| Project settings changed | All users |

### Notifications
- Toast notifications for all real-time events
- "New task: [title]" when someone creates a task

---

## 🔒 Security
- Passwords hashed with **bcrypt** (12 rounds)
- **JWT** tokens for stateless auth (7-day expiry)
- **Helmet.js** HTTP security headers
- **Rate limiting** — 300 requests per 15 minutes
- Input escaping in all frontend rendering

---

## 👤 Author

| Field | Info |
|---|---|
| **Name** | [Utkarsh MIshra] |
| **Internship** | CodeAlpha Full Stack Development |
| **Task** | Task 3 — Project Management Tool |
| **GitHub** | [@utkarsh01245]([(https://github.com/Utkarsh01245)]) |


---

<div align="center">Made with ❤️ for CodeAlpha Internship · ⭐ Star if helpful!</div>
