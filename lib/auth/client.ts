'use client';

import { createAuthClient } from '@neondatabase/auth/next';

/**
 * Browser auth client. Requires NEXT_PUBLIC_NEON_AUTH_URL or NEON_AUTH_BASE_URL
 * available to the client build when using Google sign-in UI.
 */
export const authClient =
  typeof window !== 'undefined' || process.env.NEXT_PUBLIC_NEON_AUTH_URL
    ? createAuthClient()
    : (null as unknown as ReturnType<typeof createAuthClient>);

export function neonAuthClientReady(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_NEON_AUTH_URL || process.env.NEON_AUTH_BASE_URL
  );
}
