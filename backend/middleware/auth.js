const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Access token required' });

    jwt.verify(token, process.env.JWT_SECRET || 'blw_secret_key', (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid or expired token' });
        
        // If password reset is required, they can ONLY access the reset password route
        if (user.password_reset_required && req.path !== '/reset-password' && req.path !== '/login') {
            return res.status(403).json({ 
                error: 'Password reset required', 
                requiresReset: true 
            });
        }
        
        req.user = user;
        next();
    });
};

module.exports = authenticateToken;
