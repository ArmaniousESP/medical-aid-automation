import { cookies } from 'next/headers';

export const ADMIN_COOKIE = 'maa_admin';

/** True if PROCESS_SECRET is unset (open mode) or cookie matches. */
export function isAdminUnlocked(): boolean {
  const secret = process.env.PROCESS_SECRET;
  if (!secret) return true;
  try {
    const jar = cookies();
    return jar.get(ADMIN_COOKIE)?.value === secret;
  } catch {
    return false;
  }
}

export function assertProcessSecretHeader(
  headerValue: string | null,
  queryValue?: string | null
): boolean {
  const secret = process.env.PROCESS_SECRET;
  if (!secret) return true;
  return headerValue === secret || queryValue === secret;
}
