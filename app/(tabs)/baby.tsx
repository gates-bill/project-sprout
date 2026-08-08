import {
    useFocusEffect,
    useRouter,
} from 'expo-router';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
    BabyProfile,
    loadBabyProfile,
} from '../../lib/babyProfile';

export default function BabyScreen() {
  const router = useRouter();

  const [profile, setProfile] =
    useState<BabyProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadProfile = async () => {
        try {
          const savedProfile = await loadBabyProfile();

          if (isActive) {
            setProfile(savedProfile);
          }
        } finally {
          if (isActive) {
            setLoading(false);
          }
        }
      };

      loadProfile();

      return () => {
        isActive = false;
      };
    }, []),
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
      <View style={styles.content}>
        <Text style={styles.eyebrow}>
          BABY PROFILE
        </Text>

        <Text style={styles.title}>
          {profile?.name ?? 'Baby'}
        </Text>

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            {profile?.photoUri ? (
              <Image
                source={{ uri: profile.photoUri }}
                style={styles.avatarImage}
              />
            ) : (
              <Text style={styles.avatarText}>
                {profile?.name
                  .charAt(0)
                  .toUpperCase() ?? 'B'}
              </Text>
            )}
          </View>

          <Text style={styles.name}>
            {profile?.name ?? 'Baby'}
          </Text>

          {profile?.birthDate && (
            <>
                <Text style={styles.age}>
                {formatBabyAge(profile.birthDate)}
                </Text>

                <Text style={styles.birthDate}>
                Born{' '}
                {new Date(
                    profile.birthDate,
                ).toLocaleDateString(undefined, {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                })}
                </Text>
            </>
            )}
        </View>

        <Text style={styles.helperText}>
        Profile details stay on this device unless you choose to export your data.
        </Text>

        <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/edit-profile')}
            style={({ pressed }) => [
                styles.editButton,
                pressed && styles.editButtonPressed,
            ]}
            >
            <Text style={styles.editButtonText}>
                Edit profile
            </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function formatBabyAge(birthDate: string): string {
  const birth = new Date(birthDate);
  const today = new Date();

  let months =
    (today.getFullYear() - birth.getFullYear()) * 12 +
    today.getMonth() -
    birth.getMonth();

  if (today.getDate() < birth.getDate()) {
    months -= 1;
  }

  if (months < 1) {
    const millisecondsPerDay =
      1000 * 60 * 60 * 24;

    const days = Math.max(
      0,
      Math.floor(
        (today.getTime() - birth.getTime()) /
          millisecondsPerDay,
      ),
    );

    return `${days} ${days === 1 ? 'day' : 'days'} old`;
  }

  if (months < 24) {
    return `${months} ${
      months === 1 ? 'month' : 'months'
    } old`;
  }

  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  if (remainingMonths === 0) {
    return `${years} ${
      years === 1 ? 'year' : 'years'
    } old`;
  }

  return `${years} ${
    years === 1 ? 'year' : 'years'
  }, ${remainingMonths} ${
    remainingMonths === 1 ? 'month' : 'months'
  } old`;
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
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
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
    marginTop: 10,
  },
  profileCard: {
    alignItems: 'center',
    borderColor: '#E0E5DC',
    borderRadius: 24,
    borderWidth: 1,
    backgroundColor: '#FFFEFA',
    marginTop: 30,
    padding: 28,
  },
  avatar: {
    width: 112,
    height: 112,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 56,
    backgroundColor: '#DDE9D7',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    color: '#48684D',
    fontSize: 38,
    fontWeight: '700',
  },
  name: {
    color: '#304435',
    fontSize: 24,
    fontWeight: '700',
    marginTop: 17,
  },
  birthDate: {
    color: '#758078',
    fontSize: 15,
    marginTop: 6,
  },
  editButton: {
  minHeight: 56,
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 17,
  backgroundColor: '#48684D',
  marginTop: 20,
},
editButtonPressed: {
  opacity: 0.82,
  transform: [{ scale: 0.99 }],
},
editButtonText: {
  color: '#FFFFFF',
  fontSize: 16,
  fontWeight: '700',
},
age: {
  color: '#48684D',
  fontSize: 16,
  fontWeight: '700',
  marginTop: 8,
},
helperText: {
  color: '#7A847C',
  fontSize: 13,
  lineHeight: 19,
  textAlign: 'center',
  marginTop: 14,
  paddingHorizontal: 18,
},
});