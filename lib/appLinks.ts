export const PRIVACY_POLICY_URL = '';
export const SUPPORT_URL = '';

export function isConfiguredUrl(value: string): boolean {
  return /^https:\/\//i.test(value);
}
