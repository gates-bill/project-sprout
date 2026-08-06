import { useRouter } from 'expo-router';
import { useState } from 'react';
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

import { addActivity } from '../lib/activities';
import { loadBabyProfile } from '../lib/babyProfile';

export default function LogNoteScreen() {
  const router = useRouter();

  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const canSave = note.trim().length > 0 && !saving;

  const saveNote = async () => {
    if (!canSave) {
      return;
    }

    setSaving(true);

    try {
      const profile = await loadBabyProfile();

      if (!profile) {
        Alert.alert(
          'Profile not found',
          'Please create a baby profile before adding a note.',
        );

        router.replace('/');
        return;
      }

      const now = new Date().toISOString();

      await addActivity({
        id: Date.now().toString(),
        babyProfileId: profile.id,
        type: 'note',
        note: note.trim(),
        occurredAt: now,
        createdAt: now,
      });

      router.back();
    } catch (error) {
      console.error('Unable to save note:', error);

      Alert.alert(
        'Unable to save note',
        'The note could not be saved. Please try again.',
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

          <Text style={styles.title}>
            Add a note
          </Text>

          <Text style={styles.description}>
            Capture anything useful that does not fit into feeding,
            diaper, or sleep.
          </Text>

          <View style={styles.promptCard}>
            <Text style={styles.promptTitle}>
              Notes can be anything.
            </Text>

            <Text style={styles.promptText}>
              Medicine, symptoms, mood, milestones, appointments,
              questions, or something you simply want to remember.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>What happened?</Text>

            <TextInput
              autoFocus
              maxLength={500}
              multiline
              onChangeText={setNote}
              placeholder="Write a note"
              placeholderTextColor="#9AA29B"
              style={styles.noteInput}
              textAlignVertical="top"
              value={note}
            />

            <Text style={styles.characterCount}>
              {note.length}/500
            </Text>
          </View>

          <View style={styles.timeCard}>
            <View>
              <Text style={styles.timeLabel}>NOTE TIME</Text>
              <Text style={styles.timeValue}>Now</Text>
            </View>

            <Text style={styles.timeIcon}>◷</Text>
          </View>

          <View style={styles.footer}>
            <Pressable
              accessibilityRole="button"
              disabled={!canSave}
              onPress={saveNote}
              style={({ pressed }) => [
                styles.primaryButton,
                !canSave && styles.primaryButtonDisabled,
                pressed && canSave && styles.pressed,
              ]}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  Save note
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
  promptCard: {
    borderColor: '#DDE5D9',
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: '#EBF0E7',
    marginTop: 28,
    padding: 18,
  },
  promptTitle: {
    color: '#304435',
    fontSize: 16,
    fontWeight: '700',
  },
  promptText: {
    color: '#718075',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 6,
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
  noteInput: {
    minHeight: 170,
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
  timeCard: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderColor: '#E0E5DC',
    borderRadius: 18,
    borderWidth: 1,
    backgroundColor: '#FFFEFA',
    marginTop: 24,
    paddingHorizontal: 18,
  },
  timeLabel: {
    color: '#718075',
    fontSize: 11,
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