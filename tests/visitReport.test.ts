import assert from 'node:assert/strict';
import test from 'node:test';

import type { BabyActivity } from '../lib/activities';
import { createVisitReport, MAX_REPORT_DAYS } from '../lib/visitReport';

const babyProfileId = 'baby-local';

test('empty ranges include zero-activity daily rows', () => {
  const report = createVisitReport([], babyProfileId, {
    startDate: new Date(2026, 2, 7),
    endDate: new Date(2026, 2, 9),
  });

  assert.equal(report.activityCount, 0);
  assert.equal(report.dayCount, 3);
  assert.equal(report.days.length, 3);
  assert.deepEqual(report.days.map((day) => day.feedingCount), [0, 0, 0]);
});

test('aggregates fractional ounces and diaper types', () => {
  const activities: BabyActivity[] = [
    {
      id: 'feed-1', babyProfileId, type: 'feeding', occurredAt: '2026-08-08T12:00:00.000Z',
      feedingMethod: 'Bottle', amountOz: 2.25, note: '', createdAt: '2026-08-08T12:00:00.000Z', syncStatus: 'synced',
    },
    {
      id: 'feed-2', babyProfileId, type: 'feeding', occurredAt: '2026-08-08T14:00:00.000Z',
      feedingMethod: 'Breast', amountOz: null, note: '', createdAt: '2026-08-08T14:00:00.000Z', syncStatus: 'synced',
    },
    ...(['Wet', 'Dirty', 'Both', 'Dry'] as const).map((diaperType, index) => ({
      id: `diaper-${index}`, babyProfileId, type: 'diaper' as const,
      occurredAt: `2026-08-08T1${index}:30:00.000Z`, diaperType,
      note: '', createdAt: `2026-08-08T1${index}:30:00.000Z`, syncStatus: 'synced' as const,
    })),
  ];
  const report = createVisitReport(activities, babyProfileId, {
    startDate: new Date(2026, 7, 8), endDate: new Date(2026, 7, 8),
  });

  assert.equal(report.feeding.recordedOunces, 2.25);
  assert.equal(report.feeding.withoutOuncesCount, 1);
  assert.deepEqual(report.diaper.types.map(({ type, count }) => [type, count]), [
    ['Wet', 1], ['Dirty', 1], ['Both', 1], ['Dry', 1],
  ]);
});

test('attributes cross-midnight sleep to its recorded completion timestamp', () => {
  const sleep: BabyActivity = {
    id: 'sleep-1', babyProfileId, type: 'sleep', occurredAt: '2026-08-09T04:15:00.000Z',
    startedAt: '2026-08-09T02:45:00.000Z', endedAt: '2026-08-09T04:15:00.000Z',
    durationMinutes: 90, note: '', createdAt: '2026-08-09T04:15:00.000Z', syncStatus: 'synced',
  };
  const occurred = new Date(sleep.occurredAt);
  const report = createVisitReport([sleep], babyProfileId, {
    startDate: occurred, endDate: occurred,
  });

  assert.equal(report.sleep.totalMinutes, 90);
  assert.equal(report.days[0].sleepSessionCount, 1);
});

test('uses calendar-day math across the spring DST boundary', () => {
  const report = createVisitReport([], babyProfileId, {
    startDate: new Date(2026, 2, 7), endDate: new Date(2026, 2, 9),
  });
  assert.equal(report.dayCount, 3);
});

test('rejects report ranges beyond the MVP limit', () => {
  assert.throws(() => createVisitReport([], babyProfileId, {
    startDate: new Date(2025, 0, 1),
    endDate: new Date(2025, 0, MAX_REPORT_DAYS + 1),
  }), /limited/);
});
