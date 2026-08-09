// This file runs in Supabase's Deno Edge Runtime, not the Expo app.
// @ts-nocheck
import { createClient } from 'npm:@supabase/supabase-js@2';

const jsonHeaders = {
  'Content-Type': 'application/json',
};

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: jsonHeaders,
  });
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return jsonResponse(
      {
        code: 'METHOD_NOT_ALLOWED',
        message: 'This action only accepts POST requests.',
      },
      405,
    );
  }

  const authorization =
    request.headers.get('Authorization');

  if (!authorization) {
    return jsonResponse(
      {
        code: 'NOT_AUTHENTICATED',
        message: 'Please sign in again before deleting your account.',
      },
      401,
    );
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const publishableKey =
    Deno.env.get('SUPABASE_ANON_KEY') ??
    Deno.env.get('SUPABASE_PUBLISHABLE_KEY');
  const serviceRoleKey =
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
    Deno.env.get('SUPABASE_SECRET_KEY');

  if (
    !supabaseUrl ||
    !publishableKey ||
    !serviceRoleKey
  ) {
    console.error(
      'The delete-account function is missing Supabase environment variables.',
    );

    return jsonResponse(
      {
        code: 'SERVER_CONFIGURATION_ERROR',
        message: 'Account deletion is temporarily unavailable. Please try again later.',
      },
      500,
    );
  }

  const userClient = createClient(
    supabaseUrl,
    publishableKey,
    {
      global: {
        headers: {
          Authorization: authorization,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user) {
    return jsonResponse(
      {
        code: 'NOT_AUTHENTICATED',
        message: 'Your session has expired. Please sign in again and retry.',
      },
      401,
    );
  }

  const admin = createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );

  const { data: photos, error: photoLookupError } =
    await admin
      .from('care_circle_members')
      .select('care_circle_id, role, care_circles(babies(photo_path))')
      .eq('user_id', user.id);

  if (photoLookupError) {
    console.error(
      'Unable to inspect account before deletion:',
      photoLookupError,
    );

    return jsonResponse(
      {
        code: 'DELETE_FAILED',
        message: 'We could not safely verify your shared care data. Nothing was deleted.',
      },
      500,
    );
  }

  const photoPaths = (photos ?? [])
    .filter((membership) => membership.role === 'owner')
    .flatMap((membership) => {
      const circle = Array.isArray(membership.care_circles)
        ? membership.care_circles[0]
        : membership.care_circles;
      const babies = circle?.babies ?? [];

      return babies
        .map((baby) => baby.photo_path)
        .filter((path): path is string => Boolean(path));
    });

  for (const membership of photos ?? []) {
    if (membership.role !== 'owner') continue;

    const { count, error: memberCountError } = await admin
      .from('care_circle_members')
      .select('id', { count: 'exact', head: true })
      .eq('care_circle_id', membership.care_circle_id);

    if (memberCountError) {
      return jsonResponse(
        {
          code: 'DELETE_FAILED',
          message: 'We could not safely verify Care Circle ownership. Nothing was deleted.',
        },
        500,
      );
    }

    if ((count ?? 0) > 1) {
      return jsonResponse(
        {
          code: 'OWNER_HAS_MEMBERS',
          message: 'Transfer ownership or remove the other caregivers before deleting your account.',
        },
        409,
      );
    }
  }

  if (photoPaths.length > 0) {
    const { error: storageError } = await admin.storage
      .from('baby-profile-photos')
      .remove(photoPaths);

    if (storageError) {
      console.error('Shared photo cleanup failed:', storageError);
      return jsonResponse(
        {
          code: 'DELETE_FAILED',
          message: 'We could not safely remove your shared profile photo. Nothing else was deleted.',
        },
        500,
      );
    }
  }

  const { data, error } = await admin.rpc(
    'delete_sprout_account',
    {
      target_user_id: user.id,
    },
  );

  if (error) {
    const ownerHasMembers =
      error.message.includes('OWNER_HAS_MEMBERS');

    console.error('Account deletion failed:', error);

    return jsonResponse(
      {
        code: ownerHasMembers
          ? 'OWNER_HAS_MEMBERS'
          : 'DELETE_FAILED',
        message: ownerHasMembers
          ? 'Transfer ownership or remove the other caregivers before deleting your account.'
          : 'Your account could not be deleted. Nothing stored on this device was cleared.',
      },
      ownerHasMembers ? 409 : 500,
    );
  }

  return jsonResponse(
    {
      deleted: true,
      result: data,
    },
    200,
  );
});
