import { supabase } from './supabase';

export const PASSWORD_RESET_REDIRECT_URL =
  'projectsprout://reset-password';

const INVALID_RECOVERY_LINK_MESSAGE =
  'This password reset link is invalid or expired. Request a new reset link and try again.';

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
      redirectTo: PASSWORD_RESET_REDIRECT_URL,
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
  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    return {
      data: { session: null, user: null },
      error: new Error(INVALID_RECOVERY_LINK_MESSAGE),
    };
  }

  const hash = new URLSearchParams(
    parsed.hash.replace(/^#/, ''),
  );
  const getParameter = (name: string) =>
    parsed.searchParams.get(name) ?? hash.get(name);
  const callbackError =
    getParameter('error_description') ?? getParameter('error');

  if (callbackError) {
    return {
      data: { session: null, user: null },
      error: new Error(INVALID_RECOVERY_LINK_MESSAGE),
    };
  }

  const code = getParameter('code');

  if (code) {
    return supabase.auth.exchangeCodeForSession(code);
  }

  const accessToken = getParameter('access_token');
  const refreshToken = getParameter('refresh_token');

  if (accessToken && refreshToken) {
    return supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
  }

  return {
    data: { session: null, user: null },
    error: new Error(INVALID_RECOVERY_LINK_MESSAGE),
  };
}

export function isPasswordRecoveryCallback(url: string): boolean {
  try {
    const parsed = new URL(url);
    const isResetRoute =
      parsed.protocol === 'projectsprout:' &&
      (parsed.hostname === 'reset-password' ||
        parsed.pathname.replace(/^\//, '') === 'reset-password');
    const hash = new URLSearchParams(parsed.hash.replace(/^#/, ''));
    const hasParameter = (name: string) =>
      parsed.searchParams.has(name) || hash.has(name);

    return isResetRoute && (
      hasParameter('code') ||
      hasParameter('access_token') ||
      hasParameter('refresh_token') ||
      hasParameter('error') ||
      hasParameter('error_description')
    );
  } catch {
    return false;
  }
}
