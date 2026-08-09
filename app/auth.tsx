import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  signInWithEmail,
  signUpWithEmail,
} from '../lib/auth';

import {
  loadMyCareCircle,
} from '../lib/careCircle';
import {
  hydrateLocalBabyFromCloud,
} from '../lib/cloudBaby';

export default function AuthScreen() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [working, setWorking] = useState(false);

const continueAfterSignIn = async () => {
  const circle =
    await loadMyCareCircle();

  if (!circle) {
    router.replace('/settings');
    return;
  }

  const profile =
    await hydrateLocalBabyFromCloud(
      circle.id,
    );

  if (profile) {
    router.replace('/home');
    return;
  }

  router.replace('/settings');
};

  const handleSignUp = async () => {
    if (!email.trim() || password.length < 8) {
      Alert.alert(
        'Check your details',
        'Enter a valid email and a password of at least 8 characters.',
      );

      return;
    }

    setWorking(true);

    try {
      const { data, error } =
        await signUpWithEmail(
          email,
          password,
        );

      if (error) {
        Alert.alert(
          'Unable to create account',
          error.message,
        );
        return;
      }

      if (!data.session) {
        Alert.alert(
          'Check your email',
          'Supabase sent you a confirmation email. Confirm your address, then come back and sign in.',
        );
        return;
      }

Alert.alert(
  'Account created',
  'You are signed in.',
  [
    {
      text: 'Continue',
      onPress: () => {
        void continueAfterSignIn();
      },
    },
  ],
);
    } finally {
      setWorking(false);
    }
  };

const handleSignIn = async () => {
  if (!email.trim() || !password) {
    Alert.alert(
      'Missing information',
      'Enter your email and password.',
    );

    return;
  }

  setWorking(true);

  try {
    const { error } =
      await signInWithEmail(
        email,
        password,
      );

    if (error) {
      Alert.alert(
        'Unable to sign in',
        error.message,
      );
      return;
    }

    await continueAfterSignIn();
  } catch (error) {
    console.error(
      'Unable to continue after sign in:',
      error,
    );

    Alert.alert(
      'Unable to sign in',
      error instanceof Error
        ? error.message
        : 'Please try again.',
    );
  } finally {
    setWorking(false);
  }
};

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
      <View style={styles.content}>
        <Text style={styles.eyebrow}>
          PROJECT SPROUT
        </Text>

        <Text style={styles.title}>
          Your care circle
        </Text>

        <Text style={styles.description}>
          Sign in so the people you invite can
          share the same baby care history.
        </Text>

        <View style={styles.form}>
          <Text style={styles.label}>
            Email
          </Text>

          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor="#9AA29B"
            style={styles.input}
            value={email}
          />

          <Text style={styles.passwordLabel}>
            Password
          </Text>

          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setPassword}
            placeholder="At least 8 characters"
            placeholderTextColor="#9AA29B"
            secureTextEntry
            style={styles.input}
            value={password}
          />
        </View>

        <View style={styles.footer}>
          <Pressable
            disabled={working}
            onPress={handleSignIn}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.pressed,
              working &&
                styles.disabledButton,
            ]}
          >
            {working ? (
              <ActivityIndicator
                color="#FFFFFF"
              />
            ) : (
              <Text
                style={
                  styles.primaryButtonText
                }
              >
                Sign in
              </Text>
            )}
          </Pressable>

          <Pressable
            disabled={working}
            onPress={handleSignUp}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.pressed,
            ]}
          >
            <Text
              style={
                styles.secondaryButtonText
              }
            >
              Create account
            </Text>
          </Pressable>
        </View>
      </View>
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
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 54,
    paddingBottom: 24,
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
    marginTop: 10,
  },
  description: {
    color: '#6A756D',
    fontSize: 16,
    lineHeight: 24,
    marginTop: 14,
    maxWidth: 340,
  },
  form: {
    marginTop: 36,
  },
  label: {
    color: '#344A39',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  passwordLabel: {
    color: '#344A39',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 22,
    marginBottom: 10,
  },
  input: {
    minHeight: 58,
    color: '#263B2B',
    fontSize: 17,
    borderColor: '#DDE3DA',
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: '#FFFEFA',
    paddingHorizontal: 17,
  },
  footer: {
    marginTop: 'auto',
  },
  primaryButton: {
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: '#48684D',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  secondaryButton: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  secondaryButtonText: {
    color: '#48684D',
    fontSize: 16,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.6,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
});