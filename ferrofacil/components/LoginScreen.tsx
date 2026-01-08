import React, { useState } from 'react';
import { User, Lock, HardHat, ArrowRight, AlertCircle, ArrowLeft } from 'lucide-react';
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

      // 1. Tenta logar normalmente
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError) {
        // Se falhar o login, verificamos se é um usuário legado tentando entrar pela primeira vez
        const isLegacyUser = (username === 'gestor' && password === '070223') || (username === 'beto' && password === '120674');

        if (isLegacyUser && authError.message.includes('Invalid login credentials')) {
          console.log("Migrando usuário legado para Supabase...");
          const { error: signUpError } = await authService.signUp(username, password);

          if (signUpError) {
            alert('Erro ao criar conta no Supabase: ' + signUpError.message);
            if (signUpError.message.includes('Password should be')) {
              alert('A senha padrão é muito fraca para o Supabase. Contate o admin.');
            }
          } else {
            // Conta criada com sucesso! Logar automaticamente agora.
            const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({
              email,
              password
            });

            if (!retryError && retryData.user) {
              onLogin(username);
              return;
            } else {
              if (retryError?.message.includes('Email not confirmed')) {
                alert('CONTA CRIADA, MAS BLOQUEADA.\n\nVocê precisa desativar a opção "Confirm Email" no painel do Supabase (Authentication -> Providers -> Email) para que o login funcione sem verificação de email.');
              } else {
                alert('Conta criada mas erro no login automático: ' + retryError?.message);
              }
            }
          }
        }

        if (authError.message.includes('Invalid login credentials')) {
          setError('Usuário ou senha incorretos.');
        } else if (authError.message.includes('Email not confirmed')) {
          setError('Email não confirmado. Desative "Confirm Email" no Supabase.');
          alert('ATENÇÃO: Vá no Supabase -> Authentication -> Providers -> Email e desative "Confirm Email".');
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
      setError('Erro ao tentar conectar. ' + err.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 relative overflow-hidden">
      {/* Background Decorative Elements simulating coils/steel environment */}
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <circle cx="0" cy="0" r="40" fill="#ea580c" />
          <circle cx="100" cy="100" r="50" fill="#ea580c" />
          <path d="M0 100 L100 0" stroke="#64748b" strokeWidth="0.5" />
        </svg>
      </div>

      {/* Back Button */}
      <button
        onClick={onBack}
        className="absolute top-6 left-6 flex items-center gap-2 text-slate-400 hover:text-white transition-colors z-20"
      >
        <ArrowLeft size={20} />
        <span className="font-medium">Voltar ao Início</span>
      </button>

      <div className="w-full max-w-md p-8 z-10">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header Section mimicking the character visuals */}
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-8 text-center relative overflow-hidden">
            {/* Abstract Circles Background */}
            <div className="absolute top-0 left-0 w-full h-full opacity-20">
              <div className="absolute top-[-50px] right-[-50px] w-40 h-40 bg-white rounded-full"></div>
            </div>

            <div className="inline-flex items-center justify-center p-4 bg-white rounded-full shadow-lg mb-4 border-4 border-slate-800 relative z-10">
              <HardHat size={48} className="text-orange-600" />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight relative z-10">BETO</h1>
            <p className="text-orange-100 font-medium text-sm tracking-widest uppercase mt-1 relative z-10">Soluções em Aço</p>
          </div>

          {/* Form Section */}
          <div className="p-8">
            <h2 className="text-2xl font-semibold text-slate-800 mb-6 text-center">Acesso Restrito</h2>

            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">Usuário</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User size={20} className="text-slate-400" />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors text-slate-900 placeholder-slate-400"
                    placeholder="ex: gestor"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">Senha</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock size={20} className="text-slate-400" />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors text-slate-900 placeholder-slate-400"
                    placeholder="••••••"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 font-bold transition-all disabled:opacity-70"
              >
                {isLoading ? 'Verificando...' : 'Entrar no Sistema'}
                {!isLoading && <ArrowRight size={20} />}
              </button>
            </form>
          </div>

          <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400">
              &copy; {new Date().getFullYear()} Beto Soluções em Aço. Acesso restrito a gestores.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
