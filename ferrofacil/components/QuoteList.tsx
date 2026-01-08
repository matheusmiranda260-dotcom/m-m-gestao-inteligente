
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

      <div className="flex flex-col items-center justify-center py-32 bg-gradient-to-br from-slate-50 to-slate-100 rounded-[3rem] border-2 border-dashed border-slate-200 hover:border-amber-200 transition-colors group">
        <div className="bg-white p-6 rounded-3xl shadow-xl shadow-slate-100 mb-8 border border-slate-50 group-hover:scale-110 transition-transform duration-500">
          <div className="bg-gradient-to-br from-amber-100 to-orange-100 w-20 h-20 rounded-2xl flex items-center justify-center text-amber-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        </div>
        <h3 className="text-3xl font-black text-slate-800 tracking-tight mb-3">Vazio por aqui</h3>
        <p className="text-slate-400 font-medium max-w-sm text-center leading-relaxed">
          Sua lista de orçamentos está limpa. <br />
          Toque no botão <span className="text-amber-600 font-bold">Novo Orçamento</span> no topo para começar.
        </p>
      </div>
    );

  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter">Meus Orçamentos</h2>
          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-1">Acompanhamento de vendas e cotações</p>
        </div>
        <div className="bg-white px-6 py-3 rounded-2xl border border-slate-100 shadow-sm flex gap-6 text-sm">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Total Emitido</span>
            <span className="font-black text-slate-900">{quotes.length}</span>
          </div>
          <div className="w-px bg-slate-100"></div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-amber-500 uppercase tracking-tighter">Aguardando</span>
            <span className="font-black text-slate-900">{quotes.filter(q => q.status === 'Draft').length}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...quotes].reverse().map(quote => {
          const isDraft = quote.status === 'Draft';
          const displayName = getClientName(quote);

          return (
            <div key={quote.id} className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm hover:shadow-2xl hover:border-amber-200 transition-all flex flex-col group relative">
              {quote.isCounter && (
                <div className="absolute top-4 right-4 bg-amber-100 text-amber-700 text-[10px] font-black px-2 py-0.5 rounded-lg uppercase">
                  Balcão
                </div>
              )}

              <div className="p-8 flex-grow" onClick={() => !isDraft && onViewSummary(quote)}>
                <div className="mb-6">
                  <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest block mb-1">
                    {new Date(quote.date).toLocaleDateString('pt-BR')}
                  </span>
                  <h3 className="text-xl font-black text-slate-800 leading-tight group-hover:text-amber-600 transition-colors">
                    {displayName}
                  </h3>
                  {quote.observation && (
                    <p className="text-xs text-slate-400 mt-2 font-medium italic line-clamp-2">"{quote.observation}"</p>
                  )}
                </div>

                <div className="bg-slate-50 rounded-2xl p-5 flex justify-between items-center mb-6">
                  <div>
                    <span className="block text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-1">Peso Estimado</span>
                    <span className="text-xl font-black text-slate-800 tracking-tight">{quote.totalWeight.toFixed(1)} <small className="text-xs text-slate-400">kg</small></span>
                  </div>
                  <div className="text-right">
                    <span className="block text-[10px] font-black text-amber-500 uppercase tracking-tighter mb-1">Valor Total</span>
                    <span className="text-2xl font-black text-amber-600 tracking-tighter">R$ {quote.totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter ${quote.status === 'Draft' ? 'bg-slate-100 text-slate-500' :
                    quote.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                    {quote.status === 'Draft' ? 'Em Aberto' : 'Finalizado'}
                  </span>
                  <span className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter bg-slate-100 text-slate-500">
                    {quote.items.length} Elementos
                  </span>
                </div>
              </div>

              <div className="px-8 pb-8 flex gap-3">
                {isDraft ? (
                  <button
                    onClick={() => onFinalize(quote.id)}
                    className="flex-grow bg-emerald-500 text-white py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-50 flex items-center justify-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Finalizar
                  </button>
                ) : (
                  <button
                    onClick={() => onViewSummary(quote)}
                    className="flex-grow bg-slate-900 text-white py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-slate-100 active:scale-95 transition-all"
                  >
                    Resumo do Aço
                  </button>
                )}
                <button
                  onClick={() => onDelete(quote.id)}
                  className="w-12 bg-red-50 text-red-400 hover:bg-red-500 hover:text-white transition-all rounded-2xl flex items-center justify-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
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

