import React, { useState, useRef, useEffect } from 'react';
import { AnalysisResult, ChatMessage } from '../types';
import { CheckCircle, AlertTriangle, ArrowDown, ArrowUp, HelpCircle, Activity, FileText, User, TrendingUp, Minus, Info, Send, MessageSquare, X, Minimize2, Sparkles, ShoppingCart, Pill, Syringe, Droplet, Clock, Link as LinkIcon, ScanLine, Eye, MapPin, FlaskConical, AlertCircle } from 'lucide-react';
import { chatWithAI } from '../services/geminiService';

interface AnalysisDisplayProps {
  result: AnalysisResult;
  filePreview: string | null;
  fileType?: string;
}

// --- Internal Skeleton Components ---

const SkeletonText = ({ width = "w-3/4" }: { width?: string }) => (
  <div className={`h-4 bg-slate-200 rounded animate-pulse ${width}`}></div>
);

const SkeletonCard = () => (
  <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm animate-pulse">
    <div className="h-6 bg-slate-200 rounded w-1/3 mb-4"></div>
    <div className="space-y-3">
        <SkeletonText width="w-full" />
        <SkeletonText width="w-5/6" />
        <SkeletonText width="w-4/6" />
    </div>
  </div>
);

const SkeletonList = () => (
    <div className="space-y-4 animate-pulse">
        {[1, 2, 3].map(i => (
            <div key={i} className="flex justify-between items-center bg-slate-50 p-3 rounded">
                <div className="h-4 bg-slate-200 rounded w-1/3"></div>
                <div className="h-4 bg-slate-200 rounded w-1/4"></div>
            </div>
        ))}
    </div>
);

const SkeletonGauge = () => (
    <div className="flex flex-col items-center justify-center animate-pulse py-8">
        <div className="w-40 h-40 rounded-full border-8 border-slate-100 flex items-center justify-center">
             <div className="w-16 h-8 bg-slate-200 rounded"></div>
        </div>
        <div className="mt-4 w-24 h-4 bg-slate-200 rounded"></div>
    </div>
);


// --- Helper: Simple Markdown Parser for Chat ---
const formatMessageText = (text: string) => {
  const parseBold = (str: string) => {
    const parts = str.split(/(\*\*.*?\*\*)/g); 
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="font-semibold">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  const lines = text.split('\n');
  return lines.map((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) return <div key={i} className="h-2" />; 

    // Handle bullet points
    if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
      const content = trimmed.substring(2);
      return (
        <div key={i} className="flex items-start ml-1 mb-1">
            <span className="mr-2 text-current opacity-70">•</span>
            <span>{parseBold(content)}</span>
        </div>
      );
    }
    
    return <p key={i} className="mb-1 leading-relaxed">{parseBold(line)}</p>;
  });
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const s = status.toLowerCase();
  if (s === 'normal') {
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 print:border print:border-green-200 print:bg-transparent print:text-green-700"><CheckCircle className="w-3 h-3 mr-1" /> Normal</span>;
  }
  if (s === 'high') {
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 print:border print:border-red-200 print:bg-transparent print:text-red-700"><ArrowUp className="w-3 h-3 mr-1" /> High</span>;
  }
  if (s === 'low') {
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 print:border print:border-yellow-200 print:bg-transparent print:text-yellow-700"><ArrowDown className="w-3 h-3 mr-1" /> Low</span>;
  }
  if (s === 'slightly abnormal') {
     return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 print:border print:border-orange-200 print:bg-transparent print:text-orange-700"><AlertTriangle className="w-3 h-3 mr-1" /> Abnormal</span>;
  }
  return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 print:border print:border-gray-200 print:bg-transparent"><HelpCircle className="w-3 h-3 mr-1" /> {status}</span>;
};

const HealthScoreGauge: React.FC<{ 
  score: number; 
  label?: string; 
  abnormalItems: { parameter: string; status: string }[]; 
  normalItems: string[];
}> = ({ score, label = "Health Score", abnormalItems, normalItems }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const totalCount = abnormalItems.length + normalItems.length;
  const radius = 50;
  const strokeWidth = 10;
  const center = 60; // SVG size 120x120
  const circumference = 2 * Math.PI * radius;

  // 1. Overall Score Arc (Default View)
  const normalizedScore = Math.min(100, Math.max(0, score));
  const scoreDashOffset = circumference - (normalizedScore / 100) * circumference;
  
  let scoreColor = "text-red-500";
  let trackColor = "text-red-100";
  if (score >= 80) { scoreColor = "text-emerald-500"; trackColor = "text-emerald-100"; }
  else if (score >= 60) { scoreColor = "text-yellow-500"; trackColor = "text-yellow-100"; }

  // 2. Segmented Arc (Hover View)
  const abnormalCount = abnormalItems.length;
  const normalCount = normalItems.length;
  const safeTotal = Math.max(1, totalCount);

  const normalFraction = normalCount / safeTotal;
  const abnormalFraction = abnormalCount / safeTotal;

  // Arc lengths
  const normalArcLength = normalFraction * circumference;
  const abnormalArcLength = abnormalFraction * circumference;

  const normalDashArray = `${normalArcLength} ${circumference}`;
  const normalDashOffset = 0;

  const abnormalDashArray = `${abnormalArcLength} ${circumference}`;
  const abnormalDashOffset = -normalArcLength;

  return (
    <div className="flex flex-col items-center w-full">
        <div 
            className="flex flex-col items-center relative group cursor-pointer"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={() => setIsHovered(!isHovered)} 
        >
            <div className="relative w-48 h-48">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                    <circle 
                        cx={center} cy={center} r={radius} 
                        stroke="currentColor" strokeWidth={strokeWidth} fill="transparent" 
                        className={`${trackColor} transition-all duration-300 ${isHovered ? 'opacity-30' : 'opacity-100'}`}
                    />
                    
                    <circle
                        cx={center} cy={center} r={radius}
                        stroke="currentColor" strokeWidth={strokeWidth} fill="transparent"
                        strokeDasharray={circumference}
                        strokeDashoffset={scoreDashOffset}
                        strokeLinecap="round"
                        className={`${scoreColor} transition-all duration-500 ease-out ${isHovered ? 'opacity-0' : 'opacity-100'}`}
                    />

                    <circle
                        cx={center} cy={center} r={radius}
                        stroke="#10b981" strokeWidth={strokeWidth} fill="transparent"
                        strokeDasharray={normalDashArray}
                        strokeDashoffset={normalDashOffset}
                        className={`transition-all duration-500 ease-out ${isHovered ? 'opacity-100' : 'opacity-0'}`}
                    />
                    <circle
                        cx={center} cy={center} r={radius}
                        stroke="#ef4444" strokeWidth={strokeWidth} fill="transparent"
                        strokeDasharray={abnormalDashArray}
                        strokeDashoffset={abnormalDashOffset}
                        className={`transition-all duration-500 ease-out ${isHovered ? 'opacity-100' : 'opacity-0'}`}
                    />
                </svg>
                
                <div className="absolute inset-0 flex flex-col items-center justify-center transform transition-all">
                    <div className={`flex flex-col items-center transition-all duration-300 absolute ${isHovered ? 'opacity-0 scale-90' : 'opacity-100 scale-100'}`}>
                        <span className={`text-4xl font-bold ${scoreColor}`}>{score}</span>
                        <span className="text-xs text-slate-400 font-medium">/ 100</span>
                    </div>
                    
                    <div className={`flex flex-col items-center transition-all duration-300 absolute ${isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-110'}`}>
                        <span className="text-2xl font-bold text-slate-700">{abnormalCount}</span>
                        <span className="text-xs text-red-500 font-bold uppercase tracking-wide">Issues</span>
                        <div className="w-8 h-px bg-slate-200 my-1"></div>
                        <span className="text-xl font-bold text-emerald-600">{normalCount}</span>
                        <span className="text-xs text-emerald-600 font-bold uppercase tracking-wide">Normal</span>
                    </div>
                </div>

                <div className={`absolute top-full left-1/2 transform -translate-x-1/2 mt-4 w-72 bg-white p-5 rounded-xl shadow-2xl border border-slate-100 z-50 transition-all duration-300 pointer-events-none no-print ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
                    <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-100">
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Score Details</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${score >= 80 ? 'bg-emerald-100 text-emerald-700' : score >= 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                            {score}/100
                        </span>
                    </div>

                    {abnormalItems.length > 0 ? (
                        <div className="mb-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold text-red-600 flex items-center">
                                    <AlertTriangle className="w-3 h-3 mr-1" />
                                    Attention Needed ({abnormalItems.length})
                                </span>
                            </div>
                            <div className="space-y-1.5">
                                {abnormalItems.slice(0, 5).map((item, i) => (
                                    <div key={i} className="flex justify-between items-center text-xs bg-red-50/50 p-1.5 rounded border border-red-50">
                                        <span className="font-medium text-slate-700 truncate max-w-[130px]" title={item.parameter}>{item.parameter}</span>
                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                                            item.status.toLowerCase().includes('high') ? 'bg-red-100 text-red-700' : 
                                            item.status.toLowerCase().includes('low') ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700'
                                        }`}>
                                            {item.status}
                                        </span>
                                    </div>
                                ))}
                                {abnormalItems.length > 5 && (
                                    <div className="text-[10px] text-center text-slate-400 italic mt-1">
                                        + {abnormalItems.length - 5} other issues...
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="mb-4 text-center py-2 bg-emerald-50 rounded border border-emerald-100">
                            <span className="text-xs font-medium text-emerald-700 flex items-center justify-center">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                All parameters look good!
                            </span>
                        </div>
                    )}
                </div>
            </div>
            
            <span className="text-sm font-semibold text-slate-700 mt-2 print:text-xs">{label}</span>
            <span className="text-xs text-slate-400 bg-slate-100 px-3 py-1 rounded-full mt-1 no-print">Hover/Click for details</span>
        </div>

        <div className="hidden print:block w-full mt-4 border-t border-slate-100 pt-3">
            {abnormalItems.length > 0 ? (
                <div>
                     <p className="text-[10px] font-bold text-red-700 uppercase tracking-wide mb-1">Attention Areas:</p>
                     <ul className="text-[9px] text-slate-600 space-y-1">
                        {abnormalItems.map((item, i) => (
                            <li key={i} className="flex justify-between">
                                <span>{item.parameter}</span>
                                <span className="font-bold">{item.status}</span>
                            </li>
                        ))}
                     </ul>
                </div>
            ) : (
                 <p className="text-xs text-emerald-700 font-medium text-center">All parameters appear normal.</p>
            )}
        </div>
    </div>
  );
};

// --- Medicine UI Helpers & Themes ---

const CARD_THEMES = [
  { 
    name: 'indigo',
    bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-900',
    iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600',
    badgeBg: 'bg-indigo-50', badgeBorder: 'border-indigo-200', badgeText: 'text-indigo-600',
    btnClass: 'text-indigo-600 border-indigo-200 hover:bg-indigo-50'
  },
  { 
    name: 'emerald',
    bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-900',
    iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600',
    badgeBg: 'bg-emerald-50', badgeBorder: 'border-emerald-200', badgeText: 'text-emerald-600',
    btnClass: 'text-emerald-600 border-emerald-200 hover:bg-emerald-50'
  },
  { 
    name: 'blue',
    bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-900',
    iconBg: 'bg-blue-100', iconColor: 'text-blue-600',
    badgeBg: 'bg-blue-50', badgeBorder: 'border-blue-200', badgeText: 'text-blue-600',
    btnClass: 'text-blue-600 border-blue-200 hover:bg-blue-50'
  },
  { 
    name: 'amber',
    bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-900',
    iconBg: 'bg-amber-100', iconColor: 'text-amber-600',
    badgeBg: 'bg-amber-50', badgeBorder: 'border-amber-200', badgeText: 'text-amber-600',
    btnClass: 'text-amber-600 border-amber-200 hover:bg-amber-50'
  },
  { 
    name: 'rose',
    bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-900',
    iconBg: 'bg-rose-100', iconColor: 'text-rose-600',
    badgeBg: 'bg-rose-50', badgeBorder: 'border-rose-200', badgeText: 'text-rose-600',
    btnClass: 'text-rose-600 border-rose-200 hover:bg-rose-50'
  },
  { 
    name: 'purple',
    bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-900',
    iconBg: 'bg-purple-100', iconColor: 'text-purple-600',
    badgeBg: 'bg-purple-50', badgeBorder: 'border-purple-200', badgeText: 'text-purple-600',
    btnClass: 'text-purple-600 border-purple-200 hover:bg-purple-50'
  },
];

const getMedicineIcon = (type: string, className: string) => {
  const t = type.toLowerCase();
  if (t.includes('injection') || t.includes('syringe') || t.includes('vaccine')) return <Syringe className={className} />;
  if (t.includes('syrup') || t.includes('liquid') || t.includes('drop') || t.includes('suspension')) return <Droplet className={className} />;
  if (t.includes('tincture') || t.includes('solution') || t.includes('mixture')) return <FlaskConical className={className} />;
  return <Pill className={className} />;
};

const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({ result, filePreview, fileType }) => {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isChatBtnHovered, setIsChatBtnHovered] = useState(false);
  
  // Dynamic Suggestions State
  const [currentSuggestions, setCurrentSuggestions] = useState<string[]>(result.doctorQuestions || []);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Update suggestions when result changes (Phase 2 loads)
  useEffect(() => {
    if (result.doctorQuestions) {
        setCurrentSuggestions(result.doctorQuestions);
    }
  }, [result.doctorQuestions]);

  const docType = result.documentType || "Analyzing...";
  const isPrescription = docType.toLowerCase().includes('prescription');
  const isRadiology = /x-ray|mri|ct scan|radiology|ultrasound/.test(docType.toLowerCase());

  const abnormalItems = result.indicators
    ? result.indicators.filter(i => i.status !== 'Normal' && i.status !== 'Unknown').map(i => ({ parameter: i.parameter, status: i.status }))
    : [];

  const normalItems = result.indicators
    ? result.indicators.filter(i => i.status === 'Normal').map(i => i.parameter)
    : [];

  // Chat Functions
  const handleSendMessage = async (messageText: string) => {
    if (!messageText.trim() || isChatLoading) return;

    const userMsg: ChatMessage = { role: 'user', text: messageText };
    
    setChatHistory(prev => [...prev, userMsg]);
    setChatInput('');
    setIsChatLoading(true);
    setCurrentSuggestions([]); // Clear suggestions while loading

    try {
      const fullResponse = await chatWithAI(chatHistory, messageText, result);
      
      // Parse suggestions from response
      const parts = fullResponse.split('|||SUGGESTIONS|||');
      const cleanText = parts[0].trim();
      const suggestionPart = parts[1];

      const aiMsg: ChatMessage = { role: 'model', text: cleanText };
      setChatHistory(prev => [...prev, aiMsg]);

      if (suggestionPart) {
          try {
              const parsed = JSON.parse(suggestionPart.trim());
              if (Array.isArray(parsed)) {
                  setCurrentSuggestions(parsed);
              }
          } catch (e) {
              console.warn("Failed to parse dynamic suggestions", e);
          }
      }

    } catch (error) {
      console.error("Chat error:", error);
      const errorMsg: ChatMessage = { role: 'model', text: "I'm sorry, I encountered an error while trying to answer. Please try again." };
      setChatHistory(prev => [...prev, errorMsg]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const toggleChat = () => {
    setIsChatOpen(!isChatOpen);
    if (!isChatOpen) {
        setTimeout(() => {
            document.getElementById('chat-input')?.focus();
        }, 300);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isChatLoading, isChatOpen, currentSuggestions]);

  return (
    <div className="space-y-8 pb-12 report-container relative">
      <style>{`
         @keyframes enter {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
         }
         .animate-enter {
            animation: enter 0.6s ease-out forwards;
            opacity: 0;
         }
      `}</style>

      {/* Disclaimer */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-md no-print animate-enter" style={{animationDelay: '0ms'}}>
        <div className="flex justify-between items-start md:items-center flex-col md:flex-row gap-4">
            <div className="flex">
                <div className="flex-shrink-0">
                    <AlertTriangle className="h-5 w-5 text-blue-400" aria-hidden="true" />
                </div>
                <div className="ml-3">
                    <p className="text-sm text-blue-700">
                    <strong>Educational Use Only:</strong> This AI analysis is for informational purposes and does not constitute medical advice.
                    </p>
                </div>
            </div>
        </div>
      </div>

      {/* Print Header */}
      <div className="hidden print:block mb-6 pb-4 border-b-2 border-slate-200">
        <div className="flex justify-between items-end">
            <div>
                 <div className="mb-2 uppercase tracking-wide text-xs font-bold text-indigo-600 border border-indigo-200 bg-indigo-50 inline-block px-2 py-1 rounded">
                    {docType}
                 </div>
                <h1 className="text-3xl font-bold text-slate-900 mb-1">MediClarify Analysis Report</h1>
                <p className="text-sm text-slate-500">Generated automatically by AI Assistant</p>
            </div>
            <div className="text-right">
                <p className="text-sm font-semibold text-slate-900">Date: {new Date().toLocaleDateString()}</p>
                <p className="text-xs text-slate-500">Ref ID: {Math.random().toString(36).substr(2, 9).toUpperCase()}</p>
            </div>
        </div>
      </div>

      {/* Screen Title */}
      <div className="flex items-center justify-between mb-2 no-print animate-enter" style={{animationDelay: '100ms'}}>
          <div>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-indigo-100 text-indigo-800 shadow-sm">
                <FileText className="w-4 h-4 mr-1.5"/>
                {docType}
            </span>
          </div>
      </div>

      {/* Patient Info Card */}
      {result.patientInfo ? (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 print:shadow-none print:border print:p-4 print:mb-4 animate-enter" style={{animationDelay: '200ms'}}>
        <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center border-b border-slate-100 pb-2">
            <User className="w-5 h-5 mr-2 text-indigo-500" />
            Patient Information
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold block mb-1">Name</span>
            <span className="text-sm font-medium text-slate-900">{result.patientInfo.name}</span>
          </div>
          <div>
            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold block mb-1">Age / Gender</span>
            <span className="text-sm font-medium text-slate-900">{result.patientInfo.age} / {result.patientInfo.gender}</span>
          </div>
          <div>
            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold block mb-1">Report Date</span>
            <span className="text-sm font-medium text-slate-900">{result.patientInfo.report_date}</span>
          </div>
          <div>
             <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold block mb-1">AI Confidence</span>
             <div className="flex items-center">
                <span className="text-sm font-medium text-slate-900 mr-2">{result.patientInfo.confidence}</span>
                <div className="h-1.5 w-16 bg-slate-100 rounded-full overflow-hidden print:hidden">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: result.patientInfo.confidence }}></div>
                </div>
             </div>
          </div>
        </div>
      </div>
      ) : (
        <SkeletonCard />
      )}

      {/* 
        CONDITIONAL LAYOUT LOGIC
        1. RADIOLOGY MODE
        2. PRESCRIPTION MODE
        3. STANDARD LAB REPORT MODE
      */}

      {/* 1. RADIOLOGY VISUALIZER */}
      {isRadiology && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 print:shadow-none print:border print:p-4 print:mb-6 animate-enter" style={{animationDelay: '300ms'}}>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-slate-800 flex items-center">
                    <ScanLine className="w-5 h-5 mr-2 text-indigo-500" />
                    Scan Analysis & Findings
                </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left: X-Ray Image Visualization */}
                <div className="flex flex-col">
                    <div className="relative rounded-xl overflow-hidden bg-slate-900 border-2 border-slate-800 shadow-inner group select-none">
                        {filePreview && (!fileType || fileType.startsWith('image/')) ? (
                            <>
                                <img src={filePreview} alt="Radiology Scan" className="w-full h-auto object-cover opacity-90 block" />
                                
                                {/* Overlay Grid Effect */}
                                <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,0,0.03)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none"></div>
                                {/* Scanning Bar Animation */}
                                <div className="absolute top-0 left-0 w-full h-1 bg-green-400/50 shadow-[0_0_15px_rgba(74,222,128,0.5)] animate-scan pointer-events-none"></div>
                                <div className="absolute bottom-3 right-3 bg-black/60 px-2 py-1 rounded text-[10px] text-green-400 font-mono border border-green-500/30 z-20">
                                    AI ENHANCED VIEW
                                </div>
                            </>
                        ) : (
                            <div className="h-64 flex flex-col items-center justify-center text-slate-500">
                                <FileText className="w-12 h-12 mb-2 opacity-50" />
                                <span className="text-sm">Image preview not available for PDF</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Findings List - UPDATED UI */}
                <div className="space-y-4">
                     {result.conclusion ? (
                     <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                        {result.conclusion}
                     </p>
                     ) : <SkeletonText width="w-full" />}
                     
                     {result.radiologyFindings ? (result.radiologyFindings.length > 0 ? (
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Detected Findings</h3>
                            {result.radiologyFindings.map((item, idx) => {
                                const isConcern = /fracture|opacity|nodule|mass|pneumonia|consolidation|abnormal|tear|lesion/i.test(item.finding) || /fracture|opacity|nodule|mass|pneumonia|consolidation|abnormal|tear|lesion/i.test(item.significance);
                                
                                return (
                                    <div 
                                        key={idx} 
                                        className="group relative bg-white border border-slate-200 rounded-lg p-3 hover:shadow-md transition-all duration-200"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-start space-x-3">
                                                <div className={`mt-0.5 p-1.5 rounded-full flex-shrink-0 ${isConcern ? 'bg-red-50 text-red-500' : 'bg-teal-50 text-teal-500'}`}>
                                                    {isConcern ? <AlertCircle size={14}/> : <CheckCircle size={14}/>}
                                                </div>
                                                <div>
                                                    <h4 className="text-xs font-bold text-slate-800 leading-tight mb-1">{item.finding}</h4>
                                                    <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                                                        {item.location}
                                                    </span>
                                                </div>
                                            </div>
                                            {/* Tooltip Trigger Icon */}
                                            <div className="relative ml-2">
                                                <Info className="w-4 h-4 text-slate-300 hover:text-indigo-500 cursor-help transition-colors" />
                                                
                                                {/* Tooltip Content (Robust Positioning) */}
                                                <div className="absolute right-0 top-6 w-56 p-2.5 bg-slate-800 text-slate-100 text-[11px] leading-relaxed rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none border border-slate-700">
                                                    <div className="font-bold text-slate-300 mb-1 border-b border-slate-700 pb-1">Clinical Significance</div>
                                                    {item.significance}
                                                    {/* Triangle Arrow */}
                                                    <div className="absolute -top-1.5 right-1 w-3 h-3 bg-slate-800 transform rotate-45 border-l border-t border-slate-700"></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                     ) : (
                        <div className="text-center p-8 border-2 border-dashed border-slate-200 rounded-lg">
                            <Eye className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                            <p className="text-sm text-slate-500">No specific focal findings detected.</p>
                        </div>
                     )) : <SkeletonList />}
                </div>
            </div>
            <style>{`
                @keyframes scan {
                    0% { top: 0%; opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { top: 100%; opacity: 0; }
                }
                .animate-scan {
                    animation: scan 3s linear infinite;
                }
            `}</style>
        </div>
      )}

      {/* 2. STANDARD LAB REPORT (Gauge, Summary, Tables) - Only if NOT Radiology and NOT Prescription */}
      {!isPrescription && !isRadiology && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:grid-cols-3 print:gap-4 print:mb-6 animate-enter" style={{animationDelay: '300ms'}}>
            <div className="md:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col items-center justify-center print:border print:shadow-none print:p-2">
                {result.healthScore ? (
                    <HealthScoreGauge 
                    score={result.healthScore.currentScore} 
                    label="Current Health Score"
                    abnormalItems={abnormalItems} 
                    normalItems={normalItems}
                    />
                ) : (
                    <SkeletonGauge />
                )}
            </div>

            <div className="md:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-100 print:border print:shadow-none print:p-4">
                <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
                    <Activity className="w-5 h-5 mr-2 text-indigo-500" />
                    Analysis Summary
                </h2>
                
                <div className="space-y-4">
                    {result.conclusion ? (
                         <p className="text-slate-600 text-sm leading-relaxed">{result.conclusion}</p>
                    ) : (
                         <SkeletonText width="w-full" />
                    )}

                    {result.comparisonTable && result.comparisonTable.length > 0 ? (
                        <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
                            <h3 className="text-sm font-bold text-slate-800 mb-2 flex items-center">
                               <TrendingUp className="w-4 h-4 mr-2 text-indigo-600"/>
                               Report Comparison
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {result.healthScore && (
                              <>
                              <div>
                                  <span className="text-xs text-slate-400 uppercase">Old Score</span>
                                  <div className="text-lg font-semibold text-slate-700">{result.healthScore.previousScore || 'N/A'}</div>
                              </div>
                              <div>
                                  <span className="text-xs text-slate-400 uppercase">Trend</span>
                                  <div className={`text-lg font-bold ${
                                      result.healthScore.status === 'Improved' ? 'text-emerald-600' : 
                                      result.healthScore.status === 'Declined' ? 'text-red-600' : 'text-slate-600'
                                  }`}>
                                      {result.healthScore.status}
                                      {result.healthScore.difference ? ` (${result.healthScore.difference > 0 ? '+' : ''}${result.healthScore.difference})` : ''}
                                  </div>
                              </div>
                              </>
                              )}
                            </div>
                            {result.comparisonSummary && (
                                <p className="text-xs text-slate-600 mt-2 pt-2 border-t border-slate-200 italic">
                                  "{result.comparisonSummary}"
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-4 mt-2">
                            <div className="p-3 bg-red-50 rounded-lg border border-red-100 text-center">
                                <span className="block text-2xl font-bold text-red-600">{abnormalItems.length}</span>
                                <span className="text-xs text-red-600 font-medium">Attention Needed</span>
                            </div>
                            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100 text-center">
                                <span className="block text-2xl font-bold text-emerald-600">{normalItems.length}</span>
                                <span className="text-xs text-emerald-600 font-medium">Normal Values</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}

      {/* 3. PRESCRIPTION MODE SUMMARY */}
      {isPrescription && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 print:shadow-none print:border print:p-4 print:mb-6 animate-enter" style={{animationDelay: '300ms'}}>
            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
                <Activity className="w-5 h-5 mr-2 text-indigo-500" />
                Prescription Summary
            </h2>
            {result.conclusion ? (
            <p className="text-slate-600 text-sm leading-relaxed">{result.conclusion}</p>
            ) : <SkeletonText width="w-full" />}
        </div>
      )}

      {/* Comparison Table (Common for Lab Tests) */}
      {!isRadiology && result.comparisonTable && result.comparisonTable.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden print:border print:shadow-none print:mb-6 animate-enter" style={{animationDelay: '400ms'}}>
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 print:bg-slate-100">
                  <h3 className="font-semibold text-slate-800 flex items-center">
                      <TrendingUp className="w-5 h-5 mr-2 text-indigo-500" />
                      Detailed Comparison
                  </h3>
              </div>
              <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-sm text-left">
                      <thead className="bg-slate-50">
                          <tr>
                              <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Parameter</th>
                              <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Old Value</th>
                              <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">New Value</th>
                              <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Trend</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                          {result.comparisonTable.map((row, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/50">
                                  <td className="px-6 py-4 font-medium text-slate-900">{row.parameter}</td>
                                  <td className="px-6 py-4 text-slate-600">{row.oldValue}</td>
                                  <td className="px-6 py-4 text-slate-900 font-medium">{row.newValue}</td>
                                  <td className="px-6 py-4">
                                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                          row.trend === 'Increase' ? 'bg-blue-100 text-blue-700' :
                                          row.trend === 'Decrease' ? 'bg-purple-100 text-purple-700' :
                                          'bg-slate-100 text-slate-700'
                                      }`}>
                                          {row.trend === 'Increase' ? <ArrowUp className="w-3 h-3 mr-1"/> : 
                                           row.trend === 'Decrease' ? <ArrowDown className="w-3 h-3 mr-1"/> : 
                                           <Minus className="w-3 h-3 mr-1"/>}
                                          {row.trend}
                                      </span>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      )}
      
      {/* Medicine List (Prescriptions Only) */}
      {result.medicines && result.medicines.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden print:border print:shadow-none print:mb-6 animate-enter" style={{animationDelay: '400ms'}}>
              <div className="bg-slate-50 px-6 py-5 border-b border-slate-100 flex justify-between items-center print:bg-slate-100">
                  <h3 className="font-bold text-slate-800 flex items-center text-lg">
                      <ShoppingCart className="w-5 h-5 mr-3 text-indigo-600" />
                      Prescription Medicine List
                  </h3>
                  <span className="text-xs font-semibold bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg border border-indigo-100">
                      Checklist
                  </span>
              </div>
              <div className="p-6 bg-slate-50/30">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {result.medicines.map((med, idx) => {
                        const theme = CARD_THEMES[idx % CARD_THEMES.length];
                        return (
                            <div key={idx} className={`bg-white border rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200 ${theme.border} border-l-4`}>
                                {/* Card Header */}
                                <div className="flex justify-between items-start mb-5">
                                    <div className="flex gap-4">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${theme.iconBg} ${theme.iconColor}`}>
                                            {getMedicineIcon(med.type, "w-6 h-6")}
                                        </div>
                                        <div>
                                            <h4 className={`font-bold text-lg leading-tight ${theme.text}`}>{med.name}</h4>
                                            <span className={`inline-block mt-1.5 text-[10px] font-bold uppercase tracking-wider border px-1.5 py-0.5 rounded ${theme.badgeBg} ${theme.badgeBorder} ${theme.badgeText}`}>
                                                {med.type}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (!isChatOpen) setIsChatOpen(true);
                                            handleSendMessage(`What is ${med.name} used for generally? Keep it simple.`);
                                        }}
                                        disabled={isChatLoading}
                                        className={`flex items-center bg-white border px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm ${theme.btnClass}`}
                                    >
                                        <HelpCircle className="w-3.5 h-3.5 mr-1.5" />
                                        Explain
                                    </button>
                                </div>
                                
                                {/* Card Body */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                        <div className="flex items-center text-slate-400 mb-1.5">
                                            <LinkIcon className="w-3 h-3 mr-1.5" />
                                            <span className="text-[10px] font-bold uppercase tracking-wider">Dosage</span>
                                        </div>
                                        <p className="text-sm font-bold text-slate-700 leading-snug break-words">
                                            {med.dosage}
                                        </p>
                                    </div>
                                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                        <div className="flex items-center text-slate-400 mb-1.5">
                                            <Clock className="w-3 h-3 mr-1.5" />
                                            <span className="text-[10px] font-bold uppercase tracking-wider">Duration</span>
                                        </div>
                                        <p className="text-sm font-bold text-slate-700 leading-snug break-words">
                                            {med.duration}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
                <div className="mt-6 text-xs text-slate-400 italic text-center border-t border-slate-100 pt-4">
                    <span className="font-bold text-slate-500">Note:</span> Verify all medicines with your pharmacist before purchasing.
                </div>
              </div>
          </div>
      )}

      {/* Main Analysis Table (Only if NOT Radiology & NOT Prescription) */}
      {!isPrescription && !isRadiology && (result.extractedValues ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden print:border print:shadow-none print:mb-6 animate-enter" style={{animationDelay: '400ms'}}>
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center print:bg-slate-100">
                <h3 className="font-semibold text-slate-800 flex items-center">
                    <FileText className="w-5 h-5 mr-2 text-indigo-500" />
                    Extracted Values & Analysis
                </h3>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm text-left">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-1/3">Parameter</th>
                            <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Value</th>
                            <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {result.extractedValues.map((item, idx) => {
                            const indicator = result.indicators?.find(i => i.parameter === item.parameter);
                            const explanation = result.simpleExplanations?.find(e => e.parameter === item.parameter)?.text;
                            
                            return (
                                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4 relative group">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <span className="font-medium text-slate-900">{item.parameter}</span>
                                                <div className="text-xs text-slate-400 mt-0.5">Ref: {item.ref_range}</div>
                                            </div>
                                            
                                            {/* CSS-Only Tooltip (Group Hover) - Only if explanation exists */}
                                            {explanation && (
                                                <div className="cursor-help no-print p-1.5 rounded-full hover:bg-indigo-50 text-slate-300 hover:text-indigo-600 transition-colors ml-2 relative">
                                                    <Info className="w-4 h-4" />
                                                    
                                                    {/* Tooltip Content */}
                                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 w-64 p-3 bg-slate-800 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-300 z-[50] pointer-events-none">
                                                        <div className="font-bold mb-1 text-indigo-300 uppercase tracking-wide text-[10px] border-b border-white/10 pb-1">Use of Parameter</div>
                                                        <div className="leading-relaxed text-slate-300">{explanation}</div>
                                                        {/* Arrow */}
                                                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-px w-0 h-0 border-x-4 border-x-transparent border-t-[6px] border-t-slate-800"></div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        
                                        {/* Print-only Explanation */}
                                        {explanation && (
                                            <div className="hidden print:block text-xs text-slate-500 mt-1 italic">
                                                {explanation}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="font-semibold text-slate-700">{item.value}</span>
                                        <span className="text-xs text-slate-500 ml-1">{item.unit}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <StatusBadge status={indicator?.status || 'Unknown'} />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
      ) : <SkeletonCard />)}

      {/* Wellness & Questions */}
      {(result.wellnessSuggestions || result.doctorQuestions) ? (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2 print:gap-4 print:mb-6 animate-enter" style={{animationDelay: '500ms'}}>
          {result.wellnessSuggestions && (
          <div className="bg-emerald-50 rounded-xl p-6 border border-emerald-100 print:border print:bg-transparent">
              <h3 className="text-lg font-bold text-emerald-800 mb-4 flex items-center">
                  <CheckCircle className="w-6 h-6 mr-2 text-emerald-600" />
                  Wellness Suggestions
              </h3>
              <ul className="space-y-4">
                  {result.wellnessSuggestions.map((suggestion, idx) => (
                      <li key={idx} className="flex items-start text-sm text-emerald-900 leading-relaxed bg-white/50 p-3 rounded-lg border border-emerald-100/50">
                          <span className="mr-3 mt-1.5 w-1.5 h-1.5 bg-emerald-500 rounded-full flex-shrink-0"></span>
                          {suggestion}
                      </li>
                  ))}
              </ul>
          </div>
          )}

          {result.doctorQuestions && (
          <div className="bg-indigo-50 rounded-xl p-6 border border-indigo-100 print:border print:bg-transparent">
              <h3 className="text-lg font-bold text-indigo-800 mb-4 flex items-center">
                  <HelpCircle className="w-6 h-6 mr-2 text-indigo-600" />
                  Questions for Your Doctor
              </h3>
              <ul className="space-y-4">
                  {result.doctorQuestions.map((q, idx) => (
                      <li key={idx} className="flex items-start text-sm text-indigo-900 leading-relaxed bg-white/50 p-3 rounded-lg border border-indigo-100/50">
                          <span className="mr-3 mt-1.5 w-1.5 h-1.5 bg-indigo-500 rounded-full flex-shrink-0"></span>
                          {q}
                      </li>
                  ))}
              </ul>
          </div>
          )}
      </div>
      ) : <SkeletonList />}

      {/* FLOATING CHATBOT (Professional iMessage Style) */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end no-print font-sans animate-enter" style={{animationDelay: '600ms'}}>
        
        {/* Chat Window */}
        <div 
            className={`
                bg-white rounded-[24px] shadow-2xl border border-slate-200 overflow-hidden mb-4 transition-all duration-300 origin-bottom-right flex flex-col w-[360px] h-[550px]
                ${isChatOpen ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto' : 'opacity-0 translate-y-4 scale-95 pointer-events-none invisible'}
            `}
        >
            {/* Header */}
            <div className="bg-white/90 backdrop-blur-md px-5 py-3.5 flex items-center justify-between border-b border-slate-100 sticky top-0 z-10">
                <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white mr-3 shadow-md">
                        <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800 text-sm leading-tight">MediClarify AI</h3>
                        <p className="text-[10px] text-slate-400 font-medium flex items-center">
                            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full mr-1"></span>
                            Online
                        </p>
                    </div>
                </div>
                <button onClick={toggleChat} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-full transition-colors">
                    <Minimize2 className="w-4 h-4" />
                </button>
            </div>

            {/* Messages Area */}
            <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 scroll-smooth">
                {/* Intro Message */}
                <div className="flex justify-start animate-fade-in-up">
                   <div className="max-w-[85%] bg-white border border-slate-100 text-slate-800 p-3.5 rounded-2xl rounded-tl-none shadow-sm text-sm">
                        <p className="leading-relaxed">
                            Hello! I've analyzed your <strong>{docType}</strong>. 
                            I can explain specific values or suggest health tips. What would you like to know?
                        </p>
                   </div>
                </div>

                {/* History */}
                {chatHistory.map((msg, index) => (
                    <div key={index} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-up`}>
                        <div 
                            className={`max-w-[85%] p-3.5 text-sm shadow-sm relative leading-relaxed
                            ${msg.role === 'user' 
                                ? 'bg-indigo-600 text-white rounded-[20px] rounded-tr-none' 
                                : 'bg-white border border-slate-200 text-slate-800 rounded-[20px] rounded-tl-none'
                            }`}
                        >
                            {formatMessageText(msg.text)}
                        </div>
                    </div>
                ))}

                {isChatLoading && (
                    <div className="flex justify-start animate-fade-in-up">
                        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl rounded-tl-none p-4 shadow-sm flex items-center space-x-2 h-12">
                            <span className="text-xs font-semibold text-indigo-400 mr-1">Thinking</span>
                            <div className="flex space-x-1">
                                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            </div>
                        </div>
                    </div>
                )}
                
                {/* Suggestions Chips (Vertical Stack at bottom of chat flow) */}
                {!isChatLoading && currentSuggestions.length > 0 && (
                     <div className="flex flex-col items-end space-y-2 mt-2 pt-2 animate-fade-in">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mr-1">Suggested Questions</p>
                        {currentSuggestions.slice(0, 3).map((q, i) => (
                            <button 
                                key={i}
                                onClick={() => handleSendMessage(q)}
                                className="text-right bg-white border border-indigo-100 text-indigo-600 text-xs px-3 py-2 rounded-xl rounded-br-none shadow-sm hover:bg-indigo-50 hover:border-indigo-200 transition-all active:scale-95 max-w-[90%] break-words whitespace-normal leading-tight"
                            >
                                {q}
                            </button>
                        ))}
                    </div>
                )}
                
                <div ref={chatEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 bg-white border-t border-slate-100">
                <div className="flex items-center bg-slate-100 rounded-[20px] px-4 py-2 border border-transparent focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
                    <input
                        id="chat-input"
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(chatInput)}
                        placeholder="Type a message..."
                        className="flex-1 bg-transparent border-none focus:ring-0 text-slate-900 placeholder-slate-400 text-sm py-1"
                        autoComplete="off"
                    />
                    <button 
                        onClick={() => handleSendMessage(chatInput)}
                        disabled={!chatInput.trim() || isChatLoading}
                        className={`ml-2 p-1.5 rounded-full transition-all ${
                            chatInput.trim() && !isChatLoading 
                            ? 'bg-indigo-600 text-white shadow-md hover:scale-105' 
                            : 'bg-slate-300 text-white cursor-not-allowed'
                        }`}
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>

        {/* Toggle Button (FAB) */}
        <div className="relative flex items-center group">
            {/* Tooltip for FAB */}
            <div 
                className={`
                    absolute right-full mr-4 px-4 py-2 bg-slate-900 text-white text-xs font-medium rounded-xl whitespace-nowrap shadow-xl transition-all duration-200 pointer-events-none transform
                    ${isChatBtnHovered && !isChatOpen ? 'opacity-100 translate-x-0 scale-100' : 'opacity-0 translate-x-4 scale-95'}
                `}
            >
                Ask questions based on this report
                {/* Arrow */}
                <div className="absolute top-1/2 -right-1.5 w-3 h-3 bg-slate-900 transform rotate-45 -translate-y-1/2 rounded-sm"></div>
            </div>

            <button 
                onClick={toggleChat}
                onMouseEnter={() => setIsChatBtnHovered(true)}
                onMouseLeave={() => setIsChatBtnHovered(false)}
                className={`
                    flex items-center justify-center shadow-2xl transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]
                    ${isChatOpen 
                        ? 'w-14 h-14 rounded-2xl bg-indigo-600 text-white hover:bg-indigo-700 hover:rotate-90' 
                        : 'w-14 h-14 rounded-2xl bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-105'
                    }
                `}
            >
                {isChatOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-7 h-7" />}
            </button>
        </div>

      </div>
    </div>
  );
};

export default AnalysisDisplay;