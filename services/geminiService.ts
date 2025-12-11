import { GoogleGenAI, Schema, Type } from "@google/genai";
import { AnalysisResult, ChatMessage } from "../types";

const SYSTEM_INSTRUCTION = `
You are a helpful, non-diagnostic AI assistant designed to explain medical documents to laypeople. 
Your task is to analyze medical documents (blood tests, X-rays, prescriptions, PDF reports) and user notes.

STRICT RULES:
1. DO NOT provide medical advice, diagnoses, or treatment plans.
2. DO NOT recommend specific medicines.
3. Use safe, educational language (e.g., "levels appear high", "this parameter generally relates to...").
4. For X-rays/Scans: 
   - Identify the specific modality (e.g., "X-Ray Chest PA View").
   - Extract findings into 'radiologyFindings' (Location, Finding, Significance).
   - CRITICAL: For any visible focal abnormality (like a fracture, crack, nodule, mass, or opacity), YOU MUST ESTIMATE the bounding box coordinates [ymin, xmin, ymax, xmax] on a 0-1000 scale representing its location in the image. 0,0 is top-left.
   - Describe visible patterns/densities without claiming definitive disease names unless stated in the report.
5. For Prescriptions: Identify medicine names, dosage, duration and type. Populate the 'medicines' array.
6. REPORT COMPARISON: If two documents are provided, create a structured comparison table in 'comparisonTable' AND a concise summary of trends in 'comparisonSummary'.
7. HEALTH SCORE: Calculate a health score (0-100) based on the number of normal vs abnormal parameters. 100 is perfect health (all normal).
8. CONCLUSION: Write a safe summary of improvements or declines.
9. DOCUMENT TYPE: Identify the specific type of document (e.g., "Complete Blood Count", "Lipid Profile", "X-Ray Chest", "Prescription", "General Medical Report").

OUTPUT FORMAT:
Return a JSON object matching the requested schema exactly.
`;

// --- Partial Schemas for Phased Loading ---

const PATIENT_INFO_SCHEMA: Schema = {
  type: Type.OBJECT,
  description: "Extracted patient information",
  properties: {
    name: { type: Type.STRING, description: "Patient Name or 'Unknown'" },
    age: { type: Type.STRING, description: "Patient Age or 'Unknown'" },
    gender: { type: Type.STRING, description: "Patient Gender or 'Unknown'" },
    report_date: { type: Type.STRING, description: "Date of report or 'Unknown'" },
    confidence: { type: Type.STRING, description: "Confidence score of extraction (0-100%)" }
  },
  required: ["name", "age", "gender", "report_date", "confidence"]
};

const EXTRACTION_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    documentType: { type: Type.STRING, description: "Specific type of the document analyzed" },
    patientInfo: PATIENT_INFO_SCHEMA,
    extractedValues: {
      type: Type.ARRAY,
      description: "List of numerical values extracted from the report",
      items: {
        type: Type.OBJECT,
        properties: {
          parameter: { type: Type.STRING },
          value: { type: Type.STRING },
          unit: { type: Type.STRING },
          ref_range: { type: Type.STRING }
        },
        required: ["parameter", "value", "unit", "ref_range"]
      }
    },
    indicators: {
      type: Type.ARRAY,
      description: "Classification of values",
      items: {
        type: Type.OBJECT,
        properties: {
          parameter: { type: Type.STRING },
          status: { type: Type.STRING, enum: ["High", "Low", "Normal", "Slightly Abnormal", "Unknown"] }
        },
        required: ["parameter", "status"]
      }
    },
    medicines: {
      type: Type.ARRAY,
      description: "List of medicines if the document is a prescription",
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          dosage: { type: Type.STRING },
          duration: { type: Type.STRING },
          type: { type: Type.STRING }
        },
        required: ["name", "dosage", "duration", "type"]
      }
    },
    radiologyFindings: {
      type: Type.ARRAY,
      description: "List of findings for X-rays/Scans/Imaging reports.",
      items: {
        type: Type.OBJECT,
        properties: {
          location: { type: Type.STRING },
          finding: { type: Type.STRING },
          significance: { type: Type.STRING },
          box_2d: {
             type: Type.ARRAY,
             items: { type: Type.NUMBER }
          }
        },
        required: ["location", "finding", "significance"]
      }
    }
  },
  required: ["documentType", "patientInfo"]
};

const INSIGHTS_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    simpleExplanations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          parameter: { type: Type.STRING },
          text: { type: Type.STRING }
        },
        required: ["parameter", "text"]
      }
    },
    comparisonTable: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          parameter: { type: Type.STRING },
          oldValue: { type: Type.STRING },
          newValue: { type: Type.STRING },
          trend: { type: Type.STRING, enum: ["Increase", "Decrease", "Stable", "Unknown"] }
        }
      }
    },
    comparisonSummary: { type: Type.STRING },
    healthScore: {
      type: Type.OBJECT,
      properties: {
        currentScore: { type: Type.NUMBER },
        previousScore: { type: Type.NUMBER },
        difference: { type: Type.NUMBER },
        status: { type: Type.STRING, enum: ["Improved", "Declined", "Stable", "Unknown"] }
      },
      required: ["currentScore", "status"]
    },
    conclusion: { type: Type.STRING },
    wellnessSuggestions: {
      type: Type.ARRAY,
      items: { type: Type.STRING }
    },
    doctorQuestions: {
      type: Type.ARRAY,
      items: { type: Type.STRING }
    },
    summary: { type: Type.STRING }
  },
  required: ["healthScore", "wellnessSuggestions", "doctorQuestions", "conclusion"]
};

const fileToBase64 = async (file: File): Promise<string> => {
  return new Promise<string>((resolve, reject) => {
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

export const detectDocumentType = async (file: File): Promise<'lab' | 'prescription' | 'radiology'> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API Key not found");
    return 'lab'; // Default fallback
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const base64Data = await fileToBase64(file);

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          { inlineData: { mimeType: file.type, data: base64Data } },
          { text: "Analyze the image. Classify it as exactly one of these: 'lab' (for blood tests, urine reports, lists of numerical health data), 'prescription' (handwritten or printed list of medicines/Rx), 'radiology' (x-ray, MRI, CT, ultrasound, visual scan). Return JSON." }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
              category: { type: Type.STRING, enum: ['lab', 'prescription', 'radiology'] }
          }
        }
      }
    });

    const text = response.text;
    if (!text) return 'lab';

    const json = JSON.parse(text);
    return json.category || 'lab';
  } catch (e) {
    console.error("Error detecting document type:", e);
    return 'lab';
  }
};

/**
 * Generator function that yields partial analysis results.
 * Phase 1: Basic Extraction (Patient, Values, Findings)
 * Phase 2: Deep Analysis (Explanations, Score, Advice)
 */
export async function* analyzeDocumentPhased(
  files: File[],
  userNotes: string,
  docTypeHint: 'lab' | 'prescription' | 'radiology' = 'lab'
): AsyncGenerator<AnalysisResult, void, unknown> {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found in environment variables");
  }

  const ai = new GoogleGenAI({ apiKey });
  const parts: any[] = [];

  // Prepare file parts
  for (const file of files) {
    const base64Data = await fileToBase64(file);
    parts.push({
      inlineData: {
        mimeType: file.type,
        data: base64Data
      }
    });
  }

  // --- PHASE 1: EXTRACTION ---
  // We ask for strict data extraction first.
  const promptPhase1 = `
    Analyze the provided medical document(s). 
    User Notes: "${userNotes}".
    Document Type Hint: "${docTypeHint}".
    
    PHASE 1 TASK: EXTRACT RAW DATA.
    1. Identify the Document Type (e.g. Blood Test, Prescription, X-Ray Chest).
    2. Extract patient info (Name, Age, Gender, Date).
    3. Extract test values, units, and ranges (for Lab reports).
    4. Determine status (High/Low/Normal).
    5. If Prescription: Extract medicines.
    6. If Radiology: Extract findings with bounding boxes (0-1000 scale) for focal abnormalities.
    
    Return strict JSON matching the Extraction Schema.
  `;

  try {
    const response1 = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
          responseSchema: EXTRACTION_SCHEMA,
        },
        contents: { parts: [...parts, { text: promptPhase1 }] }
    });

    const phase1Text = response1.text;
    if (!phase1Text) throw new Error("Phase 1 Extraction failed.");
    const phase1Data = JSON.parse(phase1Text);
    
    // YIELD PHASE 1
    yield phase1Data as AnalysisResult;

    // --- PHASE 2: INSIGHTS ---
    // We feed the extracted data back (implicitly via context or explicitly) to generate qualitative analysis.
    // To save tokens/latency, we can rely on the model's internal reasoning if we continue a chat, 
    // but here we are stateless between calls unless we pass history.
    // For robustness, we send the files again + the extracted JSON as context.
    
    const promptPhase2 = `
        PHASE 2 TASK: GENERATE INSIGHTS.
        Based on the document and the extracted data below, provide educational explanations and analysis.
        
        EXTRACTED DATA: ${JSON.stringify(phase1Data)}

        Tasks:
        1. Provide simple educational explanations for the extracted parameters.
        2. Calculate Health Score (0-100) based on normal vs abnormal count.
        3. If two documents were found (or if comparing with history), generate comparisonTable and summary.
        4. Wellness suggestions & Doctor questions.
           - Doctor Questions MUST be specific to the findings in the report (e.g. "What does the opacity in the right lung mean?" or "Should I be concerned about the high cholesterol?").
           - Do not give generic questions if specific abnormalities exist.
        5. Safe conclusion.

        Return strict JSON matching the Insights Schema.
    `;

    const response2 = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
          responseSchema: INSIGHTS_SCHEMA,
        },
        // We include parts (images) again to ensure visual context for any missed nuances, 
        // though strictly the JSON might suffice. Keeping images ensures high quality.
        contents: { parts: [...parts, { text: promptPhase2 }] }
    });

    const phase2Text = response2.text;
    if (!phase2Text) {
        // If Phase 2 fails, we at least return what we have from Phase 1
        return;
    }
    const phase2Data = JSON.parse(phase2Text);

    // MERGE AND YIELD FINAL
    const finalResult = { ...phase1Data, ...phase2Data };
    yield finalResult as AnalysisResult;

  } catch (error) {
    console.error("Analysis failed:", error);
    throw error;
  }
}

// Keep the old single-shot function for compatibility if needed, but wrapping the generator
export const analyzeDocument = async (
  files: File[],
  userNotes: string,
  docTypeHint: 'lab' | 'prescription' | 'radiology' = 'lab'
): Promise<AnalysisResult> => {
  const generator = analyzeDocumentPhased(files, userNotes, docTypeHint);
  let finalResult: AnalysisResult | undefined;
  for await (const result of generator) {
      finalResult = result;
  }
  if (!finalResult) throw new Error("No result generated");
  return finalResult;
};

export const chatWithAI = async (
  history: ChatMessage[],
  userMessage: string,
  context: AnalysisResult
): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found");
  }
  const ai = new GoogleGenAI({ apiKey });

  const systemInstruction = `
  You are MediClarify, an educational AI assistant.
  CONTEXT: The user has uploaded a medical report. Here is the analysis data: ${JSON.stringify(context)}.

  YOUR ROLE:
  1. Answer follow-up questions based ONLY on the provided report data and general non-medical wellness knowledge.
  2. If the user asks about specific values (e.g., "Why is hemoglobin low?"), use the extracted values and safe, general explanations.
  3. DO NOT diagnose, prescribe, or give medical advice.
  4. If asked about treatment, say: "I cannot suggest treatments. Please consult your doctor."
  5. Keep answers concise, friendly, and simple.
  6. Use Markdown for formatting (bolding key terms, using bullet points).

  DYNAMIC SUGGESTIONS:
  At the very end of your response, strictly append a list of 2-3 short, relevant follow-up questions for the user.
  RULES FOR SUGGESTIONS:
  1. CONTEXT AWARE: The questions MUST be directly related to the specific parameters, values, or medicines mentioned in the user's last question OR the specific abnormal findings in the report.
  2. SPECIFIC: Example - If 'hemoglobin' is low, suggest "Foods to help with hemoglobin" or "Common causes of low hemoglobin". Do NOT suggest generic questions like "How to stay healthy?".
  3. PROGRESSIVE: If the user asks about a condition, suggest questions about 'lifestyle changes' or 'monitoring' for that condition.

  Format them exactly like this:
  |||SUGGESTIONS||| ["Question 1", "Question 2", "Question 3"]
  `;

  const validHistory = history
    .filter(msg => msg.text && msg.text.trim().length > 0)
    .map(msg => ({
      role: msg.role,
      parts: [{ text: msg.text }]
    }));

  const chat = ai.chats.create({
    model: "gemini-2.5-flash",
    config: { systemInstruction },
    history: validHistory
  });

  const result = await chat.sendMessage({ message: userMessage });
  return result.text || "";
};