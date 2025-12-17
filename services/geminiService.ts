
import { GoogleGenAI } from "@google/genai";
import { FinancialData } from "../types";

export const getFinancialInsights = async (data: FinancialData): Promise<string> => {
  try {
    // Initializing Gemini API using standard recommended pattern
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const prompt = `
      Atue como um consultor financeiro sênior. Analise os seguintes dados financeiros de um usuário:
      
      Entradas (Total: R$ ${data.incomes.reduce((acc, i) => acc + i.amount, 0).toFixed(2)}):
      ${data.incomes.map(i => `- ${i.source}: R$ ${i.amount}`).join('\n')}
      
      Contas Fixas (Total: R$ ${data.fixedExpenses.reduce((acc, i) => acc + i.amount, 0).toFixed(2)}):
      ${data.fixedExpenses.map(e => `- ${e.name}: R$ ${e.amount} (${e.isPaid ? 'Pago' : 'Pendente'})`).join('\n')}
      
      Cartões de Crédito (Santander e Mercado Livre):
      ${data.cardTransactions.map(t => `- ${t.description} no ${t.provider}: R$ ${t.amount} (${t.remainingInstallments}/${t.totalInstallments} parcelas restantes)`).join('\n')}

      Por favor, forneça:
      1. Um breve resumo da saúde financeira.
      2. Três dicas acionáveis para economizar este mês.
      3. Um alerta se as despesas estiverem superando as entradas.
      
      Responda em Português do Brasil de forma clara, motivadora e direta usando formatação Markdown.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: prompt,
    });

    return response.text || "Não foi possível gerar insights no momento.";
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return "Erro ao conectar com a inteligência artificial. Verifique sua conexão.";
  }
};
