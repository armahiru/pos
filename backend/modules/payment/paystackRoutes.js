/**
 * Paystack payment routes — initialize transaction & verify.
 * Uses Paystack REST API directly via https (no SDK).
 */
const express = require('express');
const router = express.Router();
const https = require('https');
const crypto = require('crypto');
const requireAuth = require('../../middleware/requireAuth');
const { requireRole } = require('../../middleware/requireRole');
const Payment = require('../../models/Payment');

function paystackRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'api.paystack.co',
      port: 443,
      path,
      method,
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {})
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('Invalid JSON from Paystack')); }
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// POST /api/paystack/initialize
router.post('/api/paystack/initialize', requireAuth, requireRole('Cashier'), async (req, res, next) => {
  try {
    const { amount, email, saleId } = req.body;

    if (!amount || !email) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'amount and email are required' }
      });
    }

    if (!process.env.PAYSTACK_SECRET_KEY || process.env.PAYSTACK_SECRET_KEY.includes('xxx')) {
      return res.status(500).json({
        success: false,
        error: { code: 'CONFIG_ERROR', message: 'Paystack secret key not configured' }
      });
    }

    const reference = `POS-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    console.log('[Paystack] Initializing transaction:', { amount, email, reference });

    const result = await paystackRequest('POST', '/transaction/initialize', {
      amount: Math.round(amount * 100), // pesewas
      email,
      currency: 'GHS',
      reference,
      metadata: {
        saleId: saleId || '',
        custom_fields: [
          { display_name: 'Sale ID', variable_name: 'sale_id', value: saleId || '' }
        ]
      },
      callback_url: `${process.env.APP_URL || 'http://localhost:' + (process.env.PORT || 3000)}/api/paystack/callback`
    });

    console.log('[Paystack] Response:', JSON.stringify(result));

    if (!result.status) {
      return res.status(400).json({
        success: false,
        error: { code: 'PAYSTACK_ERROR', message: result.message || 'Paystack initialization failed' }
      });
    }

    res.json({
      success: true,
      data: {
        authorizationUrl: result.data.authorization_url,//https://checkout.paystack.com/reference
        accessCode: result.data.access_code,
        reference: result.data.reference
      }
    });
  } catch (err) {
    console.error('[Paystack] Initialize error:', err.message);
    next(err);
  }
});

// GET /api/paystack/verify/:reference
router.get('/api/paystack/verify/:reference', requireAuth, async (req, res, next) => {
  try {
    const result = await paystackRequest('GET', `/transaction/verify/${encodeURIComponent(req.params.reference)}`);

    if (!result.status) {
      return res.status(400).json({
        success: false,
        error: { code: 'PAYSTACK_ERROR', message: result.message }
      });
    }

    const tx = result.data;
    res.json({
      success: true,
      data: {
        verified: tx.status === 'success',
        status: tx.status,
        reference: tx.reference,
        amount: tx.amount / 100,
        channel: tx.channel,
        paidAt: tx.paid_at,
        metadata: tx.metadata
      }
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/paystack/webhook
router.post('/api/paystack/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const hash = crypto
      .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
      .update(req.body)
      .digest('hex');

    if (hash !== req.headers['x-paystack-signature']) {
      return res.status(401).send('Unauthorized');
    }

    const event = JSON.parse(req.body);
    if (event.event === 'charge.success') {
      const { reference, amount, metadata } = event.data;
      const saleId = metadata?.saleId;
      if (saleId) {
        const existing = await Payment.findOne({ transactionReference: reference });
        if (!existing) {
          await Payment.create({
            saleId, paymentMethod: 'Paystack',
            amountPaid: amount / 100, changeGiven: 0, transactionReference: reference
          });
        }
      }
    }
    res.sendStatus(200);
  } catch {
    res.sendStatus(200);
  }
});

// GET /api/paystack/callback
router.get('/api/paystack/callback', (req, res) => {
  res.redirect(`/?paystack_ref=${req.query.reference || ''}`);
});

module.exports = router;
