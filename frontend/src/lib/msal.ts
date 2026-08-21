// Mock MSAL auth helper for development and testing.
// In a full production setup, this would wrap @azure/msal-browser.

export interface UserSession {
  email: string;
  name: string;
}

const STORAGE_KEY = "presente_user_session";

export function getSession(): UserSession | null {
  if (typeof window === "undefined") return null;
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function saveSession(email: string, name: string): UserSession {
  const session: UserSession = { email, name };
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }
  return session;
}

export function clearSession(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function getAuthHeaders(): Record<string, string> {
  const session = getSession();
  if (!session) return {};
  // Under backend DEV_MODE, the bearer token can be the user's email directly
  return {
    Authorization: `Bearer ${session.email}`,
  };
}
