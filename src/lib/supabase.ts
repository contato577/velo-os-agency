import { createClient } from "@supabase/supabase-js";

// A "chave publicável" é feita pra ficar aqui no código do front-end — ela sozinha
// não dá acesso a nada; quem protege os dados de verdade são as políticas de
// segurança (RLS) que já configuramos no banco. Nunca coloque a "chave secreta"
// (sb_secret_...) neste arquivo — essa sim precisa ficar só no back-end.
const SUPABASE_URL = "https://jvazyjcwsttatpjjbzuu.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_DF_d4eML5o3u1UriYQ0oCg_Oed7Wx_O";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
