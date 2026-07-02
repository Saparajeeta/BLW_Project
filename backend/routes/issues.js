const express = require('express');
const router = express.Router();
const db = require('../database');
const authenticateToken = require('../middleware/auth');
const { requireEngineerOrAdmin } = require('../middleware/roles');

// Get all issues
router.get('/', authenticateToken, (req, res) => {
    // Workers might only need to see issues they logged, or issues for their dept's locos.
    // For simplicity, we'll let everyone see all issues, or filter by role.
    let query = `
        SELECT i.*, l.loco_number, l.current_stage, u.name as logged_by_name 
        FROM issues i 
        JOIN locomotives l ON i.loco_id = l.id 
        JOIN users u ON i.logged_by = u.id
        ORDER BY i.created_at DESC
    `;
    let params = [];

    if (req.user.role === 'Worker') {
        query = `
            SELECT i.*, l.loco_number, l.current_stage, u.name as logged_by_name 
            FROM issues i 
            JOIN locomotives l ON i.loco_id = l.id 
            JOIN users u ON i.logged_by = u.id
            WHERE i.logged_by = ? OR l.current_stage = ?
            ORDER BY i.created_at DESC
        `;
        params = [req.user.id, req.user.department];
    }

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(rows);
    });
});

// Log new issue
router.post('/', authenticateToken, (req, res) => {
    const { loco_number, issue_type, description, severity } = req.body;

    if (!loco_number || !issue_type || !description || !severity) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    // Lookup loco_id by loco_number
    db.get('SELECT id FROM locomotives WHERE loco_number = ?', [loco_number], (err, loco) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!loco) return res.status(404).json({ error: 'Locomotive not found' });

        db.run(
            `INSERT INTO issues (loco_id, logged_by, issue_type, description, severity) VALUES (?, ?, ?, ?, ?)`,
            [loco.id, req.user.id, issue_type, description, severity],
            function(err) {
                if (err) return res.status(500).json({ error: 'Database error' });
                res.status(201).json({ message: 'Issue logged successfully', id: this.lastID });
            }
        );
    });
});

// Update issue status (Engineer/Admin)
router.put('/:id', authenticateToken, requireEngineerOrAdmin, (req, res) => {
    const { status, resolution_notes } = req.body;
    
    if (!status) {
        return res.status(400).json({ error: 'Status is required' });
    }

    const resolved_at = status === 'Resolved' ? new Date().toISOString() : null;

    db.run(
        `UPDATE issues SET status = ?, resolution_notes = ?, resolved_at = ? WHERE id = ?`,
        [status, resolution_notes || null, resolved_at, req.params.id],
        function(err) {
            if (err) return res.status(500).json({ error: 'Database error' });
            res.json({ message: 'Issue updated successfully' });
        }
    );
});

module.exports = router;
