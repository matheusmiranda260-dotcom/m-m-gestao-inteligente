import React, { useState, useEffect } from 'react';
import ClientManager from './ClientManager';
import QuoteBuilder from './QuoteBuilder';
import QuoteList from './QuoteList';
import SteelSummary from './SteelSummary';
import { Client, Quote } from '../types';

const HardwareQuoteModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'clients'>('dashboard');
  const [clients, setClients] = useState<Client[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [selectedClientForQuote, setSelectedClientForQuote] = useState<Client | null>(null);
  const [isSelectingClient, setIsSelectingClient] = useState(false);
  const [summaryQuote, setSummaryQuote] = useState<Quote | null>(null);

  // Balcão temporary state
  const [quoteMode, setQuoteMode] = useState<'registered' | 'counter'>('registered');
  const [counterData, setCounterData] = useState({ name: '', phone: '', obs: '' });

  // Load Initial Data
  useEffect(() => {
    const savedClients = localStorage.getItem('ff_clients');
    const savedQuotes = localStorage.getItem('ff_quotes');
    if (savedClients) setClients(JSON.parse(savedClients));
    if (savedQuotes) setQuotes(JSON.parse(savedQuotes));
  }, []);

  // Sync with LocalStorage
  useEffect(() => {
    localStorage.setItem('ff_clients', JSON.stringify(clients));
  }, [clients]);

  useEffect(() => {
    localStorage.setItem('ff_quotes', JSON.stringify(quotes));
  }, [quotes]);

  const handleAddClient = (client: Client) => {
    setClients(prev => [...prev, client]);
  };

  const handleSelectClient = (client: Client) => {
    setSelectedClientForQuote(client);
    setIsSelectingClient(false);
  };

  const handleStartCounterQuote = () => {
    if (!counterData.name) {
      alert("Por favor, informe ao menos o nome do cliente balcão.");
      return;
    }
    const virtualClient: Client = {
      id: 'counter',
      name: counterData.name,
      phone: counterData.phone,
      address: 'Consumidor Balcão'
    };
    setSelectedClientForQuote(virtualClient);
    setIsSelectingClient(false);
  };

  const handleSaveQuote = (quote: Quote) => {
    const finalQuote = selectedClientForQuote?.id === 'counter'
      ? {
        ...quote,
        isCounter: true,
        counterName: counterData.name,
        counterPhone: counterData.phone,
        observation: counterData.obs
      }
      : quote;

    setQuotes(prev => [...prev, finalQuote]);
    setSelectedClientForQuote(null);
    setCounterData({ name: '', phone: '', obs: '' });
    setActiveTab('dashboard');
    // Abre o resumo automaticamente ao salvar
    setSummaryQuote(finalQuote);
  };

  const handleDeleteQuote = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este orçamento?')) {
      setQuotes(prev => prev.filter(q => q.id !== id));
    }
  };

  const handleFinalizeQuote = (id: string) => {
    const quote = quotes.find(q => q.id === id);
    if (quote) {
      setQuotes(prev => prev.map(q => q.id === id ? { ...q, status: 'Approved' } : q));
      setSummaryQuote({ ...quote, status: 'Approved' });
    }
  };

  const handleNewQuoteClick = () => {
    setIsSelectingClient(true);
    setQuoteMode('registered');
  };

  const renderContent = () => {
    if (selectedClientForQuote) {
      return (
        <QuoteBuilder
          client={selectedClientForQuote}
          onSave={handleSaveQuote}
          onCancel={() => setSelectedClientForQuote(null)}
          isCounter={selectedClientForQuote.id === 'counter'}
          counterObs={counterData.obs}
        />
      );
    }

    if (isSelectingClient) {
      return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setIsSelectingClient(false)}></div>
          <div className="glass rounded-[2.5rem] w-full max-w-xl shadow-2xl relative z-10 overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            <div className="bg-white/5 p-8 border-b border-white/10">
              <h2 className="text-3xl font-black text-white tracking-tighter">Novo Orçamento</h2>
              <p className="text-slate-400 text-sm mt-1">Selecione como deseja iniciar a cotação.</p>

              <div className="flex bg-slate-800/50 p-1.5 rounded-2xl mt-8">
                <button
                  onClick={() => setQuoteMode('registered')}
                  className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${quoteMode === 'registered' ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Clientes
                </button>
                <button
                  onClick={() => setQuoteMode('counter')}
                  className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${quoteMode === 'counter' ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Balcão
                </button>
              </div>
            </div>

            <div className="p-8">
              {quoteMode === 'registered' ? (
                <>
                  <div className="max-h-[400px] overflow-y-auto space-y-3 mb-8 pr-2 custom-scrollbar">
                    {clients.length === 0 ? (
                      <div className="text-center py-12 px-6 rounded-3xl bg-white/5 border border-dashed border-white/10">
                        <p className="text-slate-500 font-bold">Nenhum cliente disponível.</p>
                        <button
                          onClick={() => { setIsSelectingClient(false); setActiveTab('clients'); }}
                          className="mt-4 text-orange-500 font-black text-xs uppercase tracking-widest hover:underline"
                        >
                          Cadastrar Primeiro +
                        </button>
                      </div>
                    ) : (
                      clients.map(c => (
                        <button
                          key={c.id}
                          onClick={() => handleSelectClient(c)}
                          className="w-full text-left p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-orange-500/50 hover:bg-white/10 transition-all group flex justify-between items-center"
                        >
                          <div>
                            <p className="font-black text-white group-hover:text-orange-500 transition-colors uppercase tracking-tight">{c.name}</p>
                            <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase">{c.phone}</p>
                          </div>
                          <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-orange-500 transition-all">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </>
              ) : (
                <div className="space-y-4 mb-8">
                  <div className="space-y-4">
                    <div className="relative group">
                      <span className="absolute left-4 top-3 text-[10px] font-black text-slate-500 uppercase tracking-widest pointer-events-none group-focus-within:text-orange-500 transition-colors">Nome do Cliente</span>
                      <input
                        type="text"
                        value={counterData.name}
                        onChange={e => setCounterData({ ...counterData, name: e.target.value })}
                        className="w-full pt-8 pb-3 px-4 rounded-2xl bg-white/5 border border-white/10 focus:border-orange-500 focus:bg-white/10 outline-none text-white font-bold transition-all"
                      />
                    </div>
                    <div className="relative group">
                      <span className="absolute left-4 top-3 text-[10px] font-black text-slate-500 uppercase tracking-widest pointer-events-none group-focus-within:text-orange-500 transition-colors">WhatsApp / Tel</span>
                      <input
                        type="text"
                        value={counterData.phone}
                        onChange={e => setCounterData({ ...counterData, phone: e.target.value })}
                        className="w-full pt-8 pb-3 px-4 rounded-2xl bg-white/5 border border-white/10 focus:border-orange-500 focus:bg-white/10 outline-none text-white font-bold transition-all"
                      />
                    </div>
                    <div className="relative group">
                      <span className="absolute left-4 top-3 text-[10px] font-black text-slate-500 uppercase tracking-widest pointer-events-none group-focus-within:text-orange-500 transition-colors">Observações</span>
                      <textarea
                        rows={3}
                        value={counterData.obs}
                        onChange={e => setCounterData({ ...counterData, obs: e.target.value })}
                        className="w-full pt-8 pb-3 px-4 rounded-2xl bg-white/5 border border-white/10 focus:border-orange-500 focus:bg-white/10 outline-none text-white font-bold transition-all resize-none"
                      ></textarea>
                    </div>
                  </div>
                  <button
                    onClick={handleStartCounterQuote}
                    className="w-full premium-gradient text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:scale-[1.02] shadow-xl shadow-orange-500/20 active:scale-95 transition-all"
                  >
                    Iniciar Orçamento
                  </button>
                </div>
              )}

              <div className="flex gap-4 border-t border-white/5 pt-6 justify-center">
                <button
                  onClick={() => setIsSelectingClient(false)}
                  className="px-6 py-3 font-black text-slate-500 hover:text-white text-xs uppercase tracking-widest transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (activeTab === 'clients') {
      return (
        <ClientManager
          clients={clients}
          onAddClient={handleAddClient}
          onSelectClient={handleSelectClient}
        />
      );
    }

    return (
      <div className="space-y-10">
        {/* Header Premium Redesenhado */}
        <div className="relative rounded-[3rem] overflow-hidden group">
          <div className="absolute inset-0 premium-gradient opacity-90"></div>
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-30"></div>
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/20 rounded-full blur-[100px] -mr-48 -mt-48 transition-all group-hover:scale-110 duration-1000"></div>

          <div className="relative z-10 p-10 md:p-14 flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex-1 text-center md:text-left">
              <div className="inline-flex items-center gap-2 bg-black/20 backdrop-blur-md px-4 py-1.5 rounded-full mb-6 border border-white/10 shadow-inner">
                <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
                <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Painel Operacional Ativo</span>
              </div>
              <h1 className="text-5xl md:text-6xl font-black text-white tracking-tighter leading-none">
                Cálculo de <br /> <span className="text-black/30">Ferragens</span>
              </h1>
              <p className="text-white/70 font-bold text-lg mt-6 max-w-lg">
                Módulo especializado em orçamentos técnicos e detalhamento de aço estrutural.
              </p>
            </div>

            <div className="flex flex-col gap-4 w-full md:w-auto">
              <button
                onClick={handleNewQuoteClick}
                className="bg-white text-orange-600 px-10 py-6 rounded-[2rem] font-black uppercase tracking-widest text-sm hover:bg-slate-100 hover:scale-[1.05] hover:shadow-2xl shadow-black/20 transition-all active:scale-95 flex items-center justify-center gap-3 group"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:rotate-90 transition-transform duration-300" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Novo Orçamento
              </button>

              <button
                onClick={() => setActiveTab('clients')}
                className="bg-black/20 backdrop-blur-md border border-white/10 text-white px-10 py-5 rounded-[2rem] font-bold uppercase tracking-widest text-xs hover:bg-black/40 transition-all flex items-center justify-center gap-3"
              >
                Gerenciar Clientes
              </button>
            </div>
          </div>
        </div>

        <div className="px-2">
          <QuoteList
            quotes={quotes}
            clients={clients}
            onDelete={handleDeleteQuote}
            onFinalize={handleFinalizeQuote}
            onViewSummary={(quote) => setSummaryQuote(quote)}
          />
        </div>

        {summaryQuote && (
          <SteelSummary quote={summaryQuote} onClose={() => setSummaryQuote(null)} />
        )}
      </div>
    );
  };

  return (
    <div className="min-h-full w-full mx-auto">
      {renderContent()}
    </div>
  );
};


export default HardwareQuoteModule;

