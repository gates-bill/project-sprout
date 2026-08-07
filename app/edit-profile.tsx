import DateTimePicker, {
    DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
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
    BabyProfile,
    loadBabyProfile,
    saveBabyProfile,
} from '../lib/babyProfile';

export default function EditProfileScreen() {
  const router = useRouter();

  const [profile, setProfile] =
    useState<BabyProfile | null>(null);
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] =
    useState<Date | null>(null);
  const [photoUri, setPhotoUri] =
    useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] =
    useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let isActive = true;

    const loadProfile = async () => {
      try {
        const savedProfile = await loadBabyProfile();

        if (!savedProfile) {
          Alert.alert(
            'Profile not found',
            'Please create a baby profile first.',
          );

          router.replace('/');
          return;
        }

        if (!isActive) {
          return;
        }

        setProfile(savedProfile);
        setName(savedProfile.name);
        setBirthDate(
          new Date(savedProfile.birthDate),
        );
        setPhotoUri(savedProfile.photoUri);
      } catch (error) {
        console.error(
          'Unable to load profile for editing:',
          error,
        );

        Alert.alert(
          'Unable to load profile',
          'Please go back and try again.',
        );
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
  }, [router]);

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
    profile !== null &&
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

      const result =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });

      if (!result.canceled) {
        setPhotoUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error(
        'Unable to choose profile photo:',
        error,
      );

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

  const saveChanges = async () => {
    if (
      !profile ||
      !birthDate ||
      !canSave
    ) {
      return;
    }

    setSaving(true);

    try {
      await saveBabyProfile({
        ...profile,
        name: name.trim(),
        birthDate: birthDate.toISOString(),
        photoUri,
      });

      router.back();
    } catch (error) {
      console.error(
        'Unable to update baby profile:',
        error,
      );

      Alert.alert(
        'Unable to save profile',
        'Your changes could not be saved. Please try again.',
      );

      setSaving(false);
    }
  };

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
      <KeyboardAvoidingView
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Pressable
            accessibilityLabel="Go back"
            accessibilityRole="button"
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>
              ‹
            </Text>
          </Pressable>

          <Text style={styles.eyebrow}>
            BABY PROFILE
          </Text>

          <Text style={styles.title}>
            Edit profile
          </Text>

          <Text style={styles.description}>
            Update the details that help personalize
            Sprout for your family.
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
                  <Text style={styles.photoIcon}>
                    ＋
                  </Text>

                  <Text
                    style={styles.photoButtonText}
                  >
                    Add photo
                  </Text>
                </>
              )}
            </Pressable>

            {photoUri ? (
              <View style={styles.photoActions}>
                <Pressable onPress={pickPhoto}>
                  <Text
                    style={styles.photoActionText}
                  >
                    Change
                  </Text>
                </Pressable>

                <Text style={styles.photoDivider}>
                  ·
                </Text>

                <Pressable
                  onPress={() => setPhotoUri(null)}
                >
                  <Text
                    style={styles.removePhotoText}
                  >
                    Remove
                  </Text>
                </Pressable>
              </View>
            ) : (
              <Text style={styles.optionalText}>
                Optional
              </Text>
            )}
          </View>

          <View style={styles.form}>
            <View>
              <Text style={styles.label}>
                Baby’s name
              </Text>

              <TextInput
                autoCapitalize="words"
                autoCorrect={false}
                maxLength={40}
                onChangeText={setName}
                placeholder="Enter a name"
                placeholderTextColor="#9AA29B"
                style={styles.input}
                value={name}
              />
            </View>

            <View>
              <Text style={styles.label}>
                Date of birth
              </Text>

              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  setShowDatePicker(true)
                }
                style={({ pressed }) => [
                  styles.dateField,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.dateText}>
                  {formattedBirthDate}
                </Text>

                <Text style={styles.calendarIcon}>
                  ▣
                </Text>
              </Pressable>

              {showDatePicker && (
                <View
                  style={
                    styles.datePickerContainer
                  }
                >
                  <DateTimePicker
                    display={
                      Platform.OS === 'ios'
                        ? 'spinner'
                        : 'default'
                    }
                    maximumDate={new Date()}
                    mode="date"
                    onChange={handleDateChange}
                    textColor="#263B2B"
                    themeVariant="light"
                    value={
                      birthDate ?? new Date()
                    }
                  />

                  {Platform.OS === 'ios' && (
                    <Pressable
                      onPress={() =>
                        setShowDatePicker(false)
                      }
                      style={
                        styles.dateDoneButton
                      }
                    >
                      <Text
                        style={
                          styles.dateDoneText
                        }
                      >
                        Done
                      </Text>
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
              onPress={saveChanges}
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
                <ActivityIndicator
                  color="#FFFFFF"
                />
              ) : (
                <Text
                  style={
                    styles.primaryButtonText
                  }
                >
                  Save changes
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
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
    borderColor: '#C9D6C5',
    borderRadius: 56,
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
  photoActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  photoActionText: {
    color: '#48684D',
    fontSize: 13,
    fontWeight: '700',
  },
  photoDivider: {
    color: '#A0A7A1',
  },
  removePhotoText: {
    color: '#9A403B',
    fontSize: 13,
    fontWeight: '700',
  },
  optionalText: {
    color: '#919992',
    fontSize: 12,
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
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
});