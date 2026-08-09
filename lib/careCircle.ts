import { supabase } from './supabase';

export type CareCircleSummary = {
  id: string;
  name: string;
  role: 'owner' | 'caregiver';
};

export type CareCircleMember = {
  memberId: string;
  userId: string;
  role: 'owner' | 'caregiver';
  email: string;
  createdAt: string;
};

export async function createCareCircle(
  name: string,
) {
  const { data, error } = await supabase.rpc(
    'create_care_circle',
    {
      circle_name: name.trim(),
    },
  );

  if (error) {
    throw error;
  }

  return data as string;
}

export async function loadMyCareCircle():
  Promise<CareCircleSummary | null> {
  const { data, error } = await supabase
    .from('care_circle_members')
    .select(`
      created_at,
      role,
      care_circles (
        id,
        name
      )
    `)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data?.care_circles) {
    return null;
  }

  const circle = Array.isArray(
    data.care_circles,
  )
    ? data.care_circles[0]
    : data.care_circles;

  if (!circle) {
    return null;
  }

  return {
    id: circle.id,
    name: circle.name,
    role: data.role as 'owner' | 'caregiver',
  };
}

export async function loadCareCircleMembers(
  careCircleId: string,
): Promise<CareCircleMember[]> {
  const { data, error } = await supabase.rpc(
    'get_care_circle_members',
    {
      circle_id: careCircleId,
    },
  );

  if (error) {
    throw error;
  }

type CareCircleMemberRow = {
  member_id: string;
  user_id: string;
  role: 'owner' | 'caregiver';
  email: string;
  created_at: string;
};

const members =
  (data ?? []) as CareCircleMemberRow[];

return members.map((member) => ({
  memberId: member.member_id,
  userId: member.user_id,
  role: member.role,
  email: member.email,
  createdAt: member.created_at,
}));
}

export async function removeCareCircleMember(
  careCircleId: string,
  userId: string,
): Promise<void> {
  const { error } = await supabase.rpc(
    'remove_care_circle_member',
    {
      circle_id: careCircleId,
      member_user_id: userId,
    },
  );

  if (error) {
    throw error;
  }
}

export async function transferCareCircleOwnership(
  careCircleId: string,
  newOwnerUserId: string,
): Promise<void> {
  const { error } = await supabase.rpc(
    'transfer_care_circle_ownership',
    {
      circle_id: careCircleId,
      new_owner_user_id: newOwnerUserId,
    },
  );

  if (error) throw error;
}
