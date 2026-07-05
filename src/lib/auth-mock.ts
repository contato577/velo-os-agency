// Auth mock — pronto para trocar por Supabase Auth quando o Cloud for ativado.
// Persiste em localStorage para simular sessão. Multi-perfil-ready.

const KEY = "veloce_session_v1";

export interface Session {
  email: string;
  name: string;
  role: "owner" | "admin" | "member";
  initials: string;
  loggedAt: string;
}

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export function signIn(email: string, name?: string): Session {
  const displayName = name?.trim() || email.split("@")[0].replace(/[._-]/g, " ");
  const initials = displayName
    .split(" ")
    .map((p) => p[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
  const session: Session = {
    email,
    name: displayName.replace(/\b\w/g, (c) => c.toUpperCase()),
    role: "owner",
    initials: initials || email.slice(0, 2).toUpperCase(),
    loggedAt: new Date().toISOString(),
  };
  window.localStorage.setItem(KEY, JSON.stringify(session));
  return session;
}

export function signOut() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}
