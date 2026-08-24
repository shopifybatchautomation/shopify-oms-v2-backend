// Centralised date helpers so every table stores `order_date` as a real Date
// (needed for the dashboard's date-range aggregation) while still accepting
// the dd-mm-yyyy strings that come out of the Shopify CSV export.

/**
 * Parses a date coming from the frontend which may be:
 *  - "dd-mm-yyyy" (Shopify export / legacy format)
 *  - an ISO string
 *  - a JS Date instance
 * Falls back to `now` if nothing valid is supplied.
 */
const parseToDate = (value) => {
  if (!value) return new Date();
  if (value instanceof Date && !isNaN(value.getTime())) return value;

  if (typeof value === 'string') {
    const ddmmyyyy = value.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (ddmmyyyy) {
      const [, day, month, year] = ddmmyyyy;
      return new Date(Number(year), Number(month) - 1, Number(day));
    }

    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) return parsed;
  }

  return new Date();
};

// Builds a { $gte, $lte } range covering the whole day(s) requested.
// Defaults to "today" (start of day -> end of day) when nothing is passed,
// matching the dashboard's "default today data" requirement.
const buildDateRange = (startDate, endDate) => {
  const start = startDate ? new Date(startDate) : new Date();
  start.setHours(0, 0, 0, 0);

  const end = endDate ? new Date(endDate) : new Date();
  end.setHours(23, 59, 59, 999);

  return { start, end };
};

const formatDisplayDate = (date) => {
  if (!date) return 'N/A';
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'N/A';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

module.exports = { parseToDate, buildDateRange, formatDisplayDate };
