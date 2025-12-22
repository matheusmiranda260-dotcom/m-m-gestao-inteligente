-- Tabela de Configurações do Usuário
CREATE TABLE user_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  card_settings JSONB DEFAULT '{}'::jsonb,
  category_settings JSONB DEFAULT '{}'::jsonb,
  user_id UUID DEFAULT auth.uid()
);

-- Habilitar RLS
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Política de acesso (Dev)
CREATE POLICY "Enable all access for all users" ON user_settings FOR ALL USING (true);

-- Inserir configuração inicial padrão se não existir
INSERT INTO user_settings (card_settings, category_settings)
SELECT 
  '{"Santander": {"dueDay": 10, "closeDay": 3}, "Mercado Livre": {"dueDay": 8, "closeDay": 1}}'::jsonb,
  '{"Água": 5, "Luz": 10, "Internet Casa": 15, "Internet Celular": 15, "Terreno": 20, "TV": 10}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM user_settings);
