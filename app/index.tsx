import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { loadAccessibleBabyProfile } from '../lib/babyAccess';
import { loadBabyProfile } from '../lib/babyProfile';

const STARTUP_TIMEOUT_MS = 8_000;

async function withStartupTimeout<T>(operation: Promise<T>): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error('Startup hydration timed out.'));
    }, STARTUP_TIMEOUT_MS);
  });

  try {
    return await Promise.race([operation, timeout]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

export default function WelcomeScreen() {
  const router = useRouter();

  const [checkingProfile, setCheckingProfile] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const checkForSavedProfile = async () => {
      try {
        const access = await withStartupTimeout(
          loadAccessibleBabyProfile(),
        );

        if (!isMounted) {
          return;
        }

        if (access.status === 'ready') {
          router.replace('/home');
          return;
        }

        if (access.status === 'signed-out') {
          setCheckingProfile(false);
          return;
        }

        router.replace('/settings');
      } catch (error) {
        console.warn(
          'Unable to finish online startup hydration; using local state:',
          error,
        );

        try {
          const localProfile = await withStartupTimeout(
            loadBabyProfile(),
          );

          if (!isMounted) {
            return;
          }

          if (localProfile) {
            router.replace('/home');
            return;
          }
        } catch (localError) {
          console.warn(
            'Unable to read local startup state:',
            localError,
          );
        }

        if (isMounted) {
          setCheckingProfile(false);
        }
      }
    };

    void checkForSavedProfile();

    return () => {
      isMounted = false;
    };
  }, [router]);

  if (checkingProfile) {
    return (
      <SafeAreaView style={styles.loadingSafeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#48684D" size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.brandRow}>
          <View style={styles.brandMark}>
            <Image
              accessibilityIgnoresInvertColors
              source={require('../assets/images/our-baby-log-icon.png')}
              style={styles.brandIcon}
            />
          </View>

          <Text style={styles.brandName}>OUR BABY LOG</Text>
        </View>

        <View style={styles.hero}>
          <Text style={styles.eyebrow}>Baby care, together.</Text>

          <Text style={styles.title}>
            Baby care, without the pressure.
          </Text>

          <Text style={styles.description}>
            Keep feeding, sleep, diaper, and care information in one gentle,
            private place—without turning parenthood into a numbers game.
          </Text>
        </View>

        <View style={styles.featureCard}>
          <Feature
            title="Track what matters"
            description="Quickly record the moments that are useful to your family."
          />

          <View style={styles.divider} />

          <Feature
            title="Notice gentle patterns"
            description="See helpful context without scores, streaks, or judgment."
          />

          <View style={styles.divider} />

          <Feature
            title="Designed for privacy"
            description="Your baby’s information should belong to your family."
          />
        </View>

        <View style={styles.footer}>
<Pressable
  accessibilityRole="button"
  onPress={() => router.push('/auth')}
  style={({ pressed }) => [
    styles.signInButton,
    pressed && styles.primaryButtonPressed,
  ]}
>
  <Text style={styles.signInButtonText}>
    Sign in to shared care
  </Text>
</Pressable>

          <Text style={styles.placeholderNote}>
            Private, shared care for your family.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

type FeatureProps = {
  title: string;
  description: string;
};

function Feature({ title, description }: FeatureProps) {
  return (
    <View style={styles.feature}>
      <View style={styles.featureDot} />

      <View style={styles.featureText}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F6F7F2',
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 20,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandMark: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DDE9D7',
  },
  brandIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  brandName: {
    color: '#536858',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.8,
  },
  hero: {
    marginTop: 50,
  },
  eyebrow: {
    color: '#657A68',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  title: {
    color: '#263B2B',
    fontSize: 42,
    fontWeight: '700',
    lineHeight: 48,
    letterSpacing: -1.1,
  },
  description: {
    color: '#667169',
    fontSize: 17,
    lineHeight: 26,
    marginTop: 20,
  },
  featureCard: {
    backgroundColor: '#FFFEFA',
    borderColor: '#E4E8DF',
    borderRadius: 24,
    borderWidth: 1,
    marginTop: 34,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  feature: {
    flexDirection: 'row',
    paddingVertical: 17,
  },
  featureDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#7C9A7D',
    marginTop: 7,
    marginRight: 14,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    color: '#304435',
    fontSize: 16,
    fontWeight: '700',
  },
  featureDescription: {
    color: '#758078',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#ECEFE8',
    marginLeft: 23,
  },
  footer: {
    marginTop: 'auto',
    paddingTop: 24,
  },
  primaryButton: {
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#48684D',
    borderRadius: 18,
    paddingHorizontal: 24,
  },
  primaryButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  placeholderNote: {
    color: '#8B938C',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 14,
  },

  loadingSafeArea: {
    flex: 1,
    backgroundColor: '#F6F7F2',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInButton: {
  minHeight: 54,
  alignItems: 'center',
  justifyContent: 'center',
  borderColor: '#C9D6C5',
  borderRadius: 18,
  borderWidth: 1,
  backgroundColor: '#FFFEFA',
  marginTop: 10,
},
signInButtonText: {
  color: '#48684D',
  fontSize: 16,
  fontWeight: '700',
},
});
