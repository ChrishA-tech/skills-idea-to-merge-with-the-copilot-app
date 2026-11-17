import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normaliseUrl,
  nextSlug,
  parseStored,
  formatBookmark,
  toBase62,
} from '../src/lib/bookmarks.js';

test('URL with and without https:// normalises to the same value', () => {
  assert.equal(normaliseUrl('www.example.com'), 'https://www.example.com/');
  assert.equal(normaliseUrl('https://www.example.com'), 'https://www.example.com/');
  assert.equal(normaliseUrl('  example.com/path  '), 'https://example.com/path');
});

test('non-web input is rejected', () => {
  for (const bad of ['', '   ', 'javascript:alert(1)', 'not a url', 'mailto:a@b.com', 'foo']) {
    assert.equal(normaliseUrl(bad), null, bad);
  }
});

test('slugs are mona- prefixed base62 and unique', () => {
  assert.equal(toBase62(0), '0');
  assert.equal(toBase62(61), 'Z');
  assert.equal(toBase62(62), '10');
  const slug = nextSlug([]);
  assert.match(slug, /^mona-[0-9a-zA-Z]{4}$/);
  // Force a collision on the first draw; the second draw must be used.
  const draws = [0, 0.5];
  const second = nextSlug(['mona-0000'], () => draws.shift());
  assert.notEqual(second, 'mona-0000');
});

test('empty, corrupted, legacy and non-array storage recover without throwing', () => {
  for (const raw of [null, undefined, '', '{not json', '"a string"', '42', '{"url":"x"}', 'null']) {
    assert.deepEqual(parseStored(raw), [], String(raw));
  }
  // Legacy/malformed entries are dropped, valid ones kept and normalised.
  const raw = JSON.stringify([
    { url: 'example.com', slug: 'mona-abcd' },
    { url: 'https://ok.org', slug: 'old-slug' },
    'just a string',
    null,
    { slug: 'mona-zzzz' },
    { url: 'https://dup.org', slug: 'mona-abcd' },
  ]);
  assert.deepEqual(parseStored(raw), [{ url: 'https://example.com/', slug: 'mona-abcd' }]);
});

test('a saved bookmark formats with the exact " :: " separator', () => {
  assert.equal(
    formatBookmark({ url: 'https://www.example.com/', slug: 'mona-7fk2' }),
    'https://www.example.com/ :: mona-7fk2',
  );
});
