import React, { useState } from 'react';
import {
  ArrowRight, HardHat, TrendingUp, Settings,
  Users, Phone, Mail, Lock, Star, ShieldCheck, X, Send, MessageSquare
} from 'lucide-react';
import { Lead } from '../types';
import { supabase } from '../services/supabaseClient';

interface LandingPageProps {
  onLoginClick: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLoginClick }) => {
  const [imageError, setImageError] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '', message: '' });

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.phone || !formData.message) return;

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('leads')
        .insert([
          {
            name: formData.name || 'Cliente',
            phone: formData.phone,
            message: formData.message,
            status: 'New'
          }
        ]);

      if (error) throw error;

      setIsModalOpen(false);
      setFormData({ name: '', phone: '', message: '' });
      alert('Mensagem enviada com sucesso! Entraremos em contato em breve.');
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Erro ao enviar mensagem. Por favor, tente novamente ou use o WhatsApp.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Navbar */}
      <nav className="fixed w-full z-50 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="bg-white p-2 rounded-full shadow-lg border-2 border-orange-500">
                <HardHat className="text-orange-600" size={24} />
              </div>
              <div className="leading-tight">
                <h1 className="text-2xl font-black text-white tracking-tight">BETO</h1>
                <p className="text-[10px] text-orange-500 font-bold uppercase tracking-widest">Soluções em Aço</p>
              </div>
            </div>

            {/* Desktop Menu / Restricted Access */}
            <div className="flex items-center gap-6">
              <a href="#servicos" className="hidden md:block text-slate-300 hover:text-white text-sm font-medium transition-colors">Serviços</a>
              <a href="#sobre" className="hidden md:block text-slate-300 hover:text-white text-sm font-medium transition-colors">Sobre</a>
              <a href="#contato" className="hidden md:block text-slate-300 hover:text-white text-sm font-medium transition-colors">Contato</a>

              <button
                onClick={onLoginClick}
                className="group flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-5 py-2.5 rounded-full font-bold text-sm transition-all shadow-lg hover:shadow-orange-500/20 transform hover:-translate-y-0.5"
              >
                <Lock size={16} className="opacity-70 group-hover:opacity-100" />
                Área do Gestor
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-12 lg:pt-40 lg:pb-24 bg-slate-900 overflow-hidden">
        {/* Background Patterns */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-800"></div>
          <svg className="absolute top-0 right-0 h-full w-full opacity-10" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M50 0 L100 100 L0 100 Z" fill="#ea580c" />
          </svg>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-8 items-center">

            {/* Left Content */}
            <div className="space-y-8 animate-in slide-in-from-left duration-700 z-20">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800 border border-slate-700 text-orange-400 text-xs font-bold uppercase tracking-wide shadow-lg">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                </span>
                Inteligência para sua Indústria
              </div>

              <h1 className="text-5xl lg:text-7xl font-black text-white leading-[1.1]">
                O seu parceiro <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-500 to-yellow-500">
                  Especialista em Aço
                </span>
              </h1>

              <p className="text-lg text-slate-300 max-w-xl leading-relaxed border-l-4 border-orange-600 pl-4">
                Olá, eu sou o <strong>Beto</strong>! Estou aqui para otimizar sua trefilação, calcular suas malhas e organizar sua consultoria técnica com precisão de engenheiro.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <a
                  href="#contato"
                  className="flex items-center justify-center gap-2 bg-white text-slate-900 px-8 py-4 rounded-xl font-bold text-lg hover:bg-slate-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] transform hover:-translate-y-1"
                >
                  Falar com o Beto
                  <ArrowRight size={20} />
                </a>
                <button
                  onClick={onLoginClick}
                  className="flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-bold text-lg text-white border border-slate-700 hover:bg-slate-800 hover:border-slate-500 transition-all"
                >
                  Entrar no Sistema
                </button>
              </div>

              <div className="flex items-center gap-4 text-slate-500 text-sm font-medium pt-4">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="w-8 h-8 rounded-full border-2 border-slate-900 bg-slate-700"></div>
                  ))}
                </div>
                <p>+50 empresas atendidas e satisfeitas com o resultado</p>
              </div>
            </div>

            {/* Right Character Image - Reverted to clean fallback if image missing */}
            <div className="relative lg:h-[600px] flex items-end justify-center lg:justify-end animate-in slide-in-from-bottom duration-1000 delay-200 min-h-[400px]">
              {/* Glow Effect */}
              <div className="absolute bottom-10 right-10 w-[300px] h-[300px] bg-orange-500 rounded-full blur-[100px] opacity-20"></div>

              {/* Character Image Container */}
              <div className="relative z-10 w-full max-w-[500px] flex justify-center items-center">
                {!imageError ? (
                  <img
                    src="/images/beto-pixar.jpg"
                    alt="Beto - Assistente Virtual"
                    onError={() => setImageError(true)}
                    className="w-full h-auto drop-shadow-2xl hover:scale-105 transition-transform duration-700 ease-in-out"
                    style={{
                      maskImage: 'linear-gradient(to bottom, black 85%, transparent 100%)',
                      WebkitMaskImage: 'linear-gradient(to bottom, black 85%, transparent 100%)'
                    }}
                  />
                ) : (
                  /* Clean Professional Fallback - "Inicial Style" */
                  <div className="relative group flex items-center justify-center w-[350px] h-[350px] bg-slate-800 rounded-full border-4 border-slate-700 shadow-2xl">
                    <HardHat size={180} className="text-orange-500 drop-shadow-[0_0_15px_rgba(234,88,12,0.5)]" />
                    <div className="absolute -bottom-4 bg-white text-slate-900 px-6 py-2 rounded-full font-bold shadow-lg">
                      BETO
                    </div>
                  </div>
                )}

                {/* Floating Card 1: Efficiency */}
                <div className="absolute top-20 -left-4 md:-left-12 bg-slate-800/80 backdrop-blur-md p-3 rounded-xl border border-slate-600 shadow-xl flex items-center gap-3 animate-bounce duration-[3000ms]">
                  <div className="bg-green-500/20 p-2 rounded-lg">
                    <TrendingUp size={20} className="text-green-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase font-bold">Eficiência</p>
                    <p className="text-white font-bold">+28% Garantido</p>
                  </div>
                </div>

                {/* Floating Card 2: Security */}
                <div className="absolute bottom-32 -right-4 md:-right-8 bg-slate-800/80 backdrop-blur-md p-3 rounded-xl border border-slate-600 shadow-xl flex items-center gap-3 animate-bounce duration-[4000ms] delay-700">
                  <div className="bg-orange-500/20 p-2 rounded-lg">
                    <ShieldCheck size={20} className="text-orange-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase font-bold">Qualidade</p>
                    <p className="text-white font-bold">Norma ABNT</p>
                  </div>
                </div>

                {/* Floating Card 3: Status */}
                <div className="absolute bottom-10 left-10 bg-white/90 backdrop-blur-md px-4 py-2 rounded-full shadow-xl flex items-center gap-2 animate-pulse">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span className="text-slate-900 font-bold text-sm">Beto Online Agora</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="servicos" className="py-20 bg-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-orange-600 font-bold uppercase tracking-wider text-sm mb-2 flex items-center justify-center gap-2">
              <Star size={16} fill="currentColor" /> Excelência em Aço
            </h2>
            <h3 className="text-4xl font-black text-slate-900">Como posso ajudar sua empresa?</h3>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-slate-50 p-8 rounded-2xl border border-slate-100 hover:shadow-xl hover:shadow-orange-500/10 transition-all duration-300 group hover:-translate-y-2">
              <div className="bg-white w-16 h-16 rounded-2xl flex items-center justify-center shadow-md mb-6 group-hover:bg-orange-600 transition-colors duration-300">
                <Settings className="text-orange-600 group-hover:text-white" size={32} />
              </div>
              <h4 className="text-xl font-bold text-slate-900 mb-3">Máquinas e Trefilação</h4>
              <p className="text-slate-600 leading-relaxed mb-6">
                Eu calculo o plano de passes ideal para suas máquinas, garantindo a redução exata da área e maior durabilidade das fieiras.
              </p>
              <div className="w-full bg-slate-200 h-1 rounded-full overflow-hidden">
                <div className="bg-orange-500 h-full w-3/4"></div>
              </div>
              <p className="text-xs text-slate-400 mt-2 text-right">Precisão de 99%</p>
            </div>

            <div className="bg-slate-50 p-8 rounded-2xl border border-slate-100 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 group hover:-translate-y-2">
              <div className="bg-white w-16 h-16 rounded-2xl flex items-center justify-center shadow-md mb-6 group-hover:bg-blue-600 transition-colors duration-300">
                <TrendingUp className="text-blue-600 group-hover:text-white" size={32} />
              </div>
              <h4 className="text-xl font-bold text-slate-900 mb-3">Produção de Malhas</h4>
              <p className="text-slate-600 leading-relaxed mb-6">
                Tenha controle total sobre a produção de malhas pop e treliças. Eu ajudo você a converter Kg em unidades e evitar desperdícios.
              </p>
              <div className="w-full bg-slate-200 h-1 rounded-full overflow-hidden">
                <div className="bg-blue-500 h-full w-4/5"></div>
              </div>
              <p className="text-xs text-slate-400 mt-2 text-right">Otimização de Estoque</p>
            </div>

            <div className="bg-slate-50 p-8 rounded-2xl border border-slate-100 hover:shadow-xl hover:shadow-green-500/10 transition-all duration-300 group hover:-translate-y-2">
              <div className="bg-white w-16 h-16 rounded-2xl flex items-center justify-center shadow-md mb-6 group-hover:bg-green-600 transition-colors duration-300">
                <Users className="text-green-600 group-hover:text-white" size={32} />
              </div>
              <h4 className="text-xl font-bold text-slate-900 mb-3">Consultoria Técnica</h4>
              <p className="text-slate-600 leading-relaxed mb-6">
                Agende uma visita técnica. Vou até sua fábrica (ou remotamente) para treinar sua equipe e auditar seus processos produtivos.
              </p>
              <div className="w-full bg-slate-200 h-1 rounded-full overflow-hidden">
                <div className="bg-green-500 h-full w-full"></div>
              </div>
              <p className="text-xs text-slate-400 mt-2 text-right">Satisfação Garantida</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="contato" className="py-20 bg-slate-900 relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute top-0 right-0 w-2/3 h-full bg-slate-800/50 transform -skew-x-12 translate-x-32"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-500 rounded-full blur-[120px] opacity-20"></div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-block p-3 rounded-full bg-slate-800 border-4 border-slate-700 mb-6 shadow-2xl">
            <HardHat size={48} className="text-orange-500" />
          </div>

          <h2 className="text-3xl md:text-5xl font-black text-white mb-6">Vamos modernizar sua fábrica hoje?</h2>
          <p className="text-lg text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Não perca tempo com cálculos manuais e processos ultrapassados. Deixe o <strong>Beto</strong> cuidar da parte técnica enquanto você foca no crescimento.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <a
              href={`https://wa.me/5511995687186?text=${encodeURIComponent(`Olá! Você está falando com a Beto Soluções em Aço.
Agradecemos seu contato.
Em que podemos auxiliar?`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-3 bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-xl font-bold text-lg transition-transform hover:scale-105 shadow-lg shadow-green-900/20"
            >
              <Phone size={24} />
              Chamar no WhatsApp
            </a>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center justify-center gap-3 bg-white hover:bg-slate-100 text-slate-900 px-8 py-4 rounded-xl font-bold text-lg transition-transform hover:scale-105 shadow-lg"
            >
              <MessageSquare size={24} />
              Enviar Mensagem
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 py-12 border-t border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="bg-slate-900 p-2 rounded-full border border-slate-800">
                <HardHat className="text-orange-600" size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-white tracking-tight">BETO</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase">Soluções em Aço</p>
              </div>
            </div>

            <div className="flex gap-8 text-sm font-medium text-slate-400">
              <a href="#" className="hover:text-white transition-colors">Termos de Uso</a>
              <a href="#" className="hover:text-white transition-colors">Privacidade</a>
              <a href="#" className="hover:text-white transition-colors">Suporte</a>
            </div>

            <p className="text-slate-600 text-xs">
              &copy; {new Date().getFullYear()} Beto Soluções em Aço.
            </p>
          </div>
        </div>
      </footer>
      {/* Message Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="bg-slate-900 p-6 flex justify-between items-center text-white">
              <div className="flex items-center gap-2">
                <MessageSquare className="text-orange-500" />
                <h3 className="text-xl font-bold">Fale com o Beto</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSendMessage} className="p-6 space-y-4">
              <div className="bg-orange-50 border border-orange-200 text-orange-800 p-3 rounded-lg text-sm mb-4">
                Deixe seu contato e uma breve mensagem. Retornarei o mais breve possível!
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Seu Nome (Opcional)</label>
                <div className="relative">
                  <input
                    type="text"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                    placeholder="Como prefere ser chamado?"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                  />
                  <Users className="absolute left-3 top-3.5 text-slate-400" size={18} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Seu WhatsApp / Celular <span className="text-red-500">*</span></label>
                <div className="relative">
                  <input
                    type="tel"
                    required
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                    placeholder="(11) 99999-9999"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  />
                  <Phone className="absolute left-3 top-3.5 text-slate-400" size={18} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Mensagem <span className="text-red-500">*</span></label>
                <textarea
                  required
                  rows={4}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-all resize-none"
                  placeholder="Olá Beto, gostaria de saber mais sobre..."
                  value={formData.message}
                  onChange={e => setFormData({ ...formData, message: e.target.value })}
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-orange-500/20 transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                ) : (
                  <Send size={20} />
                )}
                {isSubmitting ? 'Enviando...' : 'Enviar Mensagem'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;
