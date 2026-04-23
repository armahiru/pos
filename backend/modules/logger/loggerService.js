/**
 * Audit logging service — MongoDB/Mongoose version.
 */
const AuditLog = require('../../models/AuditLog');

async function logEvent(eventType, userId, details) {
  const detailStr = typeof details === 'object' ? JSON.stringify(details) : String(details || '');

  await AuditLog.create({
    eventType,
    userId: userId || null,
    details: detailStr
  });
}

async function getAuditLogs(filters = {}) {
  const query = {};
  if (filters.eventType) query.eventType = filters.eventType;
  if (filters.userId) query.userId = filters.userId;

  const logs = await AuditLog.find(query).sort({ createdAt: -1 }).limit(filters.limit || 100);
  return logs.map(l => ({
    logId: l._id,
    eventType: l.eventType,
    userId: l.userId,
    username: l.username,
    details: l.details,
    createdAt: l.createdAt
  }));
}

module.exports = { logEvent, getAuditLogs };
