import { getCurrentSession } from './auth';
import {
    ActiveSleepSession,
    clearActiveSleepSession,
    saveActiveSleepSession,
} from './sleepSession';
import { supabase } from './supabase';

type ActiveSleepRow = {
  baby_id: string;
  started_at: string;
  created_by: string;
  created_at: string;
};

export async function syncActiveSleepToCloud(
  session: ActiveSleepSession,
  cloudBabyId: string,
): Promise<void> {
  const { data: sessionData } =
    await getCurrentSession();

  const userId =
    sessionData.session?.user.id;

  if (!userId) {
    throw new Error(
      'You must be signed in to sync active sleep.',
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from('active_sleep_sessions')
    .upsert(
      {
        baby_id: cloudBabyId,
        started_at: session.startedAt,
        created_by: userId,
      },
      {
        onConflict: 'baby_id',
      },
    )
    .select(
      'baby_id, started_at, created_by, created_at',
    )
    .single();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(
      'Supabase did not return the active sleep session after saving it.',
    );
  }

  const row =
    data as ActiveSleepRow;

  await saveActiveSleepSession({
    babyProfileId:
      session.babyProfileId,
    cloudBabyId:
      row.baby_id,
    startedAt:
      row.started_at,
    createdAt:
      row.created_at,
    syncStatus: 'synced',
  });
}

export async function loadCloudActiveSleep(
  cloudBabyId: string,
  localBabyProfileId: string,
): Promise<ActiveSleepSession | null> {
  const {
    data,
    error,
  } = await supabase
    .from('active_sleep_sessions')
    .select(
      'baby_id, started_at, created_by, created_at',
    )
    .eq(
      'baby_id',
      cloudBabyId,
    )
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    await clearActiveSleepSession();
    return null;
  }

  const row =
    data as ActiveSleepRow;

  const activeSleep:
    ActiveSleepSession = {
      babyProfileId:
        localBabyProfileId,
      cloudBabyId:
        row.baby_id,
      startedAt:
        row.started_at,
      createdAt:
        row.created_at,
      syncStatus: 'synced',
    };

  await saveActiveSleepSession(
    activeSleep,
  );

  return activeSleep;
}

export async function deleteCloudActiveSleep(
  cloudBabyId: string,
): Promise<void> {
  const {
    error,
  } = await supabase
    .from('active_sleep_sessions')
    .delete()
    .eq(
      'baby_id',
      cloudBabyId,
    );

  if (error) {
    throw error;
  }

  await clearActiveSleepSession();
}