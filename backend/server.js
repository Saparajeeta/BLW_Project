require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Route imports
const authRoutes = require('./routes/auth');
const assetsRoutes = require('./routes/assets');
const departmentsRoutes = require('./routes/departments');
const analyticsRoutes = require('./routes/analytics');
const maintenanceRoutes = require('./routes/maintenance');

// API Mounts
app.use('/api/auth', authRoutes);
app.use('/api/assets', assetsRoutes);
app.use('/api/departments', departmentsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/maintenance', maintenanceRoutes);

// Fallback to index.html for frontend routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
