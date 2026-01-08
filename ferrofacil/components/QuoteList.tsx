
import React from 'react';
import { Quote, Client } from '../types';

interface QuoteListProps {
  quotes: Quote[];
  clients: Client[];
  onDelete: (id: string) => void;
  onFinalize: (id: string) => void;
  onViewSummary: (quote: Quote) => void;
}

const QuoteList: React.FC<QuoteListProps> = ({ quotes, clients, onDelete, onFinalize, onViewSummary }) => {
  const getClientName = (quote: Quote) => {
    if (quote.isCounter) return quote.counterName || 'Consumidor Balcão';
    return clients.find(c => c.id === quote.clientId)?.name || 'Cliente Desconhecido';
  };

  if (quotes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 bg-white/5 rounded-[3rem] border-2 border-dashed border-white/10 hover:border-orange-500/30 transition-all group">
        <div className="bg-white/5 p-6 rounded-3xl mb-8 border border-white/10 group-hover:scale-110 transition-transform duration-500">
          <div className="bg-orange-500/20 w-20 h-20 rounded-2xl flex items-center justify-center text-orange-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        </div>
        <h3 className="text-3xl font-black text-white tracking-tight mb-3">Vazio por aqui</h3>
        <p className="text-slate-400 font-medium max-w-sm text-center leading-relaxed">
          Sua lista de orçamentos está limpa. <br />
          Toque no botão <span className="text-orange-500 font-bold">Novo Orçamento</span> no topo para começar.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 px-4">
        <div>
          <h2 className="text-4xl font-black text-white tracking-tighter">Meus Orçamentos</h2>
          <div className="flex items-center gap-2 mt-2">
            <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
            <p className="text-slate-500 font-black uppercase text-[10px] tracking-widest">Acompanhamento de vendas e cotações</p>
          </div>
        </div>
        <div className="glass px-8 py-4 rounded-3xl flex gap-8 text-sm items-center">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Emitido</span>
            <span className="font-black text-2xl text-white leading-none">{quotes.length}</span>
          </div>
          <div className="w-px h-8 bg-white/10"></div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-1">Em Aberto</span>
            <span className="font-black text-2xl text-white leading-none">{quotes.filter(q => q.status === 'Draft').length}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {[...quotes].reverse().map(quote => {
          const isDraft = quote.status === 'Draft';
          const displayName = getClientName(quote);

          return (
            <div key={quote.id} className="card-premium h-full flex flex-col group relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 flex flex-col gap-2 items-end">
                {quote.isCounter && (
                  <div className="bg-orange-500/20 text-orange-500 text-[10px] font-black px-3 py-1 rounded-full border border-orange-500/20 uppercase tracking-widest">
                    Venda Balcão
                  </div>
                )}
                <div className={`px-3 py-1 rounded-full text-[10px] font-black border uppercase tracking-widest ${quote.status === 'Draft' ? 'bg-white/5 text-slate-400 border-white/5' :
                  quote.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                  }`}>
                  {quote.status === 'Draft' ? 'Rascunho' : 'Finalizado'}
                </div>
              </div>

              <div className="p-10 flex-grow" onClick={() => !isDraft && onViewSummary(quote)}>
                <div className="mb-8">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] block mb-3">
                    {new Date(quote.date).toLocaleDateString('pt-BR')}
                  </span>
                  <h3 className="text-2xl font-black text-white leading-tight group-hover:text-orange-500 transition-colors">
                    {displayName}
                  </h3>
                  {quote.observation && (
                    <p className="text-xs text-slate-400 mt-4 font-medium italic line-clamp-2 border-l-2 border-orange-500/30 pl-3">"{quote.observation}"</p>
                  )}
                </div>

                <div className="bg-white/5 rounded-3xl p-6 flex justify-between items-center mb-8 border border-white/5">
                  <div>
                    <span className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Peso Estimado</span>
                    <span className="text-2xl font-black text-white tracking-tighter">{quote.totalWeight.toFixed(1)} <small className="text-xs text-slate-500 ml-1">kg</small></span>
                  </div>
                  <div className="text-right">
                    <span className="block text-[10px] font-black text-orange-500 uppercase tracking-widest mb-1">Valor Total</span>
                    <span className="text-3xl font-black text-white tracking-tighter">R$ {quote.totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {Array.from({ length: Math.min(3, quote.items.length) }).map((_, i) => (
                      <div key={i} className="w-6 h-6 rounded-full border-2 border-slate-900 bg-orange-600 flex items-center justify-center text-[10px] font-bold text-white uppercase">
                        {String.fromCharCode(65 + i)}
                      </div>
                    ))}
                  </div>
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">
                    {quote.items.length} Componentes
                  </span>
                </div>
              </div>

              <div className="px-10 pb-10 flex gap-4">
                {isDraft ? (
                  <button
                    onClick={() => onFinalize(quote.id)}
                    className="flex-grow premium-gradient text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] transition-all shadow-lg shadow-orange-500/20 active:scale-95 flex items-center justify-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Aprovar Agora
                  </button>
                ) : (
                  <button
                    onClick={() => onViewSummary(quote)}
                    className="flex-grow bg-white/10 hover:bg-white text-white hover:text-orange-600 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95"
                  >
                    Visualizar Lista de Corte
                  </button>
                )}
                <button
                  onClick={() => onDelete(quote.id)}
                  className="w-14 h-14 bg-white/5 text-slate-500 hover:bg-red-500/20 hover:text-red-500 border border-white/5 transition-all rounded-2xl flex items-center justify-center group/del"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover/del:scale-110 transition-transform" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default QuoteList;

