import AsyncStorage from '@react-native-async-storage/async-storage';

const ACTIVITIES_STORAGE_KEY = '@project-sprout/activities';

export type FeedingMethod = 'Breast' | 'Bottle' | 'Solids';

export type DiaperType = 'Wet' | 'Dirty' | 'Both' | 'Dry';

type BaseActivity = {
  id: string;
  babyProfileId: string;
  occurredAt: string;
  createdAt: string;
};

export type FeedingActivity = BaseActivity & {
  type: 'feeding';
  feedingMethod: FeedingMethod;
  amountOz: number | null;
  note: string | null;
};

export type DiaperActivity = BaseActivity & {
  type: 'diaper';
  diaperType: DiaperType;
  note: string | null;
};

export type BabyActivity =
  | FeedingActivity
  | DiaperActivity;

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