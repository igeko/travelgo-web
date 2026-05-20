/**
 * lib/dal/entities/Users.ts
 * ─────────────────────────────────────────────────────────────────
 * The User entity — auth state, profile (`profiles`) and platform
 * roles (`user_platform_roles`).
 * ─────────────────────────────────────────────────────────────────
 */

import type { SupabaseClient } from "../supabase";
import { UserTable } from "../tables";
import { DalError, type DalResult } from "../types";
import type { User } from "@supabase/supabase-js";

export type UserProfile = {
  id: string;
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

export class Users {
  constructor(private readonly db: SupabaseClient) {}

  // ── Auth ─────────────────────────────────────────────────────────

  async getCurrentUser(): Promise<DalResult<User | null>> {
    const { data, error } = await this.db.auth.getUser();
    if (error) return { data: null, error: new DalError(error.message) };
    return { data: data.user, error: null };
  }

  async signInWithPassword(email: string, password: string): Promise<DalResult<User>> {
    const { data, error } = await this.db.auth.signInWithPassword({ email, password });
    if (error) return { data: null, error: new DalError(error.message, error.status?.toString()) };
    return { data: data.user, error: null };
  }

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

  async signOut(): Promise<DalResult<true>> {
    const { error } = await this.db.auth.signOut();
    if (error) return { data: null, error: new DalError(error.message) };
    return { data: true, error: null };
  }

  async sendPasswordResetEmail(email: string, redirectTo?: string): Promise<DalResult<true>> {
    const { error } = await this.db.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) return { data: null, error: new DalError(error.message) };
    return { data: true, error: null };
  }

  async updatePassword(newPassword: string): Promise<DalResult<true>> {
    const { error } = await this.db.auth.updateUser({ password: newPassword });
    if (error) return { data: null, error: new DalError(error.message) };
    return { data: true, error: null };
  }

  // ── Profile ───────────────────────────────────────────────────────

  async getProfile(userId: string): Promise<DalResult<UserProfile>> {
    const { data, error } = await this.db
      .from(UserTable.Profiles)
      .select("*")
      .eq("id", userId)
      .single();

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: data as UserProfile, error: null };
  }

  async getMyProfile(): Promise<DalResult<UserProfile>> {
    const { data: { user }, error: authError } = await this.db.auth.getUser();
    if (authError || !user) {
      return { data: null, error: new DalError("Not authenticated", "AUTH_REQUIRED") };
    }
    return this.getProfile(user.id);
  }

  async upsertProfile(input: UpdateProfileInput): Promise<DalResult<UserProfile>> {
    const { data: { user }, error: authError } = await this.db.auth.getUser();
    if (authError || !user) {
      return { data: null, error: new DalError("Not authenticated", "AUTH_REQUIRED") };
    }

    const { data, error } = await this.db
      .from(UserTable.Profiles)
      .upsert({ id: user.id, ...input, updated_at: new Date().toISOString() })
      .select()
      .single();

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: data as UserProfile, error: null };
  }

  async getProfiles(userIds: string[]): Promise<DalResult<UserProfile[]>> {
    if (userIds.length === 0) return { data: [], error: null };
    const { data, error } = await this.db
      .from(UserTable.Profiles)
      .select("*")
      .in("id", userIds);

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: data as UserProfile[], error: null };
  }

  // ── Platform roles ─────────────────────────────────────────────────

  /** All platform roles granted to a user (e.g. ["admin","dev"]). */
  async getPlatformRoles(userId: string): Promise<string[]> {
    const { data } = await this.db
      .from(UserTable.PlatformRoles)
      .select("role")
      .eq("user_id", userId);
    return ((data ?? []) as { role: string }[]).map((r) => r.role);
  }

  /** True if the user holds at least one of the allowed platform roles. */
  async hasPlatformRole(userId: string, allowed: readonly string[]): Promise<boolean> {
    const { data } = await this.db
      .from(UserTable.PlatformRoles)
      .select("role")
      .eq("user_id", userId)
      .in("role", allowed as unknown as string[])
      .limit(1)
      .maybeSingle();
    return !!data;
  }
}
