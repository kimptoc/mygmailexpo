export const EVENT_REFRESH_GUARD_MS = 15_000;

export interface StoredWebSession {
  accessToken?: string;
  userEmail?: string;
}

export interface RestoreSessionDeps {
  storedSession: StoredWebSession | null;
  refreshToken: string | null;
  refreshAccessToken: (refreshToken: string) => Promise<string | null>;
  validateAccessToken: (accessToken: string) => Promise<boolean>;
}

export type RestoreSessionResult =
  | {
      kind: 'authenticated';
      accessToken: string;
      userEmail: string;
      persistUpdatedToken: boolean;
    }
  | {
      kind: 'unauthenticated';
      clearStoredSession: boolean;
    };

export function shouldRunEventRefresh(
  nowMs: number,
  lastRefreshAttemptMs: number,
  minIntervalMs: number = EVENT_REFRESH_GUARD_MS
): boolean {
  return nowMs - lastRefreshAttemptMs >= minIntervalMs;
}

export function shouldRequestConsentPrompt(hasStoredRefreshToken: boolean): boolean {
  return !hasStoredRefreshToken;
}

export async function restoreWebSession({
  storedSession,
  refreshToken,
  refreshAccessToken,
  validateAccessToken,
}: RestoreSessionDeps): Promise<RestoreSessionResult> {
  const accessToken = storedSession?.accessToken;
  const userEmail = storedSession?.userEmail;

  if (!accessToken || !userEmail) {
    return { kind: 'unauthenticated', clearStoredSession: true };
  }

  if (refreshToken) {
    const refreshedAccessToken = await refreshAccessToken(refreshToken);
    if (refreshedAccessToken) {
      return {
        kind: 'authenticated',
        accessToken: refreshedAccessToken,
        userEmail,
        persistUpdatedToken: true,
      };
    }
  }

  try {
    const isValid = await validateAccessToken(accessToken);
    if (isValid) {
      return {
        kind: 'authenticated',
        accessToken,
        userEmail,
        persistUpdatedToken: false,
      };
    }
    return { kind: 'unauthenticated', clearStoredSession: true };
  } catch {
    // Offline/transient network: keep existing session and let API retry logic handle refresh/401 later.
    return {
      kind: 'authenticated',
      accessToken,
      userEmail,
      persistUpdatedToken: false,
    };
  }
}
