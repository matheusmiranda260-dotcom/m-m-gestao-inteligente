
import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { supabase } from './ferrofacil/services/supabaseClient';
import { authService } from './ferrofacil/services/authService';
import HardwareQuoteModule from './ferrofacil/components/HardwareQuoteModule';
import LoginScreen from './ferrofacil/components/LoginScreen';
import LandingPage from './ferrofacil/components/LandingPage';
import { AuthState } from './ferrofacil/types';
import { LogOut } from 'lucide-react';

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
        <div className="relative min-h-screen bg-slate-50">
            {/* Header Fixa de Navegação do App Pai */}
            <div className="fixed top-0 left-0 right-0 h-16 bg-slate-900 border-b border-white/10 z-[60] flex items-center justify-between px-4">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-white hover:text-orange-500 transition-colors font-bold text-sm"
                >
                    <ArrowLeft size={20} />
                    <span>Voltar aos Projetos</span>
                </button>

                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                        <span className="text-slate-900 font-black text-xs italic">FF</span>
                    </div>
                    <span className="text-white font-black tracking-tighter hidden md:block">FERRO FÁCIL</span>
                </div>

                {auth.isAuthenticated ? (
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 text-slate-400 hover:text-red-500 transition-colors font-bold text-xs"
                    >
                        <LogOut size={16} />
                        <span className="hidden sm:block">Sair</span>
                    </button>
                ) : (
                    <div className="w-20"></div> /* spacer */
                )}
            </div>

            <div className="pt-16 min-h-screen">
                {auth.isAuthenticated ? (
                    <main className="max-w-7xl mx-auto p-4 md:p-8">
                        <HardwareQuoteModule />
                    </main>
                ) : showLogin ? (
                    <LoginScreen
                        onLogin={handleLogin}
                        onBack={() => setShowLogin(false)}
                    />
                ) : (
                    <LandingPage onLoginClick={() => setShowLogin(true)} />
                )}
            </div>
        </div>
    );
};
