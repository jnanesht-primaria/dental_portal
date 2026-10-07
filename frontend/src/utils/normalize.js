// frontend/src/utils/normalize.js

/**
 * Always return an array, no matter what the API sent.
 *
 * Handles these shapes:
 *   [ ... ]                                 → returned as-is
 *   { items: [...] }                        → .items
 *   { doctors: [...] }                      → keyed by name
 *   { entries: [...] }
 *   { hospitals: [...] }
 *   { data: [...] }                         → axios-style envelope
 *   { results: [...] }
 *   { rows: [...] }
 *   { error: "..." }                        → [] (never crash)
 *   null / undefined / number / string      → []
 *
 * @param {*} x        The candidate value (usually res.data)
 * @param {string[]} preferredKeys  Try these keys first (in order)
 */
export const toArray = (x, ...preferredKeys) => {
  if (Array.isArray(x)) return x;

  if (x && typeof x === 'object') {
    // 1. Caller-supplied keys first
    for (const k of preferredKeys) {
      if (Array.isArray(x[k])) return x[k];
    }
    // 2. Common envelopes
    const fallbacks = [
      'items', 'data', 'results', 'rows',
      'entries', 'doctors', 'hospitals',
    ];
    for (const k of fallbacks) {
      if (Array.isArray(x[k])) return x[k];
    }
  }

  return [];
};

/**
 * Human-readable error extractor — used by every catch block
 * so a failed request never leaves state in a broken shape.
 */
export const errMsg = (err, fallback = 'Request failed') =>
  err?.response?.data?.error ||
  err?.response?.data?.message ||
  err?.message ||
  fallback;