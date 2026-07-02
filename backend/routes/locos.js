const express = require('express');
const router = express.Router();
const db = require('../database');
const authenticateToken = require('../middleware/auth');
const { requireEngineerOrAdmin } = require('../middleware/roles');

const STAGES = [
    'Frame Fabrication',
    'Bogie Assembly',
    'Loco Assembly',
    'Electrical Fitting',
    'Paint & Finishing',
    'Quality Check',
    'Trial Run',
    'Ready for Dispatch',
    'Dispatched'
];

const EXPECTED_DAYS = {
    'Frame Fabrication': 5,
    'Bogie Assembly': 4,
    'Loco Assembly': 7,
    'Electrical Fitting': 5,
    'Paint & Finishing': 3,
    'Quality Check': 2,
    'Trial Run': 3,
    'Ready for Dispatch': 1
};

// Get all locos (Filtered by role)
router.get('/', authenticateToken, (req, res) => {
    let query = `SELECT * FROM locomotives ORDER BY created_at DESC`;
    let params = [];

    // Workers only see locos in their department's stage (assuming department name exactly matches stage name or we map it)
    if (req.user.role === 'Worker') {
        query = `SELECT * FROM locomotives WHERE current_stage = ? ORDER BY created_at DESC`;
        params = [req.user.department];
    }

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(rows);
    });
});

// Add new loco (Engineer/Admin)
router.post('/', authenticateToken, requireEngineerOrAdmin, (req, res) => {
    const { loco_number, model, start_date, assigned_engineer, target_dispatch_date } = req.body;
    
    if (!loco_number || !model || !start_date) {
        return res.status(400).json({ error: 'Loco number, model, and start date are required' });
    }

    const current_stage = STAGES[0]; // Start at Frame Fabrication

    db.run(
        `INSERT INTO locomotives (loco_number, model, start_date, assigned_engineer, current_stage, target_dispatch_date, last_stage_update_at) 
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
        [loco_number, model, start_date, assigned_engineer || req.user.name, current_stage, target_dispatch_date],
        function(err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(400).json({ error: 'Loco number already exists' });
                }
                return res.status(500).json({ error: 'Database error' });
            }
            
            const locoId = this.lastID;
            
            // Record initial stage history
            db.run(
                `INSERT INTO stage_history (loco_id, stage_name, action, updated_by, remarks) VALUES (?, ?, ?, ?, ?)`,
                [locoId, current_stage, 'Forward', req.user.id, 'Initial Production Entry'],
                (err2) => {
                    if (err2) console.error("Error logging stage history", err2);
                    res.status(201).json({ message: 'Locomotive added successfully', id: locoId });
                }
            );
        }
    );
});

// Get detailed loco info by loco_number
router.get('/:loco_number', authenticateToken, (req, res) => {
    const loco_number = req.params.loco_number;

    db.get('SELECT * FROM locomotives WHERE loco_number = ?', [loco_number], (err, loco) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!loco) return res.status(404).json({ error: 'Locomotive not found' });

        // Fetch stage history
        db.all(
            `SELECT h.*, u.name as user_name, u.role as user_role 
             FROM stage_history h 
             JOIN users u ON h.updated_by = u.id 
             WHERE h.loco_id = ? ORDER BY h.updated_at ASC`,
            [loco.id],
            (err, history) => {
                if (err) return res.status(500).json({ error: 'Database error' });
                
                // Fetch issues
                db.all(
                    `SELECT i.*, u.name as logged_by_name 
                     FROM issues i 
                     JOIN users u ON i.logged_by = u.id 
                     WHERE i.loco_id = ? ORDER BY i.created_at DESC`,
                    [loco.id],
                    (err, issues) => {
                        if (err) return res.status(500).json({ error: 'Database error' });
                        
                        res.json({ loco, history, issues, expected_days: EXPECTED_DAYS });
                    }
                );
            }
        );
    });
});

// Update stage (Engineer/Admin)
router.post('/:loco_number/stage', authenticateToken, requireEngineerOrAdmin, (req, res) => {
    const loco_number = req.params.loco_number;
    const { action, remarks, dispatch_details } = req.body; // action: 'Forward' or 'Back'

    if (!remarks || remarks.trim() === '') {
        return res.status(400).json({ error: 'Remarks are mandatory for stage updates' });
    }

    db.get('SELECT * FROM locomotives WHERE loco_number = ?', [loco_number], (err, loco) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!loco) return res.status(404).json({ error: 'Locomotive not found' });

        const currentIndex = STAGES.indexOf(loco.current_stage);
        if (currentIndex === -1) return res.status(500).json({ error: 'Invalid current stage' });

        let nextStage = loco.current_stage;
        
        if (action === 'Forward') {
            if (currentIndex < STAGES.length - 1) {
                nextStage = STAGES[currentIndex + 1];
            } else {
                return res.status(400).json({ error: 'Locomotive is already dispatched' });
            }
        } else if (action === 'Back') {
            if (currentIndex > 0) {
                nextStage = STAGES[currentIndex - 1];
            } else {
                return res.status(400).json({ error: 'Cannot send back from initial stage' });
            }
        } else {
            return res.status(400).json({ error: 'Invalid action' });
        }

        const newStatus = nextStage === 'Dispatched' ? 'Completed' : 'In Production';

        db.run(
            `UPDATE locomotives SET current_stage = ?, status = ?, last_stage_update_at = datetime('now') WHERE id = ?`,
            [nextStage, newStatus, loco.id],
            function(err) {
                if (err) return res.status(500).json({ error: 'Database error' });

                // Log history
                db.run(
                    `INSERT INTO stage_history (loco_id, stage_name, action, updated_by, remarks) VALUES (?, ?, ?, ?, ?)`,
                    [loco.id, nextStage, action, req.user.id, remarks]
                );

                // If dispatching, log dispatch records
                if (nextStage === 'Dispatched' && dispatch_details) {
                    const { destination_zone, receiving_shed, dispatch_date, consignment_number } = dispatch_details;
                    db.run(
                        `INSERT INTO dispatch_records (loco_id, destination_zone, receiving_shed, dispatch_date, consignment_number, created_by) 
                         VALUES (?, ?, ?, ?, ?, ?)`,
                        [loco.id, destination_zone, receiving_shed, dispatch_date, consignment_number, req.user.id]
                    );
                }

                res.json({ message: `Loco moved to ${nextStage}`, nextStage });
            }
        );
    });
});

module.exports = router;
