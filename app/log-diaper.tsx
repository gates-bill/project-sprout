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
  DiaperType,
} from '../lib/activities';
import { loadBabyProfile } from '../lib/babyProfile';
import { loadMyCareCircle } from '../lib/careCircle';
import {
  syncActivityToCloud,
} from '../lib/cloudActivities';
import { loadCloudBabyForCircle } from '../lib/cloudBaby';
import { createId } from '../lib/id';

const diaperTypes: {
  type: DiaperType;
  icon: string;
}[] = [
  { type: 'Wet', icon: '💧' },
  { type: 'Dirty', icon: '●' },
  { type: 'Both', icon: '◉' },
  { type: 'Dry', icon: '○' },
];

export default function LogDiaperScreen() {
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);

  const [diaperType, setDiaperType] =
    useState<DiaperType | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [occurredAt, setOccurredAt] =
    useState(new Date());
  const canSave = diaperType !== null && !saving;

  const saveDiaper = async () => {
    if (!diaperType || saving) {
      return;
    }

    if (occurredAt.getTime() > Date.now()) {
      Alert.alert(
        'Check the time',
        'A diaper entry cannot be logged in the future.',
      );

      return;
    }

    setSaving(true);

    try {
      const profile = await loadBabyProfile();

      if (!profile) {
        Alert.alert(
          'Profile not found',
          'Please create a baby profile before logging a diaper.',
        );

        router.replace('/');
        return;
      }

const createdAt = new Date().toISOString();
const occurredAtIso = occurredAt.toISOString();

const diaperActivity: BabyActivity = {
  id: createId(),
  babyProfileId: profile.id,
  type: 'diaper',
  diaperType,
  note: note.trim() || null,
  occurredAt: occurredAtIso,
  createdAt,
};

await addActivity(diaperActivity);

try {
  const circle = await loadMyCareCircle();

  if (circle) {
    const cloudBaby =
      await loadCloudBabyForCircle(
        circle.id,
      );

    if (cloudBaby) {
      await syncActivityToCloud(
        diaperActivity,
        cloudBaby.id,
      );
    }
  }
} catch (syncError) {
  console.warn(
    'Diaper saved locally but could not sync:',
    syncError,
  );

  Alert.alert(
    'Saved on this device',
    'The diaper entry was saved, but Our Baby Log could not sync it with your Care Circle yet.',
  );
}

router.back();
    } catch (error) {
      console.error('Unable to save diaper:', error);

      Alert.alert(
        'Unable to save diaper',
        'The diaper entry could not be saved. Please try again.',
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
          <Text style={styles.title}>Log a diaper</Text>

          <Text style={styles.description}>
            Choose the description that feels most useful.
          </Text>

          <View style={styles.section}>
            <Text style={styles.label}>Diaper type</Text>

            <View style={styles.typeGrid}>
              {diaperTypes.map((option) => {
                const selected =
                  diaperType === option.type;

                return (
                  <Pressable
                    accessibilityRole="button"
                    key={option.type}
                    onPress={() =>
                      setDiaperType(option.type)
                    }
                    style={({ pressed }) => [
                      styles.typeButton,
                      selected &&
                        styles.typeButtonSelected,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.typeIcon,
                        selected &&
                          styles.typeTextSelected,
                      ]}
                    >
                      {option.icon}
                    </Text>

                    <Text
                      style={[
                        styles.typeText,
                        selected &&
                          styles.typeTextSelected,
                      ]}
                    >
                      {option.type}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>
              Note
              <Text style={styles.optional}>
                {' '}· Optional
              </Text>
            </Text>

            <TextInput
              maxLength={250}
              multiline
              onChangeText={setNote}
              placeholder="Anything you’d like to remember"
              placeholderTextColor="#9AA29B"
              style={styles.noteInput}
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
              onPress={saveDiaper}
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
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  Save diaper
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
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  typeButton: {
    width: '48%',
    minHeight: 86,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: '#DDE3DA',
    borderRadius: 17,
    borderWidth: 1,
    backgroundColor: '#FFFEFA',
  },
  typeButtonSelected: {
    borderColor: '#48684D',
    backgroundColor: '#48684D',
  },
  typeIcon: {
    color: '#536858',
    fontSize: 22,
  },
  typeText: {
    color: '#536858',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 7,
  },
  typeTextSelected: {
    color: '#FFFFFF',
  },
  noteInput: {
    minHeight: 110,
    color: '#263B2B',
    fontSize: 17,
    borderColor: '#DDE3DA',
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: '#FFFEFA',
    paddingHorizontal: 17,
    paddingTop: 16,
  },
  timeCard: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderColor: '#E0E5DC',
    borderRadius: 18,
    borderWidth: 1,
    backgroundColor: '#EBF0E7',
    marginTop: 28,
    paddingHorizontal: 18,
  },
  timeLabel: {
    color: '#718075',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  timeValue: {
    color: '#304435',
    fontSize: 17,
    fontWeight: '700',
    marginTop: 3,
  },
  timeIcon: {
    color: '#52705A',
    fontSize: 24,
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
