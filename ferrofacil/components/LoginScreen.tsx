
import React, { useState } from 'react';
import { User, Lock, HardHat, ArrowRight, AlertCircle, ArrowLeft, Construction } from 'lucide-react';
import { authService } from '../services/authService';
import { supabase } from '../services/supabaseClient';

interface LoginScreenProps {
  onLogin: (username: string) => void;
  onBack: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onBack }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const { email } = await authService.signIn(username);

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError) {
        const isLegacyUser = (username === 'gestor' && password === '070223') || (username === 'beto' && password === '120674');

        if (isLegacyUser && authError.message.includes('Invalid login credentials')) {
          const { error: signUpError } = await authService.signUp(username, password);

          if (!signUpError) {
            const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({
              email,
              password
            });

            if (!retryError && retryData.user) {
              onLogin(username);
              return;
            }
          }
        }

        if (authError.message.includes('Invalid login credentials')) {
          setError('Usuário ou senha incorretos.');
        } else if (authError.message.includes('Email not confirmed')) {
          setError('Email não confirmado no Supabase.');
        } else {
          setError(authError.message);
        }
        setIsLoading(false);
        return;
      }

      if (data.user) {
        onLogin(username);
      }
    } catch (err: any) {
      setError('Erro de conexão. ' + err.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 relative overflow-hidden font-sans">
      {/* Background Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-500/10 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '-2s' }}></div>

      {/* Back Button */}
      <button
        onClick={onBack}
        className="absolute top-12 left-12 flex items-center gap-3 text-slate-500 hover:text-white transition-all group z-20"
      >
        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-all">
          <ArrowLeft size={18} />
        </div>
        <span className="font-black uppercase tracking-[0.2em] text-[10px]">Voltar ao Início</span>
      </button>

      <div className="w-full max-w-md p-6 z-10 animate-in fade-in zoom-in duration-700">
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 to-amber-500 rounded-[3rem] blur opacity-20 group-hover:opacity-30 transition duration-1000"></div>

          <div className="relative bg-slate-900/60 backdrop-blur-2xl border border-white/10 rounded-[3rem] overflow-hidden shadow-2xl">
            {/* Header Section */}
            <div className="p-12 text-center border-b border-white/5">
              <div className="inline-flex items-center justify-center w-24 h-24 premium-gradient rounded-[2rem] shadow-2xl shadow-orange-500/20 mb-8 rotate-3">
                <Construction size={48} className="text-white" />
              </div>
              <h1 className="text-4xl font-black text-white tracking-tighter mb-2">FERRO FÁCIL</h1>
              <p className="text-slate-500 font-bold text-[10px] tracking-[0.4em] uppercase">Engenharia de Aço Inteligente</p>
            </div>

            {/* Form Section */}
            <div className="p-12 pt-10">
              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Usuário</label>
                  <div className="relative group/input">
                    <User size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within/input:text-orange-500 transition-colors" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full bg-black/20 border border-white/5 rounded-2xl py-5 pl-14 pr-6 text-white focus:outline-none focus:border-orange-500/50 focus:bg-black/40 transition-all placeholder:text-slate-700 font-bold"
                      placeholder="seu_usuario"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Chave de Acesso</label>
                  <div className="relative group/input">
                    <Lock size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within/input:text-orange-500 transition-colors" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-black/20 border border-white/5 rounded-2xl py-5 pl-14 pr-6 text-white focus:outline-none focus:border-orange-500/50 focus:bg-black/40 transition-all placeholder:text-slate-700 font-bold"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl text-[10px] font-black uppercase tracking-widest animate-in slide-in-from-top-2">
                    <AlertCircle size={16} />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full premium-gradient text-white py-6 rounded-[2rem] font-black uppercase tracking-[0.3em] text-xs shadow-2xl shadow-orange-500/30 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-4 group/btn"
                >
                  {isLoading ? 'Autenticando...' : 'Acessar Sistema'}
                  {!isLoading && <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform" />}
                </button>
              </form>
            </div>

            <div className="px-12 py-8 bg-black/40 border-t border-white/5 text-center">
              <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">
                Desenvolvido por M-M Gestão Inteligente
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
