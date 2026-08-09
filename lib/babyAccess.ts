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

  if (!data.session) {
    return profile
      ? {
          status: 'ready',
          profile,
          circle: null,
        }
      : { status: 'signed-out' };
  }

  let circle;

  try {
    circle = await loadMyCareCircle();
  } catch (error) {
    if (profile) {
      return {
        status: 'ready',
        profile,
        circle: null,
      };
    }

    throw error;
  }

  const previousCareCircleId =
    await loadSharedCareCircleId();

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
