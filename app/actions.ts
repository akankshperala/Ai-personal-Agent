"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createAuthActions } from "@insforge/sdk/ssr";
import { createServerClient } from "@insforge/sdk/ssr";

export async function signInWithGoogle() {
  const cookieStore = await cookies();
  const auth = createAuthActions({ cookies: cookieStore });

  const { data, error } = await auth.signInWithOAuth("google", {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
    skipBrowserRedirect: true,
  });

  if (error || !data?.url || !data?.codeVerifier) {
    throw new Error(error?.message || "Google sign-in could not start");
  }

  cookieStore.set("insforge_code_verifier", data.codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  redirect(data.url);
}

export async function signInWithEmail(email: string, password: string) {
  const auth = createAuthActions({
    cookies: await cookies(),
  });

  const { data, error } = await auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  return {
    success: true,
    user: data?.user ?? null,
  };
}
export async function signUpWithEmail(
  email: string,
  password: string,
  name: string
) {
  const auth = createAuthActions({
    cookies: await cookies(),
  });

  const { data, error } = await auth.signUp({
    email,
    password,
    name,
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/sign-in`,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    user: data?.user ?? null,
  };
}

export async function getAuthenticatedAppUser() {
  const insforge = createServerClient({
  baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL!,
  anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!,
  cookies: await cookies(),
});

  const { data, error } = await insforge.auth.getCurrentUser();

  if (error || !data?.user) {
    return {
      success: false,
      user: null,
      error: error?.message ?? null,
    };
  }

  const currentUser = data.user;
  const metadata = (currentUser.metadata ?? {}) as Record<string, unknown>;
  const profile = (currentUser.profile ?? {}) as Record<string, unknown>;

  const name =
    (typeof profile.name === "string" && profile.name) ||
    (typeof metadata.full_name === "string" && metadata.full_name) ||
    (typeof metadata.name === "string" && metadata.name) ||
    currentUser.email.split("@")[0];

  const avatarUrl =
    (typeof profile.avatar_url === "string" && profile.avatar_url) ||
    (typeof metadata.avatar_url === "string" && metadata.avatar_url) ||
    (typeof metadata.picture === "string" && metadata.picture) ||
    null;

  const { data: dbUser, error: dbError } = await insforge.database
    .from("users")
    .upsert({
      id: currentUser.id,
      email: currentUser.email,
      name,
      avatar_url: avatarUrl,
      auth_provider: "google",
      verification_method: "google",
      last_login_at: new Date().toISOString(),
    })
    .select("*")
    .maybeSingle();

  if (dbError) {
    console.error("User profile synchronization failed:", dbError.message);

    return {
      success: false,
      user: null,
      error: dbError.message,
    };
  }

  return {
    success: true,
    error: null,
    user: {
      ...currentUser,
      profile: {
        ...profile,
        name: dbUser?.name ?? name,
        avatar_url: dbUser?.avatar_url ?? avatarUrl,
      },
      integrations: dbUser?.integrations ?? {},
    },
  };
}

export async function signOutFromServer() {
  const auth = createAuthActions({
    cookies: await cookies(),
  });

  const { error } = await auth.signOut();

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  return { success: true, error: null };
}
