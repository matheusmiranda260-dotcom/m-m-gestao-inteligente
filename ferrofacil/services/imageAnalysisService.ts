
import { SteelItem, ElementType, MainBarGroup, BarUsage } from '../types';

const GEN_AI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent";

/**
 * Converts a File object to a clean Base64 string (without data:image/...;base64 prefix)
 */
const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            const base64 = result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = error => reject(error);
    });
};

/**
 * Parses the AI response text into SteelItem objects
 */
const parseGeminiResponse = (responseText: string): SteelItem[] => {
    console.log(">>> RESPOSTA BRUTA DA IA:", responseText);
    try {
        // 1. Agressive Cleanup: Extract ONLY the JSON part using Regex
        // Looks for [ ... ] OR { ... } ignoring surrounding text
        const jsonMatch = responseText.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);

        if (!jsonMatch) {
            console.error("AI Response not a valid JSON structure:", responseText);
            throw new Error("Formato inválido recebido da IA (esperado JSON)");
        }

        const cleanJsonString = jsonMatch[0];
        const data = JSON.parse(cleanJsonString);

        // Ensure data is an array
        const items = Array.isArray(data) ? data : [data];

        // Map to SteelItem structure ensuring required fields
        return items.map((item: any) => {
            // ... parsing bars first to use them for validation ...
            const parsedBars = (item.mainBars || []).map((bar: any) => {
                let hStart = Number(bar.hookStart) || 0;
                let hEnd = Number(bar.hookEnd) || 0;
                let shape = bar.shape || 'straight';

                // AUTO-CORRECTION: Trust 'straight' classification to avoid "c/15" reading errors
                if (shape === 'straight') {
                    hStart = 0;
                    hEnd = 0;
                }
                // Fallback: If hooks exist and shape is NOT straight (e.g. undefined), infer shape
                else if ((hStart > 0 || hEnd > 0) && !['u_up', 'u_down', 'l_left_up', 'l_right_up'].includes(shape)) {
                    const placement = bar.placement || (bar.usage === BarUsage.PRINCIPAL ? 'bottom' : 'top');
                    shape = (placement === 'top') ? 'u_down' : 'u_up';
                }

                // Map Hook Types
                let hookStartType: 'up' | 'down' | 'none' = 'none';
                let hookEndType: 'up' | 'down' | 'none' = 'none';

                if (shape === 'u_up') { hookStartType = 'up'; hookEndType = 'up'; }
                else if (shape === 'u_down') { hookStartType = 'down'; hookEndType = 'down'; }
                else if (shape === 'l_left_up') { hookStartType = 'up'; }
                else if (shape === 'l_right_up') { hookEndType = 'up'; }

                return {
                    id: crypto.randomUUID(),
                    count: Number(bar.count) || 2,
                    gauge: String(bar.gauge || '10.0'),
                    usage: bar.usage || BarUsage.PRINCIPAL,
                    placement: bar.placement || (bar.usage === BarUsage.PRINCIPAL ? 'bottom' : 'top'),
                    segmentA: Number(bar.segmentA) || (Number(item.length) * 100),
                    shape: shape,
                    hookStart: hStart,
                    hookEnd: hEnd,
                    hookStartType: hookStartType,
                    hookEndType: hookEndType,
                    position: bar.position
                };
            });

            // SANITY CHECK: Concrete Length vs Bar Length
            let rawLength = Number(item.length) || 3;
            const maxBarSegment = Math.max(...parsedBars.map((b: any) => b.segmentA || 0), 0);

            if (maxBarSegment > 0) {
                const minConcreteNeeded = (maxBarSegment / 100); // meters
                // Only increase concrete if bar is longer than concrete
                // Never shrink concrete based on bars, as that removes legitimate gaps/covers.
                if (rawLength < minConcreteNeeded) {
                    rawLength = Number((minConcreteNeeded + 0.05).toFixed(2)); // Fit bar + 5cm margin
                }
            }

            let w = Number(item.width) || 0.15;
            if (w > 4) w = w / 100; // Auto-fix: Convert CM to M if value is unrealistic for M

            let h = Number(item.height) || 0.3;
            if (h > 4) h = h / 100; // Auto-fix: Convert CM to M

            let sW = Number(item.stirrupWidth) || 15;
            if (sW < 1 && sW > 0) sW = sW * 100; // Auto-fix: Convert M to CM if value is decimal

            let sH = Number(item.stirrupHeight) || 25;
            if (sH < 1 && sH > 0) sH = sH * 100; // Auto-fix: Convert M to CM

            let spacing = Number(item.stirrupSpacing) || 20;
            if (spacing < 1 && spacing > 0) spacing = spacing * 100;

            // INTELLIGENT GAP CALCULATION:
            // If the drawing says "16 N3" (count=16), we MUST respect it.
            // If explicit gaps are missing, we calculate them to fit the 16 stirrups.
            let sCount = Number(item.stirrupCount) || 0;
            let startGap = Number(item.startGap) || 0;
            let endGap = Number(item.endGap) || 0;

            if (sCount > 0 && spacing > 0) {
                const totalLenCm = rawLength * 100;
                // Coverage distance = (N-1) * spacing.
                const coveredLen = (sCount - 1) * spacing;
                const remaining = totalLenCm - coveredLen;

                // If we have remaining space and no explicit gaps, distribute it
                if (remaining > 0 && startGap === 0 && endGap === 0) {
                    startGap = remaining / 2;
                    endGap = remaining / 2;
                }
            }

            return {
                id: crypto.randomUUID(),
                type: (item.type && Object.values(ElementType).includes(item.type)) ? item.type : ElementType.VIGA_SUPERIOR,
                observation: item.observation || 'Item Importado',
                quantity: Number(item.quantity) || 1,
                length: rawLength,
                width: w,
                height: h,

                // Stirrups
                hasStirrups: item.hasStirrups ?? true,
                stirrupGauge: String(item.stirrupGauge || '5.0'),
                stirrupSpacing: spacing,
                stirrupWidth: sW,
                stirrupHeight: sH,
                stirrupPosition: item.stirrupPosition,

                mainBars: parsedBars,

                // Supports
                supports: (item.supports || []).map((sup: any) => ({
                    label: sup.label,
                    position: Number(sup.position) || 0,
                    width: Number(sup.width) || 20,
                    leftGap: Number(sup.leftGap) || 0,
                    rightGap: Number(sup.rightGap) || 0
                })),

                // Gaps
                startGap: startGap,
                endGap: endGap,

                isConfigured: true
            };
        });
    } catch (e) {
        console.error("Error parsing Gemini response:", e);
        throw new Error("Falha ao processar dados da IA: " + (e as Error).message);
    }
};

export const analyzeImageWithGemini = async (file: File, apiKey: string, referenceItems?: SteelItem[]): Promise<SteelItem[]> => {
    if (!apiKey) throw new Error("API Key is required");

    // Helper to safely access env variables in Vite/Vercel
    const getEnv = (name: string) => {
        try {
            // @ts-ignore - access vite env
            return import.meta.env[name];
        } catch (e) {
            return process.env[name];
        }
    };

    // Convert reference items to a few-shot string for "learning"
    const learningContext = referenceItems && referenceItems.length > 0
        ? `
  HERE ARE CORRECT EXAMPLES FROM PREVIOUS ANALYSES (LEARN FROM THESE):
  ${JSON.stringify(referenceItems.slice(-3).map(item => ({
            observation: item.observation,
            length: item.length,
            stirrupQty: item.mainBars[0]?.count, // simplistic summary
            stirrupSpec: `${item.stirrupGauge} c/${item.stirrupSpacing}`
        })), null, 2)}
  ` : '';

    const base64Image = await fileToBase64(file);

    const prompt = `
  You are an expert Structural Engineer assistant. Analyze this reinforcement drawing (Rebar Detailing) following this STRICT SEQUENCE.
  IGNORE COLORS. READ TEXT LABELS, DIMENSIONS, AND POSITIONS CAREFULLY.
  **ATTENTION TO UNITS: Concrete dimensions (Width/Height) are usually in CM in drawings (e.g. 15), but output them in METERS (e.g. 0.15). Steel lengths/spacings are in CM.**
  
  ${learningContext}

  --- EXECUTION SEQUENCE ---

  ### STEP 0: READ ELEMENT TITLE (Identificação)
  - Look for large bold text identifying the element(s), e.g. "P12=P39=P54" or "V101".
  - Extract this entire string as the "observation" field.

  ### STEP 1: READ MAIN LONGITUDINAL BARS (Ferros Longitudinais)
  - Look for long horizontal lines representing the beam/column bars.
  - Find their labels, usually format: "2 N1 ø 8.0 c=237" (or "2 N1 f 8.0 c=237").
    - "2" = Quantity (Count).
    - "N1" = Position ID.
    - "ø 8.0" or "f 8mm" = Gauge (Diameter).
    - "c=237" = Total Cut Length (Comprimento Total).
  - **Top vs Bottom**: If the bar is drawn at the top of the element, it is Top. If at bottom, it is Bottom.
  - **Side Bars (Costelas/Pele)**: If bars are distributed along the height (middle), label them as 'distributed'.
  - **Hooks (Dobras)**: Check the ends of these lines. If they turn up or down, note the dimension (e.g. "15").
  - **CRITICAL**: If the bar is a straight line, set 'hookStart' and 'hookEnd' to 0. Do NOT confuse stirrup spacing (e.g. "c/15") or quantity with hooks. Only add hooks if you visually see the bend.

  ### STEP 2: READ STIRRUPS (Estribos) - LOOK AT THE CROSS-SECTION
  - **MANDATORY**: Locate the Cross-Section to get dimensions (Width x Height).
  - **READ THE LABEL**: Found below/near the section (e.g., "20 N5 ø 5.0 c/15").
    - **Note**: The quantity here (e.g. 20) often sums up total bars including starters (arrancues).
    - **CRITICAL**: For Pillars/Columns, this quantity might be HIGHER than the distribution. Keep it in mind, but Step 4 (Vertical Line) is the Tie-Breaker.
    - **Position**: "N3" (or similar).
    - **Gauge**: "5.0".
    - **Spacing**: "15" (c/15).
  - **DIMENSIONS (VITAL)**: Look at the small rectangle (Section A-A). The numbers on its sides are Width and Height.
    - Example: "15" and "35". Width=15, Height=35.
    - **Shape**: Usually rectangular. If unique (circular, polygonal), note it.

  ### STEP 3: GAPS & SPANS (Vãos e Esperas) - NEW CRITICAL STEP
  - **Start Gap (Vão Inicial/Espera)**: Look for the distance from the bottom/start of the element to the *first* stirrup.
  - **End Gap (Vão Final)**: Look for the distance from the last stirrup to the top/end of the element.

  ### STEP 4: READ VERTICAL DISTRIBUTION LINE (Cotagem Lateral de Distribuição) = SOURCE OF TRUTH
  - **CRITICAL FOR COLUMNS**: Look for the vertical dimension line next to the drawing.
  - **Read the Middle**: The label here (e.g. "17 N5") provides the EXPLICIT QUANTITY (17).
  - **ACTION**: Set the JSON field "stirrupCount" to this value (e.g. 17).
  - **DO NOT CALCULATE**: Do NOT try to calculate quantity from Length/Spacing. READ THE VISUAL NUMBER.
  - **OVERRIDE RULE**: If Step 2 found a different number (e.g. 20), IGNORE IT and use the one from this line.
  - **Read the Gaps**: Look for "VÃO" or numbers at the ends (e.g. "42").

  ========================================
  OUTPUT JSON FORMAT (STRICT):
  For each structural element found:
  {
    "type": "Pilar" | "Viga" | "Sapata",
    "observation": "Label (e.g. P1)",
    "quantity": 1,
    "length": Total concrete length (m),
    "width": Concrete Section Width (Meters - e.g. 0.20),
    "height": Concrete Section Height (Meters - e.g. 0.40),

    "hasStirrups": true,
    "stirrupGauge": "5.0",
    "stirrupSpacing": 15, // cm
    "stirrupCount": 16,    // OPTIONAL: Explicit count read from label (e.g. "16 N3")
    "stirrupWidth": 15,    // cm (FROM SECTION A-A)
    "stirrupHeight": 35,   // cm (FROM SECTION A-A)
    "stirrupPosition": "N3", // FROM LABEL

    "startGap": 0, // Gap in CM at the start/bottom
    "endGap": 0,   // Gap in CM at the end/top

    "mainBars": [
      {
        "count": 2, // integer
        "position": "N1",
        "gauge": "10.0",
        "placement": "top" | "bottom" | "distributed",
        "shape": "u_up" | "u_down" | "straight" | "l_left_up" | "l_right_up",
        "segmentA": 237, // Straight part in CM
        "hookStart": 0,
        "hookEnd": 0
      }
    ],

    "supports": [] // Optional
  }

  Return ONLY valid JSON.
  `;

    const body = {
        contents: [{
            parts: [
                { text: prompt },
                { inline_data: { mime_type: file.type || 'image/jpeg', data: base64Image } }
            ]
        }],
        generationConfig: {
            temperature: 0.1,
            topK: 1,
            topP: 1,
            maxOutputTokens: 3000,
        }
    };

    // Lista de modelos conhecidos para visão (ordem de prioridade)
    const knownModels = [
        "gemini-1.5-flash",
        "gemini-1.5-flash-latest",
        "gemini-1.5-flash-001",
        "gemini-1.5-pro",
        "gemini-1.5-pro-latest",
        "gemini-pro-vision",
        "gemini-1.0-pro-vision-latest"
    ];

    let candidateModels = [...knownModels];

    // 1. Tenta descobrir o melhor modelo disponível na chave (Discovery)
    try {
        const listReq = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        if (listReq.ok) {
            const listData = await listReq.json();
            if (listData.models) {
                const availableVision = listData.models
                    .map((m: any) => m.name.replace('models/', ''))
                    .filter((name: string) =>
                        (name.includes('flash') || name.includes('vision') || name.includes('pro')) &&
                        !name.includes('embedding')
                    );

                if (availableVision.length > 0) {
                    const others = candidateModels.filter(m => !availableVision.includes(m));
                    candidateModels = [...availableVision, ...others];
                }
            }
        }
    } catch (e) {
        console.warn("Falha silenciosa na descoberta:", e);
    }

    // 2. Loop Robusto com Retries para evitar Syntax Error
    const versions = ["v1beta", "v1"];
    let lastError: any;

    // Tenta até 3 vezes (para casos de JSON mal formatado aleatório)
    for (let attempt = 0; attempt < 3; attempt++) {
        let success = false;

        for (const model of candidateModels) {
            if (success) break;

            for (const version of versions) {
                if (success) break;

                try {
                    const response = await fetch(`https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${apiKey}`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(body)
                    });

                    if (!response.ok) {
                        const err = await response.json();
                        const msg = err.error?.message || "Erro";
                        if (msg.includes("not found") || msg.includes("not supported")) {
                            continue;
                        }
                        throw new Error(msg);
                    }

                    const data = await response.json();
                    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

                    if (!text) continue;

                    // Tenta parsear. Se falhar, vai cair no catch e tentar o próximo modelo/retry
                    const result = parseGeminiResponse(text);

                    success = true;
                    console.log(`SUCESSO com: ${model} (${version}) - Tentativa ${attempt + 1}`);
                    return result;

                } catch (error) {
                    console.warn(`Erro na tentativa ${attempt + 1}/${model}:`, error);
                    lastError = error;
                    continue;
                }
            }
        }

        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
    }

    throw lastError || new Error("Não foi possível processar a imagem. Erro de validação JSON persistente.");
};

