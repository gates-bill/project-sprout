import { BabyProfile } from './babyProfile';
import { supabase } from './supabase';

export type CloudBaby = {
  id: string;
  careCircleId: string;
  name: string;
  birthDate: string;
};

export async function createCloudBaby(
  careCircleId: string,
  profile: BabyProfile,
) {
  const { data, error } = await supabase
    .from('babies')
    .insert({
      care_circle_id: careCircleId,
      name: profile.name,
      birth_date: profile.birthDate,
      photo_path: null,
    })
    .select('id')
    .single();

  if (error) {
    throw error;
  }

  return data.id as string;
}

export async function loadCloudBabyForCircle(
  careCircleId: string,
): Promise<CloudBaby | null> {
  const { data, error } = await supabase
    .from('babies')
    .select(
      'id, care_circle_id, name, birth_date',
    )
    .eq('care_circle_id', careCircleId)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    careCircleId: data.care_circle_id,
    name: data.name,
    birthDate: data.birth_date,
  };
}