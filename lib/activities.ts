import AsyncStorage from '@react-native-async-storage/async-storage';

const ACTIVITIES_STORAGE_KEY = '@project-sprout/activities';

export type FeedingMethod = 'Breast' | 'Bottle' | 'Solids';

export type DiaperType = 'Wet' | 'Dirty' | 'Both' | 'Dry';

type BaseActivity = {
  id: string;
  babyProfileId: string;
  note: string | null;
  occurredAt: string;
  createdAt: string;
};

export type FeedingActivity = BaseActivity & {
  type: 'feeding';
  feedingMethod: FeedingMethod;
  amountOz: number | null;
};

export type DiaperActivity = BaseActivity & {
  type: 'diaper';
  diaperType: DiaperType;
};

export type SleepActivity = BaseActivity & {
  type: 'sleep';
  startedAt: string;
  endedAt: string;
  durationMinutes: number;
};

export type NoteActivity = BaseActivity & {
  type: 'note';
  note: string;
};

export type BabyActivity =
  | FeedingActivity
  | DiaperActivity
  | SleepActivity
  | NoteActivity;

export async function loadActivities(): Promise<BabyActivity[]> {
  try {
    const storedActivities = await AsyncStorage.getItem(
      ACTIVITIES_STORAGE_KEY,
    );

    if (!storedActivities) {
      return [];
    }

    const parsedActivities: unknown = JSON.parse(storedActivities);

    if (!Array.isArray(parsedActivities)) {
      await AsyncStorage.removeItem(ACTIVITIES_STORAGE_KEY);
      return [];
    }

    return [...(parsedActivities as BabyActivity[])].sort(
      (first, second) =>
        new Date(second.occurredAt).getTime() -
        new Date(first.occurredAt).getTime(),
    );
  } catch (error) {
    console.error('Unable to load activities:', error);

    await AsyncStorage.removeItem(ACTIVITIES_STORAGE_KEY);

    return [];
  }
}

export async function addActivity(
  activity: BabyActivity,
): Promise<void> {
  const existingActivities = await loadActivities();

  const updatedActivities: BabyActivity[] = [
    activity,
    ...existingActivities,
  ];

  await AsyncStorage.setItem(
    ACTIVITIES_STORAGE_KEY,
    JSON.stringify(updatedActivities),
  );
}

export async function loadActivityById(
  activityId: string,
): Promise<BabyActivity | null> {
  const activities = await loadActivities();

  return (
    activities.find(
      (activity) => activity.id === activityId,
    ) ?? null
  );
}

export async function deleteActivity(
  activityId: string,
): Promise<void> {
  const activities = await loadActivities();

  const updatedActivities = activities.filter(
    (activity) => activity.id !== activityId,
  );

  await AsyncStorage.setItem(
    ACTIVITIES_STORAGE_KEY,
    JSON.stringify(updatedActivities),
  );
}

export async function updateActivity(
  updatedActivity: BabyActivity,
): Promise<void> {
  const activities = await loadActivities();

  const activityExists = activities.some(
    (activity) => activity.id === updatedActivity.id,
  );

  if (!activityExists) {
    throw new Error('Activity not found');
  }

  const updatedActivities = activities.map((activity) =>
    activity.id === updatedActivity.id
      ? updatedActivity
      : activity,
  );

  await AsyncStorage.setItem(
    ACTIVITIES_STORAGE_KEY,
    JSON.stringify(updatedActivities),
  );
}