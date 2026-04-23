const { mongoose } = require('../../backend/config/database');

const saleItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  name: String,
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true },
  discountPercent: { type: Number, default: 0 },
  lineTotal: { type: Number, required: true }
}, { _id: true });

const saleSchema = new mongoose.Schema({
  cashierUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null },
  saleDate: { type: Date, default: Date.now },
  items: [saleItemSchema],
  subtotal: { type: Number, required: true },
  discountAmount: { type: Number, default: 0 },
  taxRate: { type: Number, required: true },
  taxAmount: { type: Number, required: true },
  grandTotal: { type: Number, required: true }
});

module.exports = mongoose.model('Sale', saleSchema);
