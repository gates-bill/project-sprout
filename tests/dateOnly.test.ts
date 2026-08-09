import assert from 'node:assert/strict';
import test from 'node:test';

import { formatDateOnly, parseDateOnly, validateBirthDate } from '../lib/dateOnly';

test('round trips a birth date without UTC timezone conversion', () => {
  const value = parseDateOnly('2026-01-02');
  assert.equal(formatDateOnly(value), '2026-01-02');
});

test('rejects future and implausibly old birth dates', () => {
  const future = new Date();
  future.setDate(future.getDate() + 1);
  assert.match(validateBirthDate(future) ?? '', /future/i);
  assert.match(validateBirthDate(new Date(1990, 0, 1)) ?? '', /18 years/i);
});
