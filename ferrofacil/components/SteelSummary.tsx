
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
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[300] flex items-center justify-center p-4">
      <div className="bg-white rounded-[3rem] w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
        <div className="bg-slate-900 p-10 text-white flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-black tracking-tighter">Resumo do Aço</h2>
            <p className="text-amber-500 text-[10px] font-black uppercase tracking-widest mt-1">Consolidado para Produção • {quote.items.length} Itens</p>
          </div>
          <button onClick={onClose} className="bg-white/10 hover:bg-white/20 p-3 rounded-2xl transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-10 flex-grow overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-1 gap-4">
            <div className="flex bg-slate-50 p-4 rounded-2xl border border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <span className="flex-1">Bitola (mm)</span>
              <span className="flex-1 text-center">Metros Totais</span>
              <span className="flex-1 text-center text-indigo-600">Varas (12m)</span>
              <span className="flex-1 text-right">Peso (kg)</span>
            </div>

            {sortedGauges.map(gauge => {
              const data = summaryData[gauge];
              return (
                <div key={gauge} className="flex items-center p-6 bg-white border border-slate-100 rounded-[2rem] hover:shadow-lg transition-all group">
                  <div className="flex-1 flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black text-xs">Ø{gauge}</div>
                  </div>
                  <div className="flex-1 text-center font-bold text-slate-600">
                    {data.totalMeters.toFixed(1)}m
                  </div>
                  <div className="flex-1 text-center">
                    <span className="bg-indigo-600 text-white px-4 py-1.5 rounded-xl font-black text-lg shadow-lg shadow-indigo-100">
                      {data.bars12m}
                    </span>
                  </div>
                  <div className="flex-1 text-right font-black text-slate-900">
                    {data.totalWeight.toFixed(1)} kg
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-10 p-8 bg-amber-50 rounded-[2.5rem] border border-amber-100 flex justify-between items-center">
            <div>
              <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest block mb-1">Peso Total Estimado</span>
              <span className="text-4xl font-black text-slate-900 tracking-tighter">{quote.totalWeight.toFixed(1)} <small className="text-sm">kg</small></span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest block mb-1">Custo Matéria-Prima</span>
              <span className="text-3xl font-black text-amber-600 tracking-tighter">R$ {quote.totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
          <button onClick={() => window.print()} className="flex-1 bg-white border border-slate-200 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h8a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" /></svg>
            Imprimir Guia
          </button>
          <button onClick={onClose} className="flex-[2] bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl active:scale-95">
            Voltar para Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default SteelSummary;

