
import { GoogleGenAI, Schema, Type } from "@google/genai";
import { AnalysisResult } from "../types";

const SYSTEM_INSTRUCTION = `
You are a helpful, non-diagnostic AI assistant designed to explain medical documents to laypeople. 
Your task is to analyze medical documents (blood tests, X-rays, prescriptions, PDF reports) and user notes.

STRICT RULES:
1. DO NOT provide medical advice, diagnoses, or treatment plans.
2. DO NOT recommend specific medicines.
3. Use safe, educational language (e.g., "levels appear high", "this parameter generally relates to...").
4. For X-rays/Scans: Describe visible patterns/densities without claiming disease names. Use "may suggest" or "could indicate".
5. For Prescriptions: Identify medicine names and general purpose (e.g., "pain reliever") and clarify dosage timing.
6. REPORT COMPARISON: If two documents are provided, create a structured comparison table in 'comparisonTable' AND a concise summary of trends in 'comparisonSummary'.
7. HEALTH SCORE: Calculate a health score (0-100) based on the number of normal vs abnormal parameters. 100 is perfect health (all normal).
8. CONCLUSION: Write a safe summary of improvements or declines.
9. DOCUMENT TYPE: Identify the specific type of document (e.g., "Complete Blood Count", "Lipid Profile", "X-Ray Chest", "Prescription", "General Medical Report").

OUTPUT FORMAT:
Return a JSON object matching the requested schema exactly.
`;

const RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    documentType: { type: Type.STRING, description: "Specific type of the document analyzed (e.g., 'Blood Test', 'X-Ray', 'Prescription')" },
    patientInfo: {
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
    },
    extractedValues: {
      type: Type.ARRAY,
      description: "List of numerical values extracted from the report",
      items: {
        type: Type.OBJECT,
        properties: {
          parameter: { type: Type.STRING, description: "Name of the test or parameter" },
          value: { type: Type.STRING, description: "The result value" },
          unit: { type: Type.STRING, description: "The unit of measurement" },
          ref_range: { type: Type.STRING, description: "The reference range provided in the doc" }
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
    simpleExplanations: {
      type: Type.ARRAY,
      description: "Simple, layperson explanations of what the parameters mean",
      items: {
        type: Type.OBJECT,
        properties: {
          parameter: { type: Type.STRING },
          text: { type: Type.STRING, description: "Educational explanation of the parameter" }
        },
        required: ["parameter", "text"]
      }
    },
    comparisonTable: {
      type: Type.ARRAY,
      description: "If two reports are provided, list parameters found in both with trend.",
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
    comparisonSummary: {
      type: Type.STRING,
      description: "A concise summary of the key trends and changes observed between the two reports. Only populate if two reports are analyzed."
    },
    healthScore: {
      type: Type.OBJECT,
      description: "Calculated health score based on parameters.",
      properties: {
        currentScore: { type: Type.NUMBER, description: "Score 0-100 for current report" },
        previousScore: { type: Type.NUMBER, description: "Score 0-100 for previous report (if available)" },
        difference: { type: Type.NUMBER, description: "Difference between new and old score" },
        status: { type: Type.STRING, enum: ["Improved", "Declined", "Stable", "Unknown"] }
      },
      required: ["currentScore", "status"]
    },
    conclusion: {
      type: Type.STRING,
      description: "Safe summary about improvement, decline, or overall status."
    },
    wellnessSuggestions: {
      type: Type.ARRAY,
      description: "General lifestyle, hydration, sleep, and nutrition tips. Non-medical.",
      items: { type: Type.STRING }
    },
    doctorQuestions: {
      type: Type.ARRAY,
      description: "Safe questions the user can ask their doctor based on these results.",
      items: { type: Type.STRING }
    },
    summary: {
      type: Type.STRING,
      description: "A brief, friendly summary of the document type and contents."
    }
  },
  required: ["documentType", "patientInfo", "extractedValues", "indicators", "simpleExplanations", "healthScore", "wellnessSuggestions", "doctorQuestions"]
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

export const analyzeDocument = async (
  files: File[],
  userNotes: string
): Promise<AnalysisResult> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found in environment variables");
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    const parts: any[] = [];

    // Process all files
    for (const file of files) {
      const base64Data = await fileToBase64(file);
      parts.push({
        inlineData: {
          mimeType: file.type,
          data: base64Data
        }
      });
    }

    // Add prompt
    parts.push({
      text: `Analyze the provided medical document(s). 
      User Notes: "${userNotes}".
      
      Tasks:
      1. Identify the Document Type (e.g. Blood Test, Prescription).
      2. Extract patient info (Name, Age, Gender, Date).
      3. Extract test values, units, and ranges.
      4. Identify status (High/Low/Normal/Slightly Abnormal).
      5. Provide simple educational explanations.
      6. If TWO documents are provided:
         - Create a structured comparison table.
         - Generate a concise text summary of the comparison trends in 'comparisonSummary'.
         - Calculate scores for BOTH and compare.
      7. Calculate Health Score (0-100). Deduct points for high/low values. 
      8. Provide general wellness suggestions.
      9. Suggest questions for the doctor.
      10. Write a safe conclusion.
      
      Remember: NO DIAGNOSIS.`
    });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
      },
      contents: { parts }
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");

    return JSON.parse(text) as AnalysisResult;

  } catch (error) {
    console.error("Analysis failed:", error);
    throw error;
  }
};
