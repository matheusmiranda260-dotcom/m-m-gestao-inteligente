
import React from 'react';
import { Quote, ElementType } from '../types';
import { STEEL_WEIGHTS } from '../constants';

interface SteelSummaryProps {
  quote: Quote;
  onClose: () => void;
}

interface ConsolidatedSteel {
  gauge: string;
  totalMeters: number;
  totalWeight: number;
  bars12m: number;
}

const SteelSummary: React.FC<SteelSummaryProps> = ({ quote, onClose }) => {
  const consolidate = (): Record<string, ConsolidatedSteel> => {
    const summary: Record<string, ConsolidatedSteel> = {};

    const addMeters = (gauge: string, meters: number) => {
      if (!summary[gauge]) {
        summary[gauge] = { gauge, totalMeters: 0, totalWeight: 0, bars12m: 0 };
      }
      summary[gauge].totalMeters += meters;
      summary[gauge].totalWeight += meters * (STEEL_WEIGHTS[gauge] || 0);
      summary[gauge].bars12m = Math.ceil(summary[gauge].totalMeters / 12);
    };

    quote.items.forEach(item => {
      const isSapata = item.type === ElementType.SAPATA;

      // 1. Calcular Ferros Principais / Manuais
      item.mainBars.forEach(group => {
        const length = group.usage.includes('Largura') ? (item.width || item.length) : item.length;
        const hooks = (group.hookStart + group.hookEnd) / 100;
        const totalLineMeters = item.quantity * group.count * (length + hooks);
        addMeters(group.gauge, totalLineMeters);
      });

      // 2. Calcular Estribos ou Gaiola Armada
      if (item.hasStirrups) {
        if (isSapata) {
          // Lógica de Gaiola (Fechado)
          const hookCm = (item.height || 20) - 5;
          const hooksM = (hookCm * 2) / 100;

          // Barras no sentido Comprimento (X)
          const countL = Math.ceil((item.width || 0.8) * 100 / item.stirrupSpacing);
          const weightL = countL * (item.length + hooksM);

          // Barras no sentido Largura (Y)
          const countW = Math.ceil(item.length * 100 / item.stirrupSpacing);
          const weightW = countW * ((item.width || 0.8) + hooksM);

          addMeters(item.stirrupGauge, item.quantity * (weightL + weightW));
        } else {
          // Lógica de Estribo Normal (Viga/Pilar)
          const stirrupCount = Math.ceil((item.length * 100) / item.stirrupSpacing);
          // Perímetro: (L1*2 + L2*2 + 10cm de dobra)
          const stirrupPerimeter = (item.stirrupWidth * 2 + item.stirrupHeight * 2 + 10) / 100;
          const totalLineMeters = item.quantity * stirrupCount * stirrupPerimeter;
          addMeters(item.stirrupGauge, totalLineMeters);
        }
      }
    });

    return summary;
  };

  const summaryData = consolidate();
  const sortedGauges = Object.keys(summaryData).sort((a, b) => parseFloat(a) - parseFloat(b));

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[300] flex items-center justify-center p-4">
      <div className="glass rounded-[3rem] w-full max-w-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10 overflow-hidden flex flex-col animate-in zoom-in-95 duration-500">
        <div className="bg-white/5 p-10 flex justify-between items-center border-b border-white/5">
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 premium-gradient rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20 rotate-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" />
              </svg>
            </div>
            <div>
              <h2 className="text-4xl font-black text-white tracking-tighter">Resumo Estrutural</h2>
              <p className="text-orange-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Consolidado Técnico • {quote.items.length} Elementos</p>
            </div>
          </div>
          <button onClick={onClose} className="w-12 h-12 bg-white/5 hover:bg-white/10 text-white rounded-2xl transition-all flex items-center justify-center border border-white/5">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-10 flex-grow overflow-y-auto custom-scrollbar bg-black/20">
          <div className="space-y-4">
            <div className="flex px-8 py-3 rounded-2xl bg-white/5 text-[10px] font-black text-slate-500 uppercase tracking-widest">
              <span className="flex-1">Bitola</span>
              <span className="flex-1 text-center">Linear (m)</span>
              <span className="flex-1 text-center">Barras (12m)</span>
              <span className="flex-1 text-right">Peso Líquido</span>
            </div>

            {sortedGauges.map(gauge => {
              const data = summaryData[gauge];
              return (
                <div key={gauge} className="flex items-center p-6 bg-white/5 border border-white/5 rounded-[2.5rem] hover:bg-white/10 transition-all group">
                  <div className="flex-1 flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-800 text-white rounded-2xl flex items-center justify-center font-black text-sm border border-white/10">Ø{gauge}</div>
                  </div>
                  <div className="flex-1 text-center font-bold text-white text-lg tracking-tight">
                    {data.totalMeters.toFixed(1)}<span className="text-xs text-slate-500 ml-1">m</span>
                  </div>
                  <div className="flex-1 text-center">
                    <span className="bg-orange-500/10 text-orange-500 border border-orange-500/20 px-5 py-2 rounded-xl font-black text-xl shadow-lg shadow-orange-500/5">
                      {data.bars12m}
                    </span>
                  </div>
                  <div className="flex-1 text-right font-black text-white text-xl tracking-tighter">
                    {data.totalWeight.toFixed(1)} <span className="text-xs text-slate-500 uppercase">kg</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-12 p-10 glass-dark rounded-[3.5rem] border border-orange-500/20 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
              <div>
                <span className="text-[10px] font-black text-orange-500 uppercase tracking-[0.3em] block mb-2">Peso Total da Cotação</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-6xl font-black text-white tracking-tighter tabular-nums">{quote.totalWeight.toFixed(1)}</span>
                  <span className="text-xl font-black text-slate-500 uppercase">kg</span>
                </div>
              </div>
              <div className="h-16 w-px bg-white/10 hidden md:block"></div>
              <div className="text-center md:text-right">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] block mb-2">Valor Total Estimado</span>
                <span className="text-4xl font-black text-white tracking-tighter tabular-nums">R$ {quote.totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-10 bg-white/5 border-t border-white/5 flex flex-col sm:flex-row gap-4">
          <button onClick={() => window.print()} className="flex-1 bg-white/5 border border-white/10 hover:bg-white/10 py-5 rounded-[2rem] font-black text-[10px] uppercase tracking-[0.2em] text-white transition-all flex items-center justify-center gap-3 active:scale-95 group">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:animate-bounce" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h8a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" /></svg>
            Imprimir Relatório
          </button>
          <button onClick={onClose} className="flex-[2] premium-gradient text-white py-5 rounded-[2rem] font-black text-[10px] uppercase tracking-[0.2em] hover:scale-[1.02] transition-all shadow-xl shadow-orange-500/20 active:scale-95">
            CONCLUIR E VOLTAR
          </button>
        </div>
      </div>
    </div>
  );
};

export default SteelSummary;

