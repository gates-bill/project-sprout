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
} from '../lib/activities';
import {
    BabyProfile,
    loadBabyProfile,
} from '../lib/babyProfile';

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

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadHomeData = async () => {
        try {
          const [
            savedProfile,
            savedActivities,
          ] = await Promise.all([
            loadBabyProfile(),
            loadActivities(),
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

        {activities.length === 0 && (
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
              <View
                key={activity.id}
                style={styles.timelineItem}
              >
                <View style={styles.timelineIcon}>
                  <Text style={styles.timelineEmoji}>
                    🍼
                  </Text>
                </View>

                <View style={styles.timelineContent}>
                  <Text style={styles.timelineTitle}>
                    {activity.feedingMethod} feeding
                  </Text>

                  <Text style={styles.timelineDetails}>
                    {activity.amountOz
                      ? `${activity.amountOz} oz · `
                      : ''}
                    {new Date(
                      activity.occurredAt,
                    ).toLocaleTimeString(
                      undefined,
                      {
                        hour: 'numeric',
                        minute: '2-digit',
                      },
                    )}
                  </Text>

                  {activity.note && (
                    <Text style={styles.timelineNote}>
                      {activity.note}
                    </Text>
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
});