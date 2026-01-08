
import React, { useState } from 'react';
import { Client } from '../types';

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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Clientes</h2>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="bg-slate-900 text-white px-4 py-2 rounded-lg font-medium hover:bg-slate-800 transition-colors flex items-center gap-2"
        >
          {showForm ? 'Cancelar' : 'Novo Cliente'}
          {!showForm && <span>+</span>}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Nome Completo</label>
              <input 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                placeholder="Ex: João Silva"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Telefone / WhatsApp</label>
              <input 
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                placeholder="(00) 00000-0000"
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-sm font-semibold text-slate-700">Endereço da Obra</label>
              <input 
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                placeholder="Ex: Rua das Flores, 123"
              />
            </div>
          </div>
          <button type="submit" className="mt-4 w-full bg-amber-500 text-slate-900 py-2.5 rounded-lg font-bold hover:bg-amber-400 transition-colors">
            Salvar Cliente
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {clients.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 italic">
            Nenhum cliente cadastrado. Adicione um para começar os orçamentos.
          </div>
        ) : (
          clients.map(client => (
            <div key={client.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 hover:border-amber-300 transition-all group">
              <h3 className="text-lg font-bold text-slate-800">{client.name}</h3>
              <p className="text-sm text-slate-500 mt-1">{client.phone || 'Sem telefone'}</p>
              <p className="text-xs text-slate-400 mt-2 truncate">{client.address || 'Sem endereço'}</p>
              <button 
                onClick={() => onSelectClient(client)}
                className="mt-4 w-full border border-slate-200 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 group-hover:bg-amber-50 group-hover:border-amber-200 transition-colors"
              >
                Novo Orçamento
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ClientManager;

