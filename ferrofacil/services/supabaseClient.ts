
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_FERRO_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_FERRO_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("ERRO: Variáveis do Supabase para Ferro Fácil faltando no arquivo .env");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

