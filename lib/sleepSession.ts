import AsyncStorage from '@react-native-async-storage/async-storage';

export type PendingSleepEnd = {
  operationId: string;
  activityClientId: string;
  endedAt: string;
  note: string | null;
};

export type ActiveSleepSession = {
  babyProfileId: string;
  cloudBabyId?: string;
  sessionId: string;
  startedAt: string;
  createdAt: string;
  syncStatus: 'pending-start' | 'synced' | 'pending-end';
  pendingEnd?: PendingSleepEnd;
};

const ACTIVE_SLEEP_STORAGE_KEY =
  '@project-sprout/active-sleep-session';

export async function loadActiveSleepSession():
  Promise<ActiveSleepSession | null> {
  try {
    const storedSession = await AsyncStorage.getItem(
      ACTIVE_SLEEP_STORAGE_KEY,
    );

    if (!storedSession) {
      return null;
    }

    const parsed = JSON.parse(storedSession) as
      Partial<ActiveSleepSession> & {
        syncStatus?: string;
      };

    return {
      babyProfileId: parsed.babyProfileId ?? '',
      cloudBabyId: parsed.cloudBabyId,
      sessionId:
        parsed.sessionId ??
        `legacy-${parsed.createdAt ?? parsed.startedAt}`,
      startedAt: parsed.startedAt ?? '',
      createdAt:
        parsed.createdAt ?? parsed.startedAt ?? '',
      syncStatus:
        parsed.syncStatus === 'pending-end'
          ? 'pending-end'
          : parsed.syncStatus === 'synced'
            ? 'synced'
            : 'pending-start',
      pendingEnd: parsed.pendingEnd,
    };
  } catch (error) {
    console.error('Unable to load active sleep:', error);
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

export async function clearActiveSleepSession():
  Promise<void> {
  await AsyncStorage.removeItem(
    ACTIVE_SLEEP_STORAGE_KEY,
  );
}
