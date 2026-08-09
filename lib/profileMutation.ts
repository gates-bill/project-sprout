import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  BabyProfile,
  saveBabyProfile,
} from './babyProfile';
import {
  createCloudBaby,
  loadCloudBabyForCircle,
  updateCloudBabyProfile,
} from './cloudBaby';
import {
  deleteCloudBabyPhoto,
  uploadCloudBabyPhoto,
} from './cloudBabyPhoto';
import { createId } from './id';

const PROFILE_MUTATION_KEY =
  '@project-sprout/profile-mutation';

export type ProfileMutation = {
  operationId: string;
  profile: BabyProfile;
  photoChanged: boolean;
  queuedAt: string;
};

export async function queueProfileUpdate(
  profile: BabyProfile,
  photoChanged: boolean,
): Promise<void> {
  const mutation: ProfileMutation = {
    operationId: createId(),
    profile,
    photoChanged,
    queuedAt: new Date().toISOString(),
  };

  await AsyncStorage.setItem(
    PROFILE_MUTATION_KEY,
    JSON.stringify(mutation),
  );
}

export async function syncPendingProfileUpdate(
  careCircleId: string,
): Promise<BabyProfile | null> {
  const stored = await AsyncStorage.getItem(
    PROFILE_MUTATION_KEY,
  );

  if (!stored) return null;

  const mutation = JSON.parse(stored) as ProfileMutation;
  const profile = mutation.profile;
  let cloudBaby = await loadCloudBabyForCircle(
    careCircleId,
  );

  if (!cloudBaby) {
    await createCloudBaby(careCircleId, profile);
    cloudBaby = await loadCloudBabyForCircle(careCircleId);
  }

  if (!cloudBaby) {
    throw new Error('The shared baby profile is unavailable.');
  }

  const previousPhotoPath = cloudBaby.photoPath;
  let uploadedPhotoPath: string | null = null;

  if (mutation.photoChanged && profile.photoUri) {
    uploadedPhotoPath = await uploadCloudBabyPhoto(
      careCircleId,
      profile.photoUri,
    );
  }

  try {
    cloudBaby = await updateCloudBabyProfile(
      careCircleId,
      {
        name: profile.name,
        birthDate: profile.birthDate,
        ...(mutation.photoChanged
          ? { photoPath: uploadedPhotoPath }
          : {}),
      },
    );
  } catch (error) {
    if (uploadedPhotoPath) {
      await deleteCloudBabyPhoto(uploadedPhotoPath)
        .catch(() => undefined);
    }
    throw error;
  }

  const savedProfile: BabyProfile = {
    ...profile,
    name: cloudBaby.name,
    birthDate: cloudBaby.birthDate,
    cloudPhotoPath: cloudBaby.photoPath,
  };

  await saveBabyProfile(savedProfile);
  await AsyncStorage.removeItem(PROFILE_MUTATION_KEY);

  if (
    mutation.photoChanged &&
    previousPhotoPath &&
    previousPhotoPath !== cloudBaby.photoPath
  ) {
    await deleteCloudBabyPhoto(previousPhotoPath)
      .catch(() => undefined);
  }

  return savedProfile;
}
