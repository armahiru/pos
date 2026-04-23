const { mongoose } = require('../config/database');

const systemConfigSchema = new mongoose.Schema({
  configKey: { type: String, required: true, unique: true },
  configValue: { type: String, required: true },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SystemConfig', systemConfigSchema);
