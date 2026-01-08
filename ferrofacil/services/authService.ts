import { supabase } from './supabaseClient';

const EMAIL_DOMAIN = 'betosolucoes.com';

export const authService = {
    // Converte username simples para email falso
    getEmailFromUsername: (username: string) => {
        // Remove espaços e deixa minusculo
        const cleanUser = username.trim().toLowerCase().replace(/\s+/g, '');
        return `${cleanUser}@${EMAIL_DOMAIN}`;
    },

    signIn: async (username: string) => {
        const email = authService.getEmailFromUsername(username);
        // Para simplificar, vamos assumir uma senha padrão ou que o usuário digite a senha.
        // O usuário pediu "login simples", então vamos pedir a senha no UI mas usar o email gerado.
        return { email };
    },

    // Helper para criar usuário (apenas para uso interno/admin)
    signUp: async (username: string, password: string, role: string = 'user', permissions: string[] = []) => {
        const email = authService.getEmailFromUsername(username);

        // Armazena username no metadata para usar no trigger de profile
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    username: username.trim(),
                    role: role,
                    permissions: permissions
                }
            }
        });

        return { data, error };
    },

    logout: async () => {
        await supabase.auth.signOut();
    }
};

