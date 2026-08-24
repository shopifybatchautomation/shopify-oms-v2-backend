const ApiError = require('../utils/ApiError');
const { paginateQuery } = require('../utils/pagination');
const { parseToDate } = require('../utils/dateUtils');
const { guardAgainstBlacklist } = require('./blacklist.service');

const DEFAULT_SEARCH_FIELDS = [
  'order_id',
  'size',
  'shipping_method',
  'order_status',
  'contact_number',
  'customer_email',
  'customer_name',
];

// An order can carry more than one pending reason at once (e.g. both "High
// RTO Risk" and "Bad Address"), so pending_reason is always normalised to an
// array -- accepts a single string too, for callers that only have one.
const normalizePendingReason = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string' && value.length > 0) return [value];
  return undefined;
};

// Normalises whatever the frontend sends into the shared order shape before
// it hits a Mongoose model (order_date -> real Date, numeric coercion, etc).
const normalizeOrderPayload = (raw) => {
  const normalized = {
    ...raw,
    styleNumber: Number(raw.styleNumber) || 0,
    quantity: Number(raw.quantity) || 0,
    price: Number(raw.price) || 0,
    order_date: parseToDate(raw.order_date),
    customer_id: raw.customer_id ? Number(raw.customer_id) : undefined,
    customer_email: raw.customer_email ? String(raw.customer_email).toLowerCase().trim() : undefined,
    payment_type: raw.payment_type === 'Prepaid' ? 'Prepaid' : 'COD',
  };

  if ('pending_reason' in raw) {
    normalized.pending_reason = normalizePendingReason(raw.pending_reason);
  }

  return normalized;
};

/**
 * Paginated list for any order-status resource.
 */
const listOrders = (Model, query, searchFields = DEFAULT_SEARCH_FIELDS) => {
  const { page, limit, search, startDate, endDate } = query;
  return paginateQuery(Model, { page, limit, search, searchFields, startDate, endDate });
};

/**
 * Creates a single order document against `Model`, unless the customer is
 * blacklisted -- in which case it is redirected to BlacklistedOrder instead.
 * `destinationLabel` is a human label (e.g. "confirmed") used for the audit
 * trail on the blacklisted record.
 */
const createOrder = async (Model, rawPayload, destinationLabel) => {
  const payload = normalizeOrderPayload(rawPayload);

  const guard = await guardAgainstBlacklist(payload, destinationLabel);
  if (guard.redirected) {
    return { redirected: true, doc: guard.doc };
  }

  const doc = await Model.create(payload);
  return { redirected: false, doc };
};

/**
 * Bulk-creates an array of orders, splitting them between `Model` and the
 * BlacklistedOrder table based on the blacklist check.
 */
const createOrdersBulk = async (Model, rawOrders, destinationLabel) => {
  if (!Array.isArray(rawOrders) || rawOrders.length === 0) {
    throw new ApiError(400, 'Request body must be a non-empty array of orders.');
  }

  const clean = [];
  let blacklistedCount = 0;

  for (const raw of rawOrders) {
    if (!raw.order_id) continue;
    const payload = normalizeOrderPayload(raw);
    const guard = await guardAgainstBlacklist(payload, destinationLabel);
    if (guard.redirected) {
      blacklistedCount += 1;
    } else {
      clean.push(payload);
    }
  }

  const inserted = clean.length > 0 ? await Model.insertMany(clean, { ordered: false }) : [];

  return { inserted, blacklistedCount };
};

/**
 * Moves ONE order document (identified by its Mongo _id) from one collection
 * to another -- e.g. Pending -> Confirmed, or restoring a Cancelled order
 * back to Confirmed -- preserving its fields and applying the blacklist
 * guard on the way in.
 *
 * IMPORTANT: this is scoped to a single _id on purpose. The same order_id
 * can have several documents (one per line item / SKU on a multi-item
 * Shopify order) -- confirming or cancelling one line item must NOT cascade
 * to its siblings, so callers must pass the specific document's _id, not
 * its order_id.
 */
const moveOrderById = async (FromModel, ToModel, id, extraFields = {}, destinationLabel) => {
  const existing = await FromModel.findById(id);
  if (!existing) {
    throw new ApiError(404, `Order not found.`);
  }

  const plain = existing.toObject();
  delete plain._id;
  delete plain.__v;
  delete plain.createdAt;
  delete plain.updatedAt;

  const payload = { ...plain, ...extraFields };
  const guard = await guardAgainstBlacklist(payload, destinationLabel);
  const created = guard.redirected ? guard.doc : await ToModel.create(payload);

  await FromModel.findByIdAndDelete(existing._id);

  return { redirected: guard.redirected, doc: created, order_id: existing.order_id };
};

module.exports = {
  normalizeOrderPayload,
  listOrders,
  createOrder,
  createOrdersBulk,
  moveOrderById,
  DEFAULT_SEARCH_FIELDS,
};
