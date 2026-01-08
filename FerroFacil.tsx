import React, { useState, useEffect } from 'react';
import { ArrowLeft, Construction, LogOut } from 'lucide-react';
import { supabase } from './ferrofacil/services/supabaseClient';
import { authService } from './ferrofacil/services/authService';
import HardwareQuoteModule from './ferrofacil/components/HardwareQuoteModule';
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
        <div className="relative min-h-screen bg-slate-950 text-slate-200 selection:bg-orange-500/30">
            {/* Background Decorative Elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-orange-600/10 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute top-[20%] -right-[10%] w-[30%] h-[30%] bg-amber-600/10 rounded-full blur-[100px]"></div>
                <div className="absolute -bottom-[10%] left-[20%] w-[50%] h-[50%] bg-blue-600/5 rounded-full blur-[150px]"></div>
            </div>

            {/* Header Fixa de Navegação Premium */}
            <div className="fixed top-0 left-0 right-0 h-20 glass-dark border-b border-white/5 z-[60] flex items-center justify-between px-6">
                <div className="flex items-center gap-6">
                    <button
                        onClick={onBack}
                        className="flex items-center gap-2 text-slate-400 hover:text-white transition-all font-bold text-xs uppercase tracking-widest group"
                    >
                        <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center group-hover:bg-white/10 group-hover:border-white/20 transition-all">
                            <ArrowLeft size={16} />
                        </div>
                        <span className="hidden sm:block">Projetos</span>
                    </button>

                    <div className="h-6 w-px bg-white/10 hidden sm:block"></div>

                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 premium-gradient rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20 rotate-3">
                            <Construction size={20} className="text-white" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-white font-black tracking-tighter text-xl leading-none">FERRO FÁCIL</span>
                            <span className="text-[10px] font-bold text-orange-500 tracking-[0.2em] uppercase leading-none mt-1">Cálculo Técnico</span>
                        </div>
                    </div>
                </div>

                {auth.isAuthenticated ? (
                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex flex-col items-end mr-2">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Acesso:</span>
                            <span className="text-sm font-bold text-slate-200 leading-none mt-1">{auth.user?.username}</span>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/30 text-slate-300 hover:text-red-500 px-4 py-2 rounded-xl transition-all font-bold text-xs"
                        >
                            <LogOut size={16} />
                            <span className="hidden sm:block">ENCERRAR</span>
                        </button>
                    </div>
                ) : (
                    <div className="w-20"></div>
                )}
            </div>

            <div className="pt-24 min-h-screen relative z-10">
                {auth.isAuthenticated ? (
                    <main className="max-w-7xl mx-auto p-4 md:p-8">
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                            <HardwareQuoteModule />
                        </div>
                    </main>
                ) : showLogin ? (
                    <div className="animate-in fade-in zoom-in-95 duration-500">
                        <LoginScreen
                            onLogin={handleLogin}
                            onBack={() => setShowLogin(false)}
                        />
                    </div>
                ) : (
                    <div className="animate-in fade-in duration-1000">
                        <LandingPage onLoginClick={() => setShowLogin(true)} />
                    </div>
                )}
            </div>
        </div>
    );
};
