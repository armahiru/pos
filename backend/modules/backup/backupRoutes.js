/**
 * Backup module Express routes. Admin only.
 * Validates: Requirements 23.1, 24.1, 25.1, 26.5
 */
const express = require('express');
const router = express.Router();
const path = require('path');

const { createBackup, restoreBackup, exportTable } = require('./backupService');
const { logEvent } = require('../logger/loggerService');
const requireAuth = require('../../middleware/requireAuth');
const { requireRole } = require('../../middleware/requireRole');

const BACKUP_DIR = path.join(__dirname, '..', '..', '..', 'backups');

// POST /api/backup — create database backup (Admin only)
router.post('/api/backup', requireAuth, requireRole('Admin'), async (req, res, next) => {
  try {
    const result = await createBackup(BACKUP_DIR);
    await logEvent('BACKUP_CREATED', req.user.userId, `Backup created: ${result.filePath}`);
    res.status(201).json({ success: true, data: result });
  } catch (err) { next(err); }
});

// POST /api/backup/restore — restore from backup (Admin only)
router.post('/api/backup/restore', requireAuth, requireRole('Admin'), async (req, res, next) => {
  try {
    const { filePath } = req.body;
    if (!filePath) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'filePath is required' } });
    }
    await restoreBackup(filePath);
    await logEvent('BACKUP_RESTORED', req.user.userId, `Restored from: ${filePath}`);

    // Invalidate current session after restore
    req.session.destroy(() => {});

    res.json({ success: true, data: { message: 'Database restored successfully. Please log in again.' } });
  } catch (err) { next(err); }
});

// GET /api/export/:table — export table as CSV (Admin only)
router.get('/api/export/:table', requireAuth, requireRole('Admin'), async (req, res, next) => {
  try {
    const csv = await exportTable(req.params.table);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${req.params.table}.csv`);
    res.send(csv);
  } catch (err) { next(err); }
});

module.exports = router;
