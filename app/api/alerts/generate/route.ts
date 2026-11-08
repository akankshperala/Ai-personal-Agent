
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@insforge/sdk/ssr";
import { hasInsforgeAdminKey } from "@/lib/insforge-admin";
import { generateAutomaticAlertsForUser } from "@/lib/alert-auto-generation";

export async function POST(req: NextRequest) {
  try {
    if (!hasInsforgeAdminKey) {
      return NextResponse.json(
        { error: "INSFORGE_API_KEY is required to generate alerts." },
        { status: 503 }
      );
    }

    const insforge = createServerClient({
      baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL!,
      anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!,
      cookies: await cookies(),
    });

    const { data: authData, error: authError } =
      await insforge.auth.getCurrentUser();

    if (authError || !authData?.user) {
      return NextResponse.json(
        { error: "Your session has expired. Please sign in again." },
        { status: 401 }
      );
    }
  
    const cookieHeader = req.headers.get("cookie") || "";
    const { userId } = await req.json();
    const authenticatedUserId = authData.user.id;

    if (userId && userId !== authenticatedUserId) {
      return NextResponse.json(
        { error: "Unauthorized user." },
        { status: 403 }
      );
    }

    const result = await generateAutomaticAlertsForUser(
      authenticatedUserId,
      cookieHeader
    );

    return NextResponse.json({ success: true, ...result });
  } catch (err: unknown) {
    console.error("Error in POST /api/alerts/generate:", err);

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
