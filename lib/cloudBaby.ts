import {
  BabyProfile,
  loadBabyProfile,
  saveCloudBabyProfile,
} from './babyProfile';
import { downloadCloudBabyPhoto } from './cloudBabyPhoto';
import { isProfilePhotoAvailable } from './profilePhoto';
import { supabase } from './supabase';

export type CloudBaby = {
  id: string;
  careCircleId: string;
  name: string;
  birthDate: string;
  photoPath: string | null;
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
      'id, care_circle_id, name, birth_date, photo_path',
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

  return mapCloudBaby(data);
}

export async function updateCloudBabyProfile(
  careCircleId: string,
  updates: {
    name: string;
    birthDate: string;
    photoPath?: string | null;
  },
): Promise<CloudBaby> {
  const cloudUpdates: {
    name: string;
    birth_date: string;
    photo_path?: string | null;
  } = {
    name: updates.name,
    birth_date: updates.birthDate,
  };

  if (updates.photoPath !== undefined) {
    cloudUpdates.photo_path = updates.photoPath;
  }

  const { data, error } = await supabase
    .from('babies')
    .update(cloudUpdates)
    .eq('care_circle_id', careCircleId)
    .select(
      'id, care_circle_id, name, birth_date, photo_path',
    )
    .single();

  if (error) {
    throw error;
  }

  return mapCloudBaby(data);
}

export async function hydrateLocalBabyFromCloud(
  careCircleId: string,
): Promise<BabyProfile | null> {
  const [cloudBaby, existingProfile] =
    await Promise.all([
      loadCloudBabyForCircle(careCircleId),
      loadBabyProfile(),
    ]);

  if (!cloudBaby) {
    return null;
  }

  if (
    cloudBaby.photoPath &&
    (
      existingProfile?.cloudPhotoPath !==
        cloudBaby.photoPath ||
      !isProfilePhotoAvailable(
        existingProfile.photoUri,
      )
    )
  ) {
    try {
      const photoUri =
        await downloadCloudBabyPhoto(
          cloudBaby.photoPath,
        );

      return saveCloudBabyProfile(
        cloudBaby,
        {
          photoUri,
          cloudPhotoPath:
            cloudBaby.photoPath,
        },
      );
    } catch (error) {
      console.warn(
        'Unable to refresh shared baby photo:',
        error,
      );
    }
  }

  if (
    !cloudBaby.photoPath &&
    existingProfile?.cloudPhotoPath
  ) {
    return saveCloudBabyProfile(
      cloudBaby,
      {
        photoUri: null,
        cloudPhotoPath: null,
      },
    );
  }

  return saveCloudBabyProfile(cloudBaby);
}

function mapCloudBaby(data: {
  id: string;
  care_circle_id: string;
  name: string;
  birth_date: string;
  photo_path: string | null;
}): CloudBaby {
  return {
    id: data.id,
    careCircleId: data.care_circle_id,
    name: data.name,
    birthDate: data.birth_date,
    photoPath: data.photo_path,
  };
}
