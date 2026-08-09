import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { loadActivities } from './activities';
import { loadBabyProfile } from './babyProfile';
import {
  clearAllProfilePhotos,
} from './profilePhoto';
import { loadActiveSleepSession } from './sleepSession';
import { clearLocalAccessBinding } from './localAccess';

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

  try {
    await Sharing.shareAsync(file.uri);
  } finally {
    if (file.exists) {
      file.delete();
    }
  }
}

export async function deleteAllSproutData(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();

  const sproutKeys = keys.filter((key) =>
    key.startsWith(SPROUT_STORAGE_PREFIX),
  );

  if (sproutKeys.length > 0) {
    await AsyncStorage.multiRemove(
      sproutKeys,
    );
  }

  clearAllProfilePhotos();
  await clearGeneratedSproutFiles();
  await clearLocalAccessBinding();
}

function clearGeneratedSproutFiles(): void {
  const cacheDirectory = new Directory(Paths.cache);

  if (!cacheDirectory.exists) return;

  for (const entry of cacheDirectory.list()) {
    if (
      entry instanceof File &&
      (
        entry.name.startsWith('Sprout-Report-') ||
        entry.name.startsWith('project-sprout-export-')
      )
    ) {
      entry.delete();
    }
  }
}
