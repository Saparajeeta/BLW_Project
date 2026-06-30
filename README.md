# Railway Workshop Asset & Inventory Management System

A production-grade full-stack web application designed for a locomotive manufacturing unit (inspired by BLW/DLW Varanasi). It provides a robust platform for tracking machinery, IT hardware, tools, and spare parts across various shop floors and departments.

## 🏭 About Banaras Locomotive Works (BLW)
This project is deeply inspired by the real-world operations of Banaras Locomotive Works (formerly Diesel Locomotive Works) in Varanasi. 
- **Heritage:** Founded in 1956, BLW began by manufacturing ALCO-based locomotives (like WDM-2). 
- **Evolution:** By 2002, they transitioned to high-horsepower EMD 710-based locomotives (WDG-4/WDP-4). 
- **Modern Era:** In 2019, they developed India's first bi-mode locomotive (WDAP-5) and today are massive producers of electric locomotives, notably the **WAP-7** and **WAG-9**.
- **Production Scale:** In FY 2025-26, cumulative production hit 572 locomotives, contributing to over 11,259 locomotives built since inception.
- **Global Reach:** BLW is not just a domestic supplier; they have generated ₹1,837 crore from non-railway customers and exports (like locomotives sent to Mozambique).

## 🌟 Key Features

* **Real-time Dashboard Analytics:** Interactive charts powered by `Chart.js` displaying asset distribution, condition breakdowns, and key metrics.
* **Role-Based Access Control (RBAC):** Secure authentication using real JWTs and `bcrypt` password hashing. Distinct roles (Admin, Viewer) to restrict sensitive actions.
* **Comprehensive Asset Tracking:** 
  * Granular details (Category, Condition, Location, Assignee, Value).
  * Global free-text search across multiple fields.
  * Server-side pagination for handling large datasets efficiently.
* **Maintenance & Audit Logging:** 
  * Dedicated tables for recording maintenance history.
  * An automated Audit Log tracking all CRUD and transfer actions with a live Recent Activity feed on the dashboard.
* **Modern Premium UI:** Built with HTML/CSS using a dark-mode glassmorphism aesthetic, responsive grids, and dynamic toast notifications.

## 🛠️ Technology Stack

* **Backend:** Node.js, Express.js
* **Database:** SQLite3 (Relational Schema: Users, Departments, Assets, Maintenance, Audits)
* **Authentication/Security:** JSON Web Tokens (JWT), bcrypt, express-validator
* **Frontend:** Vanilla HTML5, CSS3, JavaScript (ES6+), Chart.js, Ionicons

## 📂 Folder Structure

```
├── backend/
│   ├── routes/
│   │   ├── analytics.js    # Dashboard chart data & recent activity
│   │   ├── assets.js       # CRUD, pagination, search, transfer
│   │   ├── auth.js         # JWT Login
│   │   ├── departments.js  # Department lookup
│   │   └── maintenance.js  # Maintenance logging
│   ├── utils/
│   │   ├── audit.js        # Audit log helper
│   │   └── authMiddleware.js # RBAC protection
│   ├── database.js         # SQLite connection & Realistic Seeding
│   ├── server.js           # Main Express server entry
│   └── package.json        
├── frontend/
│   ├── css/styles.css      # Premium custom design system
│   ├── js/app.js           # Client-side API interactions & UI logic
│   ├── index.html          # Main application dashboard
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
3. **Environment Setup:**
   Ensure the `.env` file exists with `PORT`, `DB_PATH`, and `JWT_SECRET`.
4. **Start the Server:**
   ```sh
   npm start
   ```
   *Note: Upon first run, the database will be automatically created and seeded with realistic Indian Railways workshop data and hashed credentials.*

### Credentials
* **Admin Access:** Username: `admin` | Password: `admin123`
* **Viewer Access:** Username: `viewer` | Password: `viewer123`

## 🔮 Future Enhancements
- Export to CSV/PDF features for automated monthly reports.
- Advanced Maintenance predicting (AI-driven alerts based on wear-and-tear).
- Asset Barcode/QR Code scanning integration for mobile devices on the shop floor.
- WebSocket integration for live, real-time dashboard updates.
