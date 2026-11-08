/**
 * Server-side OTP store backed by a module-level Map.
 * In production, replace with Redis or a database table with TTL.
 */

interface OtpEntry {
  otp: string;
  expires: number;
  method: string;
}

// Module-level singleton — persists for the lifetime of the server process
const otpStore = new Map<string, OtpEntry>();

export function storeOtp(phoneNumber: string, method: string, otp: string, ttlMs = 10 * 60 * 1000): void {
  const storeKey = `${phoneNumber}:${method}`;
  otpStore.set(storeKey, { otp, expires: Date.now() + ttlMs, method });
}

export function verifyOtp(phoneNumber: string, method: string, otp: string): boolean {
  const storeKey = `${phoneNumber}:${method}`;
  const entry = otpStore.get(storeKey);

  if (!entry) return false;
  if (Date.now() > entry.expires) {
    otpStore.delete(storeKey);
    return false;
  }
  if (entry.otp !== otp) return false;

  // Consume the OTP (one-time use)
  otpStore.delete(storeKey);
  return true;
}
