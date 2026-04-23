/**
 * Backup manager service — MongoDB version (pure JS, no mongodump needed).
 */
const fs = require('fs');
const path = require('path');
const { mongoose } = require('../../config/database');
const { Parser } = require('json2csv');
const AppError = require('../../utils/AppError');

const COLLECTIONS = ['users', 'products', 'sales', 'customers', 'payments', 'inventorylogs', 'auditlogs', 'systemconfigs'];

async function createBackup(backupDir) {
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filePath = path.join(backupDir, `backup-${timestamp}.json`);

  const backup = {};
  for (const name of COLLECTIONS) {
    try {
      const collection = mongoose.connection.db.collection(name);
      backup[name] = await collection.find({}).toArray();
    } catch (_) {
      backup[name] = [];
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(backup, null, 2), 'utf8');
  const stats = fs.statSync(filePath);

  return {
    filePath,
    fileSize: stats.size,
    collections: COLLECTIONS.length,
    timestamp: new Date().toISOString()
  };
}

async function restoreBackup(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new AppError('Backup file not found', 404, 'NOT_FOUND');
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  const backup = JSON.parse(raw);

  for (const name of Object.keys(backup)) {
    if (!COLLECTIONS.includes(name)) continue;
    const collection = mongoose.connection.db.collection(name);
    await collection.deleteMany({});
    if (backup[name].length > 0) {
      await collection.insertMany(backup[name]);
    }
  }
}

const SENSITIVE_FIELDS = ['passwordHash'];

async function exportTable(collectionName) {
  const name = collectionName.toLowerCase();

  if (!COLLECTIONS.includes(name)) {
    throw new AppError(`Collection '${collectionName}' is not exportable`, 400, 'VALIDATION_ERROR');
  }

  const collection = mongoose.connection.db.collection(name);
  const docs = await collection.find({}).toArray();

  if (docs.length === 0) return 'No data\n';

  // Remove sensitive fields from users
  if (name === 'users') {
    docs.forEach(doc => SENSITIVE_FIELDS.forEach(f => delete doc[f]));
  }

  const fields = Object.keys(docs[0]);
  const parser = new Parser({ fields });
  return parser.parse(docs);
}

module.exports = { createBackup, restoreBackup, exportTable };
