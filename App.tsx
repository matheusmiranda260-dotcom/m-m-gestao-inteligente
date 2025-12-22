
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  FinancialData,
  CardTransaction,
  FixedExpense,
  Income,
  CardProvider,
  IncomeSource,
  TransactionType,
  FixedExpenseCategory
} from './types';
import { getFinancialInsights } from './services/geminiService';
import { MONTHS } from './constants';
import {
  CreditCard,
  TrendingUp,
  Calendar,
  PlusCircle,
  Trash2,
  CheckCircle,
  Circle,
  BrainCircuit,
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
  Check,
  Repeat,
  Plus,
  Info,
  AlertCircle
} from 'lucide-react';

import { api } from './services/api';

// ... (imports remain the same, ensure 'api' is imported)

const App: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [fixedCategory, setFixedCategory] = useState<FixedExpenseCategory>(FixedExpenseCategory.AGUA);
  const [showDetailsModal, setShowDetailsModal] = useState<number | null>(null);
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]);
  const [aiInsight, setAiInsight] = useState<string>('');
  const [loadingAi, setLoadingAi] = useState(false);
  const [showModal, setShowModal] = useState<TransactionType | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [data, setData] = useState<FinancialData>({
    cardTransactions: [],
    fixedExpenses: [],
    incomes: []
  });

  const fetchSafely = async () => {
    setIsLoading(true);
    const result = await api.fetchData();
    if (result) {
      setData(result);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchSafely();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setIsMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!showModal) setSelectedMonths([]);
  }, [showModal]);

  const yearlySummary = useMemo(() => {
    // ... (logic remains exactly the same, this assumes 'data' is populated correctly)
    const year = currentDate.getFullYear();
    return MONTHS.map((monthName, monthIndex) => {
      const monthlyIncomes = data.incomes
        .filter(i => {
          const d = new Date(i.date);
          return d.getMonth() === monthIndex && d.getFullYear() === year;
        })
        .reduce((acc, i) => acc + i.amount, 0);

      const filteredFixed = data.fixedExpenses.filter(e => e.month === monthIndex && e.year === year);
      const monthlyFixed = filteredFixed.reduce((acc, e) => acc + e.amount, 0);
      const pendingFixed = filteredFixed.filter(e => !e.isPaid).reduce((acc, e) => acc + e.amount, 0);

      let monthlyCards = 0;
      data.cardTransactions.forEach(t => {
        const pDate = new Date(t.purchaseDate);
        const startMonthTotal = pDate.getMonth() + pDate.getFullYear() * 12;
        const currentMonthTotal = monthIndex + year * 12;
        const diff = currentMonthTotal - startMonthTotal;
        if (diff >= 0 && diff < t.totalInstallments) {
          monthlyCards += (t.amount / t.totalInstallments);
        }
      });

      return {
        monthIndex, monthName, income: monthlyIncomes, fixed: monthlyFixed,
        pendingFixed, cards: monthlyCards, balance: monthlyIncomes - (monthlyFixed + monthlyCards),
        filteredFixed, filteredIncomes: data.incomes.filter(i => {
          const d = new Date(i.date);
          return d.getMonth() === monthIndex && d.getFullYear() === year;
        })
      };
    });
  }, [data, currentDate.getFullYear()]);

  const changeYear = (offset: number) => {
    const newDate = new Date(currentDate);
    newDate.setFullYear(currentDate.getFullYear() + offset);
    setCurrentDate(newDate);
  };

  const handleAddCardTransaction = async (base: Omit<CardTransaction, 'id'>, targetMonths: number[]) => {
    const year = currentDate.getFullYear();
    setIsLoading(true);

    // Create promises for all insertions
    const promises = targetMonths.map(m =>
      api.addCardTransaction({
        ...base,
        purchaseDate: new Date(year, m, 1).toISOString()
      })
    );

    await Promise.all(promises);
    await fetchSafely(); // Refresh data
    setShowModal(null);
  };

  const handleAddIncome = async (base: Omit<Income, 'id'>, targetMonths: number[]) => {
    const year = currentDate.getFullYear();
    setIsLoading(true);

    const promises = targetMonths.map(m =>
      api.addIncome({
        ...base,
        date: new Date(year, m, 1).toISOString()
      })
    );

    await Promise.all(promises);
    await fetchSafely();
    setShowModal(null);
  };

  const handleAddFixedExpense = async (base: Omit<FixedExpense, 'id' | 'isPaid' | 'month' | 'year'>, targetMonths: number[]) => {
    const year = currentDate.getFullYear();
    setIsLoading(true);

    const promises = targetMonths.map(m =>
      api.addFixedExpense({
        ...base,
        isPaid: false,
        month: m,
        year: year
      })
    );

    await Promise.all(promises);
    await fetchSafely();
    setShowModal(null);
  };

  const toggleFixedExpense = async (id: string) => {
    const expense = data.fixedExpenses.find(e => e.id === id);
    if (!expense) return;

    // Optimistic update
    setData(prev => ({
      ...prev,
      fixedExpenses: prev.fixedExpenses.map(e => e.id === id ? { ...e, isPaid: !e.isPaid } : e)
    }));

    const success = await api.updateFixedExpense(id, { isPaid: !expense.isPaid });
    if (!success) fetchSafely(); // Revert on failure
  };

  const updateFixedAmount = async (id: string, amount: number) => {
    // Optimistic update
    setData(prev => ({
      ...prev,
      fixedExpenses: prev.fixedExpenses.map(e => e.id === id ? { ...e, amount } : e)
    }));

    // Debouncing could be added here, but for now direct update
    await api.updateFixedExpense(id, { amount });
  };

  const deleteTransaction = async (type: 'card' | 'income' | 'fixed', id: string) => {
    if (!confirm('Excluir este registro?')) return;

    // Optimistic delete
    setData(prev => {
      if (type === 'card') return { ...prev, cardTransactions: prev.cardTransactions.filter(t => t.id !== id) };
      if (type === 'income') return { ...prev, incomes: prev.incomes.filter(t => t.id !== id) };
      if (type === 'fixed') return { ...prev, fixedExpenses: prev.fixedExpenses.filter(e => e.id !== id) };
      return prev;
    });

    const tableMap = {
      'card': 'card_transactions',
      'income': 'incomes',
      'fixed': 'fixed_expenses'
    } as const;

    const success = await api.deleteItem(tableMap[type], id);
    if (!success) fetchSafely();
  };

  const generateInsights = async () => {
    setLoadingAi(true);
    const insight = await getFinancialInsights(data);
    setAiInsight(insight);
    setLoadingAi(false);
  };

  const toggleMonthSelection = (m: number) => {
    setSelectedMonths(prev => prev.includes(m) ? prev.filter(month => month !== m) : [...prev, m]);
  };

  const selectAllMonths = () => {
    setSelectedMonths(selectedMonths.length === 12 ? [] : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  };

  const selectedDetails = showDetailsModal !== null ? yearlySummary[showDetailsModal] : null;

  return (
    <div className="min-h-screen bg-slate-50 pb-24 text-slate-900 overflow-x-hidden">
      {(isMenuOpen || showDetailsModal !== null || showModal !== null) && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-40 transition-all duration-300" />
      )}

      {/* HEADER COMPACTO PARA MOBILE - REMOVIDO "PREMIUM FINANCE" */}
      <header className="bg-slate-900 text-white p-3 md:p-6 shadow-xl rounded-b-[1.5rem] sticky top-0 z-30">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-emerald-500 rounded-lg md:rounded-xl flex items-center justify-center shadow-lg rotate-3">
              <span className="text-xs md:text-sm font-black italic tracking-tighter text-slate-900">M$M</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] md:text-sm font-black tracking-tighter leading-none">GESTÃO INTELIGENTE</span>
            </div>
          </div>
          <button
            onClick={generateInsights} disabled={loadingAi}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 p-1.5 md:p-2 rounded-lg md:rounded-xl transition-all flex items-center gap-1 px-3 shadow-lg active:scale-95"
          >
            <BrainCircuit size={14} />
            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-wider">{loadingAi ? '...' : 'Insights'}</span>
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-2 md:p-4 space-y-3 md:space-y-4">
        {/* NAVEGAÇÃO DE ANO REDUZIDA */}
        <div className="flex justify-between items-center bg-white p-2 md:p-3 rounded-xl md:rounded-2xl shadow-sm border border-slate-100">
          <h2 className="text-[9px] md:text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
            <Calendar size={10} className="text-emerald-500" /> Fluxo {currentDate.getFullYear()}
          </h2>
          <div className="flex items-center gap-1.5 md:gap-2">
            <button onClick={() => changeYear(-1)} className="p-1.5 md:p-2 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-500"><ChevronLeft size={16} /></button>
            <span className="text-xs md:text-sm font-black text-slate-800">{currentDate.getFullYear()}</span>
            <button onClick={() => changeYear(1)} className="p-1.5 md:p-2 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-500"><ChevronRight size={16} /></button>
          </div>
        </div>

        {/* VISÃO PRINCIPAL - GRID DE 2 COLUNAS EM MOBILE */}
        <section className="space-y-3">
          {/* Versão Desktop */}
          <div className="hidden md:block bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50/50 text-[10px] uppercase font-black text-slate-400 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">Mês</th>
                  <th className="px-6 py-4 text-emerald-600">Entrada</th>
                  <th className="px-6 py-4 text-red-500">Fixas</th>
                  <th className="px-6 py-4 text-orange-500">Cartão</th>
                  <th className="px-6 py-4">Saldo</th>
                  <th className="px-6 py-4 text-center">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {yearlySummary.map(m => (
                  <tr key={m.monthIndex} className="hover:bg-emerald-50/30 transition-all text-sm">
                    <td className="px-6 py-4 font-bold capitalize">{m.monthName}</td>
                    <td className="px-6 py-4 font-bold text-emerald-600">R$ {m.income.toFixed(2)}</td>
                    <td className="px-6 py-4 text-slate-500 italic">R$ {m.fixed.toFixed(2)}</td>
                    <td className="px-6 py-4 text-slate-500">R$ {m.cards.toFixed(2)}</td>
                    <td className={`px-6 py-4 font-black ${m.balance >= 0 ? 'text-slate-800' : 'text-red-500'}`}>R$ {m.balance.toFixed(2)}</td>
                    <td className="px-6 py-4 text-center">
                      <button onClick={() => setShowDetailsModal(m.monthIndex)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"><Eye size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Versão Mobile - Grid de 2 Colunas para caber na tela */}
          <div className="grid grid-cols-2 gap-2 md:hidden">
            {yearlySummary.map(m => (
              <button
                key={m.monthIndex}
                onClick={() => setShowDetailsModal(m.monthIndex)}
                className="flex flex-col p-3 bg-white rounded-xl shadow-sm border border-slate-100 active:scale-95 transition-all text-left"
              >
                <span className="text-[11px] font-black text-slate-800 capitalize mb-1">{m.monthName}</span>
                <div className="flex items-center justify-between w-full mb-1">
                  <span className={`text-xs font-black ${m.balance >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    R$ {m.balance.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5 border-t border-slate-50 pt-1 mt-1">
                  <div className="flex justify-between items-center text-[8px] font-bold text-slate-400">
                    <span>E: <span className="text-emerald-500">+{m.income.toFixed(0)}</span></span>
                    <span>S: <span className="text-red-400">-{(m.fixed + m.cards).toFixed(0)}</span></span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        {aiInsight && (
          <div className="bg-slate-900 border-l-4 border-emerald-500 p-3 md:p-6 rounded-xl md:rounded-2xl relative shadow-xl animate-in fade-in slide-in-from-top-4">
            <button onClick={() => setAiInsight('')} className="absolute top-3 right-3 text-slate-500"><X size={16} /></button>
            <h3 className="text-white font-black text-[10px] md:text-sm mb-1.5 flex items-center gap-1.5"><BrainCircuit size={14} className="text-emerald-500" /> Análise AI</h3>
            <div className="text-slate-300 text-[10px] leading-relaxed whitespace-pre-wrap">{aiInsight}</div>
          </div>
        )}
      </main>

      {/* MODAL DE DETALHES - MAIS COMPACTO EM MOBILE */}
      {selectedDetails && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white rounded-t-3xl md:rounded-[3rem] w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl animate-in slide-in-from-bottom-10 md:zoom-in-95 duration-300">
            <div className="p-4 md:p-8 border-b border-slate-100 flex justify-between items-center bg-slate-900 text-white">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="w-8 h-8 md:w-10 md:h-10 bg-emerald-500 rounded-lg md:rounded-xl flex items-center justify-center text-slate-900 font-black text-base rotate-3">
                  {selectedDetails.monthName.charAt(0)}
                </div>
                <h3 className="text-lg md:text-xl font-black capitalize tracking-tight">{selectedDetails.monthName}</h3>
              </div>
              <button onClick={() => setShowDetailsModal(null)} className="p-1.5 text-slate-400 hover:text-white"><X size={24} /></button>
            </div>

            <div className="overflow-y-auto p-4 md:p-10 space-y-4 md:space-y-8 custom-scrollbar bg-slate-50/20">
              {/* Cards de Resumo */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
                <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-100">
                  <p className="text-[8px] font-black text-emerald-600 uppercase mb-0.5 tracking-widest">Entradas</p>
                  <p className="text-xs font-black text-slate-900">R$ {selectedDetails.income.toFixed(2)}</p>
                </div>
                <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-100">
                  <p className="text-[8px] font-black text-orange-500 uppercase mb-0.5 tracking-widest">Cartões</p>
                  <p className="text-xs font-black text-slate-900">R$ {selectedDetails.cards.toFixed(2)}</p>
                </div>
                <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-100 col-span-2 md:col-span-1">
                  <p className="text-[8px] font-black text-red-500 uppercase mb-0.5 tracking-widest">Pendências</p>
                  <p className="text-xs font-black text-slate-900">R$ {selectedDetails.pendingFixed.toFixed(2)}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                {/* Contas Fixas */}
                <div className="space-y-3">
                  <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 px-1"><Calendar size={10} className="text-emerald-500" /> Contas Periódicas</h4>
                  <div className="space-y-1.5">
                    {selectedDetails.filteredFixed.map(expense => (
                      <div key={expense.id} className="flex items-center justify-between p-3 rounded-xl bg-white shadow-sm border border-slate-100">
                        <div className="flex items-center gap-2">
                          <button onClick={() => toggleFixedExpense(expense.id)} className="shrink-0">
                            {expense.isPaid ? <CheckCircle className="text-emerald-500" size={20} /> : <Circle className="text-slate-200" size={20} />}
                          </button>
                          <div>
                            <div className="font-bold text-[10px] text-slate-800 leading-tight">{expense.name}</div>
                            <div className="text-[7px] text-slate-400 font-bold uppercase">Dia {expense.dueDate}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number" value={expense.amount || ''} placeholder="0.00"
                            onChange={(e) => updateFixedAmount(expense.id, parseFloat(e.target.value) || 0)}
                            className="w-12 bg-transparent text-right font-black text-[10px] focus:outline-none border-b border-transparent focus:border-emerald-500"
                          />
                          <button onClick={() => deleteTransaction('fixed', expense.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={14} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Entradas */}
                <div className="space-y-3">
                  <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 px-1"><TrendingUp size={10} className="text-emerald-500" /> Entradas (+)</h4>
                  <div className="space-y-1.5">
                    {selectedDetails.filteredIncomes.map(income => (
                      <div key={income.id} className="flex justify-between items-center p-3 rounded-xl bg-emerald-50/40 border border-emerald-100">
                        <div>
                          <div className="text-[7px] text-emerald-600 font-black uppercase mb-0.5">{income.source}</div>
                          <div className="font-bold text-[10px] text-slate-800 leading-tight">{income.description || 'Receita'}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-[10px]">R$ {income.amount.toFixed(2)}</span>
                          <button onClick={() => deleteTransaction('income', income.id)} className="text-emerald-400 hover:text-red-500"><Trash2 size={14} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE LANÇAMENTO - REMOVIDO "M$M GESTÃO INTELIGENTE" DO RODAPÉ */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center p-0 md:p-4 overflow-y-auto">
          <div className="bg-white rounded-t-3xl md:rounded-[3rem] w-full max-w-lg p-5 md:p-10 relative shadow-2xl animate-in slide-in-from-bottom-10 md:zoom-in-95 duration-300 border-t-8 border-emerald-500 my-auto">
            <button onClick={() => setShowModal(null)} className="absolute top-5 right-5 text-slate-300 hover:text-slate-600"><X size={28} /></button>

            <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2 mb-5">
              {showModal === TransactionType.CARD_EXPENSE && <><CreditCard className="text-orange-500" /> Lançar Cartão</>}
              {showModal === TransactionType.INCOME && <><TrendingUp className="text-emerald-600" /> Nova Entrada</>}
              {showModal === TransactionType.FIXED_EXPENSE && <><Calendar className="text-slate-900" /> Conta Fixa</>}
            </h3>

            <form onSubmit={(e) => {
              e.preventDefault();
              const formDataObj = new FormData(e.currentTarget);
              const val = parseFloat(formDataObj.get('amount') as string);
              const finalMonths = selectedMonths.length > 0 ? selectedMonths : [currentDate.getMonth()];

              if (showModal === TransactionType.CARD_EXPENSE) {
                handleAddCardTransaction({
                  description: formDataObj.get('description') as string, amount: val,
                  provider: formDataObj.get('provider') as CardProvider,
                  totalInstallments: parseInt(formDataObj.get('totalInstallments') as string) || 1,
                  remainingInstallments: parseInt(formDataObj.get('totalInstallments') as string) || 1,
                  purchaseDate: new Date().toISOString()
                }, finalMonths);
              } else if (showModal === TransactionType.INCOME) {
                handleAddIncome({
                  description: formDataObj.get('description') as string, amount: val,
                  source: formDataObj.get('source') as IncomeSource, date: new Date().toISOString()
                }, finalMonths);
              } else if (showModal === TransactionType.FIXED_EXPENSE) {
                const category = formDataObj.get('category') as FixedExpenseCategory;
                handleAddFixedExpense({
                  category, name: category === FixedExpenseCategory.OUTROS ? formDataObj.get('customName') as string : category,
                  amount: val, dueDate: formDataObj.get('dueDate') as string
                }, finalMonths);
              }
            }} className="space-y-3">

              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-400 uppercase ml-2 tracking-widest">Identificação</label>
                {showModal === TransactionType.FIXED_EXPENSE ? (
                  <div className="space-y-2">
                    <select required name="category" onChange={(e) => setFixedCategory(e.target.value as FixedExpenseCategory)} className="w-full p-3 bg-slate-50 border-2 border-transparent rounded-xl focus:border-emerald-500 focus:bg-white outline-none font-bold text-xs">
                      {Object.values(FixedExpenseCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                    {fixedCategory === FixedExpenseCategory.OUTROS && (
                      <input required name="customName" placeholder="Título" className="w-full p-3 bg-slate-50 border-2 border-transparent rounded-xl focus:border-emerald-500 focus:bg-white outline-none text-xs font-bold" />
                    )}
                  </div>
                ) : (
                  <input required={showModal !== TransactionType.INCOME} placeholder="Ex: Amazon, Mercado..." name="description" className="w-full p-3 bg-slate-50 border-2 border-transparent rounded-xl focus:border-emerald-500 focus:bg-white outline-none text-xs font-bold" />
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-slate-400 uppercase ml-2 tracking-widest">Valor</label>
                  <input required name="amount" type="number" step="0.01" placeholder="0,00" className="w-full p-3 bg-slate-50 border-2 border-transparent rounded-xl focus:border-emerald-500 focus:bg-white outline-none text-sm font-black" />
                </div>
                {showModal === TransactionType.CARD_EXPENSE ? (
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase ml-2 tracking-widest">Parcelas</label>
                    <input required name="totalInstallments" type="number" defaultValue="1" min="1" className="w-full p-3 bg-slate-50 border-2 border-transparent rounded-xl focus:border-emerald-500 focus:bg-white outline-none text-sm font-black" />
                  </div>
                ) : showModal === TransactionType.INCOME ? (
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase ml-2 tracking-widest">Fonte</label>
                    <select required name="source" className="w-full p-3 bg-slate-50 border-2 border-transparent rounded-xl focus:border-emerald-500 focus:bg-white outline-none font-bold text-[10px]">
                      {Object.values(IncomeSource).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase ml-2 tracking-widest">Vencimento</label>
                    <input required name="dueDate" type="number" min="1" max="31" defaultValue="1" className="w-full p-3 bg-slate-50 border-2 border-transparent rounded-xl focus:border-emerald-500 focus:bg-white outline-none text-sm font-black" />
                  </div>
                )}
              </div>

              {/* REPETIÇÃO COMPACTADA */}
              <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex justify-between items-center">
                  <label className="text-[8px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-1">
                    <Repeat size={10} className="text-emerald-500" /> Meses
                  </label>
                  <button type="button" onClick={selectAllMonths} className="text-[7px] font-black uppercase text-emerald-600 bg-white px-1.5 py-0.5 rounded-md border border-slate-100">
                    {selectedMonths.length === 12 ? 'Reset' : 'Todos'}
                  </button>
                </div>
                <div className="grid grid-cols-6 gap-1">
                  {MONTHS.map((m, idx) => (
                    <button
                      key={m} type="button" onClick={() => toggleMonthSelection(idx)}
                      className={`py-1.5 px-0.5 text-[8px] font-black rounded-lg border-2 transition-all ${selectedMonths.includes(idx) ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-transparent text-slate-400'}`}
                    >
                      {m.substring(0, 3)}
                    </button>
                  ))}
                </div>
              </div>

              {showModal === TransactionType.CARD_EXPENSE && (
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-slate-400 uppercase ml-2 tracking-widest">Cartão</label>
                  <select required name="provider" className="w-full p-3 bg-slate-50 border-2 border-transparent rounded-xl focus:border-emerald-500 focus:bg-white outline-none font-bold text-xs">
                    <option value={CardProvider.SANTANDER}>Santander</option>
                    <option value={CardProvider.MERCADO_LIVRE}>Mercado Livre</option>
                  </select>
                </div>
              )}

              <button type="submit" className="w-full py-3.5 bg-slate-900 text-white font-black rounded-xl hover:bg-emerald-600 transition-all shadow-xl active:scale-[0.98] text-xs uppercase tracking-widest">
                Confirmar Lançamento
              </button>
            </form>
          </div>
        </div>
      )}

      {/* FAB - COMPACTO E ELEGANTE */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2 md:gap-4" ref={menuRef}>
        <div className={`flex flex-col items-end gap-2 transition-all duration-400 ${isMenuOpen ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-50 pointer-events-none'}`}>
          <button
            onClick={() => { setShowModal(TransactionType.FIXED_EXPENSE); setIsMenuOpen(false); }}
            className="flex items-center gap-2.5 bg-white text-slate-900 pr-4 pl-3 py-2.5 rounded-xl shadow-xl border border-slate-100 group transition-all"
          >
            <span className="text-[10px] font-black tracking-tight">Conta Fixa</span>
            <div className="bg-slate-100 p-1.5 rounded-lg group-hover:bg-emerald-500 transition-all"><Calendar size={14} /></div>
          </button>
          <button
            onClick={() => { setShowModal(TransactionType.CARD_EXPENSE); setIsMenuOpen(false); }}
            className="flex items-center gap-2.5 bg-white text-slate-900 pr-4 pl-3 py-2.5 rounded-xl shadow-xl border border-slate-100 group transition-all"
          >
            <span className="text-[10px] font-black tracking-tight">Cartão</span>
            <div className="bg-slate-100 p-1.5 rounded-lg group-hover:bg-emerald-500 transition-all"><CreditCard size={14} /></div>
          </button>
          <button
            onClick={() => { setShowModal(TransactionType.INCOME); setIsMenuOpen(false); }}
            className="flex items-center gap-2.5 bg-white text-slate-900 pr-4 pl-3 py-2.5 rounded-xl shadow-xl border border-slate-100 group transition-all"
          >
            <span className="text-[10px] font-black tracking-tight">Entrada</span>
            <div className="bg-slate-100 p-1.5 rounded-lg group-hover:bg-emerald-500 transition-all"><TrendingUp size={14} /></div>
          </button>
        </div>

        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className={`relative w-14 h-14 md:w-20 md:h-20 rounded-xl md:rounded-[2.5rem] shadow-2xl flex items-center justify-center transition-all duration-500 border-2 border-white ${isMenuOpen ? 'bg-red-500 rotate-[135deg]' : 'bg-emerald-500 hover:scale-105 active:scale-95'}`}
        >
          {isMenuOpen ? <Plus size={28} className="text-white" /> : <PlusCircle size={28} className="text-slate-900" />}
        </button>
      </div>
    </div>
  );
};

export default App;
