import { GoogleGenAI } from "@google/genai";

// Initialize Gemini Client
// Note: In a production environment, never expose keys on the client side. 
// However, per instructions, we use process.env.API_KEY directly here.
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

let ai: any = null;
if (apiKey) {
  try {
    ai = new GoogleGenAI({ apiKey });
  } catch (error) {
    console.error("Failed to initialize Gemini client:", error);
  }
} else {
  console.warn("VITE_GEMINI_API_KEY is missing. Beto AI features will use fallback responses.");
}

export const generateBetoResponse = async (prompt: string): Promise<string> => {
  if (!ai) {
    return "Olá! Sou o Beto. No momento minha conexão com a IA está desligada (Chave de API não configurada), mas estou aqui para ajudar no que for possível!";
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: `Você é o Beto, um assistente virtual especialista em aço e construção civil da empresa "Beto Soluções em Aço". 
        Você é amigável, usa capacete (metaforicamente) e fala como um engenheiro experiente, mas acessível. 
        Você ajuda gestores a calcular pesos de aço, verificar normas técnicas e dar dicas sobre bobinas e chapas.
        Sempre mantenha um tom prestativo e otimista.`,
      },
    });

    return response.text || "Desculpe, estou verificando o estoque e não consegui responder agora.";
  } catch (error) {
    console.error("Erro ao consultar o Beto:", error);
    return "Tive um problema de comunicação com a central. Tente novamente em breve.";
  }
};
