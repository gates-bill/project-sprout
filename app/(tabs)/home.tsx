import {
  useFocusEffect,
  useRouter,
} from 'expo-router';
import {
  useCallback,
  useEffect,
  useState
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
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
import {
  BabyProfile,
  loadBabyProfile,
} from '../../lib/babyProfile';
import {
  ActiveSleepSession,
  loadActiveSleepSession,
} from '../../lib/sleepSession';
const quickActions = [
  { label: 'Feeding', icon: '🍼' },
  { label: 'Diaper', icon: '◌' },
  { label: 'Sleep', icon: '☾' },
  { label: 'Note', icon: '＋' },
];

export default function HomeScreen() {
  const router = useRouter();

  const [profile, setProfile] =
    useState<BabyProfile | null>(null);
  const [activities, setActivities] =
    useState<BabyActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSleep, setActiveSleep] =
    useState<ActiveSleepSession | null>(null);
  const [nowMs, setNowMs] = useState(Date.now());
  const todaySummary = getTodaySummary(activities);

  useEffect(() => {
    if (!activeSleep) {
      return;
    }

    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 30000);

    return () => {
      clearInterval(interval);
    };
  }, [activeSleep]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadHomeData = async () => {
        try {
          const [
            savedProfile,
            savedActivities,
            savedActiveSleep,
          ] = await Promise.all([
            loadBabyProfile(),
            loadActivities(),
            loadActiveSleepSession(),
          ]);

          if (!savedProfile) {
            router.replace('/');
            return;
          }

          const today = new Date();

          const todaysActivities =
            savedActivities.filter((activity) => {
              const activityDate =
                new Date(activity.occurredAt);

              return (
                activity.babyProfileId ===
                  savedProfile.id &&
                activityDate.toDateString() ===
                  today.toDateString()
              );
            });

          if (isActive) {
            setProfile(savedProfile);
            setActivities(todaysActivities);

            setActiveSleep(
              savedActiveSleep?.babyProfileId === savedProfile.id
                ? savedActiveSleep
                : null,
            );
          }
        } catch (error) {
            console.error('Unable to load home data:', error);

            Alert.alert(
                'Unable to load today',
                'Please close the app and try again.',
            );
            } finally {
          if (isActive) {
            setLoading(false);
          }
        }
      };

      loadHomeData();

      return () => {
        isActive = false;
      };
    }, [router]),
  );

const handleQuickAction = (label: string) => {
  if (label === 'Feeding') {
    router.push('/log-feeding');
    return;
  }

  if (label === 'Diaper') {
    router.push('/log-diaper');
    return;
  }

  if (label === 'Sleep') {
    router.push('/log-sleep');
    return;
  }

  if (label === 'Note') {
    router.push('/log-note');
    return;
  }

  Alert.alert(
    label,
    `${label} tracking is coming next.`,
  );
};

  if (loading || !profile) {
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
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>TODAY WITH</Text>
            <Text style={styles.babyName}>
              {profile.name}
            </Text>
          </View>

          <View style={styles.avatar}>
            {profile.photoUri ? (
              <Image
                source={{ uri: profile.photoUri }}
                style={styles.avatarImage}
              />
            ) : (
              <Text style={styles.avatarText}>
                {profile.name
                  .charAt(0)
                  .toUpperCase()}
              </Text>
            )}
          </View>
        </View>

        {activeSleep && (
        <Pressable
          onPress={() => router.push('/log-sleep')}
          style={({ pressed }) => [
            styles.activeSleepCard,
            pressed && styles.actionButtonPressed,
          ]}
        >
          <View style={styles.activeSleepIcon}>
            <Text style={styles.activeSleepEmoji}>☾</Text>
          </View>

          <View style={styles.activeSleepContent}>
            <Text style={styles.activeSleepLabel}>
              SLEEP IN PROGRESS
            </Text>

            <Text style={styles.activeSleepTime}>
              {formatDuration(
                Math.max(
                  0,
                  Math.floor(
                    (nowMs -
                      new Date(activeSleep.startedAt).getTime()) /
                      60000,
                  ),
                ),
              )}
            </Text>

            <Text style={styles.activeSleepStarted}>
              Started at {formatTime(activeSleep.startedAt)}
            </Text>
          </View>

          <Text style={styles.activeSleepAction}>
            End ›
          </Text>
        </Pressable>
      )}

        {activities.length === 0 && !activeSleep && (
          <View style={styles.emptyCard}>
            <Text style={styles.cardIcon}>🌱</Text>

            <Text style={styles.cardTitle}>
              A fresh day together
            </Text>

            <Text style={styles.cardDescription}>
              When you’re ready, record the moments
              that are helpful to remember. There’s
              nothing you need to complete.
            </Text>
          </View>
        )}

          <View style={styles.summarySection}>
            <Text style={styles.summaryHeading}>
              Today at a glance
            </Text>

            <View style={styles.summaryGrid}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryIcon}>🍼</Text>
                <Text style={styles.summaryValue}>
                  {todaySummary.feedings}
                </Text>
                <Text style={styles.summaryLabel}>
                  Feedings
                </Text>
              </View>

              <View style={styles.summaryCard}>
                <Text style={styles.summaryIcon}>◌</Text>
                <Text style={styles.summaryValue}>
                  {todaySummary.diapers}
                </Text>
                <Text style={styles.summaryLabel}>
                  Diapers
                </Text>
              </View>

              <View style={styles.summaryCard}>
                <Text style={styles.summaryIcon}>☾</Text>
                <Text style={styles.summaryValue}>
                  {formatSummarySleep(
                    todaySummary.sleepMinutes,
                  )}
                </Text>
                <Text style={styles.summaryLabel}>
                  Sleep
                </Text>
              </View>

              <View style={styles.summaryCard}>
                <Text style={styles.summaryIcon}>✎</Text>
                <Text style={styles.summaryValue}>
                  {todaySummary.notes}
                </Text>
                <Text style={styles.summaryLabel}>
                  Notes
                </Text>
              </View>
            </View>
          </View>

        <Text style={styles.sectionTitle}>
          Quick add
        </Text>

        <View style={styles.actionGrid}>
          {quickActions.map((action) => (
            <Pressable
              key={action.label}
              onPress={() =>
                handleQuickAction(action.label)
              }
              style={({ pressed }) => [
                styles.actionButton,
                pressed &&
                  styles.actionButtonPressed,
              ]}
            >
              <Text style={styles.actionIcon}>
                {action.icon}
              </Text>

              <Text style={styles.actionLabel}>
                {action.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.timelineHeader}>
          <Text style={styles.sectionTitle}>
            Today
          </Text>

          <Text style={styles.timelineDate}>
            {new Date().toLocaleDateString(
              undefined,
              {
                month: 'short',
                day: 'numeric',
              },
            )}
          </Text>
        </View>

        {activities.length === 0 ? (
          <View style={styles.timelineEmpty}>
            <Text style={styles.timelineEmptyText}>
              Today’s moments will appear here.
            </Text>
          </View>
        ) : (
          <View style={styles.timeline}>
            {activities.map((activity) => (
              <Pressable
                accessibilityRole="button"
                key={activity.id}
                onPress={() =>
                  router.push({
                    pathname: '/activity/[id]',
                    params: {
                      id: activity.id,
                    },
                  })
                }
                style={({ pressed }) => [
                  styles.timelineItem,
                  pressed && styles.timelineItemPressed,
                ]}
              >
                <View style={styles.timelineIcon}>
                    <Text style={styles.timelineEmoji}>
                      {getActivityIcon(activity)}
                    </Text>
                </View>

                <View style={styles.timelineContent}>
                  <Text style={styles.timelineTitle}>
                    {getActivityTitle(activity)}
                  </Text>

                  <Text style={styles.timelineDetails}>
                    {getActivityDetails(activity)}
                  </Text>

                  {activity.note && (
                    <Text style={styles.timelineNote}>
                      {activity.note}
                    </Text>
                  )}
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function getActivityIcon(activity: BabyActivity): string {
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

function getActivityTitle(activity: BabyActivity): string {
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

function getActivityDetails(activity: BabyActivity): string {
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
  return new Date(value).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
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

function getTodaySummary(
  activities: BabyActivity[],
) {
  const now = new Date();

  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();

  const startOfTomorrow = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
  ).getTime();

  let feedings = 0;
  let diapers = 0;
  let sleepMinutes = 0;
  let notes = 0;

  activities.forEach((activity) => {
    const occurredAt =
      new Date(activity.occurredAt).getTime();

    if (
      occurredAt < startOfToday ||
      occurredAt >= startOfTomorrow
    ) {
      return;
    }

    switch (activity.type) {
      case 'feeding':
        feedings += 1;
        break;

      case 'diaper':
        diapers += 1;
        break;

      case 'sleep':
        sleepMinutes +=
          activity.durationMinutes;
        break;

      case 'note':
        notes += 1;
        break;
    }
  });

  return {
    feedings,
    diapers,
    sleepMinutes,
    notes,
  };
}

function formatSummarySleep(
  minutes: number,
): string {
  if (minutes === 0) {
    return '—';
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) {
    return `${remainingMinutes}m`;
  }

  if (remainingMinutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainingMinutes}m`;
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
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eyebrow: {
    color: '#718075',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  babyName: {
    color: '#263B2B',
    fontSize: 32,
    fontWeight: '700',
    marginTop: 3,
  },
  avatar: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 27,
    backgroundColor: '#DDE9D7',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    color: '#48684D',
    fontSize: 21,
    fontWeight: '700',
  },
  emptyCard: {
    alignItems: 'center',
    borderColor: '#E4E8DF',
    borderRadius: 24,
    borderWidth: 1,
    backgroundColor: '#FFFEFA',
    marginTop: 28,
    paddingHorizontal: 24,
    paddingVertical: 25,
  },
  cardIcon: {
    fontSize: 31,
  },
  cardTitle: {
    color: '#304435',
    fontSize: 19,
    fontWeight: '700',
    marginTop: 10,
  },
  cardDescription: {
    color: '#758078',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 8,
  },
  sectionTitle: {
    color: '#344A39',
    fontSize: 17,
    fontWeight: '700',
    marginTop: 27,
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 13,
  },
  actionButton: {
    flex: 1,
    minHeight: 86,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: '#E0E5DC',
    borderRadius: 17,
    borderWidth: 1,
    backgroundColor: '#FFFEFA',
  },
  actionButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  actionIcon: {
    color: '#48684D',
    fontSize: 23,
  },
  actionLabel: {
    color: '#536858',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 7,
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  timelineDate: {
    color: '#8B938C',
    fontSize: 13,
  },
  timelineEmpty: {
    alignItems: 'center',
    borderColor: '#DDE3DA',
    borderRadius: 18,
    borderStyle: 'dashed',
    borderWidth: 1,
    marginTop: 13,
    paddingVertical: 24,
  },
  timelineEmptyText: {
    color: '#8B938C',
    fontSize: 14,
  },
  timeline: {
    gap: 12,
    marginTop: 13,
  },
  timelineItem: {
    flexDirection: 'row',
    borderColor: '#E0E5DC',
    borderRadius: 18,
    borderWidth: 1,
    backgroundColor: '#FFFEFA',
    padding: 16,
  },
  timelineItemPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.99 }],
  },
  timelineIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    backgroundColor: '#E7EFE3',
    marginRight: 13,
  },
  timelineEmoji: {
    fontSize: 20,
  },
  timelineContent: {
    flex: 1,
  },
  timelineTitle: {
    color: '#304435',
    fontSize: 16,
    fontWeight: '700',
  },
  timelineDetails: {
    color: '#758078',
    fontSize: 13,
    marginTop: 4,
  },
  timelineNote: {
    color: '#5E6C62',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
activeSleepCard: {
  minHeight: 104,
  flexDirection: 'row',
  alignItems: 'center',
  borderColor: '#CDD9C9',
  borderRadius: 20,
  borderWidth: 1,
  backgroundColor: '#E7EFE3',
  marginTop: 24,
  padding: 16,
},
activeSleepIcon: {
  width: 48,
  height: 48,
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 24,
  backgroundColor: '#D5E3D0',
  marginRight: 14,
},
activeSleepEmoji: {
  color: '#48684D',
  fontSize: 26,
},
activeSleepContent: {
  flex: 1,
},
activeSleepLabel: {
  color: '#657A68',
  fontSize: 10,
  fontWeight: '700',
  letterSpacing: 1.1,
},
activeSleepTime: {
  color: '#304435',
  fontSize: 21,
  fontWeight: '700',
  marginTop: 3,
},
activeSleepStarted: {
  color: '#718075',
  fontSize: 12,
  marginTop: 3,
},
activeSleepAction: {
  color: '#48684D',
  fontSize: 14,
  fontWeight: '700',
},
summarySection: {
  marginTop: 24,
},
summaryHeading: {
  color: '#344A39',
  fontSize: 16,
  fontWeight: '700',
  marginBottom: 12,
},
summaryGrid: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 10,
},
summaryCard: {
  width: '48%',
  minHeight: 104,
  justifyContent: 'center',
  borderColor: '#E0E6DD',
  borderRadius: 18,
  borderWidth: 1,
  backgroundColor: '#FFFEFA',
  paddingHorizontal: 16,
  paddingVertical: 14,
},
summaryIcon: {
  fontSize: 18,
  marginBottom: 6,
},
summaryValue: {
  color: '#304435',
  fontSize: 22,
  fontWeight: '700',
},
summaryLabel: {
  color: '#768078',
  fontSize: 13,
  marginTop: 3,
},
});