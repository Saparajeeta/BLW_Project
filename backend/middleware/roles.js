const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Forbidden: Insufficient privileges' });
        }
        next();
    };
};

const requireAdmin = requireRole(['Admin']);
const requireEngineerOrAdmin = requireRole(['Admin', 'Engineer']);
const requireAny = requireRole(['Admin', 'Engineer', 'Worker']);

module.exports = {
    requireRole,
    requireAdmin,
    requireEngineerOrAdmin,
    requireAny
};
