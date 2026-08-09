import AsyncStorage from '@react-native-async-storage/async-storage';

import { createId } from './id';

const ACTIVITIES_STORAGE_KEY =
  '@project-sprout/activities';

const ACTIVITY_MUTATIONS_STORAGE_KEY =
  '@project-sprout/activity-mutations';

export type FeedingMethod =
  | 'Breast'
  | 'Bottle'
  | 'Solids';

export type DiaperType =
  | 'Wet'
  | 'Dirty'
  | 'Both'
  | 'Dry';

type BaseActivity = {
  id: string;
  babyProfileId: string;
  note: string | null;
  occurredAt: string;
  createdAt: string;
  syncStatus?: 'pending' | 'synced';
  cloudRevision?: number;
  cloudUpdatedAt?: string;
};

export type ActivityMutation = {
  operationId: string;
  activityId: string;
  babyProfileId: string;
  kind: 'upsert' | 'delete';
  expectedRevision: number;
  activity: BabyActivity | null;
  queuedAt: string;
  attemptCount: number;
  lastError: string | null;
};

export type FeedingActivity =
  BaseActivity & {
    type: 'feeding';
    feedingMethod: FeedingMethod;
    amountOz: number | null;
  };

export type DiaperActivity =
  BaseActivity & {
    type: 'diaper';
    diaperType: DiaperType;
  };

export type SleepActivity =
  BaseActivity & {
    type: 'sleep';
    startedAt: string;
    endedAt: string;
    durationMinutes: number;
  };

export type NoteActivity =
  BaseActivity & {
    type: 'note';
    note: string;
  };

export type BabyActivity =
  | FeedingActivity
  | DiaperActivity
  | SleepActivity
  | NoteActivity;

function sortActivities(
  activities: BabyActivity[],
): BabyActivity[] {
  return [...activities].sort(
    (first, second) =>
      new Date(
        second.occurredAt,
      ).getTime() -
      new Date(
        first.occurredAt,
      ).getTime(),
  );
}

async function saveActivities(
  activities: BabyActivity[],
): Promise<void> {
  await AsyncStorage.setItem(
    ACTIVITIES_STORAGE_KEY,
    JSON.stringify(
      sortActivities(activities),
    ),
  );
}

export async function loadActivities():
  Promise<BabyActivity[]> {
  try {
    const storedActivities =
      await AsyncStorage.getItem(
        ACTIVITIES_STORAGE_KEY,
      );

    if (!storedActivities) {
      return [];
    }

    const parsedActivities: unknown =
      JSON.parse(storedActivities);

    if (!Array.isArray(parsedActivities)) {
      await AsyncStorage.removeItem(
        ACTIVITIES_STORAGE_KEY,
      );

      return [];
    }

    return sortActivities(
      parsedActivities as BabyActivity[],
    );
  } catch (error) {
    console.error(
      'Unable to load activities:',
      error,
    );

    await AsyncStorage.removeItem(
      ACTIVITIES_STORAGE_KEY,
    );

    return [];
  }
}

export async function addActivity(
  activity: BabyActivity,
): Promise<void> {
  const existingActivities =
    await loadActivities();

  const pendingActivity: BabyActivity = {
    ...activity,
    syncStatus:
      activity.syncStatus ?? 'pending',
  };

  const updatedActivities: BabyActivity[] = [
    pendingActivity,
    ...existingActivities,
  ];

  await saveActivities(updatedActivities);
}

export async function loadActivityById(
  activityId: string,
): Promise<BabyActivity | null> {
  const activities = await loadActivities();

  return (
    activities.find(
      (activity) =>
        activity.id === activityId,
    ) ?? null
  );
}

export async function deleteActivity(
  activityId: string,
): Promise<void> {
  const activities = await loadActivities();

  const activity = activities.find(
    (candidate) => candidate.id === activityId,
  );

  if (!activity) {
    return;
  }

  const updatedActivities =
    activities.filter(
      (activity) =>
        activity.id !== activityId,
    );

  await saveActivities(updatedActivities);

  await queueActivityMutation({
    activityId: activity.id,
    babyProfileId: activity.babyProfileId,
    kind: 'delete',
    expectedRevision:
      activity.cloudRevision ?? 0,
    activity: null,
  });
}

export async function updateActivity(
  updatedActivity: BabyActivity,
): Promise<void> {
  const activities = await loadActivities();

  const activityExists =
    activities.some(
      (activity) =>
        activity.id ===
        updatedActivity.id,
    );

  if (!activityExists) {
    throw new Error(
      'Activity not found',
    );
  }

  const updatedActivities =
    activities.map((activity) =>
      activity.id === updatedActivity.id
        ? {
            ...updatedActivity,
            syncStatus: 'pending' as const,
          }
        : activity,
    );

  await saveActivities(updatedActivities);
}

export async function loadActivityMutations():
  Promise<ActivityMutation[]> {
  try {
    const stored = await AsyncStorage.getItem(
      ACTIVITY_MUTATIONS_STORAGE_KEY,
    );

    if (!stored) {
      return [];
    }

    const parsed: unknown = JSON.parse(stored);
    return Array.isArray(parsed)
      ? parsed as ActivityMutation[]
      : [];
  } catch {
    return [];
  }
}

export async function queueActivityUpsert(
  activity: BabyActivity,
): Promise<ActivityMutation> {
  return queueActivityMutation({
    activityId: activity.id,
    babyProfileId: activity.babyProfileId,
    kind: 'upsert',
    expectedRevision:
      activity.cloudRevision ?? 0,
    activity: {
      ...activity,
      syncStatus: 'pending',
    },
  });
}

export async function removeActivityMutation(
  operationId: string,
): Promise<void> {
  const mutations = await loadActivityMutations();
  await saveActivityMutations(
    mutations.filter(
      (mutation) =>
        mutation.operationId !== operationId,
    ),
  );
}

export async function removeActivityMutationsForActivity(
  activityId: string,
): Promise<void> {
  const mutations = await loadActivityMutations();
  await saveActivityMutations(
    mutations.filter(
      (mutation) => mutation.activityId !== activityId,
    ),
  );
}

export async function discardLocalActivity(
  activityId: string,
): Promise<void> {
  const activities = await loadActivities();
  await saveActivities(
    activities.filter(
      (activity) => activity.id !== activityId,
    ),
  );
  await removeActivityMutationsForActivity(activityId);
}

export async function recordActivityMutationFailure(
  operationId: string,
  message: string,
): Promise<void> {
  const mutations = await loadActivityMutations();
  await saveActivityMutations(
    mutations.map((mutation) =>
      mutation.operationId === operationId
        ? {
            ...mutation,
            attemptCount: mutation.attemptCount + 1,
            lastError: message,
          }
        : mutation,
    ),
  );
}

async function queueActivityMutation(
  input: Omit<
    ActivityMutation,
    'operationId' | 'queuedAt' |
    'attemptCount' | 'lastError'
  >,
): Promise<ActivityMutation> {
  const mutations = await loadActivityMutations();
  const retained = mutations.filter(
    (mutation) =>
      mutation.activityId !== input.activityId,
  );
  const mutation: ActivityMutation = {
    ...input,
    operationId: createId(),
    queuedAt: new Date().toISOString(),
    attemptCount: 0,
    lastError: null,
  };

  await saveActivityMutations([
    ...retained,
    mutation,
  ]);

  return mutation;
}

async function saveActivityMutations(
  mutations: ActivityMutation[],
): Promise<void> {
  await AsyncStorage.setItem(
    ACTIVITY_MUTATIONS_STORAGE_KEY,
    JSON.stringify(mutations),
  );
}

export async function markActivitySynced(
  activityId: string,
  cloudRevision?: number,
  cloudUpdatedAt?: string,
): Promise<void> {
  const activities = await loadActivities();

  const updatedActivities =
    activities.map((activity) =>
      activity.id === activityId
        ? {
            ...activity,
            syncStatus: 'synced' as const,
            cloudRevision:
              cloudRevision ?? activity.cloudRevision,
            cloudUpdatedAt:
              cloudUpdatedAt ?? activity.cloudUpdatedAt,
          }
        : activity,
    );

  await saveActivities(updatedActivities);
}

export async function markActivityPending(
  activityId: string,
): Promise<void> {
  const activities = await loadActivities();

  const updatedActivities =
    activities.map((activity) =>
      activity.id === activityId
        ? {
            ...activity,
            syncStatus: 'pending' as const,
          }
        : activity,
    );

  await saveActivities(updatedActivities);
}

export async function reconcileActivitiesWithCloud(
  cloudActivities: BabyActivity[],
  babyProfileId: string,
): Promise<void> {
  const existingActivities =
    await loadActivities();

  const cloudActivityIds = new Set(
    cloudActivities.map(
      (activity) => activity.id,
    ),
  );

  const retainedActivities =
    existingActivities.filter(
      (activity) => {
        if (
          activity.babyProfileId !==
          babyProfileId
        ) {
          return true;
        }

        if (
          activity.syncStatus ===
          'pending'
        ) {
          return true;
        }

        return cloudActivityIds.has(
          activity.id,
        );
      },
    );

  const activityMap = new Map<
    string,
    BabyActivity
  >();

  retainedActivities.forEach(
    (activity) => {
      activityMap.set(
        activity.id,
        activity,
      );
    },
  );

  cloudActivities.forEach(
    (activity) => {
      activityMap.set(
        activity.id,
        {
          ...activity,
          syncStatus: 'synced',
        },
      );
    },
  );

  await saveActivities(
    Array.from(
      activityMap.values(),
    ),
  );
}

export async function mergeActivities(
  incomingActivities: BabyActivity[],
): Promise<number> {
  const existingActivities =
    await loadActivities();

  const activityMap = new Map<
    string,
    BabyActivity
  >();

  existingActivities.forEach(
    (activity) => {
      activityMap.set(
        activity.id,
        activity,
      );
    },
  );

incomingActivities.forEach(
  (activity) => {
    activityMap.set(
      activity.id,
      {
        ...activity,
        syncStatus: 'synced',
      },
    );
  },
);

  const mergedActivities =
    Array.from(activityMap.values());

  await saveActivities(
    mergedActivities,
  );

  return incomingActivities.length;
}
