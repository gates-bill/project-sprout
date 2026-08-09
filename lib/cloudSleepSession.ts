import {
  discardLocalActivity,
  markActivitySynced,
  removeActivityMutationsForActivity,
} from './activities';
import {
  ActiveSleepSession,
  clearActiveSleepSession,
  loadActiveSleepSession,
  saveActiveSleepSession,
} from './sleepSession';
import { supabase } from './supabase';

type ActiveSleepRow = {
  baby_id: string;
  session_id: string;
  started_at: string;
  created_at: string;
};

export async function syncActiveSleepToCloud(
  session: ActiveSleepSession,
  cloudBabyId: string,
): Promise<void> {
  const { data, error } = await supabase.rpc(
    'start_active_sleep',
    {
      target_baby_id: cloudBabyId,
      target_session_id: session.sessionId,
      target_started_at: session.startedAt,
    },
  );

  if (error) throw error;

  const result = data as {
    session_id: string;
    started_at: string;
    created_at: string;
  };

  await saveActiveSleepSession({
    ...session,
    cloudBabyId,
    sessionId: result.session_id,
    startedAt: result.started_at,
    createdAt: result.created_at,
    syncStatus: 'synced',
  });
}

export async function syncPendingActiveSleep(
  cloudBabyId: string,
): Promise<void> {
  const local = await loadActiveSleepSession();

  if (!local) return;

  if (local.syncStatus === 'pending-start') {
    await syncActiveSleepToCloud(local, cloudBabyId);
    return;
  }

  if (
    local.syncStatus === 'pending-end' &&
    local.pendingEnd
  ) {
    const pendingEnd = local.pendingEnd;
    const { data, error } = await supabase.rpc(
      'complete_active_sleep',
      {
        target_baby_id: cloudBabyId,
        target_session_id: local.sessionId,
        p_operation_id: pendingEnd.operationId,
        p_activity_client_id:
          pendingEnd.activityClientId,
        target_ended_at: pendingEnd.endedAt,
        target_note: pendingEnd.note,
      },
    );

    if (error) {
      if (error.message.includes('SLEEP_SESSION_NOT_ACTIVE')) {
        await discardLocalActivity(
          pendingEnd.activityClientId,
        );
        await clearActiveSleepSession();
        return;
      }

      throw error;
    }

    const result = data as {
      activity_client_id: string;
    };

    await markActivitySynced(
      result.activity_client_id,
      1,
      new Date().toISOString(),
    );
    await removeActivityMutationsForActivity(
      result.activity_client_id,
    );
    await clearActiveSleepSession();
  }
}

export async function loadCloudActiveSleep(
  cloudBabyId: string,
  localBabyProfileId: string,
): Promise<ActiveSleepSession | null> {
  const local = await loadActiveSleepSession();

  if (
    local?.babyProfileId === localBabyProfileId &&
    local.syncStatus !== 'synced'
  ) {
    return local;
  }

  const { data, error } = await supabase
    .from('active_sleep_sessions')
    .select('baby_id, session_id, started_at, created_at')
    .eq('baby_id', cloudBabyId)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    if (local?.syncStatus === 'synced') {
      await clearActiveSleepSession();
    }
    return null;
  }

  const row = data as ActiveSleepRow;
  const activeSleep: ActiveSleepSession = {
    babyProfileId: localBabyProfileId,
    cloudBabyId: row.baby_id,
    sessionId: row.session_id,
    startedAt: row.started_at,
    createdAt: row.created_at,
    syncStatus: 'synced',
  };

  await saveActiveSleepSession(activeSleep);
  return activeSleep;
}

export async function deleteCloudActiveSleep(
  cloudBabyId: string,
): Promise<void> {
  const local = await loadActiveSleepSession();
  if (!local?.pendingEnd) {
    throw new Error('A durable sleep completion is required.');
  }
  await syncPendingActiveSleep(cloudBabyId);
}
