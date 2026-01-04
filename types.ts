
export enum TransactionType {
  INCOME = 'INCOME',
  FIXED_EXPENSE = 'FIXED_EXPENSE',
  CARD_EXPENSE = 'CARD_EXPENSE'
}

export enum CardProvider {
  SANTANDER = 'Santander',
  MERCADO_LIVRE = 'Mercado Livre'
}

export enum IncomeSource {
  SALARY = 'Salário',
  BONUS = 'Bônus/Extra',
  VALE = 'Vale',
  FREELANCE = 'Bico/Freelance'
}

export enum FixedExpenseCategory {
  AGUA = 'Água',
  LUZ = 'Luz',
  INTERNET_CASA = 'Internet Casa',
  INTERNET_CELULAR = 'Internet Celular',
  TERRENO = 'Terreno',
  TV = 'TV',
  OUTROS = 'Outros'
}

export interface CardTransaction {
  id: string;
  description: string;
  amount: number;
  provider: CardProvider;
  totalInstallments: number;
  remainingInstallments: number;
  purchaseDate: string;
  paidInstallments?: number[];
}

export interface FixedExpense {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  isPaid: boolean;
  category: FixedExpenseCategory;
  month: number;
  year: number;
}

export interface Income {
  id: string;
  source: IncomeSource;
  description: string;
  amount: number;
  date: string;
}

export interface FinancialData {
  cardTransactions: CardTransaction[];
  fixedExpenses: FixedExpense[];
  incomes: Income[];
}

export interface MarineClient {
  id: string;
  name: string;
  phone: string;
  address: string;
  notes: string;
  created_at?: string;
}

export interface MarineAppointment {
  id: string;
  client_id: string;
  date: string;
  start_time: string;
  end_time: string;
  amount: number;
  is_paid: boolean;
  notes: string;
  created_at?: string;
  // Join data
  client?: MarineClient;
}

