
import React, { useState, useEffect, useMemo } from 'react';
import {
    Calendar as CalendarIcon,
    Users,
    Plus,
    Search,
    Filter,
    ChevronLeft,
    ChevronRight,
    Circle,
    Clock,
    DollarSign,
    Edit2,
    MapPin,
    MoreVertical,
    Phone,
    Trash2,
    UserPlus,
    X,
    ArrowLeft,
    CheckCircle2
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
    const [clientSearchTerm, setClientSearchTerm] = useState('');
    const [selectedClientFilter, setSelectedClientFilter] = useState<string>('ALL');

    const [isClientModalOpen, setIsClientModalOpen] = useState(false);
    const [isManageClientsOpen, setIsManageClientsOpen] = useState(false);
    const [isApptModalOpen, setIsApptModalOpen] = useState(false);
    const [isFabOpen, setIsFabOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<MarineClient | null>(null);
    const [editingAppt, setEditingAppt] = useState<MarineAppointment | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [clientsData, apptsData] = await Promise.all([
                api.marine.fetchClients(),
                api.marine.fetchAppointments()
            ]);
            console.log('Marine Sync:', { clients: clientsData.length, appointments: apptsData.length });
            setClients(clientsData);
            setAppointments(apptsData);
        } catch (error) {
            console.error('Error fetching Marine data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Filter logic
    const filteredAppointments = useMemo(() => {
        return appointments.filter(appt => {
            const matchesSearch = (appt.client?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (appt.notes || '').toLowerCase().includes(searchTerm.toLowerCase());
            const matchesClient = selectedClientFilter === 'ALL' || appt.client_id === selectedClientFilter;

            if (!matchesSearch || !matchesClient) return false;

            const [y, m, d] = appt.date.split('-').map(Number);
            const apptDate = new Date(y, m - 1, d); // Data local sem timezone issues
            apptDate.setHours(0, 0, 0, 0);

            const startOfWeek = new Date(currentDate);
            const dayIdx = startOfWeek.getDay();
            // Se hoje é domingo (0), queremos a semana que começa na segunda passada ou próxima segunda?
            // Vamos fazer a semana sempre começar na segunda-feira.
            const diff = (dayIdx === 0) ? -6 : -(dayIdx - 1);

            startOfWeek.setDate(startOfWeek.getDate() + diff);
            startOfWeek.setHours(0, 0, 0, 0);

            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6); // Agora até Domingo (7 dias)
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
        const result: Record<number, MarineAppointment[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };

        filteredAppointments.forEach(appt => {
            const [y, m, d] = appt.date.split('-').map(Number);
            const date = new Date(y, m - 1, d);
            const day = date.getDay(); // 0-6 (0 é Domingo)
            // No nosso array idx de 0 a 6, vamos mapear Segunda(1) como 0... Domingo(0) como 6?
            // Melhor usar o day do JS: 0=Dom, 1=Seg...
            result[day].push(appt);
        });

        return result;
    }, [filteredAppointments]);

    const weekDays = useMemo(() => {
        const start = new Date(currentDate);
        const dayIdx = start.getDay();
        const diff = (dayIdx === 0) ? -6 : -(dayIdx - 1);
        start.setDate(start.getDate() + diff);

        return ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'].map((name, i) => {
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
        await fetchData();

        // Se o agendamento não estiver na semana atual, avisa ou pula pra lá
        const [y, m, d] = apptData.date.split('-').map(Number);
        const apptDate = new Date(y, m - 1, d);
        apptDate.setHours(0, 0, 0, 0);

        const now = new Date(currentDate);
        const dayIdx = now.getDay();
        const diff = (dayIdx === 0) ? -6 : -(dayIdx - 1);
        const start = new Date(now);
        start.setDate(now.getDate() + diff);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);

        if (apptDate < start || apptDate > end) {
            if (confirm('Agendamento salvo! Ele não está na semana atual. Deseja ir para a data do agendamento?')) {
                setCurrentDate(apptDate);
            }
        }
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
            {/* Header - Hidden on Mobile */}
            <header className="bg-white border-b border-slate-200 hidden md:block">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full"><ArrowLeft size={20} /></button>
                        <div className="flex items-center gap-3">
                            <img src="/mascot.png" alt="M" className="w-10 h-10 rounded-full border shadow-sm" />
                            <h1 className="text-xl font-black text-blue-600">Marine</h1>
                        </div>
                    </div>
                    <button onClick={() => setIsManageClientsOpen(true)} className="p-2.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                        <Users size={20} />
                    </button>
                </div>
            </header>

            {/* Mobile Minimalist Nav - Visible ONLY on Mobile */}
            <div className="md:hidden flex items-center justify-between mb-4 px-2">
                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-2xl p-1 shadow-sm">
                    <button onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() - 7); setCurrentDate(d); }} className="p-2 active:bg-slate-100 rounded-xl"><ChevronLeft size={18} /></button>
                    <div className="flex flex-col items-center px-2">
                        <span className="text-[11px] font-black text-slate-900 leading-none">{weekDays[0].date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
                    </div>
                    <button onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() + 7); setCurrentDate(d); }} className="p-2 active:bg-slate-100 rounded-xl"><ChevronRight size={18} /></button>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex flex-col items-end">
                        <span className="text-[11px] font-black text-emerald-600 leading-none">R$ {weeklyStats.paid.toFixed(0)}</span>
                        <span className="text-[7px] font-black text-slate-400 uppercase">Recebido</span>
                    </div>
                    <button onClick={onBack} className="p-2 bg-white border border-slate-200 rounded-xl text-slate-400"><ArrowLeft size={18} /></button>
                </div>
            </div>

            {/* Weekly Grid View - Now the ONLY view */}
            <div className="flex lg:grid lg:grid-cols-7 gap-4 overflow-x-auto pb-6 lg:pb-0 snap-x snap-mandatory">
                {weekDays.map((day, idx) => {
                    // appointmentsByDay usa o getDay do JS: 0=Dom, 1=Seg...
                    // weekDays[0] é Segunda (day 1), weekDays[6] é Domingo (day 0)
                    const currentJSDate = day.date.getDay();
                    const dayAppts = appointmentsByDay[currentJSDate] || [];
                    const dateStr = day.date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                    const isToday = new Date().toDateString() === day.date.toDateString();

                    return (
                        <div key={day.name} className={`flex-none w-[90vw] sm:w-[320px] lg:w-auto bg-white rounded-[1.5rem] border ${isToday ? 'border-blue-500 ring-1 ring-blue-100' : 'border-slate-200'} shadow-sm flex flex-col overflow-hidden h-[75vh] lg:h-[600px] snap-center transition-all duration-300`}>
                            <div className={`py-3 ${isToday ? 'bg-blue-600' : 'bg-slate-900'} text-white text-center`}>
                                <h4 className={`font-black uppercase tracking-[0.2em] text-[7px] ${isToday ? 'text-blue-100' : 'opacity-40'} mb-0.5`}>{day.name}</h4>
                                <div className="text-base font-black">{dateStr}</div>
                            </div>
                            <div className="p-4 space-y-4 flex-1 overflow-y-auto bg-slate-50/20">
                                {dayAppts.length > 0 ? (
                                    dayAppts.sort((a, b) => a.start_time.localeCompare(b.start_time)).map(appt => (
                                        <div
                                            key={appt.id}
                                            className={`p-3 rounded-2xl border bg-white shadow-sm hover:shadow-md transition-all cursor-pointer group relative ${appt.is_paid ? 'border-emerald-100 bg-emerald-50/10' : 'border-yellow-100 bg-yellow-50/5'}`}
                                            onClick={() => { setEditingAppt(appt); setIsApptModalOpen(true); }}
                                        >
                                            <div className="flex justify-between items-start mb-1.5 group/card">
                                                <div className="text-[11px] font-black text-slate-900 leading-tight pr-4 truncate">{appt.client?.name}</div>
                                                <div className="flex items-center gap-1 shrink-0">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); deleteAppt(appt.id); }}
                                                        className="p-1 px-1.5 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); togglePaid(appt); }}
                                                        className={`shrink-0 p-1 rounded-full transition-all ${appt.is_paid ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-200 bg-yellow-50 hover:text-yellow-600'}`}
                                                    >
                                                        <CheckCircle2 size={14} strokeWidth={3} />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="space-y-1 mb-2">
                                                <div className="flex items-center gap-2 text-[9px] font-bold text-slate-400">
                                                    <Clock size={11} className="text-blue-500 shrink-0" />
                                                    <span>{appt.start_time}-{appt.end_time}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-[9px] font-bold text-slate-400">
                                                    <MapPin size={11} className="text-red-400 shrink-0" />
                                                    <span className="truncate">{appt.client?.address}</span>
                                                </div>
                                            </div>

                                            <div className="flex justify-between items-center border-t border-slate-50 pt-2 mt-auto">
                                                <span className={`text-[11px] font-black ${appt.is_paid ? 'text-emerald-600' : 'text-blue-600'}`}>R$ {appt.amount.toFixed(0)}</span>
                                                <span className={`text-[7px] font-black uppercase px-2 py-0.5 rounded-full ${appt.is_paid ? 'bg-emerald-50 text-emerald-500' : 'bg-yellow-100/50 text-yellow-600'}`}>
                                                    {appt.is_paid ? 'Pago' : 'Pendente'}
                                                </span>
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

                            {/* Daily Footer Summary */}
                            <div className={`p-4 border-t ${isToday ? 'bg-blue-50/50 border-blue-100' : 'bg-slate-50/50 border-slate-100'}`}>
                                <div className="flex justify-between items-center px-1">
                                    <div className="flex flex-col">
                                        <span className="text-[7px] font-black text-slate-400 border border-slate-100 uppercase tracking-widest px-1.5 rounded-full w-fit mb-1">Total Previsto</span>
                                        <span className={`text-sm font-black ${isToday ? 'text-blue-700' : 'text-slate-900'}`}>R$ {dayAppts.reduce((sum, a) => sum + a.amount, 0).toFixed(0)}</span>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-[7px] font-black text-emerald-500 border border-emerald-100 uppercase tracking-widest px-1.5 rounded-full w-fit mb-1">Recebido</span>
                                        <span className="text-sm font-black text-emerald-600">R$ {dayAppts.filter(a => a.is_paid).reduce((sum, a) => sum + a.amount, 0).toFixed(0)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Enhanced Magic FAB */}
            <div className="fixed bottom-8 right-6 z-50 flex flex-col items-end gap-3">
                {isFabOpen && (
                    <div className="flex flex-col items-end gap-3 mb-2 animate-in slide-in-from-bottom-5">
                        <button onClick={() => { setIsManageClientsOpen(true); setIsFabOpen(false); }} className="group flex items-center gap-3">
                            <span className="bg-white px-3 py-1.5 rounded-xl shadow-lg border border-slate-100 text-[10px] font-black tracking-widest text-slate-600">CLIENTES</span>
                            <div className="w-12 h-12 bg-white text-slate-600 border border-slate-200 rounded-2xl flex items-center justify-center shadow-xl"><Users size={20} /></div>
                        </button>
                        <button onClick={() => { setEditingClient(null); setIsClientModalOpen(true); setIsFabOpen(false); }} className="group flex items-center gap-3">
                            <span className="bg-white px-3 py-1.5 rounded-xl shadow-lg border border-slate-100 text-[10px] font-black tracking-widest text-slate-600">NOVO CLIENTE</span>
                            <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-xl"><UserPlus size={20} /></div>
                        </button>
                        <button onClick={() => { setEditingAppt(null); setIsApptModalOpen(true); setIsFabOpen(false); }} className="group flex items-center gap-3">
                            <span className="bg-white px-3 py-1.5 rounded-xl shadow-lg border border-slate-100 text-[10px] font-black tracking-widest text-slate-600">AGENDAR</span>
                            <div className="w-14 h-14 bg-blue-600 text-white rounded-[1.2rem] flex items-center justify-center shadow-xl"><Plus size={24} strokeWidth={3} /></div>
                        </button>
                    </div>
                )}
                <button
                    onClick={() => setIsFabOpen(!isFabOpen)}
                    className={`w-16 h-16 rounded-3xl flex items-center justify-center shadow-2xl transition-all ${isFabOpen ? 'bg-slate-900 text-white rotate-45' : 'bg-blue-600 text-white'}`}
                >
                    <Plus size={36} strokeWidth={3} />
                </button>
            </div>

            {/* Modals */}
            {
                isManageClientsOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                        <div className="bg-white rounded-[2.5rem] w-full max-w-2xl h-[80vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95">
                            <div className="p-6 bg-gradient-to-r from-slate-900 to-blue-900 text-white flex justify-between items-center">
                                <div>
                                    <h3 className="text-xl font-black">Gerenciar Clientes</h3>
                                    <p className="text-[10px] font-bold text-blue-300 uppercase tracking-widest leading-none mt-1">Sua lista de contatos</p>
                                </div>
                                <button onClick={() => { setIsManageClientsOpen(false); setClientSearchTerm(''); }} className="p-2 hover:bg-white/10 rounded-full transition-all"><X /></button>
                            </div>

                            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        type="text"
                                        placeholder="Buscar por nome ou endereço..."
                                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500 transition-all"
                                        value={clientSearchTerm}
                                        onChange={(e) => setClientSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30">
                                {clients.filter(c => (c.name || '').toLowerCase().includes(clientSearchTerm.toLowerCase()) || (c.address || '').toLowerCase().includes(clientSearchTerm.toLowerCase())).map(client => (
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
                )
            }
            {
                isClientModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                        <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95">
                            <div className="p-6 bg-gradient-to-r from-blue-700 to-blue-900 text-white flex justify-between items-center">
                                <h3 className="text-xl font-black">{editingClient ? 'Editar Cliente' : 'Novo Cliente'}</h3>
                                <button onClick={() => setIsClientModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-all"><X /></button>
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
                )
            }

            {
                isApptModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                        <div className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95">
                            <div className="p-6 bg-gradient-to-r from-blue-700 to-blue-900 text-white flex justify-between items-center">
                                <h3 className="text-xl font-black">{editingAppt?.id ? 'Editar Agendamento' : 'Agendar Faxina'}</h3>
                                <button onClick={() => setIsApptModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-all"><X /></button>
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
