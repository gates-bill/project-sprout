import { supabase } from './supabase';

export async function signUpWithEmail(
  email: string,
  password: string,
) {
  return supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
  });
}

export async function signInWithEmail(
  email: string,
  password: string,
) {
  return supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function clearLocalAuthSession() {
  return supabase.auth.signOut({
    scope: 'local',
  });
}

export async function getCurrentSession() {
  return supabase.auth.getSession();
}

export async function resendConfirmationEmail(
  email: string,
) {
  return supabase.auth.resend({
    type: 'signup',
    email: email.trim().toLowerCase(),
  });
}

export async function requestPasswordReset(
  email: string,
) {
  return supabase.auth.resetPasswordForEmail(
    email.trim().toLowerCase(),
    {
      redirectTo: 'projectsprout://reset-password',
    },
  );
}

export async function updatePassword(
  password: string,
) {
  return supabase.auth.updateUser({ password });
}

export async function completeAuthRedirect(
  url: string,
) {
  const parsed = new URL(url);
  const code = parsed.searchParams.get('code');

  if (code) {
    return supabase.auth.exchangeCodeForSession(code);
  }

  const hash = new URLSearchParams(
    parsed.hash.replace(/^#/, ''),
  );
  const accessToken = hash.get('access_token');
  const refreshToken = hash.get('refresh_token');

  if (accessToken && refreshToken) {
    return supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
  }

  return {
    data: { session: null, user: null },
    error: new Error('This password reset link is invalid or expired.'),
  };
}
