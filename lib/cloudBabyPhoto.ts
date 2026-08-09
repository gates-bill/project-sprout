import { File } from 'expo-file-system';

import {
  downloadCloudProfilePhoto,
  getProfilePhotoFileExtension,
} from './profilePhoto';
import { supabase } from './supabase';

const BABY_PROFILE_PHOTO_BUCKET =
  'baby-profile-photos';

export async function uploadCloudBabyPhoto(
  careCircleId: string,
  sourceUri: string,
): Promise<string> {
  const sourceFile = new File(sourceUri);

  if (!sourceFile.exists) {
    throw new Error(
      'Selected profile photo is unavailable.',
    );
  }

  const extension = getUploadExtension(
    sourceFile,
  );
  const objectPath = [
    careCircleId,
    'profile',
    `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 10)}.${extension}`,
  ].join('/');

  const { error } = await supabase.storage
    .from(BABY_PROFILE_PHOTO_BUCKET)
    .upload(
      objectPath,
      await sourceFile.arrayBuffer(),
      {
        cacheControl: '3600',
        contentType: getContentType(extension),
        upsert: false,
      },
    );

  if (error) {
    throw error;
  }

  return objectPath;
}

export async function downloadCloudBabyPhoto(
  objectPath: string,
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BABY_PROFILE_PHOTO_BUCKET)
    .createSignedUrl(
      objectPath,
      60,
    );

  if (error) {
    throw error;
  }

  return downloadCloudProfilePhoto(
    data.signedUrl,
    objectPath,
  );
}

export async function deleteCloudBabyPhoto(
  objectPath: string,
): Promise<void> {
  const { error } = await supabase.storage
    .from(BABY_PROFILE_PHOTO_BUCKET)
    .remove([objectPath]);

  if (error) {
    throw error;
  }
}

function getUploadExtension(file: File): string {
  switch (file.type.toLowerCase()) {
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/heic':
      return 'heic';
    case 'image/heif':
      return 'heif';
    case 'image/jpeg':
      return 'jpg';
    default:
      return getProfilePhotoFileExtension(
        file.uri,
      );
  }
}

function getContentType(extension: string): string {
  switch (extension) {
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'heic':
      return 'image/heic';
    case 'heif':
      return 'image/heif';
    default:
      return 'image/jpeg';
  }
}
