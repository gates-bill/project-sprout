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
  isPasswordRecoveryCallback,
  updatePassword,
} from '../lib/auth';
import { getFriendlyAuthError } from '../lib/authErrors';
import { supabase } from '../lib/supabase';

const recoveryRequests = new Map<
  string,
  ReturnType<typeof completeAuthRedirect>
>();

function establishRecoverySession(url: string) {
  const pendingRequest = recoveryRequests.get(url);
  if (pendingRequest) return pendingRequest;

  const request = completeAuthRedirect(url);
  recoveryRequests.set(url, request);
  return request;
}

const RECOVERY_LINK_ERROR =
  'This reset link is invalid or expired. Request a new password reset link and try again.';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const linkingUrl = Linking.useLinkingURL();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [checkingLink, setCheckingLink] = useState(true);
  const [sessionReady, setSessionReady] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'PASSWORD_RECOVERY' && session) {
          setLinkError(null);
          setSessionReady(true);
          setCheckingLink(false);
        }
      },
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let active = true;

    const prepare = async () => {
      setCheckingLink(true);
      setSessionReady(false);
      setLinkError(null);

      if (linkingUrl && isPasswordRecoveryCallback(linkingUrl)) {
        const { data, error } = await establishRecoverySession(linkingUrl);

        if (!active) return;

        if (error || !data.session) {
          setLinkError(RECOVERY_LINK_ERROR);
          setCheckingLink(false);
          return;
        }

        const { data: storedSession } = await getCurrentSession();
        if (!active) return;

        if (!storedSession.session) {
          setLinkError(RECOVERY_LINK_ERROR);
          setCheckingLink(false);
          return;
        }

        setSessionReady(true);
        setCheckingLink(false);
        return;
      }

      const { data } = await getCurrentSession();
      if (!active) return;

      if (data.session) {
        setSessionReady(true);
      } else {
        setLinkError(RECOVERY_LINK_ERROR);
      }
      setCheckingLink(false);
    };

    void prepare();

    return () => {
      active = false;
    };
  }, [linkingUrl]);

  const save = async () => {
    if (!sessionReady || checkingLink) {
      Alert.alert('Reset link unavailable', RECOVERY_LINK_ERROR);
      return;
    }

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

  if (linkError) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <Text style={styles.eyebrow}>ACCOUNT SECURITY</Text>
          <Text style={styles.title}>Reset link unavailable</Text>
          <Text style={styles.description}>{linkError}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace('/auth')}
            style={styles.button}
          >
            <Text style={styles.buttonText}>Request a new reset link</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <Text style={styles.eyebrow}>ACCOUNT SECURITY</Text>
        <Text style={styles.title}>Choose a new password</Text>
        <Text style={styles.description}>
          Use at least 8 characters. Your other Our Baby Log data will not change.
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
          disabled={saving || !sessionReady}
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
