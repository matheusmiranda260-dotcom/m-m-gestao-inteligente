
import React, { useState } from 'react';
import {
  ArrowRight, Construction, TrendingUp, Settings,
  Users, Phone, Mail, Lock, Star, ShieldCheck, X, Send, MessageSquare, ChevronRight
} from 'lucide-react';
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
      alert('Erro ao enviar mensagem. Por favor, tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-white selection:bg-orange-500/30">
      {/* Navbar */}
      <nav className="fixed w-full z-50 bg-slate-950/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="flex justify-between items-center h-24">
            {/* Logo */}
            <div className="flex items-center gap-4">
              <div className="premium-gradient p-3 rounded-2xl shadow-xl shadow-orange-500/20 rotate-3">
                <Construction className="text-white" size={28} />
              </div>
              <div className="leading-none">
                <h1 className="text-2xl font-black text-white tracking-tighter">FERRO FÁCIL</h1>
                <p className="text-[9px] text-orange-500 font-black uppercase tracking-[0.4em] mt-1">Smart Rebar Engineering</p>
              </div>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-10">
              <a href="#solucoes" className="text-slate-400 hover:text-white text-[10px] font-black uppercase tracking-widest transition-colors">Soluções</a>
              <a href="#tecnologia" className="text-slate-400 hover:text-white text-[10px] font-black uppercase tracking-widest transition-colors">Tecnologia</a>
              <button
                onClick={onLoginClick}
                className="group flex items-center gap-3 bg-white hover:bg-orange-500 text-slate-950 hover:text-white px-8 py-3.5 rounded-full font-black text-[10px] uppercase tracking-widest transition-all shadow-xl hover:shadow-orange-500/40 active:scale-95"
              >
                <Lock size={14} />
                Portal do Gestor
              </button>
            </div>

            {/* Mobile Login Only */}
            <button onClick={onLoginClick} className="md:hidden p-3 bg-white/5 rounded-2xl border border-white/10 text-orange-500">
              <Lock size={20} />
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-44 pb-20 lg:pt-56 lg:pb-32 overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-orange-500/10 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '-2s' }}></div>

        <div className="max-w-7xl mx-auto px-6 lg:px-12 relative z-10">
          <div className="grid lg:grid-cols-2 gap-20 items-center">

            {/* Left Content */}
            <div className="space-y-10 animate-in slide-in-from-left duration-1000">
              <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-white/5 border border-white/10 text-orange-500 text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl">
                <span className="w-2 h-2 bg-orange-500 rounded-full animate-ping"></span>
                Revolucionando a Construção Civil
              </div>

              <h1 className="text-6xl lg:text-8xl font-black leading-[0.9] tracking-tighter">
                O Futuro da <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-600 to-amber-600">
                  Armação Digital
                </span>
              </h1>

              <p className="text-xl text-slate-400 max-w-xl leading-relaxed font-medium">
                Cálculos instantâneos, resumos de peso precisos e detalhamento de projeto em segundos. O <strong>Ferro Fácil</strong> é a inteligência que sua obra precisava.
              </p>

              <div className="flex flex-col sm:flex-row gap-6 pt-6">
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="flex items-center justify-center gap-4 premium-gradient text-white px-10 py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] hover:shadow-[0_20px_40px_rgba(234,88,12,0.3)] transition-all transform hover:-translate-y-1 active:scale-95 shadow-xl shadow-orange-500/20"
                >
                  Solicitar Demo
                  <ChevronRight size={18} />
                </button>
                <button
                  onClick={onLoginClick}
                  className="flex items-center justify-center gap-4 bg-white/5 border border-white/10 hover:bg-white/10 text-white px-10 py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] transition-all active:scale-95"
                >
                  Acesso Interno
                </button>
              </div>

              <div className="flex items-center gap-6 pt-10">
                <div className="flex -space-x-3">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="w-12 h-12 rounded-2xl border-4 border-slate-950 bg-slate-800 flex items-center justify-center overflow-hidden">
                      <Users size={20} className="text-slate-600" />
                    </div>
                  ))}
                </div>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest leading-loose">Confiança de <br /><span className="text-white">+50 Engenheiros & Construtoras</span></p>
              </div>
            </div>

            {/* Right Side: Hero Visual */}
            <div className="relative flex justify-center items-center h-[500px] lg:h-[700px] animate-in slide-in-from-right duration-1000 delay-300">
              <div className="absolute inset-0 bg-gradient-to-tr from-orange-500/20 to-blue-500/20 rounded-[4rem] blur-[80px] opacity-30"></div>

              <div className="relative z-10 w-full max-w-lg aspect-square bg-slate-900 shadow-2xl rounded-[4rem] border border-white/5 flex flex-col items-center justify-center overflow-hidden group">
                <div className="absolute inset-0 bg-blue-blueprint-grid opacity-10"></div>

                {/* Premium Construction Visual Helper */}
                <div className="w-32 h-32 premium-gradient rounded-3xl flex items-center justify-center shadow-2xl mb-8 group-hover:scale-110 transition-transform duration-700">
                  <Construction size={64} className="text-white" />
                </div>

                <div className="text-center px-12">
                  <h3 className="text-2xl font-black text-white mb-4 tracking-tighter">ALTA PERFORMANCE</h3>
                  <p className="text-slate-500 text-sm font-medium leading-relaxed uppercase tracking-[0.1em]">Reduza desperdícios de aço em até 15% com orçamentos detalhados e técnicos.</p>
                </div>

                {/* Floating Elements */}
                <div className="absolute top-12 left-8 bg-slate-800/80 backdrop-blur-xl p-4 rounded-3xl border border-white/10 shadow-2xl flex items-center gap-4 animate-bounce duration-[5000ms]">
                  <div className="w-10 h-10 bg-green-500/20 rounded-2xl flex items-center justify-center text-green-500">
                    <TrendingUp size={20} />
                  </div>
                  <div className="text-left font-black tracking-widest">
                    <p className="text-[8px] text-slate-500 uppercase">Economia</p>
                    <p className="text-sm text-white">+15%</p>
                  </div>
                </div>

                <div className="absolute bottom-12 right-8 bg-slate-800/80 backdrop-blur-xl p-4 rounded-3xl border border-white/10 shadow-2xl flex items-center gap-4 animate-bounce duration-[6000ms] delay-1000">
                  <div className="w-10 h-10 bg-orange-500/20 rounded-2xl flex items-center justify-center text-orange-500">
                    <ShieldCheck size={20} />
                  </div>
                  <div className="text-left font-black tracking-widest">
                    <p className="text-[8px] text-slate-500 uppercase">Qualidade</p>
                    <p className="text-sm text-white">ISO 9001</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Solutions Grid */}
      <section id="solucoes" className="py-32 bg-slate-950 relative">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="text-center mb-24">
            <h2 className="text-orange-500 font-black uppercase tracking-[0.4em] text-[10px] mb-6 flex items-center justify-center gap-4">
              <div className="w-12 h-px bg-orange-500/30"></div>
              Excelência e Rigor Técnico
              <div className="w-12 h-px bg-orange-500/30"></div>
            </h2>
            <h3 className="text-5xl font-black text-white tracking-tighter">O que fazemos por você</h3>
          </div>

          <div className="grid md:grid-cols-3 gap-10">
            {[
              {
                icon: <Settings size={36} />,
                title: "Engenharia depasses",
                desc: "Cálculos ultra-precisos de trefilação e redução de área para maximizar vida útil.",
                accent: "orange"
              },
              {
                icon: <TrendingUp size={36} />,
                title: "Otimização de Peso",
                desc: "Resumos dinámicos de ferragem com conversão automática CM para KG por bitola.",
                accent: "blue"
              },
              {
                icon: <Users size={36} />,
                title: "Gestão de Obras",
                desc: "Organize todos os orçamentos por cliente e endereço de obra em um único lugar.",
                accent: "emerald"
              }
            ].map((sol, i) => (
              <div key={i} className="group relative bg-white/5 p-12 rounded-[3.5rem] border border-white/5 hover:border-white/10 transition-all duration-500 hover:-translate-y-4">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-[60px] group-hover:bg-orange-500/10 transition-all"></div>
                <div className="relative z-10">
                  <div className={`mb-10 w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center transition-all duration-500 group-hover:premium-gradient group-hover:text-white group-hover:rotate-6 text-slate-400`}>
                    {sol.icon}
                  </div>
                  <h4 className="text-2xl font-black text-white mb-6 tracking-tight group-hover:text-orange-500 transition-colors uppercase">{sol.title}</h4>
                  <p className="text-slate-500 font-medium leading-[1.8] group-hover:text-slate-400 transition-colors">{sol.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="tecnologia" className="py-20 max-w-7xl mx-auto px-6 lg:px-12">
        <div className="relative p-20 rounded-[4rem] bg-slate-900 overflow-hidden border border-white/5">
          <div className="absolute inset-0 bg-blue-blueprint-grid opacity-5"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-orange-500/10 rounded-full blur-[120px]"></div>

          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-12 text-center md:text-left">
            <div className="max-w-2xl">
              <h2 className="text-4xl md:text-6xl font-black text-white mb-8 tracking-tighter leading-[0.9]">Potencialize seu canteiro hoje</h2>
              <p className="text-lg text-slate-400 font-medium leading-relaxed">Não aceite menos que a precisão absoluta. Entre para a era da armadura digital com o Ferro Fácil.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-6 shrink-0">
              <button onClick={() => setIsModalOpen(true)} className="px-10 py-6 bg-white text-slate-950 font-black uppercase tracking-[0.3em] text-[10px] rounded-full hover:bg-orange-500 hover:text-white transition-all shadow-2xl active:scale-95">Solicitar Agora</button>
              <a href="https://wa.me/5511995687186" target="_blank" className="px-10 py-6 bg-green-500/10 border border-green-500/20 text-green-500 font-black uppercase tracking-[0.3em] text-[10px] rounded-full hover:bg-green-500/20 transition-all active:scale-95">WhatsApp</a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 py-20 border-t border-white/5 font-sans">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="flex flex-col md:flex-row justify-between items-center gap-12">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/5 rounded-2xl border border-white/10 text-orange-500">
                <Construction size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-white tracking-tighter uppercase">Ferro Fácil</h3>
                <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mt-1">Smart Rebar Engineering</p>
              </div>
            </div>

            <div className="flex gap-12">
              {['Termos', 'Privacidade', 'Support'].map(item => (
                <a key={item} href="#" className="text-[10px] font-black text-slate-600 uppercase tracking-widest hover:text-white transition-colors">{item}</a>
              ))}
            </div>

            <p className="text-slate-700 text-[10px] font-black uppercase tracking-[0.2em]">
              &copy; {new Date().getFullYear()} M-M Gestão Inteligente
            </p>
          </div>
        </div>
      </footer>

      {/* Contact Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/90 backdrop-blur-xl p-4 animate-in fade-in duration-300">
          <div className="bg-slate-900 rounded-[3rem] w-full max-w-md overflow-hidden shadow-2xl border border-white/10 animate-in zoom-in-95 duration-300">
            <div className="p-10 border-b border-white/5 flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black text-white tracking-tighter">FALE CONOSCO</h3>
                <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-1">Nossa equipe entrará em contato</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-500 hover:text-white transition-all"><X size={20} /></button>
            </div>

            <form onSubmit={handleSendMessage} className="p-10 space-y-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nome</label>
                <div className="relative group/input">
                  <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-700 group-focus-within/input:text-orange-500 transition-colors" size={18} />
                  <input type="text" className="w-full bg-black/20 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-orange-500/50 transition-all font-bold" placeholder="Digite seu nome" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">WhatsApp <span className="text-orange-500">*</span></label>
                <div className="relative group/input">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-700 group-focus-within/input:text-orange-500 transition-colors" size={18} />
                  <input type="tel" required className="w-full bg-black/20 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-orange-500/50 transition-all font-bold" placeholder="(00) 00000-0000" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Mensagem <span className="text-orange-500">*</span></label>
                <textarea required rows={3} className="w-full bg-black/20 border border-white/5 rounded-2xl p-6 text-white focus:outline-none focus:border-orange-500/50 transition-all font-bold resize-none" placeholder="No que podemos ajudar?" value={formData.message} onChange={e => setFormData({ ...formData, message: e.target.value })}></textarea>
              </div>

              <button type="submit" disabled={isSubmitting} className="w-full premium-gradient text-white py-6 rounded-[2rem] font-black uppercase tracking-[0.3em] text-xs shadow-2xl shadow-orange-500/30 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-4">
                {isSubmitting ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : <Send size={20} />}
                {isSubmitting ? 'ENVIANDO...' : 'ENVIAR AGORA'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;
