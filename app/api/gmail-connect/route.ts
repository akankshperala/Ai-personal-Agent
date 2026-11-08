
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@insforge/sdk/ssr";

async function getInsforgeServerClient() {
  return createServerClient({
    baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL!,
    anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!,
    cookies: await cookies(),
  });
}

export async function GET() {
  return NextResponse.json({
    clientId: process.env.GOOGLE_CLIENT_ID || "",
  });
}

export async function POST(req: NextRequest) {
  try {
    // 1. Create an authenticated InsForge server client
    const insforge = await getInsforgeServerClient();

    // 2. Verify the currently authenticated user
    const {
      data: authData,
      error: authError,
    } = await insforge.auth.getCurrentUser();

    if (authError || !authData?.user) {
      return NextResponse.json(
        { error: "Your session has expired. Please sign in again." },
        { status: 401 }
      );
    }

    const authenticatedUserId = authData.user.id;

    // 3. Read the Gmail authorization code
    const { code, userId } = await req.json();

    if (!code) {
      return NextResponse.json(
        { error: "Google authorization code is required." },
        { status: 400 }
      );
    }

    // Never allow a browser-supplied ID to select another user's record
    if (userId && userId !== authenticatedUserId) {
      return NextResponse.json(
        { error: "User identity mismatch." },
        { status: 403 }
      );
    }

    // 4. Verify Google OAuth credentials
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: "Google OAuth credentials are not configured." },
        { status: 500 }
      );
    }

    // 5. Exchange authorization code for Google tokens
    const googleResponse = await fetch(
      "https://oauth2.googleapis.com/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri:
            "http://localhost:3000/auth/gmail-callback",
          grant_type: "authorization_code",
        }),
      }
    );

    if (!googleResponse.ok) {
      const errorText = await googleResponse.text();

      console.error("Google token exchange failed:", errorText);

      return NextResponse.json(
        { error: "Google authorization failed. Please reconnect Gmail." },
        { status: 400 }
      );
    }

    const googleData = await googleResponse.json();

    const {
      access_token,
      refresh_token,
      expires_in,
    } = googleData;

    if (!access_token) {
      return NextResponse.json(
        { error: "Google did not return an access token." },
        { status: 400 }
      );
    }

    // 6. Fetch the authenticated user's existing integrations
    const { data: dbUser, error: dbError } = await insforge.database
      .from("users")
      .select("integrations")
      .eq("id", authenticatedUserId)
      .maybeSingle();

    if (dbError) {
      console.error("Failed to fetch user integrations:", dbError);

      return NextResponse.json(
        { error: "Could not retrieve your database profile." },
        { status: 500 }
      );
    }

    if (!dbUser) {
      return NextResponse.json(
        { error: "Your user profile was not found in the database." },
        { status: 404 }
      );
    }

    // 7. Preserve other integrations and any existing refresh token
    const currentIntegrations = dbUser.integrations || {};

    const updatedIntegrations = {
      ...currentIntegrations,
      gmail: {
        connected: true,
        accessToken: access_token,
        refreshToken:
          refresh_token ||
          currentIntegrations.gmail?.refreshToken ||
          null,
        expiresAt:
          Date.now() + (expires_in || 3600) * 1000,
        isSimulated: false,
        email: currentIntegrations.gmail?.email || "",
      },
    };

    // 8. Save Gmail integration to the authenticated user's row
    const { error: updateError } = await insforge.database
      .from("users")
      .update({
        integrations: updatedIntegrations,
      })
      .eq("id", authenticatedUserId);

    if (updateError) {
      console.error("Failed to save Gmail integration:", updateError);

      return NextResponse.json(
        { error: "Failed to save Gmail integration to the database." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Gmail connected successfully.",
    });

  } catch (err: unknown) {
    console.error("Gmail connect exception:", err);

    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
