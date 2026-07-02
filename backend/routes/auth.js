const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../database');
const authenticateToken = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roles');

const JWT_SECRET = process.env.JWT_SECRET || 'blw_secret_key';

// Login
router.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });

        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) return res.status(401).json({ error: 'Invalid credentials' });

        const token = jwt.sign(
            { 
                id: user.id, 
                employee_id: user.employee_id,
                username: user.username, 
                role: user.role, 
                department: user.department,
                name: user.name,
                password_reset_required: user.password_reset_required 
            }, 
            JWT_SECRET, 
            { expiresIn: '8h' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                employee_id: user.employee_id,
                name: user.name,
                username: user.username,
                role: user.role,
                department: user.department,
                password_reset_required: user.password_reset_required === 1
            }
        });
    });
});

// Reset Password
router.post('/reset-password', authenticateToken, async (req, res) => {
    const { newPassword } = req.body;
    const userId = req.user.id;

    if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    try {
        const hash = await bcrypt.hash(newPassword, 10);
        db.run('UPDATE users SET password_hash = ?, password_reset_required = 0 WHERE id = ?', [hash, userId], function(err) {
            if (err) return res.status(500).json({ error: 'Failed to update password' });
            
            // Re-issue token without reset required flag
            const token = jwt.sign(
                { 
                    id: req.user.id, 
                    employee_id: req.user.employee_id,
                    username: req.user.username, 
                    role: req.user.role, 
                    department: req.user.department,
                    name: req.user.name,
                    password_reset_required: 0 
                }, 
                JWT_SECRET, 
                { expiresIn: '8h' }
            );

            res.json({ message: 'Password updated successfully', token });
        });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Create User (Admin Only)
router.post('/register', authenticateToken, requireAdmin, async (req, res) => {
    const { employee_id, name, username, password, role, department } = req.body;

    if (!employee_id || !name || !username || !password || !role) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const hash = await bcrypt.hash(password, 10);
        db.run(
            'INSERT INTO users (employee_id, name, username, password_hash, role, department, password_reset_required) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [employee_id, name, username, hash, role, department || null, 1],
            function(err) {
                if (err) {
                    if (err.message.includes('UNIQUE constraint failed')) {
                        return res.status(400).json({ error: 'Username or Employee ID already exists' });
                    }
                    return res.status(500).json({ error: 'Database error' });
                }
                res.status(201).json({ message: 'User created successfully', id: this.lastID });
            }
        );
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// List Users (Admin Only)
router.get('/users', authenticateToken, requireAdmin, (req, res) => {
    db.all('SELECT id, employee_id, name, username, role, department, password_reset_required FROM users', [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(rows);
    });
});

module.exports = router;
