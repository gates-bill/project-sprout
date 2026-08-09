import { getCurrentSession } from './auth';
import {
  BabyProfile,
  loadBabyProfile,
} from './babyProfile';
import {
  CareCircleSummary,
  loadMyCareCircle,
} from './careCircle';
import { hydrateLocalBabyFromCloud } from './cloudBaby';
import { deleteAllSproutData } from './dataControls';
import {
  loadSharedCareCircleId,
  saveSharedCareCircleId,
} from './sharedCareState';
import {
  bindCacheToSharedAccount,
  loadLocalAccessBinding,
} from './localAccess';
import { syncPendingProfileUpdate } from './profileMutation';

export type BabyAccessResult =
  | {
      status: 'ready';
      profile: BabyProfile;
      circle: CareCircleSummary | null;
    }
  | {
      status: 'signed-out';
    }
  | {
      status: 'no-care-circle';
    }
  | {
      status: 'access-ended';
    };

export async function loadAccessibleBabyProfile():
  Promise<BabyAccessResult> {
  let profile = await loadBabyProfile();

  const { data } = await getCurrentSession();
  const binding = await loadLocalAccessBinding();
  const previousCareCircleId =
    await loadSharedCareCircleId();

  if (!data.session) {
    if (
      binding?.mode === 'shared' ||
      previousCareCircleId
    ) {
      await deleteAllSproutData();
      return { status: 'signed-out' };
    }

    return profile
      ? {
          status: 'ready',
          profile,
          circle: null,
        }
      : { status: 'signed-out' };
  }

  if (
    binding?.mode === 'shared' &&
    binding.userId !== data.session.user.id
  ) {
    await deleteAllSproutData();
    profile = null;
  }

  let circle;

  try {
    circle = await loadMyCareCircle();
  } catch (error) {
    if (
      profile &&
      binding?.mode === 'shared' &&
      binding.userId === data.session.user.id
    ) {
      return {
        status: 'ready',
        profile,
        circle: {
          id: binding.careCircleId,
          name: binding.careCircleName,
          role: binding.role,
        },
      };
    }

    throw error;
  }

  if (!circle) {
    if (previousCareCircleId) {
      await deleteAllSproutData();

      return { status: 'access-ended' };
    }

    return { status: 'no-care-circle' };
  }

  if (
    previousCareCircleId &&
    previousCareCircleId !== circle.id
  ) {
    await deleteAllSproutData();
    profile = null;
  }

  await saveSharedCareCircleId(circle.id);

  await bindCacheToSharedAccount({
    userId: data.session.user.id,
    careCircleId: circle.id,
    careCircleName: circle.name,
    role: circle.role,
  });

  try {
    await syncPendingProfileUpdate(circle.id);
  } catch (error) {
    console.warn(
      'Pending shared baby profile update remains queued:',
      error,
    );
  }

  try {
    const cloudProfile =
      await hydrateLocalBabyFromCloud(
        circle.id,
      );

    if (cloudProfile) {
      profile = cloudProfile;
    }
  } catch (error) {
    if (!profile) {
      throw error;
    }
  }

  return profile
    ? {
        status: 'ready',
        profile,
        circle,
      }
    : { status: 'no-care-circle' };
}
