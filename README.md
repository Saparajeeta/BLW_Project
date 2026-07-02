# Live Locomotive Production Tracking System

A production-grade full-stack web application designed for Banaras Locomotive Works (BLW) Varanasi. It provides a real-time, employee-facing platform for tracking locomotives as they progress through manufacturing stages on the shop floor.

## 🏭 About Banaras Locomotive Works (BLW)
This project is deeply inspired by the real-world operations of Banaras Locomotive Works in Varanasi. 
- **Production Scale:** Huge producers of electric locomotives, notably the **WAP-7** and **WAG-9**.
- **Real-time Pipeline:** Locomotives move through strictly monitored stages: Frame Fabrication, Bogie Assembly, Loco Assembly, Electrical Fitting, Paint & Finishing, Quality Check, Trial Run, and Dispatch.

## 🌟 Key Features

* **Real-time Pipeline Dashboard:** Interactive visual pipeline showing the count of locomotives in each manufacturing stage.
* **Intelligent Alerts:** Automatically flags locomotives that are overdue or stuck in a single stage for more than 7 days.
* **Detailed Locomotive Timelines:** Calculates Expected vs. Actual days spent in each stage, with automated color-coding (Green/Yellow/Red alerts) for delays.
* **Role-Based Access Control (RBAC):** Distinct roles (Admin, Engineer, Worker) restricting stage updates, user management, and issue logging visibility.
* **Issue & Breakdown Logging:** Employees can log issues directly against a Locomotive Number.
* **Comprehensive Reporting Suite:** Automated data exports for Monthly Production, Stage Status, Pending Issues, and Overdue Locomotives.
* **Modern Premium UI:** Built with a clean, functional "internal tool" aesthetic featuring dark-mode glassmorphism and the official Indian Railways orange accent (`#f97316`).

## 🛠️ Technology Stack

* **Backend:** Node.js, Express.js
* **Database:** SQLite3 (Relational Schema: Users, Locomotives, Stage History, Issues, Dispatch Records)
* **Authentication/Security:** JSON Web Tokens (JWT), bcrypt, forced password reset flows
* **Frontend:** Vanilla HTML5, CSS3, JavaScript (ES6+), Chart.js

## 📂 Folder Structure

```
├── backend/
│   ├── routes/
│   │   ├── auth.js         # JWT Login & User Management
│   │   ├── locos.js        # Stage progressions & Loco CRUD
│   │   ├── issues.js       # Breakdown logging
│   │   └── reports.js      # Dashboard alerts & CSV exports
│   ├── middleware/
│   │   ├── auth.js         # JWT validation
│   │   └── roles.js        # RBAC protection
│   ├── database.js         # SQLite connection & Schema initialization
│   ├── server.js           # Main Express server entry
│   └── package.json        
├── frontend/
│   ├── css/styles.css      # Premium custom design system
│   ├── js/                 # API client wrappers and DOM logic
│   ├── assets/images/      # Local image assets
│   ├── dashboard.html      # Pipeline Hero & Alerts
│   ├── locos.html          # Tracking table
│   ├── loco-detail.html    # Single Loco timeline & issue list
│   ├── issues.html         # Issue logging portal
│   ├── reports.html        # CSV export suite
│   ├── users.html          # User management
│   └── login.html          # Secure login portal
├── .env                    # Environment variables configuration
└── README.md
```

## 🚀 Getting Started

### Prerequisites
* [Node.js](https://nodejs.org/) installed on your machine.

### Installation & Setup

1. **Navigate to the Backend Directory:**
   ```sh
   cd backend
   ```
2. **Install Dependencies:**
   ```sh
   npm install
   ```
3. **Start the Server:**
   ```sh
   npm start
   ```
   *Note: Upon first run, the database will be automatically created and seeded with a default admin account.*

### Default Credentials
* **Username:** `apar`
* **Password:** `apar123`
* **Note:** The system forces a password reset on first login for security.
