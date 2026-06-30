const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

const dbPath = path.resolve(__dirname, process.env.DB_PATH || 'inventory.db');
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
        db.run(`CREATE TABLE IF NOT EXISTS departments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS assets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            department_id INTEGER NOT NULL,
            quantity INTEGER NOT NULL,
            purchase_date TEXT,
            warranty_expiry TEXT,
            condition TEXT NOT NULL,
            assigned_to TEXT,
            location TEXT,
            asset_value REAL,
            last_maintenance TEXT,
            next_maintenance TEXT,
            FOREIGN KEY(department_id) REFERENCES departments(id)
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            action TEXT NOT NULL,
            target_type TEXT NOT NULL,
            target_id INTEGER,
            details TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS maintenance_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            asset_id INTEGER NOT NULL,
            maintenance_date TEXT NOT NULL,
            technician TEXT NOT NULL,
            notes TEXT,
            cost REAL,
            FOREIGN KEY(asset_id) REFERENCES assets(id)
        )`);

        db.get("SELECT COUNT(*) AS count FROM users", (err, row) => {
            if (row && row.count === 0) {
                seedData();
            }
        });
    });
}

async function seedData() {
    console.log("Seeding initial database...");
    
    // Seed Users
    const saltRounds = 10;
    const adminHash = await bcrypt.hash('admin123', saltRounds);
    const viewerHash = await bcrypt.hash('viewer123', saltRounds);
    
    db.run(`INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)`, ['admin', adminHash, 'Admin']);
    db.run(`INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)`, ['viewer', viewerHash, 'Viewer']);
    
    // Seed Departments
    const depts = [
        'Loco Assembly Shop',
        'Heavy Machine Shop',
        'Electronic Data Processing (EDP)',
        'Stores',
        'Tele Exchange'
    ];
    
    depts.forEach(dept => {
        db.run(`INSERT INTO departments (name) VALUES (?)`, [dept]);
    });

    // Seed Assets
    const stmt = db.prepare(`INSERT INTO assets (name, category, department_id, quantity, purchase_date, warranty_expiry, condition, assigned_to, location, asset_value, last_maintenance, next_maintenance) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    
    const assetsData = [
        // Loco Assembly Shop (dept 1)
        { name: 'WAP7 Traction Motor', category: 'Machinery', dept: 1, qty: 5, pur: '2022-01-15', war: '2025-01-14', cond: 'Good', assign: 'Ramesh K.', loc: 'Shop Floor A', val: 500000, last_maint: '2025-01-10', next_maint: '2025-07-10' },
        { name: 'Overhead Crane (10T)', category: 'Machinery', dept: 1, qty: 2, pur: '2015-05-20', war: '2020-05-19', cond: 'Needs Repair', assign: 'Suresh M.', loc: 'Bay 2', val: 1200000, last_maint: '2024-11-20', next_maint: '2025-02-20' },
        { name: 'Pneumatic Wrenches', category: 'Tools', dept: 1, qty: 15, pur: '2024-03-01', war: '2026-03-01', cond: 'New', assign: null, loc: 'Tool Room 1', val: 15000, last_maint: null, next_maint: '2025-09-01' },
        // Heavy Machine Shop (dept 2)
        { name: 'CNC Lathe Machine', category: 'Machinery', dept: 2, qty: 1, pur: '2018-08-10', war: '2023-08-10', cond: 'Decommissioned', assign: 'Amit P.', loc: 'Shop Floor C', val: 2500000, last_maint: '2024-01-15', next_maint: null }, // Decommissioned -> no next maint
        { name: 'Vertical Boring Mill', category: 'Machinery', dept: 2, qty: 2, pur: '2021-11-12', war: '2026-11-12', cond: 'Good', assign: 'Vikram S.', loc: 'Bay 1', val: 1800000, last_maint: '2025-05-10', next_maint: '2025-11-10' },
        // EDP (dept 3)
        { name: 'High-end Servers', category: 'IT Hardware', dept: 3, qty: 4, pur: '2023-06-15', war: '2026-06-15', cond: 'Good', assign: 'EDP Admin', loc: 'Server Room', val: 350000, last_maint: '2025-06-15', next_maint: '2025-12-15' },
        { name: 'Desktop Workstations', category: 'IT Hardware', dept: 3, qty: 40, pur: '2022-02-20', war: '2025-02-20', cond: 'Good', assign: null, loc: 'Lab 1', val: 60000, last_maint: null, next_maint: '2026-02-20' },
        // Stores (dept 4)
        { name: 'WAP7 Bogie Frames', category: 'Spare Parts', dept: 4, qty: 10, pur: '2025-01-05', war: '2035-01-05', cond: 'New', assign: 'Storekeeper', loc: 'Warehouse B', val: 800000, last_maint: null, next_maint: null },
        // Tele Exchange (dept 5)
        { name: 'Cisco Core Switches', category: 'IT Hardware', dept: 5, qty: 3, pur: '2020-09-10', war: '2023-09-10', cond: 'Needs Repair', assign: 'Network Team', loc: 'Control Room', val: 120000, last_maint: '2024-10-10', next_maint: '2025-01-10' }
    ];

    assetsData.forEach(a => {
        stmt.run([a.name, a.category, a.dept, a.qty, a.pur, a.war, a.cond, a.assign, a.loc, a.val, a.last_maint, a.next_maint], function(err) {
            if (!err && a.last_maint) {
                // Add an initial maintenance log for assets that had maintenance
                db.run(`INSERT INTO maintenance_logs (asset_id, maintenance_date, technician, notes, cost) VALUES (?, ?, ?, ?, ?)`, 
                    [this.lastID, a.last_maint, 'System Seed', 'Initial seeded maintenance record', 0]);
            }
        });
    });
    
    stmt.finalize(() => {
        console.log("Database seeded successfully with users, departments, and realistic assets.");
    });
}

module.exports = db;
