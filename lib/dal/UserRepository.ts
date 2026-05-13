/**
 * lib/dal/UserRepository.ts
 * ─────────────────────────────────────────────────────────────────
 * All user-related operations: auth state, profile, and preferences.
 *
 * Supabase splits user data across two layers:
 *  • auth.users  — managed by Supabase Auth (email, phone, provider,
 *                  last_sign_in, etc.) — accessible via auth.getUser()
 *  • public.profiles — our own table for display data (avatar, name)
 *
 * This repository is the single place that touches both.
 * ─────────────────────────────────────────────────────────────────
 */

import type { SupabaseClient } from "./supabase";
import { DalError, type DalResult } from "./types";
import type { User } from "@supabase/supabase-js";

// ── Domain types ──────────────────────────────────────────────────

/** The shape we store in public.profiles (extend as needed). */
export type UserProfile = {
  id: string;           // = auth.uid()
  display_name: string | null;
  avatar_url: string | null;
  locale: string | null;
  updated_at: string;
};

export type UpdateProfileInput = {
  display_name?: string;
  avatar_url?: string;
  locale?: string;
};

// ── Repository ────────────────────────────────────────────────────

export class UserRepository {
  constructor(private readonly db: SupabaseClient) {}

  // ── Auth ─────────────────────────────────────────────────────────

  /** Returns the currently authenticated Supabase Auth user, or null. */
  async getCurrentUser(): Promise<DalResult<User | null>> {
    const { data, error } = await this.db.auth.getUser();
    if (error) return { data: null, error: new DalError(error.message) };
    return { data: data.user, error: null };
  }

  /** Sign in with email + password. */
  async signInWithPassword(
    email: string,
    password: string,
  ): Promise<DalResult<User>> {
    const { data, error } = await this.db.auth.signInWithPassword({
      email,
      password,
    });
    if (error) return { data: null, error: new DalError(error.message, error.status?.toString()) };
    return { data: data.user, error: null };
  }

  /** Sign up with email + password. */
  async signUp(
    email: string,
    password: string,
    metadata?: { display_name?: string },
  ): Promise<DalResult<User>> {
    const { data, error } = await this.db.auth.signUp({
      email,
      password,
      options: { data: metadata },
    });
    if (error) return { data: null, error: new DalError(error.message, error.status?.toString()) };
    if (!data.user) return { data: null, error: new DalError("Sign-up succeeded but no user returned") };
    return { data: data.user, error: null };
  }

  /** Sign in via OAuth provider (Google, GitHub, …). */
  async signInWithOAuth(
    provider: "google" | "github" | "apple",
    redirectTo?: string,
  ): Promise<DalResult<{ url: string }>> {
    const { data, error } = await this.db.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    });
    if (error) return { data: null, error: new DalError(error.message) };
    if (!data.url) return { data: null, error: new DalError("No redirect URL returned") };
    return { data: { url: data.url }, error: null };
  }

  /** Sign out the current user. */
  async signOut(): Promise<DalResult<true>> {
    const { error } = await this.db.auth.signOut();
    if (error) return { data: null, error: new DalError(error.message) };
    return { data: true, error: null };
  }

  /** Send a password-reset email. */
  async sendPasswordResetEmail(
    email: string,
    redirectTo?: string,
  ): Promise<DalResult<true>> {
    const { error } = await this.db.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    if (error) return { data: null, error: new DalError(error.message) };
    return { data: true, error: null };
  }

  /** Update the auth-layer password (requires an active session). */
  async updatePassword(newPassword: string): Promise<DalResult<true>> {
    const { error } = await this.db.auth.updateUser({ password: newPassword });
    if (error) return { data: null, error: new DalError(error.message) };
    return { data: true, error: null };
  }

  // ── Profile ───────────────────────────────────────────────────────

  /** Fetch the public profile for any user by ID. */
  async getProfile(userId: string): Promise<DalResult<UserProfile>> {
    const { data, error } = await this.db
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: data as UserProfile, error: null };
  }

  /** Fetch the current user's profile. */
  async getMyProfile(): Promise<DalResult<UserProfile>> {
    const { data: { user }, error: authError } = await this.db.auth.getUser();
    if (authError || !user) {
      return { data: null, error: new DalError("Not authenticated", "AUTH_REQUIRED") };
    }
    return this.getProfile(user.id);
  }

  /** Create or update the current user's profile row. */
  async upsertProfile(input: UpdateProfileInput): Promise<DalResult<UserProfile>> {
    const { data: { user }, error: authError } = await this.db.auth.getUser();
    if (authError || !user) {
      return { data: null, error: new DalError("Not authenticated", "AUTH_REQUIRED") };
    }

    const { data, error } = await this.db
      .from("profiles")
      .upsert({
        id: user.id,
        ...input,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: data as UserProfile, error: null };
  }

  /** Fetch profiles for multiple users at once (e.g. to display member avatars). */
  async getProfiles(userIds: string[]): Promise<DalResult<UserProfile[]>> {
    if (userIds.length === 0) return { data: [], error: null };

    const { data, error } = await this.db
      .from("profiles")
      .select("*")
      .in("id", userIds);

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: data as UserProfile[], error: null };
  }
}
