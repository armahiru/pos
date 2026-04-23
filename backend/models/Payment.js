const { mongoose } = require('../../backend/config/database');

const paymentSchema = new mongoose.Schema({
  saleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale', required: true },
  paymentMethod: { type: String, enum: ['Cash', 'Card', 'MTN_MoMo', 'Paystack'], required: true },
  amountPaid: { type: Number, required: true },
  changeGiven: { type: Number, default: 0 },
  transactionReference: { type: String, default: null },
  cardLastFour: { type: String, default: null },
  paymentDate: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Payment', paymentSchema);
