import {
    BabyActivity,
    loadActivities,
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

  const activities = await loadActivities();

  if (activities.length === 0) {
    return 0;
  }

  const rows = activities.map((activity) =>
    activityToCloudRow(
      activity,
      babyId,
      user.id,
    ),
  );

  const { error } = await supabase
    .from('activities')
    .upsert(rows, {
      onConflict: 'baby_id,client_id',
    });

  if (error) {
    throw error;
  }

  return rows.length;
}