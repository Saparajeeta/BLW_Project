const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../database');
const { logAction } = require('../utils/audit');
const { requireAuth, requireAdmin } = require('../utils/authMiddleware');

router.post('/', requireAuth, requireAdmin, [
    body('asset_id').isInt(),
    body('maintenance_date').notEmpty(),
    body('technician').notEmpty(),
    body('cost').optional({ nullable: true }).isFloat({ min: 0 })
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { asset_id, maintenance_date, technician, notes, cost } = req.body;
    
    db.run(
        `INSERT INTO maintenance_logs (asset_id, maintenance_date, technician, notes, cost) VALUES (?, ?, ?, ?, ?)`,
        [asset_id, maintenance_date, technician, notes, cost || 0],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            
            // Also update the asset's last_maintenance date
            db.run(`UPDATE assets SET last_maintenance = ? WHERE id = ?`, [maintenance_date, asset_id]);
            
            logAction(req.user.id, 'MAINTENANCE_LOGGED', 'ASSET', asset_id, `Logged maintenance on ${maintenance_date} by ${technician}`);
            res.json({ success: true, log_id: this.lastID });
        }
    );
});

module.exports = router;
