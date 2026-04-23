/**
 * Auth module Express routes.
 * Validates: Requirements 1.1, 1.2, 1.6, 2.1, 2.2
 */
const express = require('express');
const router = express.Router();

const { authenticate, createSession, destroySession } = require('./sessionService');
const { createUser, updateUser, listUsers } = require('./userService');
const { logEvent } = require('../logger/loggerService');
const requireAuth = require('../../middleware/requireAuth');
const { requireRole } = require('../../middleware/requireRole');

// POST /api/auth/login — authenticate user, create session
router.post('/api/auth/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const user = await authenticate(username, password);
    createSession(req, user);
    logEvent('LOGIN_SUCCESS', user.userId, 'User logged in', user.username);
    res.json({ success: true, data: { user } });
  } catch (err) {
    logEvent('LOGIN_FAILURE', null, 'Invalid credentials', req.body.username);
    next(err);
  }
});

// POST /api/auth/logout — destroy session (requires auth)
router.post('/api/auth/logout', requireAuth, async (req, res, next) => {
  try {
    await destroySession(req);
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/session — return current session info (requires auth)
router.get('/api/auth/session', requireAuth, (req, res, next) => {
  try {
    res.json({ success: true, data: { user: req.user } });
  } catch (err) {
    next(err);
  }
});

// POST /api/users — create new user (requires Admin role)
router.post('/api/users', requireAuth, requireRole('Admin'), async (req, res, next) => {
  try {
    const user = await createUser(req.body);
    res.status(201).json({ success: true, data: { user } });
  } catch (err) {
    next(err);
  }
});

// PUT /api/users/:id — update user (requires Admin role)
router.put('/api/users/:id', requireAuth, requireRole('Admin'), async (req, res, next) => {
  try {
    const user = await updateUser(req.params.id, req.body);
    res.json({ success: true, data: { user } });
  } catch (err) {
    next(err);
  }
});

// GET /api/users — list all users (requires Admin role)
router.get('/api/users', requireAuth, requireRole('Admin'), async (req, res, next) => {
  try {
    const users = await listUsers();
    res.json({ success: true, data: { users } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
