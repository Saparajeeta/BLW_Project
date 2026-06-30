const db = require('../database');

/**
 * Logs an action to the audit_logs table
 * @param {number} userId - The ID of the user performing the action
 * @param {string} action - The action performed (e.g., 'ADD_ASSET', 'UPDATE_ASSET', 'TRANSFER_ASSET')
 * @param {string} targetType - The type of entity affected (e.g., 'ASSET')
 * @param {number} targetId - The ID of the affected entity
 * @param {string} details - A JSON string or plain text describing the change
 */
function logAction(userId, action, targetType, targetId, details) {
    db.run(
        `INSERT INTO audit_logs (user_id, action, target_type, target_id, details) VALUES (?, ?, ?, ?, ?)`,
        [userId, action, targetType, targetId, details],
        (err) => {
            if (err) {
                console.error("Failed to write to audit log:", err.message);
            }
        }
    );
}

module.exports = { logAction };
