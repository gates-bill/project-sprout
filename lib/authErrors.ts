export function getFriendlyAuthError(
  error: { message?: string; code?: string } | null,
  fallback = 'Please try again.',
): string {
  const value = `${error?.code ?? ''} ${error?.message ?? ''}`
    .toLowerCase();

  if (value.includes('invalid login')) {
    return 'The email or password is incorrect.';
  }
  if (value.includes('email not confirmed')) {
    return 'Confirm your email address before signing in.';
  }
  if (value.includes('already registered') || value.includes('user_already_exists')) {
    return 'An account already exists for this email address.';
  }
  if (value.includes('rate limit') || value.includes('over_email_send_rate_limit')) {
    return 'Too many attempts were made. Wait a few minutes and try again.';
  }
  if (value.includes('password')) {
    return 'Use a password with at least 8 characters.';
  }
  if (value.includes('network') || value.includes('fetch')) {
    return 'Our Baby Log could not connect. Check your internet connection and try again.';
  }
  if (value.includes('session') || value.includes('jwt')) {
    return 'Your session expired. Sign in again to continue.';
  }

  return fallback;
}
