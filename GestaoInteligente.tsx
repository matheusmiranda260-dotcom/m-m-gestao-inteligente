
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
    Repeat,
    Plus,
    AlertCircle,
    Edit2,
    Settings,
    ArrowLeft
} from 'lucide-react';

import { api } from './services/api';

interface GestaoInteligenteProps {
    onBack: () => void;
}

export const GestaoInteligente: React.FC<GestaoInteligenteProps> = ({ onBack }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [fixedCategory, setFixedCategory] = useState<FixedExpenseCategory>(FixedExpenseCategory.AGUA);
    const [showDetailsModal, setShowDetailsModal] = useState<number | null>(null);
    const [selectedMonths, setSelectedMonths] = useState<number[]>([]);
    const [aiInsight, setAiInsight] = useState<string>('');
    const [loadingAi, setLoadingAi] = useState(false);
    const [showModal, setShowModal] = useState<TransactionType | null>(null);
    const [editingTransaction, setEditingTransaction] = useState<any | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [transactionYear, setTransactionYear] = useState(new Date().getFullYear());

    const [data, setData] = useState<FinancialData>({
        cardTransactions: [],
        fixedExpenses: [],
        incomes: []
    });
    const [appSettings, setAppSettings] = useState<any>({
        card_settings: {
            [CardProvider.SANTANDER]: { dueDay: 10, closeDay: 3 },
            [CardProvider.MERCADO_LIVRE]: { dueDay: 8, closeDay: 1 }
        },
        category_settings: {
            [FixedExpenseCategory.AGUA]: 5,
            [FixedExpenseCategory.LUZ]: 10,
            [FixedExpenseCategory.INTERNET_CASA]: 15,
            [FixedExpenseCategory.INTERNET_CELULAR]: 15,
            [FixedExpenseCategory.TERRENO]: 20,
            [FixedExpenseCategory.TV]: 10
        }
    });
    const [showSettings, setShowSettings] = useState(false);

    const fetchSafely = async () => {
        setIsLoading(true);
        const [result, settings] = await Promise.all([api.fetchData(), api.getSettings()]);
        if (result) setData(result);
        if (settings) {
            setAppSettings({
                card_settings: settings.card_settings || appSettings.card_settings,
                category_settings: settings.category_settings || appSettings.category_settings
            });
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
        if (!showModal) {
            setSelectedMonths([]);
            setEditingTransaction(null);
        } else {
            setTransactionYear(currentDate.getFullYear());
        }
    }, [showModal, currentDate]);

    const yearlySummary = useMemo(() => {
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

            let monthlyCardsSantander = 0;
            let monthlyCardsML = 0;
            const filteredCards: any[] = [];

            data.cardTransactions.forEach(t => {
                const pDate = new Date(t.purchaseDate);
                const startMonthTotal = pDate.getMonth() + pDate.getFullYear() * 12;
                const currentMonthTotal = monthIndex + year * 12;
                const diff = currentMonthTotal - startMonthTotal;
                if (diff >= 0 && diff < t.totalInstallments) {
                    const installmentValue = (t.amount / (t.totalInstallments || 1));
                    const isPaid = t.paidInstallments?.includes(diff + 1);

                    filteredCards.push({
                        ...t,
                        currentInstallment: diff + 1,
                        installmentValue,
                        isPaid
                    });

                    if (t.provider === CardProvider.SANTANDER) {
                        monthlyCardsSantander += installmentValue;
                    } else {
                        monthlyCardsML += installmentValue;
                    }
                }
            });

            const totalCards = monthlyCardsSantander + monthlyCardsML;
            const pendingCards = filteredCards.filter(c => !c.isPaid).reduce((acc, c) => acc + c.installmentValue, 0);

            return {
                monthIndex, monthName, income: monthlyIncomes, fixed: monthlyFixed,
                pendingFixed, pendingCards, cardsSantander: monthlyCardsSantander, cardsML: monthlyCardsML, cards: totalCards, balance: monthlyIncomes - (monthlyFixed + totalCards),
                filteredFixed, filteredCards, filteredIncomes: data.incomes.filter(i => {
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

    const handleAddCardTransaction = async (base: Omit<CardTransaction, 'id'>, targetMonths: number[], yearOverride?: number) => {
        try {
            const year = yearOverride || currentDate.getFullYear();
            setIsLoading(true);
            const providerSettings = appSettings?.card_settings?.[base.provider];
            const dueDay = providerSettings?.dueDay || 1;
            const promises = targetMonths.map(m => {
                const daysInMonth = new Date(year, m + 1, 0).getDate();
                const finalDay = Math.min(dueDay, daysInMonth);
                return api.addCardTransaction({
                    ...base,
                    purchaseDate: new Date(year, m, finalDay).toISOString()
                });
            });
            await Promise.all(promises);
            await fetchSafely();
            setShowModal(null);
        } catch (error) {
            console.error("Erro ao adicionar transação:", error);
        }
    };

    const handleSmartAddCard = async (base: Omit<CardTransaction, 'id'>, targetMonths: number[], yearOverride?: number) => {
        const providerSettings = appSettings?.card_settings?.[base.provider];
        const closeDay = providerSettings?.closeDay || 100;
        const today = new Date();
        const isClosed = today.getDate() >= closeDay;
        let finalMonths = targetMonths;
        let finalYear = yearOverride || currentDate.getFullYear();
        if (targetMonths.length === 1 && targetMonths[0] === today.getMonth() && finalYear === today.getFullYear()) {
            if (isClosed) {
                const nextMonth = (today.getMonth() + 1) % 12;
                finalMonths = [nextMonth];
                if (nextMonth === 0) finalYear += 1;
                alert(`Cartão virou! Lançamento jogado para o próximo mês (Fatura fecha dia ${closeDay}).`);
            }
        }
        await handleAddCardTransaction(base, finalMonths, finalYear);
    };

    const handleAddIncome = async (base: Omit<Income, 'id'>, targetMonths: number[], yearOverride?: number) => {
        const year = yearOverride || currentDate.getFullYear();
        setIsLoading(true);
        const promises = targetMonths.map(m => api.addIncome({ ...base, date: new Date(year, m, 1).toISOString() }));
        await Promise.all(promises);
        await fetchSafely();
        setShowModal(null);
    };

    const handleAddFixedExpense = async (base: Omit<FixedExpense, 'id' | 'isPaid' | 'month' | 'year'>, targetMonths: number[], yearOverride?: number) => {
        const year = yearOverride || currentDate.getFullYear();
        setIsLoading(true);
        const promises = targetMonths.map(m => api.addFixedExpense({ ...base, isPaid: false, month: m, year: year }));
        await Promise.all(promises);
        await fetchSafely();
        setShowModal(null);
    };

    const toggleFixedExpense = async (id: string) => {
        const expense = data.fixedExpenses.find(e => e.id === id);
        if (!expense) return;
        setData(prev => ({ ...prev, fixedExpenses: prev.fixedExpenses.map(e => e.id === id ? { ...e, isPaid: !e.isPaid } : e) }));
        const success = await api.updateFixedExpense(id, { isPaid: !expense.isPaid });
        if (!success) fetchSafely();
    };

    const updateFixedAmount = async (id: string, amount: number) => {
        setData(prev => ({ ...prev, fixedExpenses: prev.fixedExpenses.map(e => e.id === id ? { ...e, amount } : e) }));
        await api.updateFixedExpense(id, { amount });
    };

    const toggleCardInstallment = async (id: string, installment: number) => {
        const transaction = data.cardTransactions.find(t => t.id === id);
        if (!transaction) return;
        const currentPaid = transaction.paidInstallments || [];
        const isPaid = currentPaid.includes(installment);
        const newPaid = isPaid ? currentPaid.filter(i => i !== installment) : [...currentPaid, installment];
        setData(prev => ({ ...prev, cardTransactions: prev.cardTransactions.map(t => t.id === id ? { ...t, paidInstallments: newPaid } : t) }));
        const success = await api.updateCardTransaction(id, { paidInstallments: newPaid });
        if (!success) fetchSafely();
    };

    const deleteTransaction = async (type: 'card' | 'income' | 'fixed', id: string) => {
        if (!confirm('Excluir este registro?')) return;
        const tableMap = { 'card': 'card_transactions', 'income': 'incomes', 'fixed': 'fixed_expenses' } as const;
        const success = await api.deleteItem(tableMap[type], id);
        if (success) fetchSafely();
    };

    const generateInsights = async () => {
        setLoadingAi(true);
        const insight = await getFinancialInsights(data);
        setAiInsight(insight);
        setLoadingAi(false);
    };

    const handleEditTransaction = (item: any, type: TransactionType) => {
        setEditingTransaction(item);
        setShowModal(type);
        if (type === TransactionType.FIXED_EXPENSE) setFixedCategory(item.category);
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

            <header className="bg-slate-900 text-white p-3 md:p-6 shadow-xl rounded-b-[1.5rem] sticky top-0 z-30">
                <div className="max-w-6xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onBack}
                            className="p-2 hover:bg-slate-800 rounded-full transition-colors"
                        >
                            <ArrowLeft size={20} className="text-slate-400" />
                        </button>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 md:w-12 md:h-12 bg-emerald-500 rounded-lg md:rounded-2xl flex items-center justify-center shadow-lg rotate-3">
                                <span className="text-xs md:text-base font-black italic tracking-tighter text-slate-900">M$M</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] md:text-lg font-black tracking-tighter leading-none">GESTÃO INTELIGENTE</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setShowSettings(true)} className="bg-slate-800 text-slate-400 hover:text-white p-2 md:p-3 rounded-lg md:rounded-xl transition-all"><Settings size={16} className="md:w-6 md:h-6" /></button>
                        <button onClick={generateInsights} disabled={loadingAi} className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 p-1.5 md:p-3 rounded-lg md:rounded-xl transition-all flex items-center gap-2 px-3 md:px-5 shadow-lg active:scale-95">
                            <BrainCircuit size={14} className="md:w-5 md:h-5" />
                            <span className="text-[9px] md:text-sm font-black uppercase tracking-wider">{loadingAi ? '...' : 'Análise'}</span>
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto p-2 md:p-6 space-y-4 md:space-y-6">
                <div className="flex justify-between items-center bg-white p-2 md:p-4 rounded-xl md:rounded-2xl shadow-sm border border-slate-100">
                    <h2 className="text-[9px] md:text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Calendar size={10} className="text-emerald-500 md:w-4 md:h-4" /> Fluxo {currentDate.getFullYear()}
                    </h2>
                    <div className="flex items-center gap-1.5 md:gap-3">
                        <button onClick={() => changeYear(-1)} className="p-1.5 md:p-2 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"><ChevronLeft size={16} className="md:w-6 md:h-6" /></button>
                        <span className="text-xs md:text-xl font-black text-slate-800">{currentDate.getFullYear()}</span>
                        <button onClick={() => changeYear(1)} className="p-1.5 md:p-2 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"><ChevronRight size={16} className="md:w-6 md:h-6" /></button>
                    </div>
                </div>

                <section className="space-y-3">
                    <div className="hidden md:block bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50/50 text-[10px] md:text-sm uppercase font-black text-slate-400 border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-5">Mês</th>
                                    <th className="px-6 py-5 text-emerald-600">Entrada</th>
                                    <th className="px-6 py-5 text-red-500">Fixas</th>
                                    <th className="px-6 py-5 text-orange-600">Santander</th>
                                    <th className="px-6 py-5 text-yellow-500">ML</th>
                                    <th className="px-6 py-5">Saldo</th>
                                    <th className="px-6 py-5 text-center">Ação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {yearlySummary.map(m => (
                                    <tr key={m.monthIndex} className="hover:bg-emerald-50/30 transition-all text-sm md:text-base lg:text-lg group">
                                        <td className="px-6 py-5 font-bold capitalize text-slate-700">{m.monthName}</td>
                                        <td className="px-6 py-5 font-bold text-emerald-600">R$ {m.income.toFixed(2)}</td>
                                        <td className="px-6 py-5 text-slate-500 italic">R$ {m.fixed.toFixed(2)}</td>
                                        <td className="px-6 py-5 text-orange-600 font-medium">R$ {m.cardsSantander.toFixed(2)}</td>
                                        <td className="px-6 py-5 text-yellow-600 font-medium">R$ {m.cardsML.toFixed(2)}</td>
                                        <td className={`px-6 py-5 font-black ${m.balance >= 0 ? 'text-slate-800' : 'text-red-500'}`}>R$ {m.balance.toFixed(2)}</td>
                                        <td className="px-6 py-5 text-center">
                                            <button onClick={() => setShowDetailsModal(m.monthIndex)} className="p-2.5 text-emerald-600 bg-emerald-50/0 group-hover:bg-emerald-50 rounded-xl transition-all"><Eye size={20} /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="grid grid-cols-2 gap-2 md:hidden">
                        {yearlySummary.map(m => (
                            <button key={m.monthIndex} onClick={() => setShowDetailsModal(m.monthIndex)} className="flex flex-col p-3 bg-white rounded-xl shadow-sm border border-slate-100 active:scale-95 transition-all text-left">
                                <span className="text-[11px] font-black text-slate-800 capitalize mb-1">{m.monthName}</span>
                                <div className="flex items-center justify-between w-full mb-1">
                                    <span className={`text-xs font-black ${m.balance >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                        R$ {m.balance.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                </section>

                {aiInsight && (
                    <div className="bg-slate-900 border-l-4 border-emerald-500 p-3 md:p-8 rounded-xl md:rounded-3xl relative shadow-xl animate-in fade-in slide-in-from-top-4">
                        <button onClick={() => setAiInsight('')} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"><X size={20} /></button>
                        <h3 className="text-white font-black text-[10px] md:text-lg mb-2 flex items-center gap-2"><BrainCircuit size={20} className="text-emerald-500" /> Análise AI</h3>
                        <div className="text-slate-300 text-[10px] md:text-base leading-relaxed whitespace-pre-wrap">{aiInsight}</div>
                    </div>
                )}
            </main>

            {/* CONFIGURAÇÕES MODAL */}
            {showSettings && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-900 text-white">
                            <h3 className="text-xl font-black flex items-center gap-2"><Settings className="text-emerald-500" /> Configurações</h3>
                            <button onClick={() => setShowSettings(false)}><X className="text-slate-400 hover:text-white" /></button>
                        </div>
                        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                            <div>
                                <h4 className="font-black text-slate-900 mb-3 flex items-center gap-2 uppercase tracking-wider text-xs"><CreditCard size={14} className="text-orange-500" /> Cartões de Crédito</h4>
                                <div className="space-y-3">
                                    {Object.values(CardProvider).map(provider => (
                                        <div key={provider} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                            <div className="text-sm font-bold text-slate-800 mb-2">{provider}</div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-[10px] uppercase font-bold text-slate-400">Dia Fechamento</label>
                                                    <input type="number" min="1" max="31" value={appSettings.card_settings[provider]?.closeDay || 1} onChange={(e) => setAppSettings((prev: any) => ({ ...prev, card_settings: { ...prev.card_settings, [provider]: { ...prev.card_settings[provider], closeDay: parseInt(e.target.value) } } }))} className="w-full p-2 rounded-lg border border-slate-200 font-bold" />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] uppercase font-bold text-slate-400">Dia Vencimento</label>
                                                    <input type="number" min="1" max="31" value={appSettings.card_settings[provider]?.dueDay || 10} onChange={(e) => setAppSettings((prev: any) => ({ ...prev, card_settings: { ...prev.card_settings, [provider]: { ...prev.card_settings[provider], dueDay: parseInt(e.target.value) } } }))} className="w-full p-2 rounded-lg border border-slate-200 font-bold" />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="p-4 border-t border-slate-100 bg-slate-50">
                            <button onClick={async () => { await api.updateSettings(appSettings); setShowSettings(false); alert('Configurações salvas!'); }} className="w-full py-3 bg-slate-900 text-white font-black rounded-xl hover:bg-emerald-600 transition-all shadow-lg">Salvar Configurações</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE DETALHES */}
            {selectedDetails && (
                <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
                    <div className="bg-white rounded-t-3xl md:rounded-[3rem] w-full max-w-5xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl animate-in slide-in-from-bottom-10 md:zoom-in-95 duration-300">
                        <div className="p-4 md:p-8 border-b border-slate-100 flex justify-between items-center bg-slate-900 text-white">
                            <div className="flex items-center gap-2 md:gap-4">
                                <div className="w-8 h-8 md:w-14 md:h-14 bg-emerald-500 rounded-lg md:rounded-2xl flex items-center justify-center text-slate-900 font-black rotate-3">{selectedDetails.monthName.charAt(0)}</div>
                                <h3 className="text-lg md:text-3xl font-black capitalize">{selectedDetails.monthName}</h3>
                            </div>
                            <button onClick={() => setShowDetailsModal(null)} className="p-1.5 md:p-3 text-slate-400 hover:text-white transition-colors"><X size={24} /></button>
                        </div>
                        <div className="overflow-y-auto p-4 md:p-10 space-y-4 md:space-y-10 bg-slate-50/20">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
                                <div className="bg-white p-3 md:p-5 rounded-2xl shadow-sm border border-slate-100"><p className="text-[8px] md:text-[10px] font-black text-emerald-600 uppercase">Entradas</p><p className="text-sm md:text-xl font-black">R$ {selectedDetails.income.toFixed(2)}</p></div>
                                <div className="bg-white p-3 md:p-5 rounded-2xl shadow-sm border border-slate-100"><p className="text-[8px] md:text-[10px] font-black text-orange-500 uppercase">Cartões</p><p className="text-sm md:text-xl font-black">R$ {selectedDetails.cards.toFixed(2)}</p></div>
                                <div className="bg-white p-3 md:p-5 rounded-2xl shadow-sm border border-slate-100"><p className="text-[8px] md:text-[10px] font-black text-red-500 uppercase">Pendências</p><p className="text-sm md:text-xl font-black">R$ {(selectedDetails.pendingFixed + selectedDetails.pendingCards).toFixed(2)}</p></div>
                                <div className={`p-3 md:p-5 rounded-2xl shadow-lg border-2 ${selectedDetails.balance >= 0 ? 'bg-emerald-500 border-emerald-400 text-white' : 'bg-red-500 border-red-400 text-white'} col-span-2 md:col-span-1`}><p className="text-[8px] md:text-[10px] font-black uppercase opacity-80">Saldo</p><p className="text-sm md:text-xl font-black">R$ {selectedDetails.balance.toFixed(2)}</p></div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
                                {/* Entradas */}
                                <div className="space-y-3">
                                    <h4 className="text-[9px] md:text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><TrendingUp size={14} className="text-emerald-500" /> Entradas</h4>
                                    {selectedDetails.filteredIncomes.map(income => (
                                        <div key={income.id} className="flex justify-between items-center p-3 rounded-xl bg-emerald-50/40 border border-emerald-100">
                                            <div className="text-[10px] md:text-sm font-bold">{income.source}: {income.description || 'Receita'}</div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-black">R$ {income.amount.toFixed(2)}</span>
                                                <button onClick={() => handleEditTransaction(income, TransactionType.INCOME)} className="text-blue-400 hover:text-blue-600"><Edit2 size={14} /></button>
                                                <button onClick={() => deleteTransaction('income', income.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {/* Fixas */}
                                <div className="space-y-3">
                                    <h4 className="text-[9px] md:text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Calendar size={14} className="text-red-400" /> Fixas</h4>
                                    {selectedDetails.filteredFixed.map(expense => (
                                        <div key={expense.id} className="flex justify-between items-center p-3 rounded-xl bg-white border border-slate-100">
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => toggleFixedExpense(expense.id)}>{expense.isPaid ? <CheckCircle className="text-emerald-500" size={18} /> : <Circle className="text-slate-200" size={18} />}</button>
                                                <div className="text-[10px] md:text-sm font-bold">{expense.name}</div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-black">R$ {expense.amount.toFixed(2)}</span>
                                                <button onClick={() => handleEditTransaction(expense, TransactionType.FIXED_EXPENSE)} className="text-blue-400 hover:text-blue-600"><Edit2 size={14} /></button>
                                                <button onClick={() => deleteTransaction('fixed', expense.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {/* Cartões */}
                                <div className="space-y-3">
                                    <h4 className="text-[9px] md:text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><CreditCard size={14} className="text-orange-500" /> Cartões</h4>
                                    {selectedDetails.filteredCards.map(card => (
                                        <div key={card.id} className="flex justify-between items-center p-3 rounded-xl bg-orange-50/30 border border-orange-100">
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => toggleCardInstallment(card.id, card.currentInstallment)}>{card.isPaid ? <CheckCircle className="text-emerald-500" size={18} /> : <Circle className="text-slate-200" size={18} />}</button>
                                                <div className="text-[10px] md:text-sm font-bold">{card.description}</div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-black">R$ {card.installmentValue.toFixed(2)}</span>
                                                <button onClick={() => handleEditTransaction(card, TransactionType.CARD_EXPENSE)} className="text-blue-400 hover:text-blue-600"><Edit2 size={14} /></button>
                                                <button onClick={() => deleteTransaction('card', card.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL LANÇAMENTO */}
            {showModal && (
                <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center p-0 md:p-4">
                    <div className="bg-white rounded-t-3xl md:rounded-[3rem] w-full max-w-2xl p-5 md:p-12 relative shadow-2xl border-t-8 border-emerald-500">
                        <button onClick={() => setShowModal(null)} className="absolute top-6 right-6 text-slate-300"><X size={32} /></button>
                        <h3 className="text-xl md:text-3xl font-black mb-8 flex items-center gap-3">{editingTransaction ? 'Editar Lançamento' : 'Novo Lançamento'}</h3>
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            setIsLoading(true);
                            const formDataObj = new FormData(e.currentTarget);
                            const val = parseFloat((formDataObj.get('amount') as string).replace(',', '.'));
                            const desc = formDataObj.get('description') as string;

                            if (editingTransaction) {
                                if (showModal === TransactionType.CARD_EXPENSE) {
                                    await api.updateCardTransaction(editingTransaction.id, {
                                        description: desc,
                                        amount: val,
                                        provider: formDataObj.get('provider') as CardProvider,
                                        totalInstallments: parseInt(formDataObj.get('totalInstallments') as string)
                                    });
                                } else if (showModal === TransactionType.INCOME) {
                                    await api.updateIncome(editingTransaction.id, {
                                        description: desc,
                                        amount: val,
                                        source: formDataObj.get('source') as IncomeSource
                                    });
                                } else if (showModal === TransactionType.FIXED_EXPENSE) {
                                    const cat = formDataObj.get('category') as FixedExpenseCategory;
                                    await api.updateFixedExpense(editingTransaction.id, {
                                        name: cat === FixedExpenseCategory.OUTROS ? formDataObj.get('customName') as string : cat,
                                        amount: val,
                                        category: cat,
                                        dueDate: formDataObj.get('dueDate') as string
                                    });
                                }
                                await fetchSafely();
                                setShowModal(null);
                            } else {
                                const finalMonths = selectedMonths.length > 0 ? selectedMonths : [currentDate.getMonth()];
                                if (showModal === TransactionType.CARD_EXPENSE) {
                                    handleSmartAddCard({
                                        description: desc, amount: val,
                                        provider: formDataObj.get('provider') as CardProvider,
                                        totalInstallments: parseInt(formDataObj.get('totalInstallments') as string) || 1,
                                        remainingInstallments: parseInt(formDataObj.get('totalInstallments') as string) || 1,
                                        purchaseDate: new Date().toISOString()
                                    }, finalMonths, transactionYear);
                                } else if (showModal === TransactionType.INCOME) {
                                    handleAddIncome({ description: desc, amount: val, source: formDataObj.get('source') as IncomeSource, date: new Date().toISOString() }, finalMonths, transactionYear);
                                } else if (showModal === TransactionType.FIXED_EXPENSE) {
                                    const category = formDataObj.get('category') as FixedExpenseCategory;
                                    handleAddFixedExpense({ category, name: category === FixedExpenseCategory.OUTROS ? formDataObj.get('customName') as string : category, amount: val, dueDate: formDataObj.get('dueDate') as string }, finalMonths, transactionYear);
                                }
                            }
                        }} className="space-y-6">
                            <input name="description" defaultValue={editingTransaction?.description || editingTransaction?.name || ''} placeholder="Descrição" required className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-xl focus:border-emerald-500 outline-none font-bold" />
                            <div className="grid grid-cols-2 gap-4">
                                <input name="amount" defaultValue={editingTransaction?.amount || ''} type="number" step="0.01" placeholder="Valor R$ 0,00" required className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-xl focus:border-emerald-500 outline-none font-black" />
                                {showModal === TransactionType.CARD_EXPENSE && (
                                    <>
                                        <div className="col-span-2 md:col-span-1">
                                            <select name="provider" defaultValue={editingTransaction?.provider || ''} required className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-xl focus:border-emerald-500 outline-none font-bold">
                                                <option value="" disabled>Selecione o Cartão</option>
                                                {Object.values(CardProvider).map(p => (
                                                    <option key={p} value={p}>{p}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <input name="totalInstallments" defaultValue={editingTransaction?.totalInstallments || ''} type="number" placeholder="Parcelas" required className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-xl focus:border-emerald-500 outline-none font-black" />
                                    </>
                                )}
                                {showModal === TransactionType.INCOME && (
                                    <div className="col-span-2">
                                        <select name="source" defaultValue={editingTransaction?.source || ''} required className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-xl focus:border-emerald-500 outline-none font-bold">
                                            <option value="" disabled>Fonte da Renda</option>
                                            {Object.values(IncomeSource).map(s => (
                                                <option key={s} value={s}>{s}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                {showModal === TransactionType.FIXED_EXPENSE && (
                                    <>
                                        <div className="col-span-2 md:col-span-1">
                                            <select
                                                name="category"
                                                required
                                                className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-xl focus:border-emerald-500 outline-none font-bold"
                                                onChange={(e) => setFixedCategory(e.target.value as FixedExpenseCategory)}
                                                defaultValue={editingTransaction?.category || ''}
                                            >
                                                <option value="" disabled>Categoria</option>
                                                {Object.values(FixedExpenseCategory).map(c => (
                                                    <option key={c} value={c}>{c}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <input name="dueDate" defaultValue={editingTransaction?.dueDate || ''} type="number" min="1" max="31" placeholder="Dia Venc." required className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-xl focus:border-emerald-500 outline-none font-black" />
                                        {fixedCategory === FixedExpenseCategory.OUTROS && (
                                            <div className="col-span-2">
                                                <input name="customName" defaultValue={editingTransaction?.name || ''} placeholder="Nome da Despesa" required className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-xl focus:border-emerald-500 outline-none font-bold" />
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                            <button type="submit" className="w-full py-4 bg-slate-900 text-white font-black rounded-xl hover:bg-emerald-600 transition-all uppercase tracking-widest">Confirmar</button>
                        </form>
                    </div>
                </div>
            )}

            {/* FAB */}
            <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2" ref={menuRef}>
                <div className={`flex flex-col items-end gap-2 transition-all ${isMenuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none'}`}>
                    <button onClick={() => setShowModal(TransactionType.FIXED_EXPENSE)} className="bg-white p-3 rounded-xl shadow-xl flex items-center gap-2 font-bold text-xs"><Calendar size={14} /> Conta Fixa</button>
                    <button onClick={() => setShowModal(TransactionType.CARD_EXPENSE)} className="bg-white p-3 rounded-xl shadow-xl flex items-center gap-2 font-bold text-xs"><CreditCard size={14} /> Cartão</button>
                    <button onClick={() => setShowModal(TransactionType.INCOME)} className="bg-white p-3 rounded-xl shadow-xl flex items-center gap-2 font-bold text-xs"><TrendingUp size={14} /> Entrada</button>
                </div>
                <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="w-16 h-16 bg-emerald-500 text-slate-900 rounded-2xl shadow-2xl flex items-center justify-center transition-all">
                    <Plus size={32} className={isMenuOpen ? 'rotate-45' : ''} />
                </button>
            </div>
        </div>
    );
};
