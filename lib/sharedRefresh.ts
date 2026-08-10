import type { ActivitySyncResult } from './cloudActivities';
import {
  downloadCloudActivities,
  syncPendingActivitiesToCloud,
} from './cloudActivities';
import type { BabyAccessResult } from './babyAccess';
import { loadAccessibleBabyProfile } from './babyAccess';
import { loadCloudBabyForCircle } from './cloudBaby';
import {
  loadCloudActiveSleep,
  syncPendingActiveSleep,
} from './cloudSleepSession';

export type SharedRefreshResult = {
  access: BabyAccessResult;
  activitySync: ActivitySyncResult | null;
  syncFailed: boolean;
};

let refreshInFlight: Promise<SharedRefreshResult> | null = null;

export async function refreshSharedCareData():
  Promise<SharedRefreshResult> {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  const request = runSharedRefresh();
  refreshInFlight = request;

  try {
    return await request;
  } finally {
    if (refreshInFlight === request) {
      refreshInFlight = null;
    }
  }
}

async function runSharedRefresh():
  Promise<SharedRefreshResult> {
  const access = await loadAccessibleBabyProfile();
  let activitySync: ActivitySyncResult | null = null;
  let syncFailed = false;

  if (access.status !== 'ready' || !access.circle) {
    return { access, activitySync, syncFailed };
  }

  let cloudBaby;

  try {
    cloudBaby = await loadCloudBabyForCircle(access.circle.id);
  } catch (error) {
    console.warn('Unable to find the shared baby during refresh:', error);
    return { access, activitySync, syncFailed: true };
  }

  if (!cloudBaby) {
    return { access, activitySync, syncFailed };
  }

  try {
    await syncPendingActiveSleep(cloudBaby.id);
  } catch (error) {
    syncFailed = true;
    console.warn('Active sleep remains queued for retry:', error);
  }

  try {
    activitySync = await syncPendingActivitiesToCloud(
      cloudBaby.id,
      access.profile.id,
    );
    syncFailed = syncFailed || activitySync.failed > 0;
  } catch (error) {
    syncFailed = true;
    console.warn('Activity changes remain queued for retry:', error);
  }

  try {
    await downloadCloudActivities(cloudBaby.id, access.profile.id);
  } catch (error) {
    syncFailed = true;
    console.warn('Unable to download shared activities:', error);
  }

  try {
    await loadCloudActiveSleep(cloudBaby.id, access.profile.id);
  } catch (error) {
    syncFailed = true;
    console.warn('Unable to refresh shared active sleep:', error);
  }

  return { access, activitySync, syncFailed };
}
