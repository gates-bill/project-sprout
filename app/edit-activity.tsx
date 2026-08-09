import {
  useLocalSearchParams,
  useRouter,
} from 'expo-router';
import { useEffect, useRef, useState } from 'react';
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
  BabyActivity,
  DiaperType,
  FeedingMethod,
  loadActivityById,
  updateActivity,
} from '../lib/activities';
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

const diaperTypes: DiaperType[] = [
  'Wet',
  'Dirty',
  'Both',
  'Dry',
];

export default function EditActivityScreen() {
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);

  const { id } = useLocalSearchParams<{
    id: string;
  }>();

  const [activity, setActivity] =
    useState<BabyActivity | null>(null);

  const [feedingMethod, setFeedingMethod] =
    useState<FeedingMethod>('Breast');

  const [diaperType, setDiaperType] =
    useState<DiaperType>('Wet');

  const [amountOz, setAmountOz] = useState('');
  const [note, setNote] = useState('');

  const [occurredAt, setOccurredAt] =
    useState(new Date());

  const [startedAt, setStartedAt] =
    useState(new Date());

  const [endedAt, setEndedAt] =
    useState(new Date());

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let isActive = true;

    const loadActivity = async () => {
      try {
        const savedActivity =
          await loadActivityById(id);

        if (!savedActivity) {
          Alert.alert(
            'Entry not found',
            'This entry may have been deleted.',
            [
              {
                text: 'Go back',
                onPress: () => router.back(),
              },
            ],
          );

          return;
        }

        if (!isActive) {
          return;
        }

        setActivity(savedActivity);
        setNote(savedActivity.note ?? '');

        if (savedActivity.type === 'feeding') {
          setFeedingMethod(
            savedActivity.feedingMethod,
          );

          setAmountOz(
            savedActivity.amountOz !== null
              ? savedActivity.amountOz.toString()
              : '',
          );

          setOccurredAt(
            new Date(savedActivity.occurredAt),
          );
        }

        if (savedActivity.type === 'diaper') {
          setDiaperType(savedActivity.diaperType);

          setOccurredAt(
            new Date(savedActivity.occurredAt),
          );
        }

        if (savedActivity.type === 'note') {
          setOccurredAt(
            new Date(savedActivity.occurredAt),
          );
        }

        if (savedActivity.type === 'sleep') {
          setStartedAt(
            new Date(savedActivity.startedAt),
          );

          setEndedAt(
            new Date(savedActivity.endedAt),
          );
        }
      } catch (error) {
        console.error(
          'Unable to load activity for editing:',
          error,
        );

        Alert.alert(
          'Unable to edit entry',
          'Please return to the dashboard and try again.',
        );
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    loadActivity();

    return () => {
      isActive = false;
    };
  }, [id, router]);

  const canSave =
    activity !== null &&
    !saving &&
    (activity.type !== 'note' ||
      note.trim().length > 0);

  const saveChanges = async () => {
    if (!activity || !canSave) {
      return;
    }

    let parsedAmount: number | null = null;

    if (
      activity.type === 'feeding' &&
      feedingMethod === 'Bottle' &&
      amountOz.trim().length > 0
    ) {
      parsedAmount = Number.parseFloat(amountOz);

      if (
        !Number.isFinite(parsedAmount) ||
        parsedAmount <= 0
      ) {
        Alert.alert(
          'Check the amount',
          'Enter a valid amount greater than zero.',
        );

        return;
      }
    }

    if (
      activity.type !== 'sleep' &&
      occurredAt.getTime() > Date.now()
    ) {
      Alert.alert(
        'Check the time',
        'An entry cannot be saved in the future.',
      );

      return;
    }

    if (activity.type === 'sleep') {
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

      if (
        endedAt.getTime() <= startedAt.getTime()
      ) {
        Alert.alert(
          'Check the times',
          'The sleep end time must be after the start time.',
        );

        return;
      }
    }

setSaving(true);

try {
  let updatedActivity: BabyActivity;

  switch (activity.type) {
    case 'feeding':
      updatedActivity = {
        ...activity,
        feedingMethod,
        amountOz:
          feedingMethod === 'Bottle'
            ? parsedAmount
            : null,
        note: note.trim() || null,
        occurredAt:
          occurredAt.toISOString(),
      };
      break;

    case 'diaper':
      updatedActivity = {
        ...activity,
        diaperType,
        note: note.trim() || null,
        occurredAt:
          occurredAt.toISOString(),
      };
      break;

    case 'sleep': {
      const durationMinutes = Math.max(
        1,
        Math.round(
          (endedAt.getTime() -
            startedAt.getTime()) /
            60000,
        ),
      );

      updatedActivity = {
        ...activity,
        startedAt:
          startedAt.toISOString(),
        endedAt:
          endedAt.toISOString(),
        durationMinutes,
        occurredAt:
          endedAt.toISOString(),
        note: note.trim() || null,
      };

      break;
    }

    case 'note': {
      const trimmedNote = note.trim();

      if (!trimmedNote) {
        Alert.alert(
          'Note required',
          'Enter something before saving.',
        );

        setSaving(false);
        return;
      }

      updatedActivity = {
        ...activity,
        note: trimmedNote,
        occurredAt:
          occurredAt.toISOString(),
      };

      break;
    }
  }

  const circle =
    await loadMyCareCircle();

  if (circle) {
    const cloudBaby =
      await loadCloudBabyForCircle(
        circle.id,
      );

    if (cloudBaby) {
      await syncActivityToCloud(
        updatedActivity,
        cloudBaby.id,
      );
    }
  }

  await updateActivity(
    updatedActivity,
  );

  router.back();
    } catch (error) {
      console.error(
        'Unable to update activity:',
        error,
      );

      Alert.alert(
        'Unable to save changes',
        'The entry could not be updated. Please try again.',
      );

      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <ActivityIndicator
          color="#48684D"
          size="large"
        />
      </SafeAreaView>
    );
  }

  if (!activity) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <Text style={styles.missingText}>
          Entry unavailable
        </Text>
      </SafeAreaView>
    );
  }

  const sleepDurationMinutes =
    activity.type === 'sleep'
      ? Math.max(
          0,
          Math.round(
            (endedAt.getTime() -
              startedAt.getTime()) /
              60000,
          ),
        )
      : 0;

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
          ref={scrollViewRef}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
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
            EDIT ENTRY
          </Text>

          <Text style={styles.title}>
            {getEditTitle(activity)}
          </Text>

          <Text style={styles.description}>
            Update the details or correct when this
            happened.
          </Text>

          {activity.type === 'feeding' && (
            <>
              <View style={styles.section}>
                <Text style={styles.label}>
                  Feeding type
                </Text>

                <View style={styles.optionRow}>
                  {feedingMethods.map((method) => {
                    const selected =
                      feedingMethod === method;

                    return (
                      <Pressable
                        key={method}
                        onPress={() =>
                          setFeedingMethod(method)
                        }
                        style={({ pressed }) => [
                          styles.optionButton,
                          selected &&
                            styles.optionButtonSelected,
                          pressed && styles.pressed,
                        ]}
                      >
                        <Text
                          style={[
                            styles.optionText,
                            selected &&
                              styles.optionTextSelected,
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
                    <Text style={styles.optional}>
                      {' '}
                      · Optional
                    </Text>
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
            </>
          )}

          {activity.type === 'diaper' && (
            <View style={styles.section}>
              <Text style={styles.label}>
                Diaper type
              </Text>

              <View style={styles.optionGrid}>
                {diaperTypes.map((type) => {
                  const selected =
                    diaperType === type;

                  return (
                    <Pressable
                      key={type}
                      onPress={() =>
                        setDiaperType(type)
                      }
                      style={({ pressed }) => [
                        styles.gridOption,
                        selected &&
                          styles.optionButtonSelected,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          selected &&
                            styles.optionTextSelected,
                        ]}
                      >
                        {type}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {activity.type !== 'sleep' && (
            <ActivityDateTimeField
              label="DATE & TIME"
              onChange={setOccurredAt}
              scrollViewRef={scrollViewRef}
              value={occurredAt}
            />
          )}

          {activity.type === 'sleep' && (
            <>
              <ActivityDateTimeField
                label="STARTED"
                onChange={setStartedAt}
                scrollViewRef={scrollViewRef}
                value={startedAt}
              />

              <ActivityDateTimeField
                label="ENDED"
                onChange={setEndedAt}
                scrollViewRef={scrollViewRef}
                value={endedAt}
              />

              <View style={styles.durationCard}>
                <Text style={styles.durationLabel}>
                  DURATION
                </Text>

                <Text style={styles.durationValue}>
                  {formatDuration(
                    sleepDurationMinutes,
                  )}
                </Text>
              </View>
            </>
          )}

          <View style={styles.section}>
            <Text style={styles.label}>
              {activity.type === 'note'
                ? 'Note'
                : 'Note · Optional'}
            </Text>

            <TextInput
              maxLength={
                activity.type === 'note'
                  ? 500
                  : 250
              }
              multiline
              onChangeText={setNote}
              placeholder={
                activity.type === 'note'
                  ? 'Write a note'
                  : 'Anything you’d like to remember'
              }
              placeholderTextColor="#9AA29B"
              style={styles.noteInput}
              textAlignVertical="top"
              value={note}
            />

            <Text style={styles.characterCount}>
              {note.length}/
              {activity.type === 'note'
                ? 500
                : 250}
            </Text>
          </View>

          <View style={styles.footer}>
            <Pressable
              accessibilityRole="button"
              disabled={!canSave}
              onPress={saveChanges}
              style={({ pressed }) => [
                styles.primaryButton,
                !canSave &&
                  styles.primaryButtonDisabled,
                pressed &&
                  canSave &&
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
                  Save changes
                </Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function getEditTitle(
  activity: BabyActivity,
): string {
  switch (activity.type) {
    case 'feeding':
      return 'Edit feeding';

    case 'diaper':
      return 'Edit diaper';

    case 'sleep':
      return 'Edit sleep';

    case 'note':
      return 'Edit note';
  }
}

function formatDuration(
  minutes: number,
): string {
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
  optionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionButton: {
    flex: 1,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: '#DDE3DA',
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: '#FFFEFA',
  },
  gridOption: {
    width: '48%',
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: '#DDE3DA',
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: '#FFFEFA',
  },
  optionButtonSelected: {
    borderColor: '#48684D',
    backgroundColor: '#48684D',
  },
  optionText: {
    color: '#536858',
    fontSize: 15,
    fontWeight: '700',
  },
  optionTextSelected: {
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
    minHeight: 140,
    color: '#263B2B',
    fontSize: 17,
    lineHeight: 25,
    borderColor: '#DDE3DA',
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: '#FFFEFA',
    paddingHorizontal: 17,
    paddingTop: 16,
  },
  characterCount: {
    color: '#929A93',
    fontSize: 12,
    textAlign: 'right',
    marginTop: 7,
  },
  durationCard: {
    borderColor: '#DDE5D9',
    borderRadius: 18,
    borderWidth: 1,
    backgroundColor: '#EBF0E7',
    marginTop: 20,
    padding: 17,
  },
  durationLabel: {
    color: '#657A68',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  durationValue: {
    color: '#304435',
    fontSize: 17,
    fontWeight: '700',
    marginTop: 7,
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
  missingText: {
    color: '#758078',
    fontSize: 16,
  },
});
