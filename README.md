# MediClarify 🏥 - AI-Powered Medical Document Assistant

![MediClarify Banner](https://via.placeholder.com/1200x400/4f46e5/ffffff?text=MediClarify+AI+Medical+Assistant)

**MediClarify** is a next-generation healthcare literacy tool designed to demystify complex medical documents. Powered by **Google's Gemini 2.5 Flash**, it transforms static lab reports, X-rays, and prescriptions into interactive, easy-to-understand visual insights.

> ⚠️ **Disclaimer:** This tool is for educational and informational purposes only. It is not a substitute for professional medical advice, diagnosis, or treatment.

---

## 🌟 Key Features

### 1. **Intelligent Document Parsing**
- **Auto-Detection**: Automatically classifies uploads into **Lab Reports**, **Prescriptions**, or **Radiology Scans** using visual analysis.
- **Phased Loading Architecture**: Utilizes a generator-based streaming approach (`analyzeDocumentPhased`) to render raw extracted data immediately (Phase 1) while complex insights and health scores generate in the background (Phase 2).

### 2. **Visual & Interactive Analysis**
- **Health Score Gauge**: A dynamic 0-100 score visualizing overall wellness based on the report's parameters, calculated by AI.
- **Radiology Viewer**: An enhanced image viewer with a "scanning" animation overlay and pinpointed findings (e.g., fractures, opacities) with clinical significance tooltips.
- **Medicine Cards**: Converts handwritten/printed prescriptions into organized, color-coded cards with dosage, duration, and type (Pill, Syrup, Injection) clearly highlighted.

### 3. **Smart Comparison Engine**
- **Trend Analysis**: Upload a **Current Report** and a **Previous Report** simultaneously.
- **Comparison Table**: The AI builds a side-by-side table highlighting trends (Increase ⬆️, Decrease ⬇️, Stable ➖) and summarizing changes.

### 4. **Context-Aware AI Chat**
- **Integrated Assistant**: Chat with "MediClarify AI" about your specific report.
- **Dynamic Suggestions**: The AI automatically suggests 2-3 specific follow-up questions based on findings (e.g., *"What foods help with low Hemoglobin?"* instead of generic advice).
- **Deep Context**: The chat model retains the full context of the analyzed report (values, abnormalities) to provide precise answers.

### 5. **Privacy & Export**
- **Client-Side**: Files are processed directly via the API; the app does not store personal health data.
- **Print-Optimized**: A dedicated CSS print stylesheet (`@media print`) formats the analysis into a clean, professional PDF report suitable for physical printing.

---

## 📸 App Interface

| **Dashboard & Upload** | **Lab Analysis & Health Score** |
|:---:|:---:|
| ![Upload Screen](https://via.placeholder.com/400x300/e0e7ff/4f46e5?text=Smart+Upload+%26+Compare) | ![Lab Report](https://via.placeholder.com/400x300/f0fdf4/166534?text=Health+Gauge+%26+Tables) |
| *Clean drag-and-drop interface with auto-detection* | *Interactive gauge and color-coded status badges* |

| **Radiology & Scanning** | **AI Chat & Prescriptions** |
|:---:|:---:|
| ![Radiology](https://via.placeholder.com/400x300/1e293b/38bdf8?text=X-Ray+Analysis+Mode) | ![Chat Interface](https://via.placeholder.com/400x300/fff1f2/be123c?text=Medicine+Cards+%26+Chat) |
| *AI-enhanced view with finding overlays* | *Context-aware chat and organized Rx cards* |

---

## 🛠️ Tech Stack

- **Frontend**: [React 19](https://react.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **AI Model**: [Google Gemini 2.5 Flash](https://deepmind.google/technologies/gemini/)
- **SDK**: [`@google/genai`](https://www.npmjs.com/package/@google/genai)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Build System**: ES Modules (Vite compatible)

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+) installed.
- A **Google Gemini API Key**. Get one [here](https://aistudio.google.com/).

### Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/yourusername/mediclarify.git
   cd mediclarify
   ```

2. **Environment Setup**
   - Create a `.env` file in the root directory.
   - Add your API Key:
     ```env
     API_KEY=your_google_api_key_here
     ```

3. **Install Dependencies**
   ```bash
   npm install
   ```

4. **Run Development Server**
   ```bash
   npm run dev
   ```

---

## 📖 Usage Guide

1.  **Select a File**: Click the main upload box to select a medical document (PDF, JPG, PNG).
2.  **Comparison Mode**: If "Lab Report" is detected, a secondary upload box slides in. Upload a previous report to see a trend comparison.
3.  **Analyze**: Click the "Analyze Report" button.
    - **Phase 1**: Patient details and raw data tables appear instantly.
    - **Phase 2**: Deep insights, the Health Score gauge, and wellness advice load progressively.
4.  **Explore Data**:
    - **Hover**: Move your mouse over extracted values or radiology findings for detailed explanations.
    - **Chat**: Click the floating chat icon. The AI suggests relevant questions based on *your* specific results.
5.  **Print/Save**: Click "Print Report" in the header to save the analysis as a PDF.

---

## 🧠 Technical Architecture

### Phased Generative Analysis
MediClarify solves the "LLM Latency" problem by splitting the analysis into two generator yields:

1.  **Phase 1 (Extraction)**: The model is prompted with a strict JSON schema to *only* extract text, numbers, and finding coordinates. This is fast and renders the "Skeleton" of the report.
2.  **Phase 2 (Synthesis)**: The model performs a second pass (or continues reasoning) to generate the "Health Score", "Comparisons", and "Doctor Questions".

```typescript
// Simplified Logic from services/geminiService.ts
export async function* analyzeDocumentPhased(files) {
  // Yield 1: Raw Data
  const extraction = await ai.models.generateContent({ schema: EXTRACTION_SCHEMA, ... });
  yield extraction; 

  // Yield 2: Deep Insights
  const insights = await ai.models.generateContent({ schema: INSIGHTS_SCHEMA, ... });
  yield { ...extraction, ...insights };
}
```

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

Built with ❤️ by **Prince Tagadiya**.
