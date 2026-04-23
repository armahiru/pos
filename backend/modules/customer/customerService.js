/**
 * Customer management service — MongoDB/Mongoose version.
 */
const Customer = require('../../../backend/models/Customer');
const AppError = require('../../../backend/utils/AppError');

async function createCustomer(data) {
  if (!data.name || !data.name.trim()) {
    throw new AppError('Customer name is required', 400, 'VALIDATION_ERROR');
  }
  try {
    const customer = await Customer.create({
      name: data.name.trim(),
      phone: data.phone || null,
      email: data.email || null,
      address: data.address || ''
    });
    return formatCustomer(customer);
  } catch (err) {
    if (err.code === 11000) {
      const field = err.message.includes('phone') ? 'phone' : 'email';
      throw new AppError(`A customer with this ${field} already exists`, 409, 'CONFLICT');
    }
    throw err;
  }
}

async function updateCustomer(id, data) {
  const update = {};
  if (data.name !== undefined) update.name = data.name.trim();
  if (data.phone !== undefined) update.phone = data.phone || null;
  if (data.email !== undefined) update.email = data.email || null;
  if (data.address !== undefined) update.address = data.address || '';

  if (Object.keys(update).length === 0) {
    throw new AppError('No fields to update', 400, 'VALIDATION_ERROR');
  }

  try {
    const customer = await Customer.findByIdAndUpdate(id, update, { new: true });
    if (!customer) throw new AppError('Customer not found', 404, 'NOT_FOUND');
    return formatCustomer(customer);
  } catch (err) {
    if (err.code === 11000) {
      const field = err.message.includes('phone') ? 'phone' : 'email';
      throw new AppError(`A customer with this ${field} already exists`, 409, 'CONFLICT');
    }
    throw err;
  }
}

async function getCustomer(id) {
  const customer = await Customer.findById(id);
  if (!customer) throw new AppError('Customer not found', 404, 'NOT_FOUND');
  return formatCustomer(customer);
}

async function searchCustomers(query) {
  const regex = new RegExp(query || '', 'i');
  const customers = await Customer.find({ $or: [{ name: regex }, { phone: regex }] }).sort({ name: 1 });
  return customers.map(formatCustomer);
}

async function addLoyaltyPoints(customerId, grandTotal) {
  const pointsEarned = Math.floor(grandTotal);
  const customer = await Customer.findByIdAndUpdate(
    customerId,
    { $inc: { loyaltyPoints: pointsEarned } },
    { new: true }
  );
  if (!customer) throw new AppError('Customer not found', 404, 'NOT_FOUND');
  return customer.loyaltyPoints;
}

async function redeemLoyaltyPoints(customerId, points) {
  if (points <= 0) throw new AppError('Points must be positive', 400, 'VALIDATION_ERROR');

  const customer = await Customer.findById(customerId);
  if (!customer) throw new AppError('Customer not found', 404, 'NOT_FOUND');
  if (points > customer.loyaltyPoints) {
    throw new AppError(`Insufficient points. Available: ${customer.loyaltyPoints}, requested: ${points}`, 400, 'VALIDATION_ERROR');
  }

  customer.loyaltyPoints -= points;
  await customer.save();
  return customer.loyaltyPoints;
}

function formatCustomer(c) {
  return {
    customerId: c._id,
    name: c.name,
    phone: c.phone,
    email: c.email,
    address: c.address,
    loyaltyPoints: c.loyaltyPoints,
    createdAt: c.createdAt
  };
}

module.exports = { createCustomer, updateCustomer, getCustomer, searchCustomers, addLoyaltyPoints, redeemLoyaltyPoints };
