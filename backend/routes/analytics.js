const express = require('express');
const router = express.Router();
const db = require('../database');
const { requireAuth } = require('../utils/authMiddleware');

router.get('/dashboard', requireAuth, (req, res) => {
    const data = {};

    db.serialize(() => {
        // Condition Breakdown
        db.all("SELECT condition, COUNT(*) as count FROM assets GROUP BY condition", [], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            data.conditionBreakdown = rows;

            // Department Distribution
            db.all(`
                SELECT d.name, COUNT(a.id) as count 
                FROM departments d 
                LEFT JOIN assets a ON d.id = a.department_id 
                GROUP BY d.id
            `, [], (err, rows) => {
                if (err) return res.status(500).json({ error: err.message });
                data.departmentDistribution = rows;

                // Recent Activity (Audit logs join with users)
                db.all(`
                    SELECT al.action, al.details, al.timestamp, u.username 
                    FROM audit_logs al 
                    JOIN users u ON al.user_id = u.id 
                    ORDER BY al.id DESC LIMIT 10
                `, [], (err, rows) => {
                    if (err) return res.status(500).json({ error: err.message });
                    data.recentActivity = rows;

                    res.json(data);
                });
            });
        });
    });
});

module.exports = router;
