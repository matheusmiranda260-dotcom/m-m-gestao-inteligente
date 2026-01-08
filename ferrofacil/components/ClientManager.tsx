
import React, { useState } from 'react';
import { Client } from '../types';
import { UserPlus, User, Phone, MapPin, ChevronRight, Search } from 'lucide-react';

interface ClientManagerProps {
  clients: Client[];
  onAddClient: (client: Client) => void;
  onSelectClient: (client: Client) => void;
}

const ClientManager: React.FC<ClientManagerProps> = ({ clients, onAddClient, onSelectClient }) => {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.phone && c.phone.includes(searchTerm))
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    const newClient: Client = {
      id: crypto.randomUUID(),
      name,
      phone,
      address
    };
    onAddClient(newClient);
    setName('');
    setPhone('');
    setAddress('');
    setShowForm(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tighter">Central de Clientes</h2>
          <p className="text-slate-500 text-sm font-medium uppercase tracking-[0.2em] mt-1">Gestão de Carteira e Endereços</p>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-grow md:w-64 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-orange-500 transition-colors" />
            <input
              type="text"
              placeholder="Buscar cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:bg-white/10 transition-all placeholder:text-slate-600"
            />
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 ${showForm ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'premium-gradient text-white shadow-lg shadow-orange-500/20'}`}
          >
            {showForm ? 'Cancelar' : <><UserPlus className="w-4 h-4" /> Novo Cliente</>}
          </button>
        </div>
      </div>

      {/* Form Section */}
      {showForm && (
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-500 to-amber-500 rounded-[2.5rem] blur opacity-20 group-hover:opacity-30 transition duration-1000"></div>
          <form onSubmit={handleSubmit} className="relative bg-slate-900 border border-white/10 p-8 rounded-[2.5rem] shadow-2xl animate-in slide-in-from-top-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nome Completo</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-orange-500/50 transition-all"
                    placeholder="João Silva"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Telefone / WhatsApp</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-orange-500/50 transition-all"
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Endereço da Obra</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                  <input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-orange-500/50 transition-all"
                    placeholder="Rua das Flores, 123 - Centro"
                  />
                </div>
              </div>
            </div>
            <button type="submit" className="mt-8 w-full premium-gradient text-white py-5 rounded-2xl font-black uppercase tracking-[0.3em] text-xs shadow-xl shadow-orange-500/20 active:scale-[0.98] transition-all">
              Salvar Cadastro
            </button>
          </form>
        </div>
      )}

      {/* Clients Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClients.length === 0 ? (
          <div className="col-span-full py-24 flex flex-col items-center justify-center bg-white/5 rounded-[3rem] border border-dashed border-white/10">
            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-4">
              <User className="w-8 h-8 text-slate-600" />
            </div>
            <p className="text-slate-500 font-bold italic">Nenhum cliente encontrado.</p>
            <p className="text-slate-700 text-xs mt-1 uppercase tracking-widest">Tente uma busca diferente ou adicione um novo</p>
          </div>
        ) : (
          filteredClients.map(client => (
            <div
              key={client.id}
              onClick={() => onSelectClient(client)}
              className="group relative bg-white/5 border border-white/5 p-6 rounded-[2.5rem] hover:bg-white/10 hover:border-orange-500/30 transition-all cursor-pointer overflow-hidden shadow-xl"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 blur-3xl group-hover:bg-orange-500/10 transition-all"></div>

              <div className="flex items-start justify-between mb-6">
                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center group-hover:premium-gradient group-hover:text-white transition-all duration-500">
                  <User className="w-6 h-6 text-slate-400 group-hover:text-white" />
                </div>
                <div className="p-2 bg-white/5 rounded-xl opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all duration-500">
                  <ChevronRight className="w-4 h-4 text-orange-500" />
                </div>
              </div>

              <h3 className="text-xl font-black text-white tracking-tight leading-tight group-hover:text-orange-500 transition-colors uppercase">{client.name}</h3>

              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-3 text-slate-400 text-xs group-hover:text-slate-300">
                  <Phone className="w-3.5 h-3.5 text-slate-600" />
                  <span className="font-medium">{client.phone || 'Sem telefone'}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-500 text-[10px] group-hover:text-slate-400">
                  <MapPin className="w-3.5 h-3.5 text-slate-700 shrink-0" />
                  <span className="truncate uppercase tracking-wider">{client.address || 'Sem endereço de obra'}</span>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Pronto para Orçar</span>
                <span className="text-orange-500/50 group-hover:text-orange-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all">
                  Novo Orçamento
                  <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ClientManager;

