import { NextResponse } from "next/server";
import { verifyOtp } from "@/lib/otp-store";
import { createClient } from "@insforge/sdk";
import { createClient as createAdminClient } from "@insforge/sdk";

const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL || "https://3ewxfrr2.us-east.insforge.app";
const anonKey = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3OC0xMjM0LTU2NzgtOTBhYi1jZGVmMTIzNDU2NzgiLCJlbWFpbCI6ImFub25AaW5zZm9yZ2UuY29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2ODcyMTV9.P1S_tU083Bp2wZreDffcM8UTbHqrzh5YIJRGov35c8g";

export async function POST(request: Request) {
  try {
    const { phoneNumber, otp, method, name } = await request.json() as {
      phoneNumber: string;
      otp: string;
      method: "sms" | "whatsapp";
      name?: string;
    };

    if (!phoneNumber || !otp || !method) {
      return NextResponse.json(
        { error: "Phone number, OTP, and method are required" },
        { status: 400 }
      );
    }

    // Verify the OTP
    const isValid = verifyOtp(phoneNumber, method, otp);

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid or expired OTP. Please request a new code." },
        { status: 401 }
      );
    }

    // OTP is valid — find or create user in the database
    const insforgeAdmin = createAdminClient({ baseUrl, anonKey });

    // Check if a user with this phone already exists
    const { data: existingUser } = await insforgeAdmin.database
      .from("users")
      .select("*")
      .eq("phone", phoneNumber)
      .maybeSingle();

    const now = new Date().toISOString();

    if (existingUser) {
      // Update last login
      await insforgeAdmin.database
        .from("users")
        .update({
          last_login_at: now,
          verification_method: method,
        })
        .eq("id", existingUser.id);

      return NextResponse.json({
        success: true,
        user: {
          id: existingUser.id,
          name: existingUser.name,
          phone: phoneNumber,
          auth_provider: "phone",
          verification_method: method,
        },
        isNewUser: false,
      });
    } else {
      // Create a new user record for this phone-auth user
      // Generate a deterministic pseudo-UUID based on phone number for the user ID
      const crypto = await import("crypto");
      const userId = crypto.randomUUID();
      const displayName = name || `User ${phoneNumber.slice(-4)}`;

      const { data: newUser, error: insertError } = await insforgeAdmin.database
        .from("users")
        .insert([
          {
            id: userId,
            phone: phoneNumber,
            name: displayName,
            auth_provider: "phone",
            verification_method: method,
            created_at: now,
            last_login_at: now,
          },
        ])
        .select()
        .maybeSingle();

      if (insertError) {
        console.error("Error creating phone user:", insertError);
        return NextResponse.json(
          { error: "Failed to create user account" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        user: {
          id: newUser?.id || userId,
          name: displayName,
          phone: phoneNumber,
          auth_provider: "phone",
          verification_method: method,
        },
        isNewUser: true,
      });
    }
  } catch (error: unknown) {
    console.error("Error verifying OTP:", error);
    const message = error instanceof Error ? error.message : "Failed to verify OTP";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
