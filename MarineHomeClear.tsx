
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
    const [filterType] = useState<'WEEK'>('WEEK');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedClientFilter, setSelectedClientFilter] = useState<string>('ALL');

    const [isClientModalOpen, setIsClientModalOpen] = useState(false);
    const [isManageClientsOpen, setIsManageClientsOpen] = useState(false);
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

            const startOfWeek = new Date(currentDate);
            const day = startOfWeek.getDay();
            const diff = (day === 0) ? 1 : -(day - 1);
            startOfWeek.setDate(startOfWeek.getDate() + diff);
            startOfWeek.setHours(0, 0, 0, 0);

            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 5); // Até Sábado
            endOfWeek.setHours(23, 59, 59, 999);

            return apptDate >= startOfWeek && apptDate <= endOfWeek;
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

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsManageClientsOpen(true)}
                            className="p-2.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all md:hidden"
                            title="Gerenciar Clientes"
                        >
                            <Users size={20} />
                        </button>
                        <div className="hidden md:flex items-center gap-3">
                            <button
                                onClick={() => setIsManageClientsOpen(true)}
                                className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all flex items-center gap-2"
                            >
                                <Users size={16} /> Gerenciar Clientes
                            </button>
                            <button
                                onClick={() => { setEditingClient(null); setIsClientModalOpen(true); }}
                                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all flex items-center gap-2"
                            >
                                <Plus size={16} /> Novo Cliente
                            </button>
                            <button
                                onClick={() => { setEditingAppt(null); setIsApptModalOpen(true); }}
                                className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-black hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20"
                            >
                                <Plus size={16} /> Agendar Faxina
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="space-y-6">
                    {/* Filters & Control */}
                    <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col gap-4">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div className="flex items-center justify-between bg-slate-50 p-1 rounded-2xl border border-slate-100 w-full sm:w-auto">
                                <button
                                    onClick={() => {
                                        const newDate = new Date(currentDate);
                                        newDate.setDate(newDate.getDate() - 7);
                                        setCurrentDate(newDate);
                                    }}
                                    className="p-2.5 hover:bg-white hover:shadow-sm rounded-xl transition-all active:scale-90"
                                >
                                    <ChevronLeft size={20} className="text-slate-600" />
                                </button>
                                <div className="flex flex-col items-center">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">Semana de</span>
                                    <span className="text-xs font-black text-slate-900 tracking-tight">
                                        {weekDays[0].date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                    </span>
                                </div>
                                <button
                                    onClick={() => {
                                        const newDate = new Date(currentDate);
                                        newDate.setDate(newDate.getDate() + 7);
                                        setCurrentDate(newDate);
                                    }}
                                    className="p-2.5 hover:bg-white hover:shadow-sm rounded-xl transition-all active:scale-90"
                                >
                                    <ChevronRight size={20} className="text-slate-600" />
                                </button>
                            </div>

                            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                                <div className="px-4 py-2 bg-white border border-slate-100 rounded-2xl flex items-center gap-3 shadow-sm">
                                    <div className="flex flex-col items-center">
                                        <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">Previsto</span>
                                        <span className="text-[11px] font-black text-blue-600">R$ {weeklyStats.total.toFixed(0)}</span>
                                    </div>
                                    <div className="w-px h-6 bg-slate-100" />
                                    <div className="flex flex-col items-center">
                                        <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">Recebido</span>
                                        <span className="text-[11px] font-black text-emerald-500">R$ {weeklyStats.paid.toFixed(0)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 w-full">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                <input
                                    type="text"
                                    placeholder="Buscar..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold outline-none focus:border-blue-500 focus:bg-white transition-all"
                                />
                            </div>
                            <div className="relative">
                                <select
                                    value={selectedClientFilter}
                                    onChange={(e) => setSelectedClientFilter(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-8 py-2.5 text-[11px] font-black outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer"
                                    style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%2364748b\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'3\' d=\'M19 9l-7 7-7-7\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.7rem center', backgroundSize: '1em' }}
                                >
                                    <option value="ALL">Clientes: Todos</option>
                                    {clients.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Weekly Grid View - Now the ONLY view */}
                    <div className="flex lg:grid lg:grid-cols-6 gap-4 overflow-x-auto pb-6 lg:pb-0 snap-x snap-mandatory">
                        {weekDays.map((day, idx) => {
                            const dayNum = idx + 1;
                            const dayAppts = appointmentsByDay[dayNum] || [];
                            const dateStr = day.date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                            const isToday = new Date().toDateString() === day.date.toDateString();

                            return (
                                <div key={day.name} className={`flex-none w-[85vw] sm:w-[320px] lg:w-auto bg-white rounded-[2.5rem] border ${isToday ? 'border-blue-400 ring-4 ring-blue-50' : 'border-slate-200'} shadow-sm flex flex-col overflow-hidden min-h-[550px] snap-center transition-all duration-500 hover:shadow-xl`}>
                                    <div className={`p-6 ${isToday ? 'bg-gradient-to-br from-blue-600 to-blue-700' : 'bg-slate-900'} text-white text-center relative overflow-hidden`}>
                                        {isToday && (
                                            <>
                                                <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl" />
                                                <div className="absolute bottom-0 left-0 w-16 h-16 bg-blue-400/20 rounded-full -ml-8 -mb-8 blur-xl" />
                                            </>
                                        )}
                                        <h4 className={`font-black uppercase tracking-[0.3em] text-[9px] ${isToday ? 'text-blue-100' : 'opacity-40'} leading-none mb-2`}>{day.name}</h4>
                                        <div className="text-xl font-black tracking-tighter">{dateStr}</div>
                                        {isToday && (
                                            <div className="mt-3 inline-flex items-center gap-1 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[8px] font-black uppercase tracking-widest text-white border border-white/10">
                                                Hoje
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-4 space-y-4 flex-1 overflow-y-auto bg-slate-50/20">
                                        {dayAppts.length > 0 ? (
                                            dayAppts.sort((a, b) => a.start_time.localeCompare(b.start_time)).map(appt => (
                                                <div
                                                    key={appt.id}
                                                    className={`p-4 rounded-[2rem] border bg-white shadow-sm hover:shadow-md transition-all cursor-pointer group relative ${appt.is_paid ? 'border-emerald-100 bg-emerald-50/10' : 'border-slate-100'}`}
                                                    onClick={() => { setEditingAppt(appt); setIsApptModalOpen(true); }}
                                                >
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div className="text-xs font-black text-slate-900 leading-tight pr-4">{appt.client?.name}</div>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                togglePaid(appt);
                                                            }}
                                                            className={`shrink-0 p-1 rounded-full transition-all ${appt.is_paid ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-200 bg-slate-100 hover:text-emerald-500 hover:bg-emerald-50'}`}
                                                        >
                                                            <CheckCircle2 size={16} strokeWidth={3} />
                                                        </button>
                                                    </div>

                                                    <div className="space-y-1.5 mb-3">
                                                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                                                            <Clock size={12} className="text-blue-500" />
                                                            {appt.start_time.substring(0, 5)} — {appt.end_time.substring(0, 5)}
                                                        </div>
                                                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                                                            <MapPin size={12} className="text-red-400 shrink-0" />
                                                            <span className="truncate">{appt.client?.address}</span>
                                                        </div>
                                                    </div>

                                                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-50">
                                                        <div className="text-[12px] font-black text-blue-600">
                                                            R$ {appt.amount.toFixed(2)}
                                                        </div>
                                                        {appt.is_paid && (
                                                            <span className="text-[8px] font-black uppercase tracking-widest text-emerald-500 px-2 py-0.5 bg-emerald-50 rounded-full">Liquidado</span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="h-full flex flex-col items-center justify-center gap-3 py-10">
                                                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100">
                                                    <Circle size={20} className="text-slate-200" />
                                                </div>
                                                <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Livre</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </main>

            {/* Fab for Mobile */}
            <div className="fixed bottom-8 right-6 md:hidden flex flex-col gap-4 z-50">
                <button
                    onClick={() => setIsManageClientsOpen(true)}
                    className="w-14 h-14 bg-white text-slate-900 border border-slate-200 rounded-2xl flex items-center justify-center shadow-2xl active:scale-90 transition-all"
                >
                    <Users size={24} />
                </button>
                <button
                    onClick={() => setIsApptModalOpen(true)}
                    className="w-16 h-16 bg-blue-600 text-white rounded-[1.5rem] flex items-center justify-center shadow-2xl shadow-blue-500/40 active:scale-95 transition-all"
                >
                    <Plus size={32} strokeWidth={3} />
                </button>
            </div>

            {/* Modals */}
            {isManageClientsOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-2xl h-[80vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95">
                        <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-black">Gerenciar Clientes</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">Lista de todos os clientes cadastrados</p>
                            </div>
                            <button onClick={() => setIsManageClientsOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-all"><X /></button>
                        </div>

                        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type="text"
                                    placeholder="Buscar por nome ou endereço..."
                                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500 transition-all"
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30">
                            {clients.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.address.toLowerCase().includes(searchTerm.toLowerCase())).map(client => (
                                <div key={client.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-blue-200 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-sm font-black">
                                            {client.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-black text-slate-900">{client.name}</h4>
                                            <p className="text-[10px] font-bold text-slate-400 truncate max-w-[200px] sm:max-w-xs">{client.address}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => {
                                                setEditingClient(client);
                                                setIsClientModalOpen(true);
                                            }}
                                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (confirm('Deseja realmente excluir este cliente?')) {
                                                    // Aqui chamaria a função deleteClient que já existe ou deve ser verificada
                                                    api.marine.deleteClient(client.id).then(() => fetchData());
                                                }
                                            }}
                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-4 bg-white border-t border-slate-100">
                            <button
                                onClick={() => { setEditingClient(null); setIsClientModalOpen(true); }}
                                className="w-full py-3 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-500/20"
                            >
                                + Adicionar Novo Cliente
                            </button>
                        </div>
                    </div>
                </div>
            )}
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
