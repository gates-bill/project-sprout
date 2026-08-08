import { supabase } from './supabase';

export type CareCircleSummary = {
  id: string;
  name: string;
  role: 'owner' | 'caregiver';
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
      role,
      care_circles (
        id,
        name
      )
    `)
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