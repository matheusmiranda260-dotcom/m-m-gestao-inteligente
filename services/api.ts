


import { supabase } from './supabase';
import { FinancialData, Income, FixedExpense, CardTransaction } from '../types';

// Tipos auxiliares para o banco de dados (snake_case)
interface DBIncome {
    id: string;
    description: string;
    amount: number;
    source: string;
    date: string;
}

interface DBFixedExpense {
    id: string;
    name: string;
    amount: number;
    due_date: string;
    is_paid: boolean;
    category: string;
    month: number;
    year: number;
}

interface DBCardTransaction {
    id: string;
    description: string;
    amount: number;
    provider: string;
    total_installments: number;
    remaining_installments: number;
    purchase_date: string;
}

export const api = {
    fetchData: async (): Promise<FinancialData | null> => {
        try {
            const { data: incomes, error: incomesError } = await supabase
                .from('incomes')
                .select('*')
                .order('date', { ascending: false });

            const { data: fixedExpenses, error: fixedError } = await supabase
                .from('fixed_expenses')
                .select('*');

            const { data: cardTransactions, error: cardsError } = await supabase
                .from('card_transactions')
                .select('*')
                .order('purchase_date', { ascending: false });

            if (incomesError || fixedError || cardsError) {
                console.error('Erro ao buscar dados:', incomesError, fixedError, cardsError);
                return null;
            }

            // Mapeamento de snake_case para camelCase
            return {
                incomes: (incomes as DBIncome[]).map(i => ({
                    id: i.id,
                    description: i.description,
                    amount: i.amount,
                    source: i.source as any,
                    date: i.date
                })),
                fixedExpenses: (fixedExpenses as DBFixedExpense[]).map(e => ({
                    id: e.id,
                    name: e.name,
                    amount: e.amount,
                    dueDate: e.due_date,
                    isPaid: e.is_paid,
                    category: e.category as any,
                    month: e.month,
                    year: e.year
                })),
                cardTransactions: (cardTransactions as DBCardTransaction[]).map(t => ({
                    id: t.id,
                    description: t.description,
                    amount: t.amount,
                    provider: t.provider as any,
                    totalInstallments: t.total_installments,
                    remainingInstallments: t.remaining_installments,
                    purchaseDate: t.purchase_date
                }))
            };
        } catch (error) {
            console.error('Erro geral na API:', error);
            return null;
        }
    },

    addIncome: async (income: Omit<Income, 'id'>): Promise<Income | null> => {
        const { data, error } = await supabase
            .from('incomes')
            .insert([{
                description: income.description,
                amount: income.amount,
                source: income.source,
                date: income.date
            }])
            .select()
            .single();

        if (error) {
            console.error('Erro ao adicionar renda:', error);
            return null;
        }

        const i = data as DBIncome;
        return {
            id: i.id,
            description: i.description,
            amount: i.amount,
            source: i.source as any,
            date: i.date
        };
    },

    addFixedExpense: async (expense: Omit<FixedExpense, 'id'>): Promise<FixedExpense | null> => {
        const { data, error } = await supabase
            .from('fixed_expenses')
            .insert([{
                name: expense.name,
                amount: expense.amount,
                due_date: expense.dueDate,
                is_paid: expense.isPaid,
                category: expense.category,
                month: expense.month,
                year: expense.year
            }])
            .select()
            .single();

        if (error) {
            console.error('Erro ao adicionar despesa fixa:', error);
            return null;
        }
        // Mapear retorno
        const e = data as DBFixedExpense;
        return {
            id: e.id,
            name: e.name,
            amount: e.amount,
            dueDate: e.due_date,
            isPaid: e.is_paid,
            category: e.category as any,
            month: e.month,
            year: e.year
        };
    },

    addCardTransaction: async (transaction: Omit<CardTransaction, 'id'>): Promise<CardTransaction | null> => {
        const { data, error } = await supabase
            .from('card_transactions')
            .insert([{
                description: transaction.description,
                amount: transaction.amount,
                provider: transaction.provider,
                total_installments: transaction.totalInstallments,
                remaining_installments: transaction.remainingInstallments,
                purchase_date: transaction.purchaseDate
            }])
            .select()
            .single();

        if (error) {
            console.error('Erro ao adicionar transação:', error);
            return null;
        }
        const t = data as DBCardTransaction;
        return {
            id: t.id,
            description: t.description,
            amount: t.amount,
            provider: t.provider as any,
            totalInstallments: t.total_installments,
            remainingInstallments: t.remaining_installments,
            purchaseDate: t.purchase_date
        };
    },

    deleteItem: async (table: 'incomes' | 'fixed_expenses' | 'card_transactions', id: string): Promise<boolean> => {
        const { error } = await supabase
            .from(table)
            .delete()
            .eq('id', id);

        return !error;
    },

    updateFixedExpense: async (id: string, updates: Partial<FixedExpense>): Promise<boolean> => {
        // Converter updates para snake_case se necessário
        const dbUpdates: any = {};
        if (updates.isPaid !== undefined) dbUpdates.is_paid = updates.isPaid;
        if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;
        if (updates.category !== undefined) dbUpdates.category = updates.category;

        const { error } = await supabase
            .from('fixed_expenses')
            .update(dbUpdates)
            .eq('id', id);

        return !error;
    },

    updateIncome: async (id: string, updates: Partial<Income>): Promise<boolean> => {
        const dbUpdates: any = {};
        if (updates.description !== undefined) dbUpdates.description = updates.description;
        if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
        if (updates.source !== undefined) dbUpdates.source = updates.source;
        if (updates.date !== undefined) dbUpdates.date = updates.date;

        const { error } = await supabase
            .from('incomes')
            .update(dbUpdates)
            .eq('id', id);

        return !error;
    },

    updateCardTransaction: async (id: string, updates: Partial<CardTransaction>): Promise<boolean> => {
        const dbUpdates: any = {};
        if (updates.description !== undefined) dbUpdates.description = updates.description;
        if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
        if (updates.provider !== undefined) dbUpdates.provider = updates.provider;
        if (updates.totalInstallments !== undefined) dbUpdates.total_installments = updates.totalInstallments;
        if (updates.remainingInstallments !== undefined) dbUpdates.remaining_installments = updates.remainingInstallments;
        if (updates.purchaseDate !== undefined) dbUpdates.purchase_date = updates.purchaseDate;

        const { error } = await supabase
            .from('card_transactions')
            .update(dbUpdates)
            .eq('id', id);

        return !error;
    }
};

