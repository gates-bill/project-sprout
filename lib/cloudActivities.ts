import {
  BabyActivity,
  DiaperType,
  FeedingMethod,
  loadActivities,
  markActivityPending,
  markActivitySynced,
  reconcileActivitiesWithCloud
} from './activities';
import { getCurrentSession } from './auth';
import { supabase } from './supabase';

function activityToCloudRow(
  activity: BabyActivity,
  babyId: string,
  userId: string,
) {
  const base = {
    baby_id: babyId,
    client_id: activity.id,
    created_by: userId,
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
        duration_minutes:
          activity.durationMinutes,
      };

    case 'note':
      return base;
  }
}

export async function syncLocalActivitiesToCloud(
  babyId: string,
) {
  const { data: sessionData } =
    await getCurrentSession();

  const user = sessionData.session?.user;

  if (!user) {
    throw new Error(
      'You must be signed in before syncing.',
    );
  }

  const activities =
    await loadActivities();

  if (activities.length === 0) {
    return 0;
  }

  for (const activity of activities) {
    const row = activityToCloudRow(
      activity,
      babyId,
      user.id,
    );

    const {
      data: existing,
      error: lookupError,
    } = await supabase
      .from('activities')
      .select('id')
      .eq('baby_id', babyId)
      .eq('client_id', activity.id)
      .maybeSingle();

    if (lookupError) {
      throw lookupError;
    }

    if (existing) {
      const {
        created_by: _createdBy,
        created_at: _createdAt,
        ...updateRow
      } = row;

      const { error: updateError } =
        await supabase
          .from('activities')
          .update(updateRow)
          .eq('baby_id', babyId)
          .eq('client_id', activity.id);

      if (updateError) {
        throw updateError;
      }
    } else {
      const { error: insertError } =
        await supabase
          .from('activities')
          .insert(row);

      if (insertError) {
        throw insertError;
      }
    }

    await markActivitySynced(
      activity.id,
    );
  }

  return activities.length;
}

export async function syncActivityToCloud(
  activity: BabyActivity,
  babyId: string,
): Promise<void> {
  const { data: sessionData } =
    await getCurrentSession();

  const user = sessionData.session?.user;

  if (!user) {
    throw new Error(
      'You must be signed in before syncing.',
    );
  }

  await markActivityPending(
    activity.id,
  );

  const row = activityToCloudRow(
    activity,
    babyId,
    user.id,
  );

  const {
    data: existing,
    error: lookupError,
  } = await supabase
    .from('activities')
    .select('id')
    .eq('baby_id', babyId)
    .eq('client_id', activity.id)
    .maybeSingle();

  if (lookupError) {
    throw lookupError;
  }

  if (existing) {
    const {
      created_by: _createdBy,
      created_at: _createdAt,
      ...updateRow
    } = row;

    const { error: updateError } =
      await supabase
        .from('activities')
        .update(updateRow)
        .eq('baby_id', babyId)
        .eq('client_id', activity.id);

    if (updateError) {
      throw updateError;
    }

    await markActivitySynced(
      activity.id,
    );

    return;
  }

  const { error: insertError } =
    await supabase
      .from('activities')
      .insert(row);

  if (insertError) {
    throw insertError;
  }

  await markActivitySynced(
    activity.id,
  );
}

export async function syncPendingActivitiesToCloud(
  babyId: string,
): Promise<number> {
  const { data: sessionData } =
    await getCurrentSession();

  const userId =
    sessionData.session?.user.id;

  if (!userId) {
    throw new Error(
      'You must be signed in to sync activities.',
    );
  }

  const localActivities =
    await loadActivities();

  const pendingActivities =
    localActivities.filter(
      (activity) =>
        activity.syncStatus === 'pending',
    );

  let syncedCount = 0;

  for (const activity of pendingActivities) {
    const { data: existing, error: lookupError } =
      await supabase
        .from('activities')
        .select('id')
        .eq('baby_id', babyId)
        .eq('client_id', activity.id)
        .maybeSingle();

    if (lookupError) {
      throw lookupError;
    }

    const cloudRow =
      activityToCloudRow(
        activity,
        babyId,
        userId,
      );

    if (existing) {
      const {
        created_by: _createdBy,
        created_at: _createdAt,
        ...updateRow
      } = cloudRow;

      const { error } =
        await supabase
          .from('activities')
          .update(updateRow)
          .eq('baby_id', babyId)
          .eq('client_id', activity.id);

      if (error) {
        throw error;
      }
    } else {
      const { error } =
        await supabase
          .from('activities')
          .insert(cloudRow);

      if (error) {
        throw error;
      }
    }

    await markActivitySynced(
      activity.id,
    );

    syncedCount += 1;
  }

  return syncedCount;
}

type CloudActivityRow = {
  client_id: string | null;

  type:
    | 'feeding'
    | 'diaper'
    | 'sleep'
    | 'note';

  occurred_at: string;
  created_at: string;
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
  return (
    value === 'Breast' ||
    value === 'Bottle' ||
    value === 'Solids'
  );
}

function isDiaperType(
  value: string | null,
): value is DiaperType {
  return (
    value === 'Wet' ||
    value === 'Dirty' ||
    value === 'Both' ||
    value === 'Dry'
  );
}

function cloudRowToActivity(
  row: CloudActivityRow,
  localBabyProfileId: string,
): BabyActivity {
  if (!row.client_id) {
    throw new Error(
      'A shared activity is missing its client ID.',
    );
  }

  const base = {
    id: row.client_id,
    babyProfileId:
      localBabyProfileId,
    occurredAt: row.occurred_at,
    createdAt: row.created_at,
  };

  switch (row.type) {
    case 'feeding':
      if (
        !isFeedingMethod(
          row.feeding_method,
        )
      ) {
        throw new Error(
          'A shared feeding has an invalid feeding method.',
        );
      }

      return {
        ...base,
        type: 'feeding',
        feedingMethod:
          row.feeding_method,
        amountOz: row.amount_oz,
        note: row.note,
        syncStatus: 'synced',
      };

    case 'diaper':
      if (
        !isDiaperType(
          row.diaper_type,
        )
      ) {
        throw new Error(
          'A shared diaper has an invalid diaper type.',
        );
      }

      return {
        ...base,
        type: 'diaper',
        diaperType:
          row.diaper_type,
        note: row.note,
        syncStatus: 'synced',
      };

    case 'sleep':
      if (
        !row.started_at ||
        !row.ended_at ||
        row.duration_minutes === null
      ) {
        throw new Error(
          'A shared sleep entry is incomplete.',
        );
      }

      return {
        ...base,
        type: 'sleep',
        startedAt: row.started_at,
        endedAt: row.ended_at,
        durationMinutes:
          row.duration_minutes,
        note: row.note,
        syncStatus: 'synced',
      };

    case 'note':
      return {
        ...base,
        type: 'note',
        note: row.note ?? '',
        syncStatus: 'synced',
      };
  }
}

export async function downloadCloudActivities(
  babyId: string,
  localBabyProfileId: string,
): Promise<number> {
  const { data, error } =
    await supabase
      .from('activities')
      .select(`
        client_id,
        type,
        occurred_at,
        created_at,
        note,
        feeding_method,
        amount_oz,
        diaper_type,
        started_at,
        ended_at,
        duration_minutes
      `)
      .eq('baby_id', babyId)
      .order('occurred_at', {
        ascending: false,
      });

  if (error) {
    throw error;
  }

  const cloudActivities =
    (data ?? []) as CloudActivityRow[];

  const activities =
    cloudActivities.map((row) =>
      cloudRowToActivity(
        row,
        localBabyProfileId,
      ),
    );

await reconcileActivitiesWithCloud(
  activities,
  localBabyProfileId,
);

  return activities.length;
}

export async function deleteCloudActivity(
  babyId: string,
  clientId: string,
): Promise<void> {
  const { data, error } =
    await supabase
      .from('activities')
      .delete()
      .eq('baby_id', babyId)
      .eq('client_id', clientId)
      .select('id');

  if (error) {
    throw error;
  }

  if (!data || data.length === 0) {
    throw new Error(
      'This shared activity could not be deleted.',
    );
  }
}