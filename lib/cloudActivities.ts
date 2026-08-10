import {
  ActivityMutation,
  BabyActivity,
  DiaperType,
  FeedingMethod,
  loadActivities,
  loadActivityMutations,
  markActivitySynced,
  queueActivityUpsert,
  reconcileActivitiesWithCloud,
  recordActivityMutationFailure,
  removeActivityMutation,
} from './activities';
import { getCurrentSession } from './auth';
import { supabase } from './supabase';

type MutationRpcResult = {
  status: 'applied' | 'conflict';
  revision: number | null;
};

export type ActivitySyncResult = {
  applied: number;
  conflicts: number;
  failed: number;
};

function activityToCloudData(
  activity: BabyActivity,
) {
  const base = {
    type: activity.type,
    occurred_at: activity.occurredAt,
    created_at: activity.createdAt,
    note: activity.note ?? null,
    feeding_method: null as string | null,
    amount_oz: null as number | null,
    diaper_type: null as string | null,
    started_at: null as string | null,
    ended_at: null as string | null,
    duration_minutes: null as number | null,
  };

  switch (activity.type) {
    case 'feeding':
      return {
        ...base,
        feeding_method: activity.feedingMethod,
        amount_oz: activity.amountOz,
      };
    case 'diaper':
      return {
        ...base,
        diaper_type: activity.diaperType,
      };
    case 'sleep':
      return {
        ...base,
        started_at: activity.startedAt,
        ended_at: activity.endedAt,
        duration_minutes: activity.durationMinutes,
      };
    case 'note':
      return base;
  }
}

export async function syncActivityToCloud(
  activity: BabyActivity,
  babyId: string,
): Promise<void> {
  const mutation = await queueActivityUpsert(activity);
  const result = await applyMutation(mutation, babyId);

  if (result.status === 'conflict') {
    await markActivitySynced(activity.id);
    await removeActivityMutation(mutation.operationId);
    throw new Error(
      'This entry changed on another device. Refresh to keep the newer shared version.',
    );
  }

  await markActivitySynced(
    activity.id,
    result.revision ?? undefined,
    new Date().toISOString(),
  );
  await removeActivityMutation(mutation.operationId);
}

export async function syncPendingActivitiesToCloud(
  babyId: string,
  localBabyProfileId: string,
): Promise<ActivitySyncResult> {
  const activities = await loadActivities();
  let mutations = await loadActivityMutations();

  const queuedActivityIds = new Set(
    mutations.map((mutation) => mutation.activityId),
  );

  for (const activity of activities) {
    if (
      activity.babyProfileId === localBabyProfileId &&
      activity.syncStatus === 'pending' &&
      !queuedActivityIds.has(activity.id)
    ) {
      const mutation = await queueActivityUpsert(activity);
      mutations.push(mutation);
      queuedActivityIds.add(activity.id);
    }
  }

  const result: ActivitySyncResult = {
    applied: 0,
    conflicts: 0,
    failed: 0,
  };

  for (const mutation of mutations) {
    if (mutation.babyProfileId !== localBabyProfileId) {
      continue;
    }

    try {
      const rpcResult = await applyMutation(
        mutation,
        babyId,
      );

      if (rpcResult.status === 'conflict') {
        result.conflicts += 1;
        await markActivitySynced(mutation.activityId);
      } else {
        result.applied += 1;

        if (mutation.kind === 'upsert') {
          await markActivitySynced(
            mutation.activityId,
            rpcResult.revision ?? undefined,
            new Date().toISOString(),
          );
        }
      }

      await removeActivityMutation(
        mutation.operationId,
      );
    } catch (error) {
      result.failed += 1;
      await recordActivityMutationFailure(
        mutation.operationId,
        error instanceof Error
          ? error.message
          : 'Sync failed',
      );
    }
  }

  return result;
}

async function applyMutation(
  mutation: ActivityMutation,
  babyId: string,
): Promise<MutationRpcResult> {
  const { data: sessionData } =
    await getCurrentSession();

  if (!sessionData.session) {
    throw new Error('Your session has expired.');
  }

  const { data, error } = await supabase.rpc(
    'apply_activity_mutation',
    {
      target_baby_id: babyId,
      p_operation_id: mutation.operationId,
      p_mutation_kind: mutation.kind,
      p_activity_client_id: mutation.activityId,
      p_expected_revision:
        mutation.expectedRevision,
      p_activity_data: mutation.activity
        ? activityToCloudData(mutation.activity)
        : null,
    },
  );

  if (error) {
    throw error;
  }

  return data as MutationRpcResult;
}

type CloudActivityRow = {
  client_id: string | null;
  type: 'feeding' | 'diaper' | 'sleep' | 'note';
  occurred_at: string;
  created_at: string;
  updated_at: string;
  revision: number;
  note: string | null;
  feeding_method: string | null;
  amount_oz: number | null;
  diaper_type: string | null;
  started_at: string | null;
  ended_at: string | null;
  duration_minutes: number | null;
};

function isFeedingMethod(
  value: string | null,
): value is FeedingMethod {
  return value === 'Breast' ||
    value === 'Bottle' ||
    value === 'Solids';
}

function isDiaperType(
  value: string | null,
): value is DiaperType {
  return value === 'Wet' ||
    value === 'Dirty' ||
    value === 'Both' ||
    value === 'Dry';
}

function cloudRowToActivity(
  row: CloudActivityRow,
  localBabyProfileId: string,
): BabyActivity {
  if (!row.client_id) {
    throw new Error('A shared activity is missing its client ID.');
  }

  const base = {
    id: row.client_id,
    babyProfileId: localBabyProfileId,
    occurredAt: row.occurred_at,
    createdAt: row.created_at,
    cloudRevision: row.revision,
    cloudUpdatedAt: row.updated_at,
    syncStatus: 'synced' as const,
  };

  switch (row.type) {
    case 'feeding':
      if (!isFeedingMethod(row.feeding_method)) {
        throw new Error('A shared feeding has an invalid feeding method.');
      }
      return {
        ...base,
        type: 'feeding',
        feedingMethod: row.feeding_method,
        amountOz: row.amount_oz,
        note: row.note,
      };
    case 'diaper':
      if (!isDiaperType(row.diaper_type)) {
        throw new Error('A shared diaper has an invalid diaper type.');
      }
      return {
        ...base,
        type: 'diaper',
        diaperType: row.diaper_type,
        note: row.note,
      };
    case 'sleep':
      if (!row.started_at || !row.ended_at || row.duration_minutes === null) {
        throw new Error('A shared sleep entry is incomplete.');
      }
      return {
        ...base,
        type: 'sleep',
        startedAt: row.started_at,
        endedAt: row.ended_at,
        durationMinutes: row.duration_minutes,
        note: row.note,
      };
    case 'note':
      return {
        ...base,
        type: 'note',
        note: row.note ?? '',
      };
  }
}

export async function downloadCloudActivities(
  babyId: string,
  localBabyProfileId: string,
  range?: { startDate: Date; endDate: Date },
): Promise<number> {
  let query = supabase
    .from('activities')
    .select(`
      client_id, type, occurred_at, created_at, updated_at, revision,
      note, feeding_method, amount_oz, diaper_type,
      started_at, ended_at, duration_minutes
    `)
    .eq('baby_id', babyId)
    .order('occurred_at', { ascending: false });

  if (range) {
    query = query
      .gte('occurred_at', range.startDate.toISOString())
      .lte('occurred_at', range.endDate.toISOString());
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  const cloudActivities =
    (data ?? []) as CloudActivityRow[];
  const pendingMutations = await loadActivityMutations();
  const pendingDeleteIds = new Set(
    pendingMutations
      .filter(
        (mutation) =>
          mutation.babyProfileId === localBabyProfileId &&
          mutation.kind === 'delete',
      )
      .map((mutation) => mutation.activityId),
  );
  const activities = cloudActivities
    .filter((row) =>
      !row.client_id || !pendingDeleteIds.has(row.client_id),
    )
    .map((row) =>
      cloudRowToActivity(row, localBabyProfileId),
    );

  if (!range) {
    await reconcileActivitiesWithCloud(
      activities,
      localBabyProfileId,
    );
  } else {
    await mergeRangeActivities(
      activities,
      localBabyProfileId,
      range,
    );
  }

  return activities.length;
}

async function mergeRangeActivities(
  cloudActivities: BabyActivity[],
  babyProfileId: string,
  range: { startDate: Date; endDate: Date },
) {
  const local = await loadActivities();
  const start = range.startDate.getTime();
  const end = range.endDate.getTime();
  const cloudIds = new Set(
    cloudActivities.map((activity) => activity.id),
  );
  const retained = local.filter((activity) => {
    if (activity.babyProfileId !== babyProfileId) return true;
    const time = new Date(activity.occurredAt).getTime();
    if (time < start || time > end) return true;
    return activity.syncStatus === 'pending' || cloudIds.has(activity.id);
  });
  await reconcileActivitiesWithCloud(
    [...retained.filter((item) => item.babyProfileId === babyProfileId), ...cloudActivities],
    babyProfileId,
  );
}
