-- Tabela de Entradas (Incomes)
CREATE TABLE incomes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  description TEXT,
  amount DECIMAL(10, 2) NOT NULL,
  source TEXT NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  user_id UUID DEFAULT auth.uid() -- Opcional: para futuro suporte a múltiplos usuários
);

-- Tabela de Despesas Fixas (Fixed Expenses)
CREATE TABLE fixed_expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  name TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  due_date TEXT NOT NULL,
  is_paid BOOLEAN DEFAULT FALSE,
  category TEXT NOT NULL,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  user_id UUID DEFAULT auth.uid()
);

-- Tabela de Transações de Cartão (Card Transactions)
CREATE TABLE card_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  description TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  provider TEXT NOT NULL,
  total_installments INTEGER NOT NULL,
  remaining_installments INTEGER NOT NULL,
  purchase_date TIMESTAMP WITH TIME ZONE NOT NULL,
  user_id UUID DEFAULT auth.uid()
);

-- Políticas de Segurança (RLS) - Opcional se você desativar RLS, mas recomendado
-- Habilita RLS
ALTER TABLE incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE fixed_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_transactions ENABLE ROW LEVEL SECURITY;

-- Políticas permissivas (para desenvolvimento rápido/anon)
-- ATENÇÃO: Em produção, ajuste para verificar user_id
CREATE POLICY "Enable all access for all users" ON incomes FOR ALL USING (true);
CREATE POLICY "Enable all access for all users" ON fixed_expenses FOR ALL USING (true);
CREATE POLICY "Enable all access for all users" ON card_transactions FOR ALL USING (true);
