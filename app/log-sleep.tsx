import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  addActivity,
  BabyActivity,
} from '../lib/activities';
import { loadBabyProfile } from '../lib/babyProfile';
import { loadMyCareCircle } from '../lib/careCircle';
import {
  syncActivityToCloud,
} from '../lib/cloudActivities';
import { loadCloudBabyForCircle } from '../lib/cloudBaby';
import {
  deleteCloudActiveSleep,
  syncActiveSleepToCloud,
} from '../lib/cloudSleepSession';
import {
  ActiveSleepSession,
  clearActiveSleepSession,
  loadActiveSleepSession,
  saveActiveSleepSession,
} from '../lib/sleepSession';

export default function LogSleepScreen() {
  const router = useRouter();

  const [babyProfileId, setBabyProfileId] =
    useState<string | null>(null);
  const [activeSleep, setActiveSleep] =
    useState<ActiveSleepSession | null>(null);
  const [note, setNote] = useState('');
  const [nowMs, setNowMs] = useState(Date.now());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let isActive = true;

    const loadScreen = async () => {
      try {
        const [profile, savedSleep] =
          await Promise.all([
            loadBabyProfile(),
            loadActiveSleepSession(),
          ]);

        if (!profile) {
          router.replace('/');
          return;
        }

        if (!isActive) {
          return;
        }

        setBabyProfileId(profile.id);

        if (
          savedSleep &&
          savedSleep.babyProfileId === profile.id
        ) {
          setActiveSleep(savedSleep);
        } else if (savedSleep) {
          await clearActiveSleepSession();
        }
      } catch (error) {
        console.error(
          'Unable to load sleep screen:',
          error,
        );

        Alert.alert(
          'Unable to load sleep',
          'Please return to the dashboard and try again.',
        );
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    void loadScreen();

    return () => {
      isActive = false;
    };
  }, [router]);

  useEffect(() => {
    if (!activeSleep) {
      return;
    }

    setNowMs(Date.now());

    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 30000);

    return () => {
      clearInterval(timer);
    };
  }, [activeSleep]);

  const elapsedText = useMemo(() => {
    if (!activeSleep) {
      return '';
    }

    const startedMs = new Date(
      activeSleep.startedAt,
    ).getTime();

    const minutes = Math.max(
      0,
      Math.floor(
        (nowMs - startedMs) / 60000,
      ),
    );

    return formatDuration(minutes);
  }, [activeSleep, nowMs]);

  const startSleep = async () => {
    if (!babyProfileId || saving) {
      return;
    }

    setSaving(true);

    try {
      const now =
        new Date().toISOString();

      const sleepSession: ActiveSleepSession = {
        babyProfileId,
        startedAt: now,
        createdAt: now,
        syncStatus: 'pending',
      };

      await saveActiveSleepSession(
        sleepSession,
      );

      try {
        const circle =
          await loadMyCareCircle();

        if (!circle) {
          Alert.alert(
            'Debug',
            'No Care Circle was found.',
          );

          router.back();
          return;
        }

        const cloudBaby =
          await loadCloudBabyForCircle(
            circle.id,
          );

        if (!cloudBaby) {
          Alert.alert(
            'Debug',
            'Care Circle found, but no cloud baby was found.',
          );

          router.back();
          return;
        }

        Alert.alert(
          'Debug',
          `Cloud baby found: ${cloudBaby.id}`,
        );

        await syncActiveSleepToCloud(
          sleepSession,
          cloudBaby.id,
        );
      } catch (syncError) {
        console.warn(
          'Sleep started locally but could not sync:',
          syncError,
        );

        Alert.alert(
          'Active sleep sync failed',
          syncError instanceof Error
            ? syncError.message
            : JSON.stringify(syncError),
        );
      }

      router.back();
    } catch (error) {
      console.error(
        'Unable to start sleep:',
        error,
      );

      Alert.alert(
        'Unable to start sleep',
        'The sleep session could not be started. Please try again.',
      );

      setSaving(false);
    }
  };

  const endSleep = async () => {
    if (!activeSleep || saving) {
      return;
    }

    setSaving(true);

    try {
      const endedAt = new Date();
      const startedAt = new Date(
        activeSleep.startedAt,
      );

      const durationMinutes = Math.max(
        1,
        Math.round(
          (
            endedAt.getTime() -
            startedAt.getTime()
          ) / 60000,
        ),
      );

      const endedAtIso =
        endedAt.toISOString();

      const sleepActivity: BabyActivity = {
        id: Date.now().toString(),
        babyProfileId:
          activeSleep.babyProfileId,
        type: 'sleep',
        startedAt:
          activeSleep.startedAt,
        endedAt: endedAtIso,
        durationMinutes,
        note: note.trim() || null,
        occurredAt: endedAtIso,
        createdAt: endedAtIso,
      };

      await addActivity(
        sleepActivity,
      );

      try {
        const circle =
          await loadMyCareCircle();

        if (circle) {
          const cloudBaby =
            await loadCloudBabyForCircle(
              circle.id,
            );

          if (cloudBaby) {
            await syncActivityToCloud(
              sleepActivity,
              cloudBaby.id,
            );

            await deleteCloudActiveSleep(
              cloudBaby.id,
            );
          }
        }
      } catch (syncError) {
        console.warn(
          'Sleep saved locally but could not sync:',
          syncError,
        );

        Alert.alert(
          'Saved on this device',
          'The sleep entry was saved, but Sprout could not sync it with your Care Circle yet.',
        );
      }

      await clearActiveSleepSession();

      router.back();
    } catch (error) {
      console.error(
        'Unable to end sleep:',
        error,
      );

      Alert.alert(
        'Unable to end sleep',
        'The sleep session could not be saved. Please try again.',
      );

      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView
        style={styles.loadingScreen}
      >
        <ActivityIndicator
          color="#48684D"
          size="large"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={
            styles.content
          }
          keyboardShouldPersistTaps="handled"
        >
          <Pressable
            accessibilityLabel="Go back"
            accessibilityRole="button"
            onPress={() =>
              router.back()
            }
            style={styles.backButton}
          >
            <Text
              style={
                styles.backButtonText
              }
            >
              ‹
            </Text>
          </Pressable>

          <Text style={styles.eyebrow}>
            QUICK ADD
          </Text>

          <Text style={styles.title}>
            {activeSleep
              ? 'Sleep in progress'
              : 'Start a sleep'}
          </Text>

          <Text
            style={styles.description}
          >
            {activeSleep
              ? 'End the session whenever your baby wakes up.'
              : 'Start the timer when your baby falls asleep.'}
          </Text>

          <View style={styles.sleepCard}>
            <Text
              style={styles.sleepIcon}
            >
              ☾
            </Text>

            {activeSleep ? (
              <>
                <Text
                  style={
                    styles.sleepStatus
                  }
                >
                  Sleeping
                </Text>

                <Text
                  style={
                    styles.elapsedTime
                  }
                >
                  {elapsedText}
                </Text>

                <Text
                  style={
                    styles.startedTime
                  }
                >
                  Started at{' '}
                  {formatTime(
                    activeSleep.startedAt,
                  )}
                </Text>
              </>
            ) : (
              <>
                <Text
                  style={
                    styles.sleepStatus
                  }
                >
                  Ready when you are
                </Text>

                <Text
                  style={
                    styles.readyDescription
                  }
                >
                  The start time will be
                  saved on this device.
                </Text>
              </>
            )}
          </View>

          {activeSleep && (
            <View
              style={styles.section}
            >
              <Text
                style={styles.label}
              >
                Note
                <Text
                  style={
                    styles.optional
                  }
                >
                  {' '}· Optional
                </Text>
              </Text>

              <TextInput
                maxLength={250}
                multiline
                onChangeText={setNote}
                placeholder="Anything you’d like to remember"
                placeholderTextColor="#9AA29B"
                style={
                  styles.noteInput
                }
                textAlignVertical="top"
                value={note}
              />
            </View>
          )}

          <View style={styles.footer}>
            <Pressable
              accessibilityRole="button"
              disabled={saving}
              onPress={
                activeSleep
                  ? endSleep
                  : startSleep
              }
              style={({ pressed }) => [
                styles.primaryButton,
                activeSleep &&
                  styles.endButton,
                saving &&
                  styles.primaryButtonDisabled,
                pressed &&
                  styles.pressed,
              ]}
            >
              {saving ? (
                <ActivityIndicator
                  color="#FFFFFF"
                />
              ) : (
                <Text
                  style={
                    styles.primaryButtonText
                  }
                >
                  {activeSleep
                    ? 'End sleep'
                    : 'Start sleep'}
                </Text>
              )}
            </Pressable>

            {!activeSleep && (
              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  router.push(
                    '/log-sleep-manual',
                  )
                }
                style={({
                  pressed,
                }) => [
                  styles.manualButton,
                  pressed &&
                    styles.pressed,
                ]}
              >
                <Text
                  style={
                    styles.manualButtonText
                  }
                >
                  Add completed sleep
                </Text>
              </Pressable>
            )}

            <Text
              style={
                styles.helperText
              }
            >
              {activeSleep
                ? 'Ending creates a completed entry in Today.'
                : 'You can safely close the app while the timer is active.'}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function formatTime(
  value: string,
): string {
  return new Date(
    value,
  ).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDuration(
  minutes: number,
): string {
  if (minutes < 1) {
    return 'Less than 1 min';
  }

  const hours =
    Math.floor(minutes / 60);
  const remainingMinutes =
    minutes % 60;

  if (hours === 0) {
    return `${minutes} min`;
  }

  if (remainingMinutes === 0) {
    return `${hours} hr`;
  }

  return `${hours} hr ${remainingMinutes} min`;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F6F7F2',
  },
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F6F7F2',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 24,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: '#E7ECE3',
    marginBottom: 28,
  },
  backButtonText: {
    color: '#405B45',
    fontSize: 34,
    fontWeight: '300',
    lineHeight: 36,
    marginTop: -3,
  },
  eyebrow: {
    color: '#657A68',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.7,
  },
  title: {
    color: '#263B2B',
    fontSize: 38,
    fontWeight: '700',
    lineHeight: 44,
    letterSpacing: -0.9,
    marginTop: 10,
  },
  description: {
    color: '#6A756D',
    fontSize: 16,
    lineHeight: 24,
    marginTop: 14,
  },
  sleepCard: {
    alignItems: 'center',
    borderColor: '#DDE3DA',
    borderRadius: 24,
    borderWidth: 1,
    backgroundColor: '#FFFEFA',
    marginTop: 34,
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  sleepIcon: {
    color: '#48684D',
    fontSize: 44,
  },
  sleepStatus: {
    color: '#304435',
    fontSize: 19,
    fontWeight: '700',
    marginTop: 12,
  },
  elapsedTime: {
    color: '#48684D',
    fontSize: 34,
    fontWeight: '700',
    marginTop: 12,
  },
  startedTime: {
    color: '#7B867E',
    fontSize: 14,
    marginTop: 7,
  },
  readyDescription: {
    color: '#7B867E',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 8,
  },
  section: {
    marginTop: 28,
  },
  label: {
    color: '#344A39',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  optional: {
    color: '#8B938C',
    fontWeight: '400',
  },
  noteInput: {
    minHeight: 110,
    color: '#263B2B',
    fontSize: 17,
    borderColor: '#DDE3DA',
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: '#FFFEFA',
    paddingHorizontal: 17,
    paddingTop: 16,
  },
  footer: {
    marginTop: 'auto',
    paddingTop: 34,
  },
  primaryButton: {
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: '#48684D',
    paddingHorizontal: 24,
  },
  endButton: {
    backgroundColor: '#6B5A50',
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  helperText: {
    color: '#8B938C',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 13,
  },
  pressed: {
    opacity: 0.82,
    transform: [
      {
        scale: 0.99,
      },
    ],
  },
  manualButton: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: '#C9D6C5',
    borderRadius: 18,
    borderWidth: 1,
    backgroundColor: '#FFFEFA',
    marginTop: 12,
  },
  manualButtonText: {
    color: '#48684D',
    fontSize: 16,
    fontWeight: '700',
  },
});