export interface ActiveSession {
  userId: string;
  username: string;
  role: string;
  ip: string;
  userAgent: string;
  loginTime: string;
  lastSeen: string;
}

const sessions = new Map<string, ActiveSession>();
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

export function touchSession(
  userId: string,
  info: Omit<ActiveSession, "loginTime" | "lastSeen">
): void {
  const existing = sessions.get(userId);
  sessions.set(userId, {
    ...info,
    loginTime: existing?.loginTime ?? new Date().toISOString(),
    lastSeen: new Date().toISOString(),
  });
}

export function getActiveSessions(): ActiveSession[] {
  const cutoff = Date.now() - SESSION_TIMEOUT_MS;
  const active: ActiveSession[] = [];
  for (const [userId, session] of sessions.entries()) {
    if (new Date(session.lastSeen).getTime() > cutoff) {
      active.push(session);
    } else {
      sessions.delete(userId);
    }
  }
  return active.sort(
    (a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime()
  );
}

export function removeSession(userId: string): void {
  sessions.delete(userId);
}
