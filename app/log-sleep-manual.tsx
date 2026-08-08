import { useRouter } from 'expo-router';
import { useState } from 'react';
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

import ActivityDateTimeField from '../components/ActivityDateTimeField';
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

export default function LogManualSleepScreen() {
  const router = useRouter();

  const now = new Date();

  const defaultStart = new Date(
    now.getTime() - 60 * 60 * 1000,
  );

  const [startedAt, setStartedAt] =
    useState(defaultStart);

  const [endedAt, setEndedAt] =
    useState(now);

  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const saveSleep = async () => {
    if (saving) {
      return;
    }

    if (startedAt.getTime() > Date.now()) {
      Alert.alert(
        'Check the start time',
        'Sleep cannot start in the future.',
      );
      return;
    }

    if (endedAt.getTime() > Date.now()) {
      Alert.alert(
        'Check the end time',
        'Sleep cannot end in the future.',
      );
      return;
    }

    if (endedAt.getTime() <= startedAt.getTime()) {
      Alert.alert(
        'Check the times',
        'The sleep end time must be after the start time.',
      );
      return;
    }

    setSaving(true);

    try {
      const profile = await loadBabyProfile();

      if (!profile) {
        Alert.alert(
          'Profile not found',
          'Please create a baby profile first.',
        );

        router.replace('/');
        return;
      }

      const durationMinutes = Math.max(
        1,
        Math.round(
          (endedAt.getTime() - startedAt.getTime()) /
            60000,
        ),
      );

const createdAt = new Date().toISOString();

const sleepActivity: BabyActivity = {
  id: Date.now().toString(),
  babyProfileId: profile.id,
  type: 'sleep',
  startedAt: startedAt.toISOString(),
  endedAt: endedAt.toISOString(),
  durationMinutes,
  note: note.trim() || null,
  occurredAt: endedAt.toISOString(),
  createdAt,
};

await addActivity(sleepActivity);

try {
  const circle = await loadMyCareCircle();

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

router.back();
    } catch (error) {
      console.error(
        'Unable to save manual sleep:',
        error,
      );

      Alert.alert(
        'Unable to save sleep',
        'The sleep entry could not be saved. Please try again.',
      );

      setSaving(false);
    }
  };

  const durationMinutes = Math.max(
    0,
    Math.round(
      (endedAt.getTime() - startedAt.getTime()) /
        60000,
    ),
  );

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
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable
            accessibilityLabel="Go back"
            accessibilityRole="button"
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>
              ‹
            </Text>
          </Pressable>

          <Text style={styles.eyebrow}>
            SLEEP
          </Text>

          <Text style={styles.title}>
            Add completed sleep
          </Text>

          <Text style={styles.description}>
            Record a nap or sleep session that already happened.
          </Text>

          <ActivityDateTimeField
            onChange={setStartedAt}
            value={startedAt}
          />

          <View style={styles.endField}>
            <ActivityDateTimeField
              onChange={setEndedAt}
              value={endedAt}
            />
          </View>

          <View style={styles.durationCard}>
            <Text style={styles.durationLabel}>
              DURATION
            </Text>

            <Text style={styles.durationValue}>
              {formatDuration(durationMinutes)}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>
              Note · Optional
            </Text>

            <TextInput
              maxLength={250}
              multiline
              onChangeText={setNote}
              placeholder="Anything you’d like to remember"
              placeholderTextColor="#9AA29B"
              style={styles.noteInput}
              textAlignVertical="top"
              value={note}
            />
          </View>

          <View style={styles.footer}>
            <Pressable
              accessibilityRole="button"
              disabled={saving}
              onPress={saveSleep}
              style={({ pressed }) => [
                styles.primaryButton,
                saving &&
                  styles.primaryButtonDisabled,
                pressed && styles.pressed,
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
                  Save sleep
                </Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function formatDuration(minutes: number): string {
  if (minutes <= 0) {
    return 'Check times';
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

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
    marginTop: 10,
  },
  description: {
    color: '#6A756D',
    fontSize: 16,
    lineHeight: 24,
    marginTop: 14,
  },
  endField: {
    marginTop: -10,
  },
  durationCard: {
    borderColor: '#DDE5D9',
    borderRadius: 18,
    borderWidth: 1,
    backgroundColor: '#EBF0E7',
    marginTop: 20,
    padding: 18,
  },
  durationLabel: {
    color: '#657A68',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  durationValue: {
    color: '#304435',
    fontSize: 22,
    fontWeight: '700',
    marginTop: 5,
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
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
});