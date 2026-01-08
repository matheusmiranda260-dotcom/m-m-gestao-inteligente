import React, { useState, useEffect } from 'react';
import {
    Package,
    Search,
    Plus,
    AlertTriangle,
    CheckCircle,
    Trash2,
    Edit2,
    Settings,
    Archive,
    Camera,
    Image as ImageIcon
} from 'lucide-react';
import { SparePart } from '../types';
import { supabase } from '../services/supabaseClient';

interface SparePartsManagerProps {
    initialParts?: SparePart[];
}

const SparePartsManager: React.FC<SparePartsManagerProps> = ({
    initialParts = []
}) => {
    const [parts, setParts] = useState<SparePart[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);

    // New Part Form State
    const [formData, setFormData] = useState<Partial<SparePart>>({
        name: '',
        code: '',
        quantity: 0,
        minLevel: 1,
        location: '',
        category: 'Trefila',
        imageUrl: ''
    });

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserId(user.id);
                fetchParts();
            } else {
                setLoading(false);
            }
        };
        init();
    }, []);

    const fetchParts = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('spare_parts')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching parts:', error);
        } else if (data) {
            const mappedParts: SparePart[] = data.map(item => ({
                id: item.id,
                name: item.name,
                code: item.code,
                category: item.category,
                quantity: item.quantity,
                minLevel: item.min_level,
                location: item.location,
                imageUrl: item.image_url
            }));
            setParts(mappedParts);
        }
        setLoading(false);
    };

    const getStatusColor = (current: number, min: number) => {
        if (current === 0) return 'text-red-600 bg-red-100 border-red-200';
        if (current <= min) return 'text-orange-600 bg-orange-100 border-orange-200';
        return 'text-emerald-600 bg-emerald-100 border-emerald-200';
    };

    const getStatusText = (current: number, min: number) => {
        if (current === 0) return 'Sem Estoque';
        if (current <= min) return 'Baixo Estoque';
        return 'Estoque Bom';
    };

    const handleAddOrUpdate = async () => {
        if (!formData.name || !userId) return;

        const dbPart = {
            name: formData.name,
            code: formData.code,
            category: formData.category || 'Trefila',
            quantity: formData.quantity || 0,
            min_level: formData.minLevel || 1,
            location: formData.location,
            image_url: formData.imageUrl,
            user_id: userId
        };

        if (editingId) {
            // Update
            const { error } = await supabase
                .from('spare_parts')
                .update({ ...dbPart, user_id: undefined }) // Don't update user_id
                .eq('id', editingId);

            if (error) console.error('Error updating part:', error);
        } else {
            // Insert
            const { error } = await supabase
                .from('spare_parts')
                .insert(dbPart);

            if (error) console.error('Error adding part:', error);
        }

        await fetchParts();
        setIsModalOpen(false);
        setEditingId(null);
        setFormData({ name: '', code: '', quantity: 0, minLevel: 1, location: '', category: 'Trefila', imageUrl: '' });
    };

    const handleEdit = (part: SparePart) => {
        setEditingId(part.id);
        setFormData(part);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Tem certeza que deseja excluir este item?')) {
            const { error } = await supabase
                .from('spare_parts')
                .delete()
                .eq('id', id);

            if (error) {
                console.error('Error deleting part:', error);
                alert('Erro ao excluir item.');
            } else {
                fetchParts();
            }
        }
    };

    const filteredParts = parts.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.code?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 rounded-2xl shadow-lg border border-slate-700 text-white flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-3">
                        <Archive className="text-orange-500" /> Controle de Estoque
                    </h2>
                    <p className="text-slate-400 text-sm mt-1">Gestão de peças e insumos da Trefila</p>
                </div>

                <div className="flex w-full md:w-auto gap-3">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar peças..."
                            className="w-full bg-slate-800 border border-slate-600 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all placeholder:text-slate-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => {
                            setEditingId(null);
                            setFormData({ name: '', code: '', quantity: 0, minLevel: 1, location: '', category: 'Trefila', imageUrl: '' });
                            setIsModalOpen(true);
                        }}
                        className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all shadow-lg shadow-orange-900/20 active:scale-95 whitespace-nowrap"
                    >
                        <Plus size={18} /> Nova Peça
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12 text-slate-500">
                    <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                    Carregando estoque...
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredParts.map(part => (
                        <div key={part.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition-shadow group relative overflow-hidden">
                            {/* Stock Status Bar */}
                            <div className={`absolute top-0 left-0 w-1.5 h-full ${part.quantity <= part.minLevel ? (part.quantity === 0 ? 'bg-red-500' : 'bg-orange-500') : 'bg-emerald-500'}`}></div>

                            <div className="flex justify-between items-start pl-3">
                                <div className="flex-1 min-w-0 pr-2">
                                    {part.imageUrl && (
                                        <div className="w-16 h-16 rounded-md bg-white border border-slate-200 flex-shrink-0 overflow-hidden mb-2 group-hover:scale-105 transition-transform">
                                            <img src={part.imageUrl} alt={part.name} className="w-full h-full object-cover" />
                                        </div>
                                    )}
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">{part.code || 'S/N'}</span>
                                    <h3 className="font-bold text-slate-800 text-lg leading-tight mb-1 truncate" title={part.name}>{part.name}</h3>
                                    <p className="text-xs text-slate-500 flex items-center gap-1">
                                        <Package size={12} /> {part.location || 'Local não definido'}
                                    </p>
                                </div>
                                <div className={`px-2 py-1 rounded-lg text-xs font-bold border flex items-center gap-1 flex-shrink-0 ${getStatusColor(part.quantity, part.minLevel)}`}>
                                    {part.quantity <= part.minLevel ? <AlertTriangle size={12} /> : <CheckCircle size={12} />}
                                    {getStatusText(part.quantity, part.minLevel)}
                                </div>
                            </div>

                            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between pl-3">
                                <div className="flex flex-col">
                                    <span className="text-xs text-slate-400 font-medium uppercase">Quantidade</span>
                                    <span className={`text-2xl font-black ${part.quantity <= part.minLevel ? 'text-red-600' : 'text-slate-800'}`}>
                                        {part.quantity} <span className="text-sm font-normal text-slate-400">un</span>
                                    </span>
                                </div>

                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleEdit(part)}
                                        className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-blue-100 hover:text-blue-600 transition-colors"
                                        title="Editar"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(part.id)}
                                        className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-red-100 hover:text-red-600 transition-colors"
                                        title="Excluir"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}

                    {filteredParts.length === 0 && (
                        <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-200 rounded-xl">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                <Package className="text-slate-300" size={32} />
                            </div>
                            <p className="text-slate-500 font-medium">Nenhuma peça encontrada no estoque.</p>
                            <p className="text-sm text-slate-400">Adicione novos itens para começar.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-slate-800">
                                {editingId ? 'Editar Item' : 'Novo Item de Estoque'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Nome da Peça</label>
                                <input
                                    type="text"
                                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Ex: Rolamento XYZ"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Código / Ref</label>
                                    <input
                                        type="text"
                                        className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                                        value={formData.code}
                                        onChange={e => setFormData({ ...formData, code: e.target.value })}
                                        placeholder="W-123"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Categoria</label>
                                    <select
                                        className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                                        value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                                    >
                                        <option value="Trefila">Trefila</option>
                                        <option value="Manutenção">Manutenção</option>
                                        <option value="Insumo">Insumo</option>
                                        <option value="Geral">Geral</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Quantidade Atual</label>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setFormData(p => ({ ...p, quantity: Math.max(0, (p.quantity || 0) - 1) }))}
                                            className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded-md font-bold text-slate-600 hover:bg-slate-200"
                                        >
                                            -
                                        </button>
                                        <input
                                            type="number"
                                            className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-center font-bold"
                                            value={formData.quantity}
                                            onChange={e => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                                        />
                                        <button
                                            onClick={() => setFormData(p => ({ ...p, quantity: (p.quantity || 0) + 1 }))}
                                            className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded-md font-bold text-slate-600 hover:bg-slate-200"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Estoque Mínimo</label>
                                    <input
                                        type="number"
                                        className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                                        value={formData.minLevel}
                                        onChange={e => setFormData({ ...formData, minLevel: parseInt(e.target.value) || 0 })}
                                        placeholder="1"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Localização</label>
                                <input
                                    type="text"
                                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                                    value={formData.location}
                                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                                    placeholder="Ex: Armário 2, Prateleira 3"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Imagem</label>
                                <div className="space-y-2">
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            className="flex-1 p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                                            value={formData.imageUrl || ''}
                                            onChange={e => setFormData({ ...formData, imageUrl: e.target.value })}
                                            placeholder="URL da Imagem..."
                                        />
                                        <label className="bg-slate-100 hover:bg-slate-200 text-slate-600 p-2.5 rounded-lg cursor-pointer transition-colors" title="Carregar foto">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        const reader = new FileReader();
                                                        reader.onloadend = () => {
                                                            setFormData({ ...formData, imageUrl: reader.result as string });
                                                        };
                                                        reader.readAsDataURL(file);
                                                    }
                                                }}
                                            />
                                            <Camera size={20} />
                                        </label>
                                    </div>
                                    {formData.imageUrl && (
                                        <div className="relative w-full h-32 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 group">
                                            <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-contain" />
                                            <button
                                                onClick={() => setFormData({ ...formData, imageUrl: '' })}
                                                className="absolute top-2 right-2 p-1 bg-white/90 rounded-full text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <button
                                onClick={handleAddOrUpdate}
                                disabled={!formData.name}
                                className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {editingId ? 'Salvar Alterações' : 'Adicionar ao Estoque'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SparePartsManager;

