
-- Tabela de Clientes para Marine Home Clear
CREATE TABLE marine_clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  notes TEXT,
  user_id UUID DEFAULT auth.uid()
);

-- Tabela de Agendamentos (Faxinas)
CREATE TABLE marine_appointments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  client_id UUID REFERENCES marine_clients(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  is_paid BOOLEAN DEFAULT FALSE,
  notes TEXT,
  user_id UUID DEFAULT auth.uid()
);

-- Habilitar RLS
ALTER TABLE marine_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE marine_appointments ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso (Permissivas para este setup)
CREATE POLICY "Enable all access for all users" ON marine_clients FOR ALL USING (true);
CREATE POLICY "Enable all access for all users" ON marine_appointments FOR ALL USING (true);
