import AsyncStorage from '@react-native-async-storage/async-storage';

const BABY_PROFILE_STORAGE_KEY = '@project-sprout/baby-profile';

export type BabyProfile = {
  id: string;
  name: string;
  birthDate: string;
  photoUri: string | null;
  createdAt: string;
};

export async function saveBabyProfile(
  profile: BabyProfile,
): Promise<void> {
  await AsyncStorage.setItem(
    BABY_PROFILE_STORAGE_KEY,
    JSON.stringify(profile),
  );
}

export async function loadBabyProfile(): Promise<BabyProfile | null> {
  const storedProfile = await AsyncStorage.getItem(
    BABY_PROFILE_STORAGE_KEY,
  );

  if (!storedProfile) {
    return null;
  }

  return JSON.parse(storedProfile) as BabyProfile;
}