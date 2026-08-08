import { supabase } from './supabase';

export async function createCareCircleInvite(
  careCircleId: string,
): Promise<string> {
  const { data, error } = await supabase.rpc(
    'create_care_circle_invite',
    {
      circle_id: careCircleId,
    },
  );

  if (error) {
    throw error;
  }

  return data as string;
}

export async function acceptCareCircleInvite(
  inviteCode: string,
): Promise<string> {
  const { data, error } = await supabase.rpc(
    'accept_care_circle_invite',
    {
      invite_code: inviteCode.trim(),
    },
  );

  if (error) {
    throw error;
  }

  return data as string;
}