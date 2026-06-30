const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../database');
const { logAction } = require('../utils/audit');
const { requireAuth, requireAdmin } = require('../utils/authMiddleware');

// Get all assets with pagination, search, and department filter
router.get('/', requireAuth, (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const deptId = req.query.deptId || 'all';

    let query = `
        SELECT a.*, d.name as department_name 
        FROM assets a 
        JOIN departments d ON a.department_id = d.id 
        WHERE (a.name LIKE ? OR a.assigned_to LIKE ? OR a.location LIKE ?)
    `;
    const params = [`%${search}%`, `%${search}%`, `%${search}%`];

    if (deptId !== 'all') {
        query += ` AND a.department_id = ?`;
        params.push(deptId);
    }

    // Get total count for pagination
    db.get(`SELECT COUNT(*) as count FROM (${query})`, params, (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        const total = row.count;

        query += ` ORDER BY a.id DESC LIMIT ? OFFSET ?`;
        params.push(limit, offset);

        db.all(query, params, (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({
                data: rows,
                total,
                page,
                totalPages: Math.ceil(total / limit)
            });
        });
    });
});

// Add new asset
router.post('/', requireAuth, requireAdmin, [
    body('name').notEmpty().withMessage('Name is required'),
    body('category').notEmpty().withMessage('Category is required'),
    body('department_id').isInt().withMessage('Valid department ID required'),
    body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('condition').notEmpty(),
    body('asset_value').optional({ nullable: true, checkFalsy: true }).isFloat({ min: 0 })
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, category, department_id, quantity, purchase_date, warranty_expiry, condition, assigned_to, location, asset_value, specifications } = req.body;
    
    db.run(
        `INSERT INTO assets (name, category, department_id, quantity, purchase_date, warranty_expiry, condition, assigned_to, location, asset_value, specifications) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, category, department_id, quantity, purchase_date, warranty_expiry, condition, assigned_to, location, asset_value || 0, specifications],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            const assetId = this.lastID;
            logAction(req.user.id, 'ADD_ASSET', 'ASSET', assetId, `Added new asset: ${name}`);
            res.json({ id: assetId });
        }
    );
});

// Transfer asset (Edit department)
router.post('/:id/transfer', requireAuth, requireAdmin, [
    body('new_department_id').isInt()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const assetId = req.params.id;
    const { new_department_id } = req.body;

    db.get('SELECT department_id FROM assets WHERE id = ?', [assetId], (err, asset) => {
        if (err || !asset) return res.status(404).json({ error: 'Asset not found' });
        const oldDept = asset.department_id;

        db.run(`UPDATE assets SET department_id = ? WHERE id = ?`, [new_department_id, assetId], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            logAction(req.user.id, 'TRANSFER_ASSET', 'ASSET', assetId, `Transferred from dept ${oldDept} to ${new_department_id}`);
            res.json({ success: true });
        });
    });
});

// Delete asset
router.delete('/:id', requireAuth, requireAdmin, (req, res) => {
    db.run(`DELETE FROM assets WHERE id = ?`, req.params.id, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        logAction(req.user.id, 'DELETE_ASSET', 'ASSET', req.params.id, 'Deleted asset');
        res.json({ changes: this.changes });
    });
});

module.exports = router;
