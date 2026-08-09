import { supabase } from './supabase';

type DeleteAccountResponse = {
  deleted?: boolean;
  code?: string;
  message?: string;
};

export async function deleteAccount(): Promise<void> {
  const { data, error } =
    await supabase.functions.invoke<DeleteAccountResponse>(
      'delete-account',
      {
        method: 'POST',
      },
    );

  if (error) {
    const response = error.context;

    if (response instanceof Response) {
      let body: DeleteAccountResponse | null = null;

      try {
        body =
          (await response.json()) as DeleteAccountResponse;
      } catch {
        // Fall back to the SDK error when the response has no JSON body.
      }

      if (body?.message) {
        throw new Error(body.message);
      }
    }

    throw error;
  }

  if (!data?.deleted) {
    throw new Error(
      data?.message ||
        'Your account could not be deleted.',
    );
  }
}
