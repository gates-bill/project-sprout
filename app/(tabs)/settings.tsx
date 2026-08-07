import {
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <Text style={styles.eyebrow}>
          PROJECT SPROUT
        </Text>

        <Text style={styles.title}>
          Settings
        </Text>

        <Text style={styles.description}>
          Manage your data, privacy, and app preferences.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Stored on this device
          </Text>

          <Text style={styles.cardText}>
            Project Sprout currently stores the baby
            profile and activity records locally on
            this iPhone.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            More controls are coming
          </Text>

          <Text style={styles.cardText}>
            Export, backup, data deletion, appearance,
            and privacy options will live here.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
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
  description: {
    color: '#6A756D',
    fontSize: 16,
    lineHeight: 24,
    marginTop: 14,
    marginBottom: 12,
  },
  card: {
    borderColor: '#E0E5DC',
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: '#FFFEFA',
    marginTop: 16,
    padding: 19,
  },
  cardTitle: {
    color: '#304435',
    fontSize: 16,
    fontWeight: '700',
  },
  cardText: {
    color: '#718075',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 7,
  },
});