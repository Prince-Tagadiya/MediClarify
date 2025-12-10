
export interface ExtractedValue {
  parameter: string;
  value: string;
  unit: string;
  ref_range: string;
}

export interface Indicator {
  parameter: string;
  status: 'High' | 'Low' | 'Normal' | 'Slightly Abnormal' | 'Unknown';
}

export interface Explanation {
  parameter: string;
  text: string;
}

export interface PatientInfo {
  name: string;
  age: string;
  gender: string;
  report_date: string;
  confidence: string;
}

export interface ComparisonRow {
  parameter: string;
  oldValue: string;
  newValue: string;
  trend: 'Increase' | 'Decrease' | 'Stable' | 'Unknown';
}

export interface HealthScore {
  currentScore: number;
  previousScore?: number;
  difference?: number;
  status: 'Improved' | 'Declined' | 'Stable' | 'Unknown';
}

export interface AnalysisResult {
  documentType: string;
  patientInfo: PatientInfo;
  extractedValues: ExtractedValue[];
  indicators: Indicator[];
  simpleExplanations: Explanation[];
  comparisonTable?: ComparisonRow[];
  comparisonSummary?: string;
  healthScore: HealthScore;
  conclusion?: string;
  wellnessSuggestions: string[];
  doctorQuestions: string[];
  summary?: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export enum AppStatus {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}
