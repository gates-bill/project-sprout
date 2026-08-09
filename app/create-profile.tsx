import DateTimePicker, {
    DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
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

import {
  loadBabyProfile,
  saveBabyProfile,
} from '../lib/babyProfile';
import { loadMyCareCircle } from '../lib/careCircle';
import { createId } from '../lib/id';
import {
  queueProfileUpdate,
  syncPendingProfileUpdate,
} from '../lib/profileMutation';
import {
  bindCacheToSharedAccount,
  markCacheLocalOnly,
} from '../lib/localAccess';
import { getCurrentSession } from '../lib/auth';
import {
  formatDateOnly,
  validateBirthDate,
} from '../lib/dateOnly';

export default function CreateProfileScreen() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const formattedBirthDate = useMemo(() => {
    if (!birthDate) {
      return 'Select date of birth';
    }

    return birthDate.toLocaleDateString(undefined, {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }, [birthDate]);

  const canSave =
    name.trim().length > 0 &&
    birthDate !== null &&
    !saving;

  const pickPhoto = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Photo permission needed',
          'Please allow photo access to choose a profile picture.',
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setPhotoUri(result.assets[0].uri);
      }
    } catch {
      Alert.alert(
        'Unable to select photo',
        'Please try choosing the photo again.',
      );
    }
  };

  const handleDateChange = (
    _event: DateTimePickerEvent,
    selectedDate?: Date,
  ) => {
    if (Platform.OS !== 'ios') {
      setShowDatePicker(false);
    }

    if (selectedDate) {
      setBirthDate(selectedDate);
    }
  };

  const createProfile = async () => {
    if (!canSave || !birthDate) {
      return;
    }

    setSaving(true);

    const birthDateError = validateBirthDate(birthDate);
    if (birthDateError) {
      Alert.alert('Check the birth date', birthDateError);
      setSaving(false);
      return;
    }

    try {
      const profile = {
        id: createId(),
        name: name.trim(),
        birthDate: formatDateOnly(birthDate),
        photoUri,
        createdAt: new Date().toISOString(),
      };

      await saveBabyProfile(profile);
      const persistedProfile = await loadBabyProfile();

      if (!persistedProfile) {
        throw new Error('The saved baby profile is unavailable.');
      }

      try {
        const { data: sessionData } =
          await getCurrentSession();
        const circle = await loadMyCareCircle();

        if (circle && sessionData.session) {
          await queueProfileUpdate(
            persistedProfile,
            Boolean(persistedProfile.photoUri),
          );
          await bindCacheToSharedAccount({
            userId: sessionData.session.user.id,
            careCircleId: circle.id,
            careCircleName: circle.name,
            role: circle.role,
          });

          await syncPendingProfileUpdate(circle.id);
        } else {
          await markCacheLocalOnly();
        }
      } catch (syncError) {
        console.warn(
          'Unable to connect the new baby profile yet:',
          syncError,
        );
      }

      router.replace('/home');
    } catch {
      Alert.alert(
        'Unable to save profile',
        'Your baby profile could not be saved. Please try again.',
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

          <Text style={styles.eyebrow}>LET’S GET STARTED</Text>

          <Text style={styles.title}>Tell us about your baby.</Text>

          <Text style={styles.description}>
            We’ll use this information to personalize the experience.
            You can change it later.
          </Text>

          <View style={styles.photoSection}>
            <Pressable
              accessibilityRole="button"
              onPress={pickPhoto}
              style={({ pressed }) => [
                styles.photoButton,
                pressed && styles.pressed,
              ]}
            >
              {photoUri ? (
                <Image
                  source={{ uri: photoUri }}
                  style={styles.profilePhoto}
                />
              ) : (
                <>
                  <Text style={styles.photoIcon}>＋</Text>
                  <Text style={styles.photoButtonText}>Add photo</Text>
                </>
              )}
            </Pressable>

            {photoUri ? (
              <Pressable onPress={pickPhoto}>
                <Text style={styles.changePhotoText}>Change photo</Text>
              </Pressable>
            ) : (
              <Text style={styles.optionalText}>Optional</Text>
            )}
          </View>

          <View style={styles.form}>
            <View>
              <Text style={styles.label}>Baby’s name</Text>

              <TextInput
                autoCapitalize="words"
                autoCorrect={false}
                maxLength={40}
                onChangeText={setName}
                placeholder="Enter a name"
                placeholderTextColor="#9AA29B"
                returnKeyType="done"
                style={styles.input}
                value={name}
              />
            </View>

            <View>
              <Text style={styles.label}>Date of birth</Text>

              <Pressable
                accessibilityRole="button"
                onPress={() => setShowDatePicker(true)}
                style={({ pressed }) => [
                  styles.dateField,
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  style={[
                    styles.dateText,
                    !birthDate && styles.datePlaceholder,
                  ]}
                >
                  {formattedBirthDate}
                </Text>

                <Text style={styles.calendarIcon}>▣</Text>
              </Pressable>

              {showDatePicker && (
                <View style={styles.datePickerContainer}>
                <DateTimePicker
                display={
                    Platform.OS === 'ios' ? 'spinner' : 'default'
                }
                maximumDate={new Date()}
                mode="date"
                onChange={handleDateChange}
                textColor="#263B2B"
                themeVariant="light"
                value={birthDate ?? new Date()}
                />

                  {Platform.OS === 'ios' && (
                    <Pressable
                      onPress={() => setShowDatePicker(false)}
                      style={styles.dateDoneButton}
                    >
                      <Text style={styles.dateDoneText}>Done</Text>
                    </Pressable>
                  )}
                </View>
              )}
            </View>
          </View>

          <View style={styles.footer}>
            <Pressable
              accessibilityRole="button"
              disabled={!canSave}
              onPress={createProfile}
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
                  Create profile
                </Text>
              )}
            </Pressable>

            <Text style={styles.privacyText}>
              Your information is stored on this device for now.
            </Text>
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
    marginTop: 12,
  },
  description: {
    color: '#6A756D',
    fontSize: 16,
    lineHeight: 24,
    marginTop: 16,
  },
  photoSection: {
    alignItems: 'center',
    marginTop: 30,
  },
  photoButton: {
    width: 112,
    height: 112,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 56,
    borderColor: '#C9D6C5',
    borderStyle: 'dashed',
    borderWidth: 2,
    backgroundColor: '#EBF0E7',
  },
  profilePhoto: {
    width: '100%',
    height: '100%',
  },
  photoIcon: {
    color: '#52705A',
    fontSize: 28,
    fontWeight: '300',
  },
  photoButtonText: {
    color: '#52705A',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  optionalText: {
    color: '#919992',
    fontSize: 12,
    marginTop: 9,
  },
  changePhotoText: {
    color: '#52705A',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 9,
  },
  form: {
    gap: 22,
    marginTop: 30,
  },
  label: {
    color: '#344A39',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 9,
  },
  input: {
    height: 58,
    color: '#263B2B',
    fontSize: 17,
    borderColor: '#DDE3DA',
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: '#FFFEFA',
    paddingHorizontal: 17,
  },
  dateField: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderColor: '#DDE3DA',
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: '#FFFEFA',
    paddingHorizontal: 17,
  },
  dateText: {
    color: '#263B2B',
    fontSize: 17,
  },
  datePlaceholder: {
    color: '#9AA29B',
  },
  calendarIcon: {
    color: '#718075',
    fontSize: 17,
  },
  datePickerContainer: {
    overflow: 'hidden',
    borderRadius: 16,
    backgroundColor: '#FFFEFA',
    marginTop: 10,
    paddingBottom: 8,
  },
  dateDoneButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  dateDoneText: {
    color: '#48684D',
    fontSize: 16,
    fontWeight: '700',
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
  privacyText: {
    color: '#8B938C',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 13,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
});
