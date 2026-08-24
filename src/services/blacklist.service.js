const { BlackListedCustomer } = require('../models/blacklisted_customer.model');
const BlacklistedOrder = require('../models/blacklistedOrder.model');

const normalizeEmail = (email) => (email || '').toString().trim().toLowerCase();

/**
 * Looks up whether an order's customer is on the blacklist, matching by
 * customer_id first (most reliable) and falling back to email.
 */
const findBlacklistMatch = async ({ customer_id, customer_email }) => {
  const orConditions = [];
  if (customer_id) orConditions.push({ customer_id: Number(customer_id) });

  const email = normalizeEmail(customer_email);
  if (email) orConditions.push({ email });

  if (orConditions.length === 0) return null;

  return BlackListedCustomer.findOne({ $or: orConditions });
};

/**
 * The core "validation at upload time" rule requested by the business:
 * no matter which table an order was headed for, if its customer is
 * blacklisted it must end up in the BlacklistedOrder table instead.
 *
 * Returns { redirected: true, doc } when the order was saved to
 * BlacklistedOrder, or { redirected: false } when the caller should proceed
 * with its normal insert.
 */
const guardAgainstBlacklist = async (orderPayload, intendedDestinationLabel) => {
  const match = await findBlacklistMatch(orderPayload);

  if (!match) {
    return { redirected: false };
  }

  const doc = await BlacklistedOrder.create({
    ...orderPayload,
    is_blacklisted: true,
    blacklist_reason: `Blacklisted customer (${match.first_name || match.email || match.customer_id})`,
    original_destination: intendedDestinationLabel,
  });

  return { redirected: true, doc };
};

module.exports = { findBlacklistMatch, guardAgainstBlacklist, normalizeEmail };
