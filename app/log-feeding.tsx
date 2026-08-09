import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
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
  FeedingMethod,
} from '../lib/activities';
import { loadBabyProfile } from '../lib/babyProfile';
import { loadMyCareCircle } from '../lib/careCircle';
import {
  syncActivityToCloud,
} from '../lib/cloudActivities';
import { loadCloudBabyForCircle } from '../lib/cloudBaby';

const feedingMethods: FeedingMethod[] = [
  'Breast',
  'Bottle',
  'Solids',
];

export default function LogFeedingScreen() {
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);

  const [feedingMethod, setFeedingMethod] =
    useState<FeedingMethod | null>(null);
  const [amountOz, setAmountOz] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const canSave = feedingMethod !== null && !saving;

  const [occurredAt, setOccurredAt] =
    useState(new Date());

  const saveFeeding = async () => {
    if (!feedingMethod || saving) {
      return;
    }

    const parsedAmount =
      amountOz.trim().length > 0
        ? Number.parseFloat(amountOz)
        : null;

    if (
      parsedAmount !== null &&
      (!Number.isFinite(parsedAmount) || parsedAmount <= 0)
    ) {
      Alert.alert(
        'Check the amount',
        'Enter a valid amount greater than zero.',
      );
      return;
    }

    if (occurredAt.getTime() > Date.now()) {
      Alert.alert(
        'Check the time',
        'A feeding cannot be logged in the future.',
      );

      return;
    }

    setSaving(true);

    try {
      const profile = await loadBabyProfile();

      if (!profile) {
        Alert.alert(
          'Profile not found',
          'Please create a baby profile before logging a feeding.',
        );

        router.replace('/');
        return;
      }

      const createdAt = new Date().toISOString();
      const occurredAtIso = occurredAt.toISOString();

      const feedingActivity: BabyActivity = {
        id: Date.now().toString(),
        babyProfileId: profile.id,
        type: 'feeding',
        feedingMethod,
        amountOz:
          feedingMethod === 'Bottle'
            ? parsedAmount
            : null,
        note: note.trim() || null,
        occurredAt: occurredAtIso,
        createdAt,
      };

      await addActivity(feedingActivity);

try {
  console.log('Starting feeding cloud sync');

  const circle = await loadMyCareCircle();

  console.log('Care circle:', circle);

  if (circle) {
    const cloudBaby =
      await loadCloudBabyForCircle(
        circle.id,
      );

    console.log('Cloud baby:', cloudBaby);

    if (cloudBaby) {
      await syncActivityToCloud(
        feedingActivity,
        cloudBaby.id,
      );

      console.log(
        'Feeding cloud sync complete',
      );
    }
  }
} catch (syncError) {
  console.warn(
    'Feeding saved locally but could not sync:',
    syncError,
  );

  Alert.alert(
    'Saved on this device',
    'The feeding was saved, but Sprout could not sync it with your Care Circle yet.',
  );
}

      router.back();
    } catch {
      Alert.alert(
        'Unable to save feeding',
        'The feeding could not be saved. Please try again.',
      );

      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable
            accessibilityLabel="Go back"
            accessibilityRole="button"
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>‹</Text>
          </Pressable>

          <Text style={styles.eyebrow}>QUICK ADD</Text>
          <Text style={styles.title}>Log a feeding</Text>

          <Text style={styles.description}>
            Add as much or as little information as feels useful.
          </Text>

          <View style={styles.section}>
            <Text style={styles.label}>Feeding type</Text>

            <View style={styles.methodRow}>
              {feedingMethods.map((method) => {
                const selected = feedingMethod === method;

                return (
                  <Pressable
                    accessibilityRole="button"
                    key={method}
                    onPress={() => setFeedingMethod(method)}
                    style={({ pressed }) => [
                      styles.methodButton,
                      selected && styles.methodButtonSelected,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.methodButtonText,
                        selected &&
                          styles.methodButtonTextSelected,
                      ]}
                    >
                      {method}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {feedingMethod === 'Bottle' && (
            <View style={styles.section}>
              <Text style={styles.label}>
                Amount in ounces
                <Text style={styles.optional}> · Optional</Text>
              </Text>

              <TextInput
                keyboardType="decimal-pad"
                maxLength={5}
                onChangeText={setAmountOz}
                placeholder="For example, 4"
                placeholderTextColor="#9AA29B"
                style={styles.input}
                value={amountOz}
              />
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.label}>
              Note
              <Text style={styles.optional}> · Optional</Text>
            </Text>

            <TextInput
              maxLength={250}
              multiline
              onChangeText={setNote}
              placeholder="Anything you’d like to remember"
              placeholderTextColor="#9AA29B"
              style={[styles.input, styles.noteInput]}
              textAlignVertical="top"
              value={note}
            />
          </View>

          <ActivityDateTimeField
            onChange={setOccurredAt}
            scrollViewRef={scrollViewRef}
            value={occurredAt}
          />

          <View style={styles.footer}>
            <Pressable
              accessibilityRole="button"
              disabled={!canSave}
              onPress={saveFeeding}
              style={({ pressed }) => [
                styles.primaryButton,
                !canSave && styles.primaryButtonDisabled,
                pressed && canSave && styles.pressed,
              ]}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  Save feeding
                </Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
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
    letterSpacing: -0.9,
    marginTop: 10,
  },
  description: {
    color: '#6A756D',
    fontSize: 16,
    lineHeight: 24,
    marginTop: 14,
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
  methodRow: {
    flexDirection: 'row',
    gap: 10,
  },
  methodButton: {
    flex: 1,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: '#DDE3DA',
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: '#FFFEFA',
  },
  methodButtonSelected: {
    borderColor: '#48684D',
    backgroundColor: '#48684D',
  },
  methodButtonText: {
    color: '#536858',
    fontSize: 15,
    fontWeight: '700',
  },
  methodButtonTextSelected: {
    color: '#FFFFFF',
  },
  input: {
    minHeight: 58,
    color: '#263B2B',
    fontSize: 17,
    borderColor: '#DDE3DA',
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: '#FFFEFA',
    paddingHorizontal: 17,
  },
  noteInput: {
    minHeight: 110,
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
  primaryButtonDisabled: {
    backgroundColor: '#B7C3B5',
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
