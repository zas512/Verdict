import { clearTokens } from "./api";

export interface User {
  sub: string;
  email: string;
  role: "SUPER_ADMIN" | "OWNER" | "ADMIN" | "ASSOCIATE";
  firmId: string | null;
  name?: string | null;
  avatarUrl?: string | null;
  firm?: {
    id: string;
    name: string;
    logoUrl?: string | null;
    accentColor?: string | null;
    tagline?: string | null;
  } | null;
  activeCheckInTime?: string | null;
  isCheckedIn?: boolean;
  /** True until a provisioned password has been replaced (first login). */
  mustChangePassword?: boolean;
}

export interface LoginResponse {
  success: boolean;
  user?: User | null;
  message?: string;
}

export async function login(credentials: {
  email: string;
  password: string;
}): Promise<User> {
  console.log(
    "[Centralized Auth] 🔑 Authenticating via Axios:",
    credentials.email
  );
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials)
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to sign in");
  }
  if (data.user) {
    console.log(
      "[Centralized Auth] ✅ User logged in successfully:",
      data.user
    );
  }
  return data.user;
}

export async function logout(): Promise<void> {
  console.log("[Centralized Auth] 🚪 Logging out...");
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } catch (err) {
    console.error("[Centralized Auth] Error during logout API call:", err);
  } finally {
    clearTokens();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  }
}

export async function checkAuth(): Promise<User | null> {
  try {
    const res = await fetch("/api/auth/me", { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    return data.user || null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Invite-only registration + Google OAuth helpers
// ---------------------------------------------------------------------------

export interface InviteInfo {
  id: string;
  email: string;
  type: "FOUNDER" | "MEMBER";
  role: "OWNER" | "ADMIN" | "ASSOCIATE";
  status: "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";
  expiresAt: string;
  firmName: string | null;
}

export interface RegisterWithInvitePayload {
  inviteToken: string;
  email: string;
  password?: string;
  authProvider?: "EMAIL" | "GOOGLE";
  name?: string;
  avatarUrl?: string;
  googleId?: string;
  // Founder-only firm setup
  firmName?: string;
  logoUrl?: string;
  accentColor?: string;
  tagline?: string;
}

export interface InviteResult {
  id: string;
  email: string;
  role: "OWNER" | "ADMIN" | "ASSOCIATE";
  type: "FOUNDER" | "MEMBER";
  inviteUrl: string;
}

export async function validateInvite(token: string): Promise<InviteInfo> {
  const res = await fetch(`/api/auth/invites/${encodeURIComponent(token)}`, {
    cache: "no-store"
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || "This invite is invalid or expired");
  }
  return data as InviteInfo;
}

export async function registerWithInvite(
  payload: RegisterWithInvitePayload
): Promise<User> {
  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || "Failed to create your account");
  }
  return data.user as User;
}

export async function getGoogleProfile(code: string): Promise<{
  googleId: string;
  email: string;
  name: string | null;
  picture: string | null;
}> {
  const res = await fetch(
    `/api/auth/google/profile?code=${encodeURIComponent(code)}`,
    { cache: "no-store" }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || "Could not load your Google profile");
  }
  return data;
}

export function googleAuthUrl(inviteToken?: string): string {
  return inviteToken
    ? `/api/auth/google?invite=${encodeURIComponent(inviteToken)}`
    : "/api/auth/google";
}

export async function inviteMember(payload: {
  email: string;
  role?: "ADMIN" | "ASSOCIATE";
}): Promise<InviteResult> {
  const res = await fetch("/api/auth/invites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || "Failed to create invitation");
  }
  return data as InviteResult;
}

/** Founder invite (SUPER_ADMIN only): the recipient onboards to create their firm. */
export async function inviteFounder(email: string): Promise<InviteResult> {
  const res = await fetch("/api/auth/invites/founder", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || "Failed to create invitation");
  }
  return data as InviteResult;
}
