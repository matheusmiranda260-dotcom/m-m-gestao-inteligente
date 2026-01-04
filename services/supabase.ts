
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
    console.error("ERRO: Variáveis do Supabase faltando no arquivo .env");
}

export const supabase = (supabaseUrl && supabaseKey)
    ? createClient(supabaseUrl, supabaseKey)
    : {
        from: () => ({
            select: () => ({
                order: () => Promise.resolve({ data: [], error: null }),
                single: () => Promise.resolve({ data: null, error: null }),
                then: (cb: any) => cb({ data: [], error: null })
            }),
            insert: () => ({
                select: () => ({
                    single: () => Promise.resolve({ data: {}, error: null })
                })
            }),
            delete: () => ({
                eq: () => Promise.resolve({ error: null })
            }),
            update: () => ({
                eq: () => Promise.resolve({ error: null })
            }),
            single: () => Promise.resolve({ data: null, error: null })
        })
    } as any;
