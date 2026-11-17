// Pure bookmark helpers — no DOM, no browser globals, so they can be
// unit-tested in Node and imported by the client <script> in Bookmarks.astro.

export const STORAGE_KEY = 'mona-bookmarks';
export const SLUG_PREFIX = 'mona-';
export const SEPARATOR = ' :: ';

const BASE62 = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Normalise what the user typed into a canonical http(s) URL.
 * "example.com" and "https://example.com" both become "https://example.com/".
 * @param {string} value
 * @returns {string | null} the normalised URL, or null if it isn't a web link
 */
export function normaliseUrl(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || /\s/.test(trimmed)) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    if (!url.hostname.includes('.') && url.hostname !== 'localhost') return null;
    return url.href;
  } catch {
    return null;
  }
}

/**
 * Encode a non-negative integer as base62.
 * @param {number} n
 */
export function toBase62(n) {
  let num = Math.max(0, Math.floor(n));
  let out = '';
  do {
    out = BASE62[num % 62] + out;
    num = Math.floor(num / 62);
  } while (num > 0);
  return out;
}

/**
 * Generate a "mona-" slug that isn't already taken.
 * @param {Iterable<string>} taken existing slugs
 * @param {() => number} [random] source of randomness in [0, 1), injectable for tests
 */
export function nextSlug(taken, random = Math.random) {
  const used = new Set(taken);
  for (;;) {
    const slug = SLUG_PREFIX + toBase62(Math.floor(random() * 62 ** 4)).padStart(4, '0');
    if (!used.has(slug)) return slug;
  }
}

/**
 * Parse whatever is stored under STORAGE_KEY. Never throws: empty, corrupted,
 * legacy or non-array values recover to a clean array of {url, slug}.
 * @param {string | null | undefined} raw
 * @returns {{url: string, slug: string}[]}
 */
export function parseStored(raw) {
  if (typeof raw !== 'string' || !raw.trim()) return [];
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];
  const seen = new Set();
  const clean = [];
  for (const item of data) {
    if (!item || typeof item !== 'object') continue;
    const url = normaliseUrl(item.url);
    const slug = typeof item.slug === 'string' ? item.slug.trim() : '';
    if (!url || !slug.startsWith(SLUG_PREFIX) || seen.has(slug)) continue;
    seen.add(slug);
    clean.push({ url, slug });
  }
  return clean;
}

/**
 * Visible text for one bookmark: "<url> :: <slug>".
 * @param {{url: string, slug: string}} bookmark
 */
export function formatBookmark({ url, slug }) {
  return `${url}${SEPARATOR}${slug}`;
}
