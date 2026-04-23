const { mongoose } = require('../../backend/config/database');

const inventoryLogSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  adjustmentType: { type: String, enum: ['Sale', 'Manual', 'Restock'], required: true },
  quantityChanged: { type: Number, required: true },
  reason: { type: String, default: '' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('InventoryLog', inventoryLogSchema);
