/**
 * User CRUD service — MongoDB/Mongoose version.
 */
const User = require('../../models/User');
const { hashPassword } = require('./authService');
const AppError = require('../../utils/AppError');

async function createUser(data) {
  const username = data.username;
  const password = data.password;
  const full_name = data.full_name || data.fullName;
  const role = data.role;

  if (!username || !password || !full_name || !role) {
    throw new AppError('Username, password, full name, and role are required', 400, 'VALIDATION_ERROR');
  }

  const existing = await User.findOne({ username });
  if (existing) {
    throw new AppError('Username already exists', 409, 'CONFLICT');
  }

  const passwordHash = await hashPassword(password);
  const user = await User.create({
    username,
    passwordHash,
    fullName: full_name,
    role,
    isActive: true
  });

  return {
    userId: user._id,
    username: user.username,
    fullName: user.fullName,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt
  };
}

async function updateUser(id, data) {
  const update = {};
  if (data.full_name || data.fullName) update.fullName = data.full_name || data.fullName;
  if (data.role) update.role = data.role;
  if (data.is_active !== undefined || data.isActive !== undefined) update.isActive = data.is_active !== undefined ? data.is_active : data.isActive;
  if (data.password) update.passwordHash = await hashPassword(data.password);

  const user = await User.findByIdAndUpdate(id, update, { new: true });
  if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');

  return {
    userId: user._id,
    username: user.username,
    fullName: user.fullName,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt
  };
}

async function listUsers() {
  const users = await User.find({});
  return users.map(u => ({
    _id: u._id,
    userId: u._id,
    username: u.username,
    fullName: u.fullName,
    role: u.role,
    isActive: u.isActive,
    createdAt: u.createdAt
  }));
}

async function getUserByUsername(username) {
  const user = await User.findOne({ username });
  if (!user) return null;
  return {
    userId: user._id,
    username: user.username,
    passwordHash: user.passwordHash,
    fullName: user.fullName,
    role: user.role,
    isActive: user.isActive
  };
}

module.exports = { createUser, updateUser, listUsers, getUserByUsername };
