const express = require('express');
const router = express.Router();
const db = require('../database');
const authenticateToken = require('../middleware/auth');
const { requireAdmin, requireEngineerOrAdmin } = require('../middleware/roles');

// Dashboard Data
router.get('/dashboard', authenticateToken, (req, res) => {
    const data = {};
    
    db.serialize(() => {
        // Total Locos in production
        db.get(`SELECT COUNT(*) as count FROM locomotives WHERE status = 'In Production'`, (err, row) => {
            data.totalInProduction = row ? row.count : 0;
            
            // Dispatched this month
            db.get(`SELECT COUNT(*) as count FROM locomotives WHERE status = 'Completed' AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')`, (err, row) => {
                data.dispatchedThisMonth = row ? row.count : 0;
                
                // Stage counts for pipeline
                db.all(`SELECT current_stage, COUNT(*) as count FROM locomotives WHERE status = 'In Production' GROUP BY current_stage`, (err, rows) => {
                    data.stageCounts = rows || [];
                    
                    // Critical issues alert
                    db.all(`SELECT i.*, l.loco_number FROM issues i JOIN locomotives l ON i.loco_id = l.id WHERE i.severity = 'Critical' AND i.status != 'Resolved'`, (err, rows) => {
                        data.criticalIssues = rows || [];
                        
                        // Overdue locos alert
                        db.all(`SELECT loco_number, current_stage, target_dispatch_date FROM locomotives WHERE status = 'In Production' AND target_dispatch_date < date('now')`, (err, rows) => {
                            data.overdueLocos = rows || [];
                            
                            // Stuck > 7 days alert
                            db.all(`SELECT loco_number, current_stage, last_stage_update_at FROM locomotives WHERE status = 'In Production' AND julianday('now') - julianday(last_stage_update_at) > 7`, (err, rows) => {
                                data.stuckLocos = rows || [];
                                
                                res.json(data);
                            });
                        });
                    });
                });
            });
        });
    });
});

// CSV Exports (Admin Only)

router.get('/monthly', authenticateToken, requireAdmin, (req, res) => {
    db.all(`SELECT loco_number, model, start_date, current_stage, status, target_dispatch_date FROM locomotives ORDER BY start_date DESC`, (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(rows);
    });
});

router.get('/stage-status', authenticateToken, requireAdmin, (req, res) => {
    db.all(`
        SELECT l.loco_number, l.current_stage, l.last_stage_update_at, 
               CAST(julianday('now') - julianday(l.last_stage_update_at) AS INTEGER) as days_in_stage
        FROM locomotives l 
        WHERE l.status = 'In Production'
        ORDER BY days_in_stage DESC
    `, (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(rows);
    });
});

router.get('/pending-issues', authenticateToken, requireAdmin, (req, res) => {
    db.all(`
        SELECT i.id, l.loco_number, i.issue_type, i.severity, i.status, i.created_at, u.name as logged_by
        FROM issues i
        JOIN locomotives l ON i.loco_id = l.id
        JOIN users u ON i.logged_by = u.id
        WHERE i.status != 'Resolved'
        ORDER BY i.created_at ASC
    `, (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(rows);
    });
});

router.get('/overdue-locos', authenticateToken, requireAdmin, (req, res) => {
    db.all(`
        SELECT loco_number, model, current_stage, target_dispatch_date,
               CAST(julianday('now') - julianday(target_dispatch_date) AS INTEGER) as days_overdue
        FROM locomotives 
        WHERE status = 'In Production' AND target_dispatch_date < date('now')
        ORDER BY days_overdue DESC
    `, (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(rows);
    });
});

module.exports = router;
