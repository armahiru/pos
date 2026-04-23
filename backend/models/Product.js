const { mongoose } = require('../../backend/config/database');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, default: '' },
  price: { type: Number, required: true, min: 0.01 },
  costPrice: { type: Number, default: 0 },
  stockQuantity: { type: Number, default: 0, min: 0 },
  barcode: { type: String, unique: true, sparse: true },
  imageUrl: { type: String, default: '' },
  supplier: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  lowStockThreshold: { type: Number, default: 10 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Product', productSchema);
