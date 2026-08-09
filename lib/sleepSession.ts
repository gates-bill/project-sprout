import AsyncStorage from '@react-native-async-storage/async-storage';

const ACTIVE_SLEEP_STORAGE_KEY =
  '@project-sprout/active-sleep-session';

export type ActiveSleepSession = {
  babyProfileId: string;
  cloudBabyId?: string;
  startedAt: string;
  createdAt: string;
  syncStatus?: 'pending' | 'synced';
};

export async function loadActiveSleepSession():
  Promise<ActiveSleepSession | null> {
  try {
    const storedSession = await AsyncStorage.getItem(
      ACTIVE_SLEEP_STORAGE_KEY,
    );

    if (!storedSession) {
      return null;
    }

    const parsedSession: unknown = JSON.parse(storedSession);

    if (
      !parsedSession ||
      typeof parsedSession !== 'object' ||
      !('babyProfileId' in parsedSession) ||
      !('startedAt' in parsedSession) ||
      typeof parsedSession.babyProfileId !== 'string' ||
      typeof parsedSession.startedAt !== 'string'
    ) {
      await clearActiveSleepSession();
      return null;
    }

    return parsedSession as ActiveSleepSession;
  } catch (error) {
    console.error('Unable to load active sleep:', error);

    await clearActiveSleepSession();

    return null;
  }
}

export async function saveActiveSleepSession(
  session: ActiveSleepSession,
): Promise<void> {
  await AsyncStorage.setItem(
    ACTIVE_SLEEP_STORAGE_KEY,
    JSON.stringify(session),
  );
}

export async function clearActiveSleepSession(): Promise<void> {
  await AsyncStorage.removeItem(ACTIVE_SLEEP_STORAGE_KEY);
}