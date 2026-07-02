const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

const dbPath = path.resolve(__dirname, process.env.DB_PATH || 'blw_production.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        initDb();
    }
});

function initDb() {
    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL,
            department TEXT,
            password_reset_required INTEGER DEFAULT 0
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS locomotives (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            loco_number TEXT UNIQUE NOT NULL,
            model TEXT NOT NULL,
            start_date TEXT NOT NULL,
            assigned_engineer TEXT,
            current_stage TEXT NOT NULL,
            target_dispatch_date TEXT,
            status TEXT DEFAULT 'In Production',
            last_stage_update_at TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS stage_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            loco_id INTEGER NOT NULL,
            stage_name TEXT NOT NULL,
            action TEXT NOT NULL,
            updated_by INTEGER NOT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            remarks TEXT NOT NULL,
            FOREIGN KEY(loco_id) REFERENCES locomotives(id),
            FOREIGN KEY(updated_by) REFERENCES users(id)
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS issues (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            loco_id INTEGER NOT NULL,
            logged_by INTEGER NOT NULL,
            issue_type TEXT NOT NULL,
            description TEXT NOT NULL,
            severity TEXT NOT NULL,
            status TEXT DEFAULT 'Open',
            resolution_notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            resolved_at DATETIME,
            FOREIGN KEY(loco_id) REFERENCES locomotives(id),
            FOREIGN KEY(logged_by) REFERENCES users(id)
        )`);
        
        db.run(`CREATE TABLE IF NOT EXISTS dispatch_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            loco_id INTEGER NOT NULL,
            destination_zone TEXT NOT NULL,
            receiving_shed TEXT NOT NULL,
            dispatch_date TEXT NOT NULL,
            consignment_number TEXT NOT NULL,
            created_by INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(loco_id) REFERENCES locomotives(id),
            FOREIGN KEY(created_by) REFERENCES users(id)
        )`);

        db.get("SELECT COUNT(*) AS count FROM users", (err, row) => {
            if (row && row.count === 0) {
                seedData();
            }
        });
    });
}

async function seedData() {
    console.log("Seeding default admin user...");
    const saltRounds = 10;
    const adminHash = await bcrypt.hash('apar123', saltRounds);
    
    db.run(
        `INSERT INTO users (employee_id, name, username, password_hash, role, department, password_reset_required) VALUES (?, ?, ?, ?, ?, ?, ?)`, 
        ['ADM-001', 'System Admin', 'apar', adminHash, 'Admin', 'IT', 1],
        (err) => {
            if (err) {
                console.error("Error seeding default admin:", err.message);
            } else {
                console.log("Default admin seeded. Username: apar | Password: apar123");
            }
        }
    );
}

module.exports = db;
