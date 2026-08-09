import * as SecureStore from 'expo-secure-store';

const CACHE_ACCESS_KEY =
  'project-sprout.cache-access.v1';

export type LocalAccessBinding =
  | {
      mode: 'local-only';
    }
  | {
      mode: 'shared';
      userId: string;
      careCircleId: string;
      careCircleName: string;
      role: 'owner' | 'caregiver';
      verifiedAt: string;
    };

export async function loadLocalAccessBinding():
  Promise<LocalAccessBinding | null> {
  const value = await SecureStore.getItemAsync(
    CACHE_ACCESS_KEY,
  );

  if (!value) return null;

  try {
    return JSON.parse(value) as LocalAccessBinding;
  } catch {
    await clearLocalAccessBinding();
    return null;
  }
}

export async function markCacheLocalOnly(): Promise<void> {
  await SecureStore.setItemAsync(
    CACHE_ACCESS_KEY,
    JSON.stringify({ mode: 'local-only' }),
  );
}

export async function bindCacheToSharedAccount(
  binding: Omit<
    Extract<LocalAccessBinding, { mode: 'shared' }>,
    'mode' | 'verifiedAt'
  >,
): Promise<void> {
  await SecureStore.setItemAsync(
    CACHE_ACCESS_KEY,
    JSON.stringify({
      mode: 'shared',
      ...binding,
      verifiedAt: new Date().toISOString(),
    }),
    {
      keychainAccessible:
        SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    },
  );
}

export async function clearLocalAccessBinding():
  Promise<void> {
  await SecureStore.deleteItemAsync(CACHE_ACCESS_KEY);
}
