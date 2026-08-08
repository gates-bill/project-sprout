import { supabase } from './supabase';

export async function signUpWithEmail(
  email: string,
  password: string,
) {
  return supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
  });
}

export async function signInWithEmail(
  email: string,
  password: string,
) {
  return supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function getCurrentSession() {
  return supabase.auth.getSession();
}