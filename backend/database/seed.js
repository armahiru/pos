/**
 * MongoDB seed script — creates default admin user and system config.
 * Run: node src/database/seed.js
 */
const { connectDB, mongoose } = require('../config/database');
const User = require('../models/User');
const SystemConfig = require('../models/SystemConfig');
const bcrypt = require('bcrypt');

async function seed() {
  await connectDB();

  // Create default admin user
  const existing = await User.findOne({ username: 'admin' });
  if (!existing) {
    const hash = await bcrypt.hash('admin123', 10);
    await User.create({
      username: 'admin',
      passwordHash: hash,
      fullName: 'System Administrator',
      role: 'Admin',
      isActive: true
    });
    console.log('Admin user created (username: admin, password: admin123)');
  } else {
    console.log('Admin user already exists');
  }

  // System config defaults
  const configs = [
    { configKey: 'tax_rate', configValue: '16' },
    { configKey: 'store_name', configValue: 'My POS Store' },
    { configKey: 'store_address', configValue: '123 Main Street, City, Country' }
  ];

  for (const cfg of configs) {
    await SystemConfig.findOneAndUpdate(
      { configKey: cfg.configKey },
      cfg,
      { upsert: true, new: true }
    );
  }
  console.log('System config seeded');

  await mongoose.disconnect();
  console.log('Done!');
}

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
