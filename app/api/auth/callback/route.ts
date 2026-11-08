
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { createAuthActions } from "@insforge/sdk/ssr";

export async function GET(request: NextRequest) {
    console.log(">>> OAUTH CALLBACK ROUTE HIT <<<");
  const code = request.nextUrl.searchParams.get("insforge_code");
  const cookieStore = await cookies();
  const verifier = cookieStore.get("insforge_code_verifier")?.value;

  if (!code || !verifier) {
    console.error("OAuth callback: missing code or verifier");

    return NextResponse.redirect(
      new URL("/sign-in?error=oauth", request.url)
    );
  }

  const response = NextResponse.redirect(
    new URL("/dashboard", request.url)
  );

  const auth = createAuthActions({
    requestCookies: request.cookies,
    responseCookies: response.cookies,
  });

  const { error } = await auth.exchangeOAuthCode(code, verifier);

  if (error) {
    console.error("OAuth code exchange failed:", error.message);

    return NextResponse.redirect(
      new URL("/sign-in?error=oauth", request.url)
    );
  }

  response.cookies.delete("insforge_code_verifier");

  console.log("OAuth code exchanged successfully");

  return response;
}
