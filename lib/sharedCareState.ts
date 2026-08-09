import AsyncStorage from '@react-native-async-storage/async-storage';

const SHARED_CARE_CIRCLE_KEY =
  '@project-sprout/shared-care-circle-id';

export async function saveSharedCareCircleId(
  careCircleId: string,
): Promise<void> {
  await AsyncStorage.setItem(
    SHARED_CARE_CIRCLE_KEY,
    careCircleId,
  );
}

export async function loadSharedCareCircleId():
Promise<string | null> {
  return AsyncStorage.getItem(
    SHARED_CARE_CIRCLE_KEY,
  );
}