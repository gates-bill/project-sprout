import {
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  BabyActivity,
  deleteActivity,
  loadActivityById,
} from '../../lib/activities';

import { loadMyCareCircle } from '../../lib/careCircle';
import {
  syncPendingActivitiesToCloud,
} from '../../lib/cloudActivities';
import {
  loadCloudBabyForCircle,
} from '../../lib/cloudBaby';

export default function ActivityDetailScreen() {
  const router = useRouter();

  const { id } = useLocalSearchParams<{
    id: string;
  }>();

  const [activity, setActivity] =
    useState<BabyActivity | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useFocusEffect(
    useCallback(() => {
        let isActive = true;

        setLoading(true);

        const loadActivity = async () => {
        try {
            const savedActivity =
            await loadActivityById(id);

            if (!savedActivity) {
            Alert.alert(
                'Entry not found',
                'This entry may have already been deleted.',
                [
                {
                    text: 'Return home',
                    onPress: () => router.back(),
                },
                ],
            );

            return;
            }

            if (isActive) {
            setActivity(savedActivity);
            }
        } catch (error) {
            console.error(
            'Unable to load activity:',
            error,
            );

            Alert.alert(
            'Unable to open entry',
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
    }, [id, router]),
    );

  const confirmDelete = () => {
    if (!activity || deleting) {
      return;
    }

    Alert.alert(
      'Delete this entry?',
      'This cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: handleDelete,
        },
      ],
    );
  };

const handleDelete = async () => {
  if (!activity || deleting) {
    return;
  }

  setDeleting(true);

  try {
    await deleteActivity(activity.id);

    try {
      const circle = await loadMyCareCircle();

      if (circle) {
        const cloudBaby =
          await loadCloudBabyForCircle(
            circle.id,
          );

        if (cloudBaby) {
          await syncPendingActivitiesToCloud(
            cloudBaby.id,
            activity.babyProfileId,
          );
        }
      }
    } catch (syncError) {
      console.warn(
        'Activity deletion queued for sync:',
        syncError,
      );

      Alert.alert(
        'Deleted on this device',
        'The shared deletion will sync when Sprout reconnects.',
      );
    }

    router.back();
  } catch (error) {
    console.error(
      'Unable to delete activity:',
      error,
    );

    Alert.alert(
      'Unable to delete entry',
      error instanceof Error
        ? error.message
        : 'The entry could not be deleted. Please try again.',
    );

    setDeleting(false);
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>‹</Text>
        </Pressable>

        <Text style={styles.eyebrow}>
          {getActivityEyebrow(activity)}
        </Text>

        <Text style={styles.title}>
          {getActivityTitle(activity)}
        </Text>

        <Text style={styles.date}>
          {formatFullDate(activity.occurredAt)}
        </Text>

        <View style={styles.detailCard}>
          {activity.type === 'feeding' && (
            <>
              <DetailRow
                label="Feeding type"
                value={activity.feedingMethod}
              />

              {activity.amountOz !== null && (
                <>
                  <View style={styles.divider} />

                  <DetailRow
                    label="Amount"
                    value={`${activity.amountOz} oz`}
                  />
                </>
              )}

              <View style={styles.divider} />

              <DetailRow
                label="Time"
                value={formatTime(
                  activity.occurredAt,
                )}
              />
            </>
          )}

          {activity.type === 'diaper' && (
            <>
              <DetailRow
                label="Diaper type"
                value={activity.diaperType}
              />

              <View style={styles.divider} />

              <DetailRow
                label="Time"
                value={formatTime(
                  activity.occurredAt,
                )}
              />
            </>
          )}

          {activity.type === 'sleep' && (
            <>
              <DetailRow
                label="Started"
                value={formatTime(
                  activity.startedAt,
                )}
              />

              <View style={styles.divider} />

              <DetailRow
                label="Ended"
                value={formatTime(
                  activity.endedAt,
                )}
              />

              <View style={styles.divider} />

              <DetailRow
                label="Duration"
                value={formatDuration(
                  activity.durationMinutes,
                )}
              />
            </>
          )}

          {activity.type === 'note' && (
            <DetailRow
              label="Time"
              value={formatTime(
                activity.occurredAt,
              )}
            />
          )}
        </View>

        {activity.note && (
          <View style={styles.noteCard}>
            <Text style={styles.noteLabel}>
              NOTE
            </Text>

            <Text style={styles.noteText}>
              {activity.note}
            </Text>
          </View>
        )}

        <View style={styles.footer}>
            <Pressable
                accessibilityRole="button"
                disabled={deleting}
                onPress={() =>
                    router.push({
                    pathname: '/edit-activity',
                    params: {
                        id: activity.id,
                    },
                    })
                }
                style={({ pressed }) => [
                    styles.editButton,
                    pressed && styles.pressed,
                ]}
                >
                <Text style={styles.editButtonText}>
                    Edit entry
                </Text>
            </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={deleting}
            onPress={confirmDelete}
            style={({ pressed }) => [
              styles.deleteButton,
              deleting && styles.disabledButton,
              pressed && styles.pressed,
            ]}
          >
            {deleting ? (
              <ActivityIndicator color="#9A403B" />
            ) : (
              <Text style={styles.deleteButtonText}>
                Delete entry
              </Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

type DetailRowProps = {
  label: string;
  value: string;
};

function DetailRow({
  label,
  value,
}: DetailRowProps) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>
        {label}
      </Text>

      <Text style={styles.detailValue}>
        {value}
      </Text>
    </View>
  );
}

function getActivityEyebrow(
  activity: BabyActivity,
): string {
  switch (activity.type) {
    case 'feeding':
      return 'FEEDING ENTRY';

    case 'diaper':
      return 'DIAPER ENTRY';

    case 'sleep':
      return 'SLEEP ENTRY';

    case 'note':
      return 'NOTE ENTRY';
  }
}

function getActivityTitle(
  activity: BabyActivity,
): string {
  switch (activity.type) {
    case 'feeding':
      return `${activity.feedingMethod} feeding`;

    case 'diaper':
      return `${activity.diaperType} diaper`;

    case 'sleep':
      return 'Sleep';

    case 'note':
      return 'Note';
  }
}

function formatTime(value: string): string {
  return new Date(value).toLocaleTimeString(
    undefined,
    {
      hour: 'numeric',
      minute: '2-digit',
    },
  );
}

function formatFullDate(value: string): string {
  return new Date(value).toLocaleDateString(
    undefined,
    {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    },
  );
}

function formatDuration(minutes: number): string {
  if (minutes < 1) {
    return 'Less than 1 min';
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
  date: {
    color: '#758078',
    fontSize: 15,
    marginTop: 10,
  },
  detailCard: {
    borderColor: '#E0E5DC',
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: '#FFFEFA',
    marginTop: 30,
    paddingHorizontal: 18,
  },
  detailRow: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 20,
  },
  detailLabel: {
    color: '#758078',
    fontSize: 14,
  },
  detailValue: {
    flexShrink: 1,
    color: '#304435',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: '#ECEFE8',
  },
  noteCard: {
    borderColor: '#DDE5D9',
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: '#EBF0E7',
    marginTop: 18,
    padding: 18,
  },
  noteLabel: {
    color: '#657A68',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
  },
  noteText: {
    color: '#304435',
    fontSize: 16,
    lineHeight: 24,
    marginTop: 9,
  },
footer: {
  gap: 12,
  marginTop: 'auto',
  paddingTop: 38,
},
  deleteButton: {
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: '#D9B8B4',
    borderRadius: 17,
    borderWidth: 1,
    backgroundColor: '#FFF8F7',
  },
  deleteButtonText: {
    color: '#9A403B',
    fontSize: 16,
    fontWeight: '700',
  },
editButton: {
  minHeight: 56,
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 17,
  backgroundColor: '#48684D',
},
editButtonText: {
  color: '#FFFFFF',
  fontSize: 16,
  fontWeight: '700',
},
  disabledButton: {
    opacity: 0.6,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.99 }],
  },
  missingText: {
    color: '#758078',
    fontSize: 16,
  },
});
