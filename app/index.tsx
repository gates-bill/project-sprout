import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function WelcomeScreen() {
  const showComingSoon = () => {
    Alert.alert(
      'Coming next',
      'Next, we’ll create the baby profile setup flow.',
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.brandRow}>
          <View style={styles.brandMark}>
            <Text style={styles.brandEmoji}>🌱</Text>
          </View>

          <Text style={styles.brandName}>PROJECT SPROUT</Text>
        </View>

        <View style={styles.hero}>
          <Text style={styles.eyebrow}>A calmer baby tracker</Text>

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
            onPress={showComingSoon}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.primaryButtonPressed,
            ]}
          >
            <Text style={styles.primaryButtonText}>Create baby profile</Text>
          </Pressable>

          <Text style={styles.placeholderNote}>
            Project Sprout is our temporary working name.
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
  brandEmoji: {
    fontSize: 20,
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
});