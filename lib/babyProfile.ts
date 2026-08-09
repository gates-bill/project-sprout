import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  deleteManagedProfilePhoto,
  isManagedProfilePhotoUri,
  persistProfilePhoto,
} from './profilePhoto';

const BABY_PROFILE_STORAGE_KEY =
  '@project-sprout/baby-profile';

export type BabyProfile = {
  id: string;
  name: string;
  birthDate: string;
  photoUri: string | null;
  cloudPhotoPath?: string | null;
  createdAt: string;
};

export async function saveBabyProfile(
  profile: BabyProfile,
): Promise<void> {
  const existingProfile =
    await loadStoredProfile();

  let persistentPhotoUri =
    profile.photoUri;

  if (
    persistentPhotoUri &&
    !isManagedProfilePhotoUri(
      persistentPhotoUri,
    )
  ) {
    persistentPhotoUri =
      await persistProfilePhoto(
        persistentPhotoUri,
      );
  }

  const updatedProfile: BabyProfile = {
    ...profile,
    photoUri: persistentPhotoUri,
  };

  await AsyncStorage.setItem(
    BABY_PROFILE_STORAGE_KEY,
    JSON.stringify(updatedProfile),
  );

  if (
    existingProfile?.photoUri &&
    existingProfile.photoUri !==
      updatedProfile.photoUri
  ) {
    deleteManagedProfilePhoto(
      existingProfile.photoUri,
    );
  }
}

export async function loadBabyProfile():
  Promise<BabyProfile | null> {
  const profile = await loadStoredProfile();

  if (!profile) {
    return null;
  }

  if (
    profile.photoUri &&
    !isManagedProfilePhotoUri(
      profile.photoUri,
    )
  ) {
    try {
      const persistentPhotoUri =
        await persistProfilePhoto(
          profile.photoUri,
        );

      const migratedProfile: BabyProfile = {
        ...profile,
        photoUri: persistentPhotoUri,
      };

      await AsyncStorage.setItem(
        BABY_PROFILE_STORAGE_KEY,
        JSON.stringify(migratedProfile),
      );

      return migratedProfile;
    } catch (error) {
      console.warn(
        'Unable to migrate profile photo:',
        error,
      );
    }
  }

  return profile;
}

export async function saveCloudBabyProfile(
  cloudBaby: {
    id: string;
    name: string;
    birthDate: string;
  },
  sharedPhoto?: {
    photoUri: string | null;
    cloudPhotoPath: string | null;
  },
): Promise<BabyProfile> {
  const existingProfile =
    await loadStoredProfile();

  const profile: BabyProfile = {
    id:
      existingProfile?.id ??
      cloudBaby.id,
    name: cloudBaby.name,
    birthDate: cloudBaby.birthDate,
    photoUri:
      sharedPhoto
        ? sharedPhoto.photoUri
        : existingProfile?.photoUri ?? null,
    cloudPhotoPath:
      sharedPhoto
        ? sharedPhoto.cloudPhotoPath
        : existingProfile?.cloudPhotoPath,
    createdAt:
      existingProfile?.createdAt ??
      new Date().toISOString(),
  };

  await saveBabyProfile(profile);

  return profile;
}

async function loadStoredProfile():
  Promise<BabyProfile | null> {
  const storedProfile =
    await AsyncStorage.getItem(
      BABY_PROFILE_STORAGE_KEY,
    );

  if (!storedProfile) {
    return null;
  }

  return JSON.parse(
    storedProfile,
  ) as BabyProfile;
}
