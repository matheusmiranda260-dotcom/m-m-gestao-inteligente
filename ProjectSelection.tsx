
import React from 'react';
import { LayoutDashboard, Sparkles, ArrowRight } from 'lucide-react';

interface ProjectSelectionProps {
    onSelect: (project: 'GESTO' | 'MARINE') => void;
}

export const ProjectSelection: React.FC<ProjectSelectionProps> = ({ onSelect }) => {
    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            {/* Background elements */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-emerald-500/10 rounded-full blur-[100px] animate-pulse" />
                <div className="absolute -bottom-[20%] -right-[10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[100px] animate-pulse delay-700" />
            </div>

            <div className="w-full max-w-4xl relative z-10 animate-in fade-in zoom-in duration-700">
                <div className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">
                        Qual sistema deseja <span className="text-emerald-500">acessar</span>?
                    </h1>
                    <p className="text-slate-400 text-lg">Selecione uma das plataformas disponíveis para gerenciar seu negócio.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* GESTÃO INTELIGENTE */}
                    <button
                        onClick={() => onSelect('GESTO')}
                        className="group relative bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-[2.5rem] text-left hover:bg-white/10 transition-all duration-500 hover:scale-[1.02] hover:-translate-y-1"
                    >
                        <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-all duration-500">
                            <LayoutDashboard className="text-emerald-500 w-8 h-8" />
                        </div>
                        <h2 className="text-3xl font-black text-white mb-2 tracking-tight">Gestão Inteligente</h2>
                        <p className="text-slate-400 font-medium leading-relaxed mb-8">
                            Controle financeiro avançado, lançamentos de cartões, despesas fixas e análise por IA.
                        </p>
                        <div className="flex items-center gap-2 text-emerald-500 font-black uppercase text-sm tracking-widest">
                            ENTRAR NO PAINEL <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform" />
                        </div>
                        <div className="absolute top-6 right-8 text-[100px] font-black text-white/5 select-none pointer-events-none">01</div>
                    </button>

                    {/* MARINE HOME CLEAR */}
                    <button
                        onClick={() => onSelect('MARINE')}
                        className="group relative bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-[2.5rem] text-left hover:bg-white/10 transition-all duration-500 hover:scale-[1.02] hover:-translate-y-1"
                    >
                        <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-all duration-500">
                            <Sparkles className="text-blue-500 w-8 h-8" />
                        </div>
                        <h2 className="text-3xl font-black text-white mb-2 tracking-tight">Marine Home Clear</h2>
                        <p className="text-slate-400 font-medium leading-relaxed mb-8">
                            Gestão de faxinas, agenda de clientes, controle de horários e produtividade.
                        </p>
                        <div className="flex items-center gap-2 text-blue-500 font-black uppercase text-sm tracking-widest">
                            ENTRAR NO PAINEL <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform" />
                        </div>
                        <div className="absolute top-6 right-8 text-[100px] font-black text-white/5 select-none pointer-events-none">02</div>
                    </button>

                    {/* FERRO FÁCIL */}
                    <button
                        onClick={() => (onSelect as any)('FERRO')}
                        className="group relative bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-[2.5rem] text-left hover:bg-white/10 transition-all duration-500 hover:scale-[1.02] hover:-translate-y-1 md:col-span-2"
                    >
                        <div className="w-16 h-16 bg-orange-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-all duration-500">
                            <LayoutDashboard className="text-orange-500 w-8 h-8" />
                        </div>
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <h2 className="text-3xl font-black text-white mb-2 tracking-tight">Ferro Fácil</h2>
                                <p className="text-slate-400 font-medium leading-relaxed mb-8">
                                    Cálculo técnico de ferragens, orçamentos rápidos e gestão de produção de aço.
                                </p>
                            </div>
                            <div className="flex items-center gap-2 text-orange-500 font-black uppercase text-sm tracking-widest whitespace-nowrap">
                                ENTRAR <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform" />
                            </div>
                        </div>
                        <div className="absolute top-6 right-8 text-[100px] font-black text-white/5 select-none pointer-events-none">03</div>
                    </button>
                </div>

                <div className="mt-16 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10 backdrop-blur-md">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">M$M SISTEMAS &copy; 2026</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
