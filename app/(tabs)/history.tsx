import {
  useFocusEffect,
  useRouter,
} from 'expo-router';
import {
  useCallback,
  useState,
} from 'react';
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
  loadActivities,
} from '../../lib/activities';
import { loadBabyProfile } from '../../lib/babyProfile';

type ActivityGroup = {
  dateKey: string;
  label: string;
  activities: BabyActivity[];
};

export default function HistoryScreen() {
  const router = useRouter();

  const [groups, setGroups] =
    useState<ActivityGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadHistory = async () => {
        setLoading(true);

        try {
          const [
            profile,
            savedActivities,
          ] = await Promise.all([
            loadBabyProfile(),
            loadActivities(),
          ]);

          if (!profile) {
            router.replace('/');
            return;
          }

          const profileActivities =
            savedActivities.filter(
              (activity) =>
                activity.babyProfileId === profile.id,
            );

          const activityGroups =
            groupActivitiesByDate(
              profileActivities,
            );

          if (isActive) {
            setGroups(activityGroups);
          }
        } catch (error) {
          console.error(
            'Unable to load history:',
            error,
          );

          Alert.alert(
            'Unable to load history',
            'Please go back and try again.',
          );
        } finally {
          if (isActive) {
            setLoading(false);
          }
        }
      };

      loadHistory();

      return () => {
        isActive = false;
      };
    }, [router]),
  );

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

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >

        <Text style={styles.eyebrow}>
          ACTIVITY HISTORY
        </Text>

        <Text style={styles.title}>
          Previous days
        </Text>

        <Text style={styles.description}>
          Review the moments you’ve recorded without
          scores, streaks, or pressure.
        </Text>

        {groups.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🌱</Text>

            <Text style={styles.emptyTitle}>
              No history yet
            </Text>

            <Text style={styles.emptyText}>
              Feedings, diapers, sleep sessions, and
              notes will appear here.
            </Text>
          </View>
        ) : (
          <View style={styles.groups}>
            {groups.map((group) => (
              <View key={group.dateKey}>
                <Text style={styles.dateHeading}>
                  {group.label}
                </Text>

                <View style={styles.activityList}>
                  {group.activities.map(
                    (activity) => (
                      <Pressable
                        accessibilityRole="button"
                        key={activity.id}
                        onPress={() =>
                          router.push({
                            pathname:
                              '/activity/[id]',
                            params: {
                              id: activity.id,
                            },
                          })
                        }
                        style={({ pressed }) => [
                          styles.activityCard,
                          pressed &&
                            styles.activityCardPressed,
                        ]}
                      >
                        <View
                          style={
                            styles.activityIcon
                          }
                        >
                          <Text
                            style={
                              styles.activityEmoji
                            }
                          >
                            {getActivityIcon(
                              activity,
                            )}
                          </Text>
                        </View>

                        <View
                          style={
                            styles.activityContent
                          }
                        >
                          <Text
                            style={
                              styles.activityTitle
                            }
                          >
                            {getActivityTitle(
                              activity,
                            )}
                          </Text>

                          <Text
                            style={
                              styles.activityDetails
                            }
                          >
                            {getActivityDetails(
                              activity,
                            )}
                          </Text>

                          {activity.note && (
                            <Text
                              numberOfLines={2}
                              style={
                                styles.activityNote
                              }
                            >
                              {activity.note}
                            </Text>
                          )}
                        </View>

                        <Text
                          style={
                            styles.activityChevron
                          }
                        >
                          ›
                        </Text>
                      </Pressable>
                    ),
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function groupActivitiesByDate(
  activities: BabyActivity[],
): ActivityGroup[] {
  const groupedActivities = new Map<
    string,
    BabyActivity[]
  >();

  activities.forEach((activity) => {
    const activityDate = getActivityDate(activity);
    const dateKey = createDateKey(activityDate);

    const existingGroup =
      groupedActivities.get(dateKey) ?? [];

    existingGroup.push(activity);
    groupedActivities.set(
      dateKey,
      existingGroup,
    );
  });

  return Array.from(
    groupedActivities.entries(),
  )
    .sort(
      ([firstDate], [secondDate]) =>
        secondDate.localeCompare(firstDate),
    )
    .map(([dateKey, groupedEntries]) => ({
      dateKey,
      label: formatDateHeading(
        getActivityDate(groupedEntries[0]),
      ),
      activities: groupedEntries,
    }));
}

function getActivityDate(
  activity: BabyActivity,
): Date {
  if (activity.type === 'sleep') {
    return new Date(activity.startedAt);
  }

  return new Date(activity.occurredAt);
}

function createDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1,
  ).padStart(2, '0');
  const day = String(
    date.getDate(),
  ).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function formatDateHeading(date: Date): string {
  const today = new Date();
  const yesterday = new Date();

  yesterday.setDate(today.getDate() - 1);

  if (
    date.toDateString() ===
    today.toDateString()
  ) {
    return 'Today';
  }

  if (
    date.toDateString() ===
    yesterday.toDateString()
  ) {
    return 'Yesterday';
  }

  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year:
      date.getFullYear() !==
      today.getFullYear()
        ? 'numeric'
        : undefined,
  });
}

function getActivityIcon(
  activity: BabyActivity,
): string {
  switch (activity.type) {
    case 'feeding':
      return '🍼';

    case 'diaper':
      return '💧';

    case 'sleep':
      return '☾';

    case 'note':
      return '＋';
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

function getActivityDetails(
  activity: BabyActivity,
): string {
  if (activity.type === 'sleep') {
    return (
      `${formatTime(activity.startedAt)}–` +
      `${formatTime(activity.endedAt)} · ` +
      formatDuration(activity.durationMinutes)
    );
  }

  const time = formatTime(activity.occurredAt);

  if (
    activity.type === 'feeding' &&
    activity.amountOz !== null
  ) {
    return `${activity.amountOz} oz · ${time}`;
  }

  return time;
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
    paddingBottom: 34,
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
  emptyCard: {
    alignItems: 'center',
    borderColor: '#E0E5DC',
    borderRadius: 22,
    borderWidth: 1,
    backgroundColor: '#FFFEFA',
    marginTop: 32,
    paddingHorizontal: 24,
    paddingVertical: 34,
  },
  emptyIcon: {
    fontSize: 32,
  },
  emptyTitle: {
    color: '#304435',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 11,
  },
  emptyText: {
    color: '#758078',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 8,
  },
  groups: {
    gap: 30,
    marginTop: 30,
  },
  dateHeading: {
    color: '#536858',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 11,
  },
  activityList: {
    gap: 10,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#E0E5DC',
    borderRadius: 18,
    borderWidth: 1,
    backgroundColor: '#FFFEFA',
    padding: 15,
  },
  activityCardPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.99 }],
  },
  activityIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    backgroundColor: '#E7EFE3',
    marginRight: 13,
  },
  activityEmoji: {
    color: '#48684D',
    fontSize: 20,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    color: '#304435',
    fontSize: 16,
    fontWeight: '700',
  },
  activityDetails: {
    color: '#758078',
    fontSize: 13,
    marginTop: 4,
  },
  activityNote: {
    color: '#5E6C62',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 7,
  },
  activityChevron: {
    color: '#8B938C',
    fontSize: 24,
    marginLeft: 8,
  },
});