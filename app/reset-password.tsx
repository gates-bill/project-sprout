import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  completeAuthRedirect,
  getCurrentSession,
  updatePassword,
} from '../lib/auth';
import { getFriendlyAuthError } from '../lib/authErrors';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [checkingLink, setCheckingLink] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const prepare = async () => {
      const { data } = await getCurrentSession();

      if (!data.session) {
        const url = await Linking.getInitialURL();
        if (url) {
          const { error } = await completeAuthRedirect(url);
          if (error) {
            Alert.alert(
              'Reset link unavailable',
              getFriendlyAuthError(error, error.message),
            );
          }
        }
      }

      setCheckingLink(false);
    };

    void prepare();
  }, []);

  const save = async () => {
    if (password.length < 8 || password !== confirmPassword) {
      Alert.alert(
        'Check your password',
        password.length < 8
          ? 'Use at least 8 characters.'
          : 'The passwords do not match.',
      );
      return;
    }

    setSaving(true);
    const { error } = await updatePassword(password);
    setSaving(false);

    if (error) {
      Alert.alert(
        'Unable to update password',
        getFriendlyAuthError(error),
      );
      return;
    }

    Alert.alert('Password updated', 'Your new password is ready to use.');
    router.replace('/settings');
  };

  if (checkingLink) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color="#48684D" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <Text style={styles.eyebrow}>ACCOUNT SECURITY</Text>
        <Text style={styles.title}>Choose a new password</Text>
        <Text style={styles.description}>
          Use at least 8 characters. Your other Sprout data will not change.
        </Text>

        <TextInput
          accessibilityLabel="New password"
          autoCapitalize="none"
          onChangeText={setPassword}
          placeholder="New password"
          secureTextEntry
          style={styles.input}
          value={password}
        />
        <TextInput
          accessibilityLabel="Confirm new password"
          autoCapitalize="none"
          onChangeText={setConfirmPassword}
          placeholder="Confirm password"
          secureTextEntry
          style={styles.input}
          value={confirmPassword}
        />

        <Pressable
          accessibilityRole="button"
          disabled={saving}
          onPress={save}
          style={styles.button}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Update password</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F6F7F2' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F6F7F2' },
  content: { flex: 1, padding: 24, paddingTop: 54 },
  eyebrow: { color: '#657A68', fontSize: 13, fontWeight: '700', letterSpacing: 1.5 },
  title: { color: '#263B2B', fontSize: 34, fontWeight: '700', marginTop: 10 },
  description: { color: '#6A756D', fontSize: 16, lineHeight: 24, marginTop: 14, marginBottom: 20 },
  input: { minHeight: 56, borderColor: '#DDE3DA', borderRadius: 16, borderWidth: 1, backgroundColor: '#FFFEFA', color: '#263B2B', fontSize: 16, marginTop: 12, paddingHorizontal: 16 },
  button: { minHeight: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: '#48684D', marginTop: 22 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
