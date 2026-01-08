import React, { useState, useEffect } from 'react';
import {
    Scale,
    Truck,
    Barcode,
    Plus,
    Save,
    Trash2,
    CheckCircle,
    AlertTriangle,
    History,
    FileText,
    Settings,
    X
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { StockLot } from '../types';

interface Gauge {
    id: string;
    type: 'Fio Máquina' | 'CA60';
    gauge: number;
}

const StockControl: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState<StockLot[]>([]);

    // Config State
    const [showConfig, setShowConfig] = useState(false);
    const [gauges, setGauges] = useState<Gauge[]>([]);
    const [newGauge, setNewGauge] = useState<{ type: 'Fio Máquina' | 'CA60', value: string }>({ type: 'Fio Máquina', value: '' });

    // Form State
    const [currentLot, setCurrentLot] = useState<Partial<StockLot> & { materialType?: string, gauge?: number }>({
        lotNumber: '',
        supplier: '',
        labelWeight: 0,
        scaleWeight: 0,
        notes: '',
        materialType: 'Fio Máquina', // default
        gauge: 0
    });

    // Current Session (Buffer)
    const [conferenceBuffer, setConferenceBuffer] = useState<(Partial<StockLot> & { materialType?: string, gauge?: number })[]>([]);

    useEffect(() => {
        fetchHistory();
        fetchGauges();
    }, []);

    const fetchGauges = async () => {
        const { data } = await supabase.from('stock_gauges').select('*').order('gauge', { ascending: true });
        if (data) setGauges(data as any);
    };

    const fetchHistory = async () => {
        const { data, error } = await supabase
            .from('stock_lots')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) {
            console.error('Error fetching history:', error);
        } else if (data) {
            setHistory(data.map(item => ({
                id: item.id,
                lotNumber: item.lot_number,
                supplier: item.supplier,
                labelWeight: item.label_weight,
                scaleWeight: item.scale_weight,
                difference: item.difference,
                status: item.status,
                notes: item.notes,
                createdAt: item.created_at,
                // Add these if we update main type, but mainly for display here
                materialType: item.material_type,
                gauge: item.gauge
            } as any)));
        }
    };

    const handleAddGauge = async () => {
        if (!newGauge.value) return;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return alert('Você precisa estar logado para adicionar bitolas.');

        const { error } = await supabase.from('stock_gauges').insert([{
            user_id: user.id,
            type: newGauge.type,
            gauge: parseFloat(newGauge.value)
        }]);

        if (error) {
            alert('Erro ao salvar: ' + error.message);
        } else {
            setNewGauge({ ...newGauge, value: '' });
            fetchGauges();
        }
    };

    const handleDeleteGauge = async (id: string) => {
        if (window.confirm('Excluir bitola?')) {
            await supabase.from('stock_gauges').delete().eq('id', id);
            fetchGauges();
        }
    };

    const addToBuffer = () => {
        if (!currentLot.lotNumber || !currentLot.supplier) return alert('Preencha Lote e Fornecedor');
        if (!currentLot.scaleWeight && !currentLot.labelWeight) return alert('Preencha os pesos');
        if (!currentLot.gauge) return alert('Selecione a Bitola');

        const newItem = {
            ...currentLot,
            id: Date.now().toString(), // Temp ID
            difference: (currentLot.scaleWeight || 0) - (currentLot.labelWeight || 0)
        };

        setConferenceBuffer([...conferenceBuffer, newItem]);
        setCurrentLot({
            ...currentLot,
            lotNumber: '',
            // supplier: currentLot.supplier, // Keep supplier? Maybe
            labelWeight: 0,
            scaleWeight: 0,
            notes: ''
            // Keep gauge and type for faster entry
        });
    };

    const removeFromBuffer = (tempId: string) => {
        setConferenceBuffer(conferenceBuffer.filter(i => i.id !== tempId));
    };

    const saveConference = async () => {
        if (conferenceBuffer.length === 0) return;
        setLoading(true);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            alert('Usuário não autenticado');
            setLoading(false);
            return;
        }

        const rows = conferenceBuffer.map(item => ({
            user_id: user.id,
            lot_number: item.lotNumber,
            supplier: item.supplier,
            label_weight: item.labelWeight,
            scale_weight: item.scaleWeight,
            status: 'Conferido',
            notes: item.notes,
            material_type: item.materialType,
            gauge: item.gauge
        }));

        const { error } = await supabase.from('stock_lots').insert(rows);

        if (error) {
            alert('Erro ao salvar conferência: ' + error.message);
        } else {
            alert('Conferência salva com sucesso!');
            setConferenceBuffer([]);
            fetchHistory();
        }
        setLoading(false);
    };

    // Derived list of available gauges for current selected type
    const availableGauges = gauges.filter(g => g.type === currentLot.materialType);

    return (
        <div className="space-y-8 animate-in fade-in duration-500 relative">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 to-indigo-900 p-8 rounded-3xl shadow-2xl text-white relative overflow-hidden flex justify-between items-start">
                <div className="relative z-10">
                    <h2 className="text-3xl font-black flex items-center gap-3 mb-2">
                        <Scale className="text-indigo-400" /> Controle de Estoque
                    </h2>
                    <p className="text-indigo-200">Conferência de recebimento (Fio Máquina e CA60).</p>
                </div>
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Scale size={120} />
                </div>
                <button
                    onClick={() => setShowConfig(!showConfig)}
                    className="relative z-10 bg-white/10 hover:bg-white/20 p-2 rounded-lg transition-colors border border-white/20"
                    title="Configurar Bitolas"
                >
                    <Settings className="text-white" />
                </button>
            </div>

            {showConfig && (
                <div className="bg-white p-6 rounded-2xl shadow-xl border-2 border-indigo-100 mb-8 animate-in slide-in-from-top-4">
                    <div className="flex justify-between items-center mb-6 border-b pb-4">
                        <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                            <Settings className="text-indigo-600" /> Configuração de Bitolas
                        </h3>
                        <button onClick={() => setShowConfig(false)} className="text-slate-400 hover:text-slate-600"><X /></button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <h4 className="font-bold text-sm uppercase text-slate-500 mb-3">Adicionar Nova</h4>
                            <div className="flex gap-2 mb-2">
                                <select
                                    className="p-2 border rounded-lg bg-slate-50 font-medium"
                                    value={newGauge.type}
                                    onChange={e => setNewGauge({ ...newGauge, type: e.target.value as any })}
                                >
                                    <option value="Fio Máquina">Fio Máquina</option>
                                    <option value="CA60">CA60</option>
                                </select>
                                <input
                                    type="number"
                                    placeholder="Bitola (mm)"
                                    className="p-2 border rounded-lg w-full"
                                    value={newGauge.value}
                                    onChange={e => setNewGauge({ ...newGauge, value: e.target.value })}
                                />
                                <button
                                    onClick={handleAddGauge}
                                    className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700"
                                >
                                    <Plus />
                                </button>
                            </div>
                        </div>

                        <div>
                            <h4 className="font-bold text-sm uppercase text-slate-500 mb-3">Bitolas Cadastradas</h4>
                            <div className="grid grid-cols-2 gap-4 max-h-40 overflow-y-auto pr-2">
                                {gauges.map(g => (
                                    <div key={g.id} className="flex justify-between items-center bg-slate-50 p-2 rounded border border-slate-200">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-800">{g.gauge} mm</span>
                                            <span className="text-xs text-slate-500">{g.type}</span>
                                        </div>
                                        <button onClick={() => handleDeleteGauge(g.id)} className="text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Input Form */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100">
                        <h3 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
                            <Plus className="text-indigo-600" /> Nova Entrada
                        </h3>

                        <div className="space-y-4">
                            {/* Material Type Selection */}
                            <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
                                <button
                                    onClick={() => setCurrentLot({ ...currentLot, materialType: 'Fio Máquina' })}
                                    className={`py-2 text-sm font-bold rounded-lg transition-all ${currentLot.materialType === 'Fio Máquina' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    Fio Máquina
                                </button>
                                <button
                                    onClick={() => setCurrentLot({ ...currentLot, materialType: 'CA60' })}
                                    className={`py-2 text-sm font-bold rounded-lg transition-all ${currentLot.materialType === 'CA60' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    CA60
                                </button>
                            </div>

                            {/* Gauge Selection */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Bitola (mm)</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {availableGauges.map(g => (
                                        <button
                                            key={g.id}
                                            onClick={() => setCurrentLot({ ...currentLot, gauge: g.gauge })}
                                            className={`p-2 rounded-lg border text-sm font-bold transition-all ${currentLot.gauge === g.gauge ? 'border-indigo-500 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-500' : 'border-slate-200 hover:border-indigo-300 text-slate-600'}`}
                                        >
                                            {g.gauge}
                                        </button>
                                    ))}
                                    {availableGauges.length === 0 && <span className="text-xs text-red-400 col-span-3">Nenhuma bitola cadastrada para este tipo. Configure acima.</span>}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Número do Lote</label>
                                <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 focus-within:ring-2 focus-within:ring-indigo-500 transition-all">
                                    <Barcode className="ml-3 text-slate-400" size={18} />
                                    <input
                                        type="text"
                                        className="w-full p-3 bg-transparent outline-none font-medium"
                                        placeholder="Ex: 23948-A"
                                        value={currentLot.lotNumber}
                                        onChange={e => setCurrentLot({ ...currentLot, lotNumber: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fornecedor</label>
                                <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 focus-within:ring-2 focus-within:ring-indigo-500 transition-all">
                                    <Truck className="ml-3 text-slate-400" size={18} />
                                    <input
                                        type="text"
                                        className="w-full p-3 bg-transparent outline-none font-medium"
                                        placeholder="Ex: ArcelorMittal"
                                        value={currentLot.supplier}
                                        onChange={e => setCurrentLot({ ...currentLot, supplier: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Peso Etiqueta (kg)</label>
                                    <input
                                        type="number"
                                        className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700"
                                        placeholder="0.00"
                                        value={currentLot.labelWeight || ''}
                                        onChange={e => setCurrentLot({ ...currentLot, labelWeight: parseFloat(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Peso Balança (kg)</label>
                                    <input
                                        type="number"
                                        className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-indigo-700"
                                        placeholder="0.00"
                                        value={currentLot.scaleWeight || ''}
                                        onChange={e => setCurrentLot({ ...currentLot, scaleWeight: parseFloat(e.target.value) })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Notas / Obs</label>
                                <input
                                    type="text"
                                    className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                                    placeholder="Observações opcionais"
                                    value={currentLot.notes}
                                    onChange={e => setCurrentLot({ ...currentLot, notes: e.target.value })}
                                />
                            </div>

                            <button
                                onClick={addToBuffer}
                                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 active:scale-95 transition-all flex justify-center gap-2"
                            >
                                <Plus size={20} /> Adicionar à Lista
                            </button>
                        </div>
                    </div>
                </div>

                {/* Conference List & History */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Current Buffer */}
                    {conferenceBuffer.length > 0 && (
                        <div className="bg-white p-6 rounded-2xl shadow-lg border border-indigo-100 ring-2 ring-indigo-50">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-indigo-900 text-lg flex items-center gap-2">
                                    <FileText className="text-indigo-500" /> Conferência Atual ({conferenceBuffer.length})
                                </h3>
                                <button
                                    onClick={saveConference}
                                    disabled={loading}
                                    className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold shadow-md flex items-center gap-2 transition-all disabled:opacity-50"
                                >
                                    <Save size={18} /> {loading ? 'Salvando...' : 'Finalizar e Salvar'}
                                </button>
                            </div>

                            <div className="overflow-hidden rounded-xl border border-slate-200">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                                        <tr>
                                            <th className="px-4 py-3">Tipo/Bitola</th>
                                            <th className="px-4 py-3">Lote</th>
                                            <th className="px-4 py-3">Fornecedor</th>
                                            <th className="px-4 py-3 text-right">Etiqueta</th>
                                            <th className="px-4 py-3 text-right">Balança</th>
                                            <th className="px-4 py-3 text-right">Diferença</th>
                                            <th className="px-4 py-3 text-center">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white">
                                        {conferenceBuffer.map((item, idx) => {
                                            const diff = (item.scaleWeight || 0) - (item.labelWeight || 0);
                                            const diffColor = Math.abs(diff) > 10 ? 'text-red-600 font-bold' : 'text-slate-600';

                                            return (
                                                <tr key={idx} className="hover:bg-slate-50">
                                                    <td className="px-4 py-3 font-medium text-slate-700 text-xs">
                                                        <span className="block font-bold">{item.materialType}</span>
                                                        {item.gauge}mm
                                                    </td>
                                                    <td className="px-4 py-3 font-medium">{item.lotNumber}</td>
                                                    <td className="px-4 py-3 text-slate-500">{item.supplier}</td>
                                                    <td className="px-4 py-3 text-right">{item.labelWeight} kg</td>
                                                    <td className="px-4 py-3 text-right text-indigo-600 font-bold">{item.scaleWeight} kg</td>
                                                    <td className={`px-4 py-3 text-right ${diffColor}`}>{diff > 0 ? '+' : ''}{diff.toFixed(2)} kg</td>
                                                    <td className="px-4 py-3 text-center">
                                                        <button
                                                            onClick={() => removeFromBuffer(item.id!)}
                                                            className="text-red-400 hover:text-red-600 p-1"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Recent History */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <h3 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
                            <History className="text-slate-400" /> Histórico Recente
                        </h3>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                                    <tr>
                                        <th className="px-4 py-3">Data</th>
                                        <th className="px-4 py-3">Matéria</th>
                                        <th className="px-4 py-3">Lote</th>
                                        <th className="px-4 py-3">Fornecedor</th>
                                        <th className="px-4 py-3 text-right">Pesos</th>
                                        <th className="px-4 py-3 text-right">Dif.</th>
                                        <th className="px-4 py-3 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {history.length === 0 ? (
                                        <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Nenhum registro encontrado.</td></tr>
                                    ) : (
                                        history.map(item => (
                                            <tr key={item.id} className="hover:bg-slate-50">
                                                <td className="px-4 py-3 text-slate-500 text-xs">{new Date(item.createdAt!).toLocaleDateString()}</td>
                                                <td className="px-4 py-3 text-xs">
                                                    <span className="font-bold text-slate-700 block text-[10px] uppercase">{(item as any).materialType}</span>
                                                    {(item as any).gauge}mm
                                                </td>
                                                <td className="px-4 py-3 font-bold text-slate-800">{item.lotNumber}</td>
                                                <td className="px-4 py-3 text-slate-600 text-xs truncate max-w-[100px]">{item.supplier}</td>
                                                <td className="px-4 py-3 text-right text-xs">
                                                    <span className="block text-slate-400">E: {item.labelWeight}</span>
                                                    <span className="block text-indigo-600 font-bold">B: {item.scaleWeight}</span>
                                                </td>
                                                <td className={`px-4 py-3 text-right font-medium text-xs ${Math.abs(item.difference || 0) > 5 ? 'text-red-500' : 'text-green-600'}`}>
                                                    {(item.difference || 0) > 0 ? '+' : ''}{(item.difference || 0).toFixed(2)}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-[10px] font-bold">
                                                        <CheckCircle size={10} /> Ok
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StockControl;

