
import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { supabase } from './ferrofacil/services/supabaseClient';
import { authService } from './ferrofacil/services/authService';
import Dashboard from './ferrofacil/components/Dashboard';
import LoginScreen from './ferrofacil/components/LoginScreen';
import LandingPage from './ferrofacil/components/LandingPage';
import { AuthState } from './ferrofacil/types';

interface FerroFacilProps {
    onBack: () => void;
}

export const FerroFacil: React.FC<FerroFacilProps> = ({ onBack }) => {
    const [auth, setAuth] = useState<AuthState>({
        isAuthenticated: false,
        user: null
    });
    const [showLogin, setShowLogin] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check active session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSessionUser(session);
            setIsLoading(false);
        });

        // Listen for changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSessionUser(session);
            if (session) {
                setShowLogin(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const setSessionUser = (session: any) => {
        if (session?.user) {
            const username = session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'User';
            setAuth({
                isAuthenticated: true,
                user: {
                    id: session.user.id,
                    username: username,
                    name: username,
                    role: session.user.user_metadata?.role || 'gestor',
                    permissions: session.user.user_metadata?.permissions || []
                }
            });
        } else {
            setAuth({ isAuthenticated: false, user: null });
        }
    };

    const handleLogin = () => {
        // Real auth is handled by session listener
    };

    const handleLogout = async () => {
        await authService.logout();
        setAuth({
            isAuthenticated: false,
            user: null
        });
        setShowLogin(false);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
                    <p className="font-black uppercase tracking-widest text-sm animate-pulse">Carregando Ferro Fácil...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="relative min-h-screen">
            {/* Botão de Voltar Flutuante */}
            <button
                onClick={onBack}
                className="fixed top-4 left-4 z-[100] p-3 bg-slate-900/80 backdrop-blur-md border border-white/10 text-white rounded-full hover:bg-orange-600 transition-all shadow-2xl group flex items-center gap-2 overflow-hidden max-w-[48px] hover:max-w-[150px]"
            >
                <ArrowLeft size={24} className="shrink-0" />
                <span className="font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">Voltar Projetos</span>
            </button>

            {auth.isAuthenticated ? (
                <Dashboard
                    username={auth.user?.username || 'Gestor'}
                    onLogout={handleLogout}
                    userRole={auth.user?.role}
                    userPermissions={auth.user?.permissions || []}
                />
            ) : showLogin ? (
                <LoginScreen
                    onLogin={handleLogin}
                    onBack={() => setShowLogin(false)}
                />
            ) : (
                <LandingPage onLoginClick={() => setShowLogin(true)} />
            )}
        </div>
    );
};
