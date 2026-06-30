const express = require('express');
const router = express.Router();
const db = require('../database');
const { requireAuth } = require('../utils/authMiddleware');

router.get('/', requireAuth, (req, res) => {
    db.all("SELECT * FROM departments ORDER BY name ASC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

module.exports = router;
