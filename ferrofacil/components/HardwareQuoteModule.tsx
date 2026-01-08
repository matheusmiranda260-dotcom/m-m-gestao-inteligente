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
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsSelectingClient(false)}></div>
          <div className="bg-white rounded-[2rem] w-full max-w-xl shadow-2xl relative z-10 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-50 p-6 border-b border-slate-100">
              <h2 className="text-2xl font-black text-slate-800">Novo Orçamento</h2>
              <div className="flex bg-slate-200 p-1 rounded-xl mt-4">
                <button
                  onClick={() => setQuoteMode('registered')}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${quoteMode === 'registered' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-500'}`}
                >
                  Clientes Cadastrados
                </button>
                <button
                  onClick={() => setQuoteMode('counter')}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${quoteMode === 'counter' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-500'}`}
                >
                  Consumidor Balcão
                </button>
              </div>
            </div>

            <div className="p-8">
              {quoteMode === 'registered' ? (
                <>
                  <p className="text-slate-500 mb-6 font-medium text-sm">Selecione um cliente da sua base de dados:</p>
                  <div className="max-h-60 overflow-y-auto space-y-2 mb-8 pr-2 custom-scrollbar">
                    {clients.length === 0 ? (
                      <div className="text-center py-8 text-slate-400 border border-dashed rounded-2xl">
                        Nenhum cliente cadastrado.
                      </div>
                    ) : (
                      clients.map(c => (
                        <button
                          key={c.id}
                          onClick={() => handleSelectClient(c)}
                          className="w-full text-left p-4 rounded-2xl border border-slate-100 hover:border-amber-500 hover:bg-amber-50 transition-all font-bold text-slate-700 flex justify-between items-center group"
                        >
                          {c.name}
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 opacity-0 group-hover:opacity-100 text-amber-500 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      ))
                    )}
                  </div>
                </>
              ) : (
                <div className="space-y-4 mb-8">
                  <p className="text-slate-500 font-medium text-sm">Venda rápida sem cadastro prévio:</p>
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Nome do Cliente (Obrigatório)"
                      value={counterData.name}
                      onChange={e => setCounterData({ ...counterData, name: e.target.value })}
                      className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500 outline-none font-medium"
                    />
                    <input
                      type="text"
                      placeholder="WhatsApp / Telefone"
                      value={counterData.phone}
                      onChange={e => setCounterData({ ...counterData, phone: e.target.value })}
                      className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500 outline-none font-medium"
                    />
                    <textarea
                      placeholder="Observações do pedido..."
                      rows={3}
                      value={counterData.obs}
                      onChange={e => setCounterData({ ...counterData, obs: e.target.value })}
                      className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500 outline-none font-medium resize-none"
                    ></textarea>
                  </div>
                  <button
                    onClick={handleStartCounterQuote}
                    className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-100"
                  >
                    Iniciar Orçamento Balcão
                  </button>
                </div>
              )}

              <div className="flex gap-4 border-t border-slate-50 pt-6">
                <button
                  onClick={() => setIsSelectingClient(false)}
                  className="flex-1 py-3 font-bold text-slate-400 hover:text-slate-600 text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => { setIsSelectingClient(false); setActiveTab('clients'); }}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 text-sm"
                >
                  Gerenciar Clientes
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

      <>
        {/* Header Premium */}
        <div className="mb-8 flex flex-col md:flex-row justify-between items-center bg-gradient-to-br from-slate-900 to-slate-800 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -ml-32 -mb-32 pointer-events-none"></div>

          <div className="relative z-10 flex items-center gap-6">
            <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/10 shadow-inner">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight">Cálculo de Ferragens</h1>
              <p className="text-slate-400 font-bold text-sm mt-1">Gerencie orçamentos, clientes e produção de aço.</p>
            </div>
          </div>

          <button
            onClick={handleNewQuoteClick}
            className="mt-6 md:mt-0 relative z-10 bg-gradient-to-r from-amber-500 to-orange-600 text-white px-8 py-4 rounded-[2rem] font-black uppercase tracking-widest hover:shadow-lg hover:shadow-orange-500/30 transition-all active:scale-95 flex items-center gap-3"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Novo Orçamento
          </button>
        </div>

        <QuoteList
          quotes={quotes}
          clients={clients}
          onDelete={handleDeleteQuote}
          onFinalize={handleFinalizeQuote}
          onViewSummary={(quote) => setSummaryQuote(quote)}
        />
        {summaryQuote && (
          <SteelSummary quote={summaryQuote} onClose={() => setSummaryQuote(null)} />
        )}
      </>
    );
  };

  return (
    <div className="min-h-full w-full mx-auto py-2">
      {renderContent()}
    </div>
  );
};

export default HardwareQuoteModule;

