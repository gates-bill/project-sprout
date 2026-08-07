import AsyncStorage from '@react-native-async-storage/async-storage';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { loadActivities } from './activities';
import { loadBabyProfile } from './babyProfile';
import { loadActiveSleepSession } from './sleepSession';

const SPROUT_STORAGE_PREFIX = '@project-sprout/';

export async function exportSproutData(): Promise<void> {
  const [
    profile,
    activities,
    activeSleepSession,
  ] = await Promise.all([
    loadBabyProfile(),
    loadActivities(),
    loadActiveSleepSession(),
  ]);

  const exportData = {
    app: 'Project Sprout',
    exportVersion: 1,
    exportedAt: new Date().toISOString(),
    profile,
    activities,
    activeSleepSession,
  };

  const dateStamp = new Date()
    .toISOString()
    .slice(0, 10);

  const file = new File(
    Paths.cache,
    `project-sprout-export-${dateStamp}.json`,
  );

  file.create({
    overwrite: true,
  });

  file.write(
    JSON.stringify(exportData, null, 2),
  );

  const sharingAvailable =
    await Sharing.isAvailableAsync();

  if (!sharingAvailable) {
    throw new Error(
      'Sharing is unavailable on this device.',
    );
  }

  await Sharing.shareAsync(file.uri);
}

export async function deleteAllSproutData():
  Promise<void> {
  const keys = await AsyncStorage.getAllKeys();

  const sproutKeys = keys.filter((key) =>
    key.startsWith(SPROUT_STORAGE_PREFIX),
  );

  if (sproutKeys.length === 0) {
    return;
  }

  await AsyncStorage.multiRemove(sproutKeys);
}