import { supabase } from "./supabase";

export interface Session {
  email: string;
  name: string;
  role: "admin" | "operador";
  initials: string;
}

function toInitials(name: string, email: string): string {
  const base = (name || email).trim();
  const parts = base.split(" ").filter(Boolean);
  const initials = parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
  return initials || email.slice(0, 2).toUpperCase();
}

// Busca a sessão atual + o perfil (nome, papel) na tabela profiles.
// É assíncrono de verdade agora (antes era só ler do localStorage na hora).
export async function getSessionAsync(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, email, role")
    .eq("id", user.id)
    .single();

  const name = profile?.name ?? user.email ?? "";
  const email = profile?.email ?? user.email ?? "";
  return {
    email,
    name,
    role: (profile?.role as Session["role"]) ?? "operador",
    initials: toInitials(name, email),
  };
}

export async function signInReal(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signUpReal(email: string, password: string, name: string): Promise<boolean> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });
  if (error) throw error;
  // Se o Supabase exigir confirmação de e-mail, não vem sessão aqui — a pessoa
  // precisa clicar no link que chega por e-mail antes de conseguir entrar.
  return !!data.session;
}

export async function signOutReal(): Promise<void> {
  await supabase.auth.signOut();
}

// Traduz as mensagens de erro mais comuns do Supabase pra um português direto
export function traduzirErroAuth(message: string): string {
  if (message.includes("Invalid login credentials")) return "E-mail ou senha incorretos.";
  if (message.includes("User already registered"))
    return "Já existe uma conta com esse e-mail. Tente entrar em vez de criar conta.";
  if (message.includes("Password should be at least"))
    return "A senha precisa ter pelo menos 6 caracteres.";
  if (message.includes("Unable to validate email address")) return "E-mail inválido.";
  return message;
}
