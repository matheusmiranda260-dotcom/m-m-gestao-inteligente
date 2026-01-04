
import React, { useState, useEffect, useMemo } from 'react';
import {
    Calendar as CalendarIcon,
    Users,
    Plus,
    Search,
    Filter,
    ChevronLeft,
    ChevronRight,
    Clock,
    DollarSign,
    MapPin,
    Phone,
    MoreVertical,
    CheckCircle2,
    Circle,
    X,
    Trash2,
    Edit2,
    ArrowLeft
} from 'lucide-react';
import { api } from './services/api';
import { MarineClient, MarineAppointment } from './types';

interface MarineHomeClearProps {
    onBack: () => void;
}

export const MarineHomeClear: React.FC<MarineHomeClearProps> = ({ onBack }) => {
    const [view, setView] = useState<'CALENDAR' | 'CLIENTS'>('CALENDAR');
    const [clients, setClients] = useState<MarineClient[]>([]);
    const [appointments, setAppointments] = useState<MarineAppointment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [filterType, setFilterType] = useState<'WEEK' | 'MONTH' | 'ALL'>('MONTH');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedClientFilter, setSelectedClientFilter] = useState<string>('ALL');

    const [isClientModalOpen, setIsClientModalOpen] = useState(false);
    const [isApptModalOpen, setIsApptModalOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<MarineClient | null>(null);
    const [editingAppt, setEditingAppt] = useState<MarineAppointment | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        const [clientsData, apptsData] = await Promise.all([
            api.marine.fetchClients(),
            api.marine.fetchAppointments()
        ]);
        setClients(clientsData);
        setAppointments(apptsData);
        setIsLoading(false);
    };

    // Filter logic
    const filteredAppointments = useMemo(() => {
        return appointments.filter(appt => {
            const matchesSearch = appt.client?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                appt.notes?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesClient = selectedClientFilter === 'ALL' || appt.client_id === selectedClientFilter;

            if (!matchesSearch || !matchesClient) return false;

            const apptDate = new Date(appt.date + 'T00:00:00'); // Garante data local

            if (filterType === 'MONTH') {
                return apptDate.getMonth() === currentDate.getMonth() &&
                    apptDate.getFullYear() === currentDate.getFullYear();
            } else if (filterType === 'WEEK') {
                const startOfWeek = new Date(currentDate);
                const day = startOfWeek.getDay();

                // Se for domingo (0), pula para a próxima segunda (+1)
                // Se for outro dia, volta para a segunda daquela semana
                const diff = (day === 0) ? 1 : -(day - 1);

                startOfWeek.setDate(startOfWeek.getDate() + diff);
                startOfWeek.setHours(0, 0, 0, 0);

                const endOfWeek = new Date(startOfWeek);
                endOfWeek.setDate(startOfWeek.getDate() + 5); // Até Sábado
                endOfWeek.setHours(23, 59, 59, 999);

                return apptDate >= startOfWeek && apptDate <= endOfWeek;
            }

            return true;
        });
    }, [appointments, searchTerm, selectedClientFilter, filterType, currentDate]);

    const weeklyStats = useMemo(() => {
        const total = filteredAppointments.reduce((acc, appt) => acc + appt.amount, 0);
        const paid = filteredAppointments.filter(a => a.is_paid).reduce((acc, appt) => acc + appt.amount, 0);
        const pending = total - paid;
        return { total, paid, pending };
    }, [filteredAppointments]);

    const appointmentsByDay = useMemo(() => {
        const days = [1, 2, 3, 4, 5, 6];
        const result: Record<number, MarineAppointment[]> = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };

        filteredAppointments.forEach(appt => {
            const date = new Date(appt.date);
            const utcDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
            const day = utcDate.getDay();
            if (day >= 1 && day <= 6) {
                result[day].push(appt);
            }
        });

        return result;
    }, [filteredAppointments]);

    const weekDays = useMemo(() => {
        const start = new Date(currentDate);
        const day = start.getDay();
        const diff = (day === 0) ? 1 : -(day - 1);
        start.setDate(start.getDate() + diff);

        return ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'].map((name, i) => {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            return { name, date: d };
        });
    }, [currentDate]);

    const handleAddClient = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const clientData = {
            name: formData.get('name') as string,
            phone: formData.get('phone') as string,
            address: formData.get('address') as string,
            notes: formData.get('notes') as string,
        };

        if (editingClient) {
            await api.marine.updateClient(editingClient.id, clientData);
        } else {
            await api.marine.addClient(clientData);
        }

        setIsClientModalOpen(false);
        setEditingClient(null);
        fetchData();
    };

    const handleAddAppt = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const apptData = {
            client_id: formData.get('client_id') as string,
            date: formData.get('date') as string,
            start_time: formData.get('start_time') as string,
            end_time: formData.get('end_time') as string,
            amount: parseFloat(formData.get('amount') as string),
            notes: formData.get('notes') as string,
            is_paid: false
        };

        if (editingAppt) {
            await api.marine.updateAppointment(editingAppt.id, apptData);
        } else {
            await api.marine.addAppointment(apptData);
        }

        setIsApptModalOpen(false);
        setEditingAppt(null);
        fetchData();
    };

    const togglePaid = async (appt: MarineAppointment) => {
        await api.marine.updateAppointment(appt.id, { is_paid: !appt.is_paid });
        fetchData();
    };

    const deleteAppt = async (id: string) => {
        if (confirm('Excluir este agendamento?')) {
            await api.marine.deleteAppointment(id);
            fetchData();
        }
    };

    const deleteClient = async (id: string) => {
        if (confirm('Excluir este cliente? Todos os agendamentos dele também serão excluídos.')) {
            await api.marine.deleteClient(id);
            fetchData();
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onBack}
                            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                        >
                            <ArrowLeft size={20} className="text-slate-500" />
                        </button>
                        <div>
                            <h1 className="text-xl font-black tracking-tight text-blue-600">Marine Home Clear</h1>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Gestão de Faxinas</p>
                        </div>
                    </div>

                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        <button
                            onClick={() => setView('CALENDAR')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${view === 'CALENDAR' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <CalendarIcon size={16} /> Agenda
                        </button>
                        <button
                            onClick={() => setView('CLIENTS')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${view === 'CLIENTS' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Users size={16} /> Clientes
                        </button>
                    </div>

                    <div className="hidden md:flex items-center gap-3">
                        <button
                            onClick={() => setIsClientModalOpen(true)}
                            className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all flex items-center gap-2"
                        >
                            <Plus size={16} /> Novo Cliente
                        </button>
                        <button
                            onClick={() => setIsApptModalOpen(true)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-black hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20"
                        >
                            <Plus size={16} /> Agendar Faxina
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {view === 'CALENDAR' ? (
                    <div className="space-y-6">
                        {/* Summary Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Previsto</p>
                                <p className="text-3xl font-black text-blue-600">R$ {weeklyStats.total.toFixed(2)}</p>
                            </div>
                            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Recebido</p>
                                <p className="text-3xl font-black text-emerald-500">R$ {weeklyStats.paid.toFixed(2)}</p>
                            </div>
                            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pendente</p>
                                <p className="text-3xl font-black text-orange-500">R$ {weeklyStats.pending.toFixed(2)}</p>
                            </div>
                        </div>

                        {/* Filters & Control */}
                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-100">
                                    <button onClick={() => {
                                        const newDate = new Date(currentDate);
                                        if (filterType === 'WEEK') newDate.setDate(newDate.getDate() - 7);
                                        else newDate.setMonth(newDate.getMonth() - 1);
                                        setCurrentDate(newDate);
                                    }} className="p-2 hover:bg-white rounded-lg transition-all"><ChevronLeft size={16} /></button>
                                    <span className="px-4 font-bold text-sm min-w-[120px] text-center capitalize">
                                        {filterType === 'WEEK' ? `Semana de ${currentDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}` : currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                                    </span>
                                    <button onClick={() => {
                                        const newDate = new Date(currentDate);
                                        if (filterType === 'WEEK') newDate.setDate(newDate.getDate() + 7);
                                        else newDate.setMonth(newDate.getMonth() + 1);
                                        setCurrentDate(newDate);
                                    }} className="p-2 hover:bg-white rounded-lg transition-all"><ChevronRight size={16} /></button>
                                </div>
                                <select
                                    value={filterType}
                                    onChange={(e) => setFilterType(e.target.value as any)}
                                    className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:border-blue-500 transition-all"
                                >
                                    <option value="WEEK">Visão Semanal (Grade)</option>
                                    <option value="MONTH">Visão Mensal (Lista)</option>
                                    <option value="ALL">Ver Tudo</option>
                                </select>
                            </div>

                            <div className="flex flex-1 max-w-md w-full gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Buscar por cliente ou obs..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 transition-all"
                                    />
                                </div>
                                <select
                                    value={selectedClientFilter}
                                    onChange={(e) => setSelectedClientFilter(e.target.value)}
                                    className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:border-blue-500 transition-all"
                                >
                                    <option value="ALL">Todos Clientes</option>
                                    {clients.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Weekly Grid View */}
                        {filterType === 'WEEK' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                                {weekDays.map((day, idx) => {
                                    const dayNum = idx + 1;
                                    const dayAppts = appointmentsByDay[dayNum] || [];
                                    const dateStr = day.date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                                    return (
                                        <div key={day.name} className="bg-white rounded-[2rem] border border-slate-200 shadow-sm flex flex-col overflow-hidden min-h-[400px]">
                                            <div className="p-4 bg-slate-900 text-white text-center">
                                                <h4 className="font-black uppercase tracking-widest text-[10px] opacity-60 leading-none mb-1">{day.name}</h4>
                                                <div className="text-sm font-black tracking-tighter">{dateStr}</div>
                                            </div>
                                            <div className="p-3 space-y-3 flex-1 overflow-y-auto bg-slate-50/30">
                                                {dayAppts.length > 0 ? (
                                                    dayAppts.sort((a, b) => a.start_time.localeCompare(b.start_time)).map(appt => (
                                                        <div
                                                            key={appt.id}
                                                            className={`p-3 rounded-2xl border bg-white shadow-sm hover:shadow-md transition-all cursor-pointer group relative ${appt.is_paid ? 'border-emerald-100' : 'border-slate-100'}`}
                                                            onClick={() => { setEditingAppt(appt); setIsApptModalOpen(true); }}
                                                        >
                                                            <div className="flex justify-between items-start mb-1">
                                                                <div className="text-xs font-black text-slate-900 truncate pr-2 flex-1">{appt.client?.name}</div>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        togglePaid(appt);
                                                                    }}
                                                                    className={`shrink-0 transition-colors ${appt.is_paid ? 'text-emerald-500' : 'text-slate-200 hover:text-emerald-400'}`}
                                                                >
                                                                    <CheckCircle2 size={16} />
                                                                </button>
                                                            </div>

                                                            <div className="flex flex-col gap-1 mb-2">
                                                                <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400">
                                                                    <Clock size={10} className="text-blue-500" />
                                                                    {appt.start_time.substring(0, 5)} - {appt.end_time.substring(0, 5)}
                                                                </div>
                                                                <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400 truncate">
                                                                    <MapPin size={10} className="text-red-400" />
                                                                    {appt.client?.address}
                                                                </div>
                                                            </div>

                                                            <div className="text-[11px] font-black text-blue-600">R$ {appt.amount.toFixed(2)}</div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="h-full flex items-center justify-center text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                                                        Livre
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            /* List View */
                            <div className="grid grid-cols-1 gap-4">
                                {filteredAppointments.length > 0 ? (
                                    filteredAppointments.map(appt => (
                                        <div key={appt.id} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
                                            {appt.is_paid && (
                                                <div className="absolute top-0 right-0 bg-emerald-500 text-white px-6 py-1 rounded-bl-2xl text-[10px] font-black uppercase tracking-widest shadow-lg">
                                                    Pago
                                                </div>
                                            )}
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                                <div className="flex items-start gap-4">
                                                    <div className="w-16 h-16 bg-blue-50 rounded-2xl flex flex-col items-center justify-center text-blue-600 shrink-0 border border-blue-100">
                                                        <span className="text-[10px] font-black uppercase leading-none">{new Date(appt.date).toLocaleDateString('pt-BR', { weekday: 'short' })}</span>
                                                        <span className="text-2xl font-black leading-none">{new Date(appt.date).getDate()}</span>
                                                    </div>
                                                    <div>
                                                        <h3 className="text-xl font-black text-slate-900 mb-1">{appt.client?.name}</h3>
                                                        <div className="flex flex-wrap gap-4 text-sm font-medium text-slate-500">
                                                            <div className="flex items-center gap-1.5">
                                                                <Clock size={16} className="text-blue-500" />
                                                                {appt.start_time.substring(0, 5)} - {appt.end_time.substring(0, 5)}
                                                            </div>
                                                            <div className="flex items-center gap-1.5">
                                                                <MapPin size={16} className="text-red-400" />
                                                                {appt.client?.address}
                                                            </div>
                                                            {appt.client?.phone && (
                                                                <div className="flex items-center gap-1.5">
                                                                    <Phone size={16} className="text-emerald-500" />
                                                                    {appt.client.phone}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-none pt-4 md:pt-0">
                                                    <div className="text-right">
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Valor do Serviço</p>
                                                        <p className="text-2xl font-black text-slate-900">R$ {appt.amount.toFixed(2)}</p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => togglePaid(appt)}
                                                            className={`p-3 rounded-xl transition-all ${appt.is_paid ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400 hover:text-blue-600'}`}
                                                            title={appt.is_paid ? "Marcar como não pago" : "Marcar como pago"}
                                                        >
                                                            {appt.is_paid ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                                                        </button>
                                                        <button
                                                            onClick={() => { setEditingAppt(appt); setIsApptModalOpen(true); }}
                                                            className="p-3 bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                                        >
                                                            <Edit2 size={20} />
                                                        </button>
                                                        <button
                                                            onClick={() => deleteAppt(appt.id)}
                                                            className="p-3 bg-slate-50 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                                        >
                                                            <Trash2 size={20} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                            {appt.notes && (
                                                <div className="mt-4 p-3 bg-slate-50 rounded-xl text-xs font-bold text-slate-500 italic border-l-4 border-blue-400">
                                                    "{appt.notes}"
                                                </div>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div className="bg-white py-20 rounded-[3rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center px-6">
                                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                                            <CalendarIcon size={40} className="text-slate-300" />
                                        </div>
                                        <h3 className="text-2xl font-black text-slate-800 mb-2">Nenhum agendamento encontrado</h3>
                                        <p className="text-slate-400 font-medium max-w-md">Não existem faxinas agendadas para este período ou com este filtro. Que tal agendar uma agora?</p>
                                        <button
                                            onClick={() => setIsApptModalOpen(true)}
                                            className="mt-8 px-8 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-500/20 hover:scale-105 transition-all"
                                        >
                                            Agendar Faxina
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    /* Clients View */
                    <div className="space-y-6">
                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
                            <div className="relative max-w-md w-full">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Buscar clientes por nome ou endereço..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 transition-all"
                                />
                            </div>
                            <button
                                onClick={() => { setEditingClient(null); setIsClientModalOpen(true); }}
                                className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-black shadow-lg shadow-blue-500/20"
                            >
                                Adicionar Cliente
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {clients.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase())).map(client => (
                                <div key={client.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-xl transition-all group">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center text-xl font-black shadow-lg shadow-blue-500/30">
                                            {client.name.charAt(0)}
                                        </div>
                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                            <button
                                                onClick={() => { setEditingClient(client); setIsClientModalOpen(true); }}
                                                className="p-2 bg-slate-50 text-slate-400 hover:text-blue-600 rounded-lg transition-all"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => deleteClient(client.id)}
                                                className="p-2 bg-slate-50 text-slate-400 hover:text-red-600 rounded-lg transition-all"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                    <h3 className="text-xl font-black text-slate-900 mb-4">{client.name}</h3>
                                    <div className="space-y-3">
                                        <div className="flex items-start gap-2.5 text-sm font-bold text-slate-500">
                                            <MapPin size={18} className="text-red-400 shrink-0" />
                                            <span>{client.address}</span>
                                        </div>
                                        <div className="flex items-center gap-2.5 text-sm font-bold text-slate-500">
                                            <Phone size={18} className="text-emerald-500 shrink-0" />
                                            <span>{client.phone}</span>
                                        </div>
                                        {client.notes && (
                                            <div className="mt-4 p-3 bg-slate-50 rounded-xl text-[11px] font-bold text-slate-400 leading-relaxed italic">
                                                {client.notes}
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => {
                                            setEditingAppt({
                                                client_id: client.id,
                                                date: new Date().toISOString().split('T')[0],
                                                start_time: '08:00',
                                                end_time: '12:00',
                                                amount: 0,
                                                is_paid: false,
                                                notes: '',
                                                id: ''
                                            });
                                            setIsApptModalOpen(true);
                                        }}
                                        className="w-full mt-6 py-3 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-600 transition-all"
                                    >
                                        Agendar para este cliente
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>

            {/* Fab for Mobile */}
            <div className="fixed bottom-6 right-6 md:hidden flex flex-col gap-3">
                <button
                    onClick={() => setIsClientModalOpen(true)}
                    className="w-14 h-14 bg-white text-blue-600 border border-blue-100 rounded-full flex items-center justify-center shadow-xl shadow-blue-500/20 active:scale-90 transition-all"
                >
                    <Users size={24} />
                </button>
                <button
                    onClick={() => setIsApptModalOpen(true)}
                    className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-2xl shadow-blue-500/40 active:scale-95 transition-all"
                >
                    <Plus size={32} strokeWidth={3} />
                </button>
            </div>

            {/* Modals */}
            {isClientModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95">
                        <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
                            <h3 className="text-xl font-black">{editingClient ? 'Editar Cliente' : 'Novo Cliente'}</h3>
                            <button onClick={() => setIsClientModalOpen(false)}><X /></button>
                        </div>
                        <form onSubmit={handleAddClient} className="p-6 space-y-4">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Nome Completo</label>
                                <input name="name" defaultValue={editingClient?.name} required className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:border-blue-500 transition-all" placeholder="Mariane Miranda" />
                            </div>
                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Telefone / WhatsApp</label>
                                    <input name="phone" defaultValue={editingClient?.phone} className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:border-blue-500 transition-all" placeholder="(00) 00000-0000" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Endereço</label>
                                    <input name="address" defaultValue={editingClient?.address} required className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:border-blue-500 transition-all" placeholder="Rua das Garças, 123" />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Observações / Preferências</label>
                                <textarea name="notes" defaultValue={editingClient?.notes} className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:border-blue-500 transition-all" rows={3} placeholder="Tem cachorro, prefere produtos sem cheiro..." />
                            </div>
                            <button type="submit" className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all mt-4 uppercase tracking-widest text-sm">
                                {editingClient ? 'Salvar Alterações' : 'Cadastrar Cliente'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {isApptModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95">
                        <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
                            <h3 className="text-xl font-black">{editingAppt?.id ? 'Editar Agendamento' : 'Agendar Faxina'}</h3>
                            <button onClick={() => setIsApptModalOpen(false)}><X /></button>
                        </div>
                        <form onSubmit={handleAddAppt} className="p-6 space-y-4">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Cliente</label>
                                <select name="client_id" defaultValue={editingAppt?.client_id} required className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:border-blue-500 transition-all">
                                    <option value="">Selecione um cliente...</option>
                                    {clients.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Data</label>
                                    <input type="date" name="date" defaultValue={editingAppt?.date} required className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:border-blue-500 transition-all" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Hora Início</label>
                                    <input type="time" name="start_time" defaultValue={editingAppt?.start_time} required className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:border-blue-500 transition-all" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Hora Término</label>
                                    <input type="time" name="end_time" defaultValue={editingAppt?.end_time} required className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:border-blue-500 transition-all" />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Valor do Serviço (R$)</label>
                                    <input type="number" step="0.01" name="amount" defaultValue={editingAppt?.amount} required className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:border-blue-500 transition-all" placeholder="150,00" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Notas / Tarefas</label>
                                    <input name="notes" defaultValue={editingAppt?.notes} className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:border-blue-500 transition-all" placeholder="Focar na cozinha, passar pano..." />
                                </div>
                            </div>
                            <button type="submit" className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all mt-4 uppercase tracking-widest text-sm">
                                {editingAppt?.id ? 'Salvar Alterações' : 'Confirmar Agendamento'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
