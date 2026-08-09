import {
  BabyActivity,
  DiaperType,
  FeedingMethod,
} from './activities';

export type ReportDateRange = {
  startDate: Date;
  endDate: Date;
};

export type VisitReport = {
  startDate: Date;
  endDate: Date;
  dayCount: number;
  activityCount: number;
  feeding: {
    totalCount: number;
    recordedOunces: number;
    recordedOunceCount: number;
    withoutOuncesCount: number;
    averageRecordedOuncesPerDay: number;
    averageOuncesPerRecordedFeeding: number;
    methods: {
      method: FeedingMethod;
      count: number;
    }[];
  };
  diaper: {
    totalCount: number;
    averagePerDay: number;
    types: {
      type: DiaperType;
      count: number;
    }[];
  };
  sleep: {
    totalMinutes: number;
    averageMinutesPerDay: number;
    sessionCount: number;
    averageSessionMinutes: number;
  };
  notes: {
    id: string;
    occurredAt: string;
    text: string;
  }[];
  days: {
    date: Date;
    feedingCount: number;
    recordedOunces: number;
    recordedOunceCount: number;
    diaperCount: number;
    sleepSessionCount: number;
    noteCount: number;
  }[];
};

const feedingMethods: FeedingMethod[] = [
  'Breast',
  'Bottle',
  'Solids',
];

const diaperTypes: DiaperType[] = [
  'Wet',
  'Dirty',
  'Both',
  'Dry',
];

type DailyReport = VisitReport['days'][number];

export function createVisitReport(
  activities: BabyActivity[],
  babyProfileId: string,
  range: ReportDateRange,
): VisitReport {
  const startDate = startOfDay(range.startDate);
  const endDate = endOfDay(range.endDate);
  const dayCount = getInclusiveDayCount(
    startDate,
    endDate,
  );

  const includedActivities = activities.filter(
    (activity) => {
      const occurredAt = new Date(
        activity.occurredAt,
      ).getTime();

      return (
        activity.babyProfileId === babyProfileId &&
        occurredAt >= startDate.getTime() &&
        occurredAt <= endDate.getTime()
      );
    },
  );

  const methodCounts = new Map<FeedingMethod, number>();
  const diaperCounts = new Map<DiaperType, number>();
  const dailyReports = new Map<string, DailyReport>();
  const notes: VisitReport['notes'] = [];

  let feedingCount = 0;
  let recordedOunces = 0;
  let recordedOunceCount = 0;
  let diaperCount = 0;
  let sleepMinutes = 0;
  let sleepSessionCount = 0;

  includedActivities.forEach((activity) => {
    const occurredAt = new Date(activity.occurredAt);
    const dateKey = createDateKey(occurredAt);
    const daily =
      dailyReports.get(dateKey) ??
      createDailyReport(occurredAt);

    switch (activity.type) {
      case 'feeding':
        feedingCount += 1;
        daily.feedingCount += 1;
        methodCounts.set(
          activity.feedingMethod,
          (methodCounts.get(activity.feedingMethod) ?? 0) + 1,
        );

        if (activity.amountOz !== null) {
          recordedOunces += activity.amountOz;
          recordedOunceCount += 1;
          daily.recordedOunces += activity.amountOz;
          daily.recordedOunceCount += 1;
        }

        break;

      case 'diaper':
        diaperCount += 1;
        daily.diaperCount += 1;
        diaperCounts.set(
          activity.diaperType,
          (diaperCounts.get(activity.diaperType) ?? 0) + 1,
        );
        break;

      case 'sleep':
        sleepMinutes += activity.durationMinutes;
        sleepSessionCount += 1;
        daily.sleepSessionCount += 1;
        break;

      case 'note':
        daily.noteCount += 1;
        notes.push({
          id: activity.id,
          occurredAt: activity.occurredAt,
          text: activity.note,
        });
        break;
    }

    dailyReports.set(dateKey, daily);
  });

  notes.sort(
    (first, second) =>
      new Date(first.occurredAt).getTime() -
      new Date(second.occurredAt).getTime(),
  );

  return {
    startDate,
    endDate,
    dayCount,
    activityCount: includedActivities.length,
    feeding: {
      totalCount: feedingCount,
      recordedOunces,
      recordedOunceCount,
      withoutOuncesCount:
        feedingCount - recordedOunceCount,
      averageRecordedOuncesPerDay:
        recordedOunces / dayCount,
      averageOuncesPerRecordedFeeding:
        recordedOunceCount > 0
          ? recordedOunces / recordedOunceCount
          : 0,
      methods: feedingMethods
        .map((method) => ({
          method,
          count: methodCounts.get(method) ?? 0,
        }))
        .filter(({ count }) => count > 0),
    },
    diaper: {
      totalCount: diaperCount,
      averagePerDay: diaperCount / dayCount,
      types: diaperTypes
        .map((type) => ({
          type,
          count: diaperCounts.get(type) ?? 0,
        }))
        .filter(({ count }) => count > 0),
    },
    sleep: {
      totalMinutes: sleepMinutes,
      averageMinutesPerDay:
        sleepMinutes / dayCount,
      sessionCount: sleepSessionCount,
      averageSessionMinutes:
        sleepSessionCount > 0
          ? sleepMinutes / sleepSessionCount
          : 0,
    },
    notes,
    days: Array.from(dailyReports.values()).sort(
      (first, second) =>
        first.date.getTime() - second.date.getTime(),
    ),
  };
}

function createDailyReport(date: Date): DailyReport {
  return {
    date: startOfDay(date),
    feedingCount: 0,
    recordedOunces: 0,
    recordedOunceCount: 0,
    diaperCount: 0,
    sleepSessionCount: 0,
    noteCount: 0,
  };
}

function startOfDay(date: Date): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
}

function endOfDay(date: Date): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    23,
    59,
    59,
    999,
  );
}

function createDateKey(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function getInclusiveDayCount(
  startDate: Date,
  endDate: Date,
): number {
  const startUtc = Date.UTC(
    startDate.getFullYear(),
    startDate.getMonth(),
    startDate.getDate(),
  );
  const endUtc = Date.UTC(
    endDate.getFullYear(),
    endDate.getMonth(),
    endDate.getDate(),
  );

  return Math.max(
    1,
    Math.floor(
      (endUtc - startUtc) / 86400000,
    ) + 1,
  );
}
