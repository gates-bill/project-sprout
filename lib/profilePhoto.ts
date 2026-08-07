import {
    Directory,
    File,
    Paths,
} from 'expo-file-system';

const PROFILE_PHOTO_DIRECTORY = new Directory(
  Paths.document,
  'project-sprout',
  'profile-photos',
);

export function isManagedProfilePhotoUri(
  uri: string,
): boolean {
  return uri.startsWith(
    PROFILE_PHOTO_DIRECTORY.uri,
  );
}

export async function persistProfilePhoto(
  sourceUri: string,
): Promise<string> {
  if (isManagedProfilePhotoUri(sourceUri)) {
    return sourceUri;
  }

  PROFILE_PHOTO_DIRECTORY.create({
    idempotent: true,
    intermediates: true,
  });

  const sourceFile = new File(sourceUri);

  if (!sourceFile.exists) {
    throw new Error(
      'Selected profile photo is unavailable.',
    );
  }

  const extension = getFileExtension(sourceUri);

  const destinationFile = new File(
    PROFILE_PHOTO_DIRECTORY,
    `baby-profile-${Date.now()}.${extension}`,
  );

  await sourceFile.copy(destinationFile);

  return destinationFile.uri;
}

export function deleteManagedProfilePhoto(
  uri: string | null,
): void {
  if (
    !uri ||
    !isManagedProfilePhotoUri(uri)
  ) {
    return;
  }

  const file = new File(uri);

  if (file.exists) {
    file.delete();
  }
}

export function clearAllProfilePhotos(): void {
  if (PROFILE_PHOTO_DIRECTORY.exists) {
    PROFILE_PHOTO_DIRECTORY.delete();
  }
}

function getFileExtension(uri: string): string {
  const cleanUri = uri.split('?')[0];

  const match = cleanUri.match(
    /\.([a-zA-Z0-9]+)$/,
  );

  if (!match) {
    return 'jpg';
  }

  const extension = match[1].toLowerCase();

  const supportedExtensions = [
    'jpg',
    'jpeg',
    'png',
    'heic',
    'heif',
    'webp',
  ];

  return supportedExtensions.includes(extension)
    ? extension
    : 'jpg';
}