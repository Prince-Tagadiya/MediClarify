
import React, { useState, useRef, useEffect } from 'react';
import { AnalysisResult, ChatMessage } from '../types';
import { CheckCircle, AlertTriangle, ArrowDown, ArrowUp, HelpCircle, Activity, FileText, User, Calendar, TrendingUp, Minus, Info, Share2, Send, MessageSquare, Sparkles } from 'lucide-react';
import { chatWithAI } from '../services/geminiService';

interface AnalysisDisplayProps {
  result: AnalysisResult;
}

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

  // Dash Arrays for segments
  const normalDashArray = `${normalArcLength} ${circumference}`;
  const normalDashOffset = 0;

  const abnormalDashArray = `${abnormalArcLength} ${circumference}`;
  const abnormalDashOffset = -normalArcLength;

  return (
    <div className="flex flex-col items-center w-full">
        {/* Interactive Gauge for Screen */}
        <div 
            className="flex flex-col items-center relative group cursor-pointer"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={() => setIsHovered(!isHovered)} 
        >
            <div className="relative w-48 h-48">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                    {/* Background Track (Visible in Score Mode) */}
                    <circle 
                        cx={center} cy={center} r={radius} 
                        stroke="currentColor" strokeWidth={strokeWidth} fill="transparent" 
                        className={`${trackColor} transition-all duration-300 ${isHovered ? 'opacity-30' : 'opacity-100'}`}
                    />
                    
                    {/* MODE 1: Score Arc */}
                    <circle
                        cx={center} cy={center} r={radius}
                        stroke="currentColor" strokeWidth={strokeWidth} fill="transparent"
                        strokeDasharray={circumference}
                        strokeDashoffset={scoreDashOffset}
                        strokeLinecap="round"
                        className={`${scoreColor} transition-all duration-500 ease-out ${isHovered ? 'opacity-0' : 'opacity-100'}`}
                    />

                    {/* MODE 2: Segmented Breakdown (Visible on Hover) */}
                    {/* Normal Segment (Green) */}
                    <circle
                        cx={center} cy={center} r={radius}
                        stroke="#10b981" strokeWidth={strokeWidth} fill="transparent"
                        strokeDasharray={normalDashArray}
                        strokeDashoffset={normalDashOffset}
                        className={`transition-all duration-500 ease-out ${isHovered ? 'opacity-100' : 'opacity-0'}`}
                    />
                    {/* Abnormal Segment (Red) */}
                    <circle
                        cx={center} cy={center} r={radius}
                        stroke="#ef4444" strokeWidth={strokeWidth} fill="transparent"
                        strokeDasharray={abnormalDashArray}
                        strokeDashoffset={abnormalDashOffset}
                        className={`transition-all duration-500 ease-out ${isHovered ? 'opacity-100' : 'opacity-0'}`}
                    />
                </svg>
                
                {/* Center Text Overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center transform transition-all">
                    {/* Default Score Text */}
                    <div className={`flex flex-col items-center transition-all duration-300 absolute ${isHovered ? 'opacity-0 scale-90' : 'opacity-100 scale-100'}`}>
                        <span className={`text-4xl font-bold ${scoreColor}`}>{score}</span>
                        <span className="text-xs text-slate-400 font-medium">/ 100</span>
                    </div>
                    
                    {/* Breakdown Text */}
                    <div className={`flex flex-col items-center transition-all duration-300 absolute ${isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-110'}`}>
                        <span className="text-2xl font-bold text-slate-700">{abnormalCount}</span>
                        <span className="text-xs text-red-500 font-bold uppercase tracking-wide">Issues</span>
                        <div className="w-8 h-px bg-slate-200 my-1"></div>
                        <span className="text-xl font-bold text-emerald-600">{normalCount}</span>
                        <span className="text-xs text-emerald-600 font-bold uppercase tracking-wide">Normal</span>
                    </div>
                </div>

                {/* Hover Tooltip (Legend) - HIDDEN IN PRINT */}
                <div className={`absolute top-full left-1/2 transform -translate-x-1/2 mt-4 w-72 bg-white p-5 rounded-xl shadow-2xl border border-slate-100 z-50 transition-all duration-300 pointer-events-none no-print ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
                    {/* Header */}
                    <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-100">
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Score Details</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${score >= 80 ? 'bg-emerald-100 text-emerald-700' : score >= 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                            {score}/100
                        </span>
                    </div>

                    {/* Abnormal List */}
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
            <span className="text-[10px] text-slate-400 bg-slate-100 px-3 py-1 rounded-full mt-1 no-print">Hover/Click for details</span>
        </div>

        {/* PRINT ONLY: Static Breakdown */}
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

const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({ result }) => {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const abnormalItems = result.indicators
    .filter(i => i.status !== 'Normal' && i.status !== 'Unknown')
    .map(i => ({ parameter: i.parameter, status: i.status }));

  const normalItems = result.indicators
    .filter(i => i.status === 'Normal')
    .map(i => i.parameter);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-600 bg-emerald-50 border-emerald-100";
    if (score >= 60) return "text-yellow-600 bg-yellow-50 border-yellow-100";
    return "text-red-600 bg-red-50 border-red-100";
  };

  const handleShare = async () => {
    const text = `MediClarify Analysis for ${result.patientInfo.name || 'Patient'}\n` +
                 `Type: ${result.documentType}\n` +
                 `Health Score: ${result.healthScore.currentScore}/100\n\n` +
                 `Summary: ${result.conclusion || 'No conclusion available.'}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'MediClarify Report',
          text: text,
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      window.location.href = `mailto:?subject=MediClarify Report Analysis&body=${encodeURIComponent(text)}`;
    }
  };

  // Chat Functions
  const handleSendMessage = async (messageText: string) => {
    if (!messageText.trim() || isChatLoading) return;

    const userMsg: ChatMessage = { role: 'user', text: messageText };
    setChatHistory(prev => [...prev, userMsg]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const response = await chatWithAI(chatHistory.concat(userMsg), messageText, result);
      const aiMsg: ChatMessage = { role: 'model', text: response };
      setChatHistory(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error("Chat error:", error);
      const errorMsg: ChatMessage = { role: 'model', text: "I'm sorry, I encountered an error while trying to answer. Please try again." };
      setChatHistory(prev => [...prev, errorMsg]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleSuggestionClick = (question: string) => {
    handleSendMessage(question);
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isChatLoading]);


  return (
    <div className="space-y-8 animate-fade-in pb-12 report-container">
      
      {/* Disclaimer / Action Bar */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-md no-print">
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
                    {result.documentType}
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

      {/* Screen Title & Document Type Badge & Share */}
      <div className="flex items-center justify-between mb-2 no-print">
          <div>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-indigo-100 text-indigo-800 shadow-sm">
                <FileText className="w-4 h-4 mr-1.5"/>
                {result.documentType}
            </span>
          </div>
          <button 
            onClick={handleShare}
            className="flex items-center text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </button>
      </div>

      {/* Patient Info Card */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 print:shadow-none print:border print:p-4 print:mb-4">
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

      {/* Health Score & Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:grid-cols-3 print:gap-4 print:mb-6">
          {/* Gauge */}
          <div className="md:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col items-center justify-center print:border print:shadow-none print:p-2">
              <HealthScoreGauge 
                score={result.healthScore.currentScore} 
                label="Current Health Score"
                abnormalItems={abnormalItems} 
                normalItems={normalItems}
              />
          </div>

          {/* Quick Stats / Comparison */}
          <div className="md:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-100 print:border print:shadow-none print:p-4">
              <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
                  <Activity className="w-5 h-5 mr-2 text-indigo-500" />
                  Analysis Summary
              </h2>
              
              <div className="space-y-4">
                  <p className="text-slate-600 text-sm leading-relaxed">{result.conclusion}</p>

                  {/* Comparison Summary Logic */}
                  {result.comparisonTable && result.comparisonTable.length > 0 ? (
                      <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
                          <h3 className="text-sm font-bold text-slate-800 mb-2 flex items-center">
                             <TrendingUp className="w-4 h-4 mr-2 text-indigo-600"/>
                             Report Comparison
                          </h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

      {/* Comparison Table (Conditional) */}
      {result.comparisonTable && result.comparisonTable.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden print:border print:shadow-none print:mb-6">
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

      {/* Main Analysis Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden print:border print:shadow-none print:mb-6">
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
                        const indicator = result.indicators.find(i => i.parameter === item.parameter);
                        const explanation = result.simpleExplanations.find(e => e.parameter === item.parameter)?.text;
                        
                        return (
                            <tr key={idx} className="hover:bg-slate-50/50 group">
                                <td className="px-6 py-4">
                                    <div className="flex items-center">
                                        <span className="font-medium text-slate-900">{item.parameter}</span>
                                        
                                        {/* Tooltip for Explanation */}
                                        {explanation && (
                                            <div className="relative ml-2 group-hover:opacity-100 opacity-0 transition-opacity no-print">
                                                <Info className="w-4 h-4 text-slate-400 cursor-help" />
                                                <div className="absolute left-1/2 transform -translate-x-1/2 bottom-full mb-2 w-64 p-3 bg-slate-800 text-white text-xs rounded-lg shadow-lg z-20 pointer-events-none hidden group-hover:block">
                                                    {explanation}
                                                    <div className="absolute left-1/2 transform -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-slate-800"></div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-xs text-slate-400 mt-1">Ref: {item.ref_range}</div>
                                    
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

      {/* Wellness & Questions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2 print:gap-4 print:mb-6">
          {/* Wellness Suggestions */}
          <div className="bg-emerald-50 rounded-xl p-6 border border-emerald-100 print:border print:bg-transparent">
              <h3 className="text-lg font-semibold text-emerald-800 mb-4 flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Wellness Suggestions
              </h3>
              <ul className="space-y-3">
                  {result.wellnessSuggestions.map((suggestion, idx) => (
                      <li key={idx} className="flex items-start text-sm text-emerald-900">
                          <span className="mr-2 mt-1.5 w-1.5 h-1.5 bg-emerald-400 rounded-full flex-shrink-0"></span>
                          {suggestion}
                      </li>
                  ))}
              </ul>
          </div>

          {/* Doctor Questions */}
          <div className="bg-indigo-50 rounded-xl p-6 border border-indigo-100 print:border print:bg-transparent">
              <h3 className="text-lg font-semibold text-indigo-800 mb-4 flex items-center">
                  <HelpCircle className="w-5 h-5 mr-2" />
                  Questions for Your Doctor
              </h3>
              <ul className="space-y-3">
                  {result.doctorQuestions.map((q, idx) => (
                      <li key={idx} className="flex items-start text-sm text-indigo-900">
                          <span className="mr-2 mt-1.5 w-1.5 h-1.5 bg-indigo-400 rounded-full flex-shrink-0"></span>
                          {q}
                      </li>
                  ))}
              </ul>
          </div>
      </div>

      {/* Chatbot Interface (NO PRINT) */}
      <div className="bg-white rounded-xl shadow-lg border border-indigo-100 overflow-hidden mt-8 no-print">
        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center text-white">
            <MessageSquare className="w-5 h-5 mr-2" />
            <h3 className="font-bold text-lg">Ask MediClarify AI</h3>
          </div>
          <span className="text-xs bg-white/20 text-white px-2 py-1 rounded backdrop-blur-sm">
            Based on this report
          </span>
        </div>

        {/* Chat History */}
        <div className="h-96 overflow-y-auto p-6 bg-slate-50 space-y-4">
           {/* Intro Message */}
           <div className="flex justify-start">
             <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none p-4 max-w-[85%] shadow-sm">
               <p className="text-sm text-slate-700">
                 Hi! I've analyzed your <strong>{result.documentType}</strong>. 
                 Feel free to ask me follow-up questions about the values, trends, or definitions. 
                 <br/><br/>
                 <span className="text-xs text-slate-500 italic">Remember, I cannot provide medical diagnosis or treatment advice.</span>
               </p>
             </div>
           </div>

           {/* Conversation */}
           {chatHistory.map((msg, index) => (
             <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
               <div className={`p-4 rounded-2xl max-w-[85%] shadow-sm text-sm ${
                 msg.role === 'user' 
                   ? 'bg-indigo-600 text-white rounded-tr-none' 
                   : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none'
               }`}>
                 {msg.text}
               </div>
             </div>
           ))}

           {isChatLoading && (
             <div className="flex justify-start">
               <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none p-4 shadow-sm flex items-center space-x-2">
                 <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                 <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                 <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
               </div>
             </div>
           )}
           <div ref={chatEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-slate-100">
           {/* Suggested Questions Chips */}
           {chatHistory.length === 0 && (
             <div className="mb-4 overflow-x-auto whitespace-nowrap pb-2 scrollbar-hide">
               <div className="flex space-x-2">
                  <span className="flex items-center text-xs font-semibold text-indigo-500 mr-1">
                    <Sparkles className="w-3 h-3 mr-1" /> Try asking:
                  </span>
                  {result.doctorQuestions.slice(0, 3).map((q, idx) => (
                    <button 
                      key={idx}
                      onClick={() => handleSuggestionClick(q)}
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs rounded-full border border-indigo-100 transition-colors"
                    >
                      {q.length > 50 ? q.substring(0, 50) + '...' : q}
                    </button>
                  ))}
               </div>
             </div>
           )}

           <div className="flex space-x-2">
             <input
               type="text"
               value={chatInput}
               onChange={(e) => setChatInput(e.target.value)}
               onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(chatInput)}
               placeholder="Ask a question about your report..."
               className="flex-1 px-5 py-3 border border-slate-300 rounded-full bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm shadow-sm"
             />
             <button 
               onClick={() => handleSendMessage(chatInput)}
               disabled={!chatInput.trim() || isChatLoading}
               className="p-3 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
             >
               <Send className="w-5 h-5" />
             </button>
           </div>
           <p className="text-[10px] text-center text-slate-400 mt-2">
             AI responses can be inaccurate. Always consult a doctor for medical decisions.
           </p>
        </div>
      </div>
    </div>
  );
};

export default AnalysisDisplay;
