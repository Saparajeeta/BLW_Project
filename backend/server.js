require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Routes
const authRoutes = require('./routes/auth');
const locosRoutes = require('./routes/locos');
const issuesRoutes = require('./routes/issues');
const reportsRoutes = require('./routes/reports');

app.use('/api/auth', authRoutes);
app.use('/api/locos', locosRoutes);
app.use('/api/issues', issuesRoutes);
app.use('/api/reports', reportsRoutes);

// Fallback to login for unknown pages
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/login.html'));
});

app.listen(port, () => {
    console.log(`BLW Production Tracking System running on http://localhost:${port}`);
});
