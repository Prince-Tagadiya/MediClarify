import React, { useState, useRef } from 'react';
import { FileText, AlertCircle, Loader2, ChevronRight, Activity, Plus, X, Printer, ScanLine, Brain, ClipboardList, Pill } from 'lucide-react';
import { analyzeDocumentPhased, detectDocumentType } from './services/geminiService';
import { AppStatus, AnalysisResult } from './types';
import AnalysisDisplay from './components/AnalysisDisplay';

const App: React.FC = () => {
  const [file1, setFile1] = useState<File | null>(null);
  const [file1Preview, setFile1Preview] = useState<string | null>(null);
  
  const [file2, setFile2] = useState<File | null>(null);
  const [file2Preview, setFile2Preview] = useState<string | null>(null);

  const [docCategory, setDocCategory] = useState<'lab' | 'prescription' | 'radiology'>('lab');
  const [isDetectingType, setIsDetectingType] = useState(false);

  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showPrintConfirm, setShowPrintConfirm] = useState(false);
  
  const fileInputRef1 = useRef<HTMLInputElement>(null);
  const fileInputRef2 = useRef<HTMLInputElement>(null);

  // Helper to determine if comparison tab should be shown
  const showCompare = !!(file1 && docCategory === 'lab' && !isDetectingType);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, isSecondary: boolean) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const reader = new FileReader();
      
      reader.onloadend = () => {
        if (isSecondary) {
          setFile2(selectedFile);
          setFile2Preview(reader.result as string);
        } else {
          setFile1(selectedFile);
          setFile1Preview(reader.result as string);
          
          // Auto-detect Document Type
          setIsDetectingType(true);
          detectDocumentType(selectedFile)
            .then((detectedType) => {
              console.log("Detected document type:", detectedType);
              setDocCategory(detectedType);
            })
            .catch((err) => {
              console.error("Type detection failed:", err);
              setDocCategory('lab');
            })
            .finally(() => {
              setIsDetectingType(false);
            });
        }
      };
      reader.readAsDataURL(selectedFile);
      
      if (!isSecondary) {
          // Reset when main file changes
          setStatus(AppStatus.IDLE);
          setResult(null);
          setErrorMsg(null);
          setFile2(null);
          setFile2Preview(null);
          if (fileInputRef2.current) fileInputRef2.current.value = '';
      }
    }
  };

  const removeFile = (isSecondary: boolean) => {
    if (isSecondary) {
      setFile2(null);
      setFile2Preview(null);
      if (fileInputRef2.current) fileInputRef2.current.value = '';
    } else {
      setFile1(null);
      setFile1Preview(null);
      if (fileInputRef1.current) fileInputRef1.current.value = '';
      setFile2(null); // Also clear second file if main is removed
      setFile2Preview(null);
      setDocCategory('lab');
    }
  };

  const handleSubmit = async () => {
    if (!file1) return;

    setStatus(AppStatus.ANALYZING);
    setErrorMsg(null);
    setResult(null); // Clear previous result to show skeleton

    const filesToUpload = [file1];
    // Only upload file2 if we are in 'lab' mode and file2 exists
    if (docCategory === 'lab' && file2) {
        filesToUpload.push(file2);
    }

    try {
      const generator = analyzeDocumentPhased(filesToUpload, notes, docCategory);
      
      for await (const partialResult of generator) {
        setResult(partialResult);
      }
      
      setStatus(AppStatus.SUCCESS);
    } catch (err: any) {
      console.error(err);
      setStatus(AppStatus.ERROR);
      setErrorMsg(err.message || "An unexpected error occurred while analyzing the document.");
    }
  };

  const resetApp = () => {
    setFile1(null);
    setFile1Preview(null);
    setFile2(null);
    setFile2Preview(null);
    setDocCategory('lab');
    setNotes('');
    setResult(null);
    setStatus(AppStatus.IDLE);
    if (fileInputRef1.current) fileInputRef1.current.value = '';
    if (fileInputRef2.current) fileInputRef2.current.value = '';
  };

  const handlePrint = () => {
    setShowPrintConfirm(true);
  };

  const confirmPrint = () => {
    setShowPrintConfirm(false);
    setTimeout(() => {
        window.print();
    }, 100);
  };

  const renderFilePreview = (file: File, preview: string, isSecondary: boolean) => (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-white rounded-lg p-2 animate-fade-in">
      <button 
        onClick={(e) => { e.stopPropagation(); removeFile(isSecondary); }}
        className="absolute top-2 right-2 bg-slate-100 hover:bg-slate-200 rounded-full p-1 transition-colors z-10"
      >
        <X className="w-4 h-4 text-slate-600" />
      </button>
      
      <div className="relative w-24 h-24 mb-2 flex items-center justify-center overflow-hidden rounded-md border border-slate-100">
        {file.type === 'application/pdf' ? (
          <div className="flex flex-col items-center justify-center text-slate-500">
            <FileText className="w-10 h-10 text-red-500 mb-1" />
            <span className="text-[10px] font-bold uppercase tracking-wider">PDF</span>
          </div>
        ) : (
          <img src={preview} alt="Preview" className="w-full h-full object-cover" />
        )}
      </div>
      <p className="text-xs font-medium text-slate-700 truncate w-full text-center px-2">{file.name}</p>
    </div>
  );

  // --- Skeleton Loader Component (Full Page Wireframe) ---
  const SkeletonAnalysis = () => (
      <div className="w-full animate-pulse space-y-6 max-w-4xl mx-auto py-8">
          {/* Header Skeleton */}
          <div className="flex items-center space-x-4 mb-8">
              <div className="h-8 bg-slate-200 rounded-lg w-1/3"></div>
              <div className="h-6 bg-slate-100 rounded-full w-24"></div>
          </div>
          
          {/* Patient Info Card Skeleton */}
          <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
             <div className="h-6 bg-slate-200 rounded w-1/4 mb-4"></div>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                 {[1,2,3,4].map(i => (
                     <div key={i}>
                         <div className="h-3 bg-slate-100 rounded w-1/2 mb-2"></div>
                         <div className="h-5 bg-slate-200 rounded w-3/4"></div>
                     </div>
                 ))}
             </div>
          </div>

          {/* Main Content Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1 bg-white p-6 rounded-xl border border-slate-100 h-64">
                   <div className="h-full w-full bg-slate-100 rounded-full opacity-50 flex items-center justify-center">
                        <div className="h-32 w-32 bg-slate-200 rounded-full"></div>
                   </div>
              </div>
              <div className="md:col-span-2 bg-white p-6 rounded-xl border border-slate-100 h-64 space-y-4">
                   <div className="h-6 bg-slate-200 rounded w-1/3"></div>
                   <div className="space-y-2">
                       <div className="h-4 bg-slate-100 rounded w-full"></div>
                       <div className="h-4 bg-slate-100 rounded w-5/6"></div>
                       <div className="h-4 bg-slate-100 rounded w-4/6"></div>
                   </div>
              </div>
          </div>

          {/* List Skeleton */}
          <div className="bg-white p-6 rounded-xl border border-slate-100">
             <div className="h-6 bg-slate-200 rounded w-1/4 mb-6"></div>
             {[1,2,3].map(i => (
                 <div key={i} className="flex justify-between items-center mb-4 pb-4 border-b border-slate-50">
                     <div className="w-1/3 h-5 bg-slate-200 rounded"></div>
                     <div className="w-1/4 h-5 bg-slate-100 rounded"></div>
                     <div className="w-20 h-6 bg-slate-200 rounded-full"></div>
                 </div>
             ))}
          </div>
      </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-12">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 no-print">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <Activity className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-blue-600">
              MediClarify
            </h1>
          </div>
          
          <div className="flex items-center space-x-4">
            {status === AppStatus.SUCCESS && (
              <button 
                onClick={handlePrint}
                className="hidden sm:flex items-center text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors"
              >
                <Printer className="w-4 h-4 mr-2" />
                Print Report
              </button>
            )}
            
            {(status !== AppStatus.IDLE || result) && (
              <button 
                onClick={resetApp}
                className="text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors"
              >
                Start New Analysis
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 print:p-0 print:max-w-none">
        
        {/* Intro / Hero */}
        {!result && status !== AppStatus.ANALYZING && (
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl mb-4">
              Understand Your Medical Reports
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Upload blood tests, X-rays, or prescriptions. We translate medical jargon into simple, educational language using advanced AI.
            </p>
          </div>
        )}

        {/* Input Section */}
        {status === AppStatus.IDLE && (
          <div className="space-y-6">
            
            {/* Flex Container controlling the animation and layout */}
            <div className={`flex flex-col md:flex-row transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${showCompare ? 'gap-6' : 'gap-0'}`}>
              
              {/* Primary File Input */}
              <div 
                className={`
                  relative border-2 border-dashed rounded-xl p-6 transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] text-center h-64 flex flex-col items-center justify-center overflow-hidden
                  ${file1 ? 'border-indigo-300 bg-indigo-50/50' : 'border-slate-300 hover:border-indigo-400 hover:bg-white'}
                  ${showCompare ? 'w-full md:w-1/2' : 'w-full'}
                `}
              >
                {!file1 && (
                  <input
                    type="file"
                    ref={fileInputRef1}
                    onChange={(e) => handleFileChange(e, false)}
                    accept="image/*,application/pdf"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                )}
                
                {file1 && file1Preview ? (
                  renderFilePreview(file1, file1Preview, false)
                ) : (
                  <div className="min-w-[200px] flex flex-col items-center">
                    <div className="bg-indigo-100 p-3 rounded-full mb-3">
                      <FileText className="h-6 w-6 text-indigo-600" />
                    </div>
                    <h3 className="text-base font-semibold text-slate-900">Main Report</h3>
                    <p className="text-xs text-slate-500 mt-1">Upload recent report (PDF/Image)</p>
                  </div>
                )}
              </div>

              {/* Secondary File Input - Animated Pop Out (Left to Right) */}
              <div 
                className={`
                    relative border-dashed rounded-xl transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] origin-left
                    flex flex-col items-center justify-center overflow-hidden
                    ${showCompare 
                        ? 'w-full md:w-1/2 opacity-100 translate-x-0 p-6 border-2 h-64 scale-100' 
                        : 'w-0 h-0 md:h-64 opacity-0 -translate-x-12 p-0 border-0 scale-95 pointer-events-none'
                    }
                    ${file2 ? 'border-indigo-300 bg-indigo-50/50' : 'border-slate-300 hover:border-indigo-400 hover:bg-white'}
                `}
              >
                 <div className={`w-full h-full flex flex-col items-center justify-center transition-all duration-500 min-w-[250px] ${showCompare ? 'opacity-100 delay-200' : 'opacity-0'}`}>
                    {!file2 && (
                        <input
                        type="file"
                        ref={fileInputRef2}
                        onChange={(e) => handleFileChange(e, true)}
                        accept="image/*,application/pdf"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                    )}
                    
                    {file2 && file2Preview ? (
                        renderFilePreview(file2, file2Preview, true)
                    ) : (
                        <>
                        <div className="bg-slate-100 p-3 rounded-full mb-3">
                            <Plus className="h-6 w-6 text-slate-500" />
                        </div>
                        <h3 className="text-base font-semibold text-slate-900">Compare</h3>
                        <p className="text-xs text-slate-500 mt-1">Upload previous lab report</p>
                        </>
                    )}
                 </div>
              </div>
            </div>
            
            {/* Auto-Detection Status Indicator */}
            {file1 && isDetectingType && (
                <div className="flex items-center justify-center space-x-2 text-indigo-600 animate-fade-in py-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm font-medium">Identifying document type...</span>
                </div>
            )}
            
            {/* Detected Category Badge */}
            {file1 && !isDetectingType && (
                <div className="flex justify-center animate-fade-in">
                    <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-xs font-bold border shadow-sm transition-colors duration-500 ${
                        docCategory === 'lab' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                        docCategory === 'prescription' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        'bg-blue-50 text-blue-700 border-blue-200'
                    }`}>
                         {docCategory === 'lab' && <ClipboardList className="w-3.5 h-3.5 mr-2" />}
                         {docCategory === 'prescription' && <Pill className="w-3.5 h-3.5 mr-2" />}
                         {docCategory === 'radiology' && <ScanLine className="w-3.5 h-3.5 mr-2" />}
                         Detected: {docCategory === 'lab' ? 'Lab Report' : docCategory === 'prescription' ? 'Prescription' : 'Scan / Radiology'}
                    </span>
                </div>
            )}

            {/* Additional Notes */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <label htmlFor="notes" className="block text-sm font-medium text-slate-800 mb-2">
                Additional Notes / Symptoms (Optional)
              </label>
              <textarea
                id="notes"
                rows={3}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl bg-white text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all resize-none text-base"
                placeholder="E.g., I've been feeling tired lately, or I had a fever yesterday..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {/* Action Button */}
            <button
              onClick={handleSubmit}
              disabled={!file1 || isDetectingType}
              className={`w-full py-4 px-6 rounded-xl flex items-center justify-center space-x-2 font-semibold text-lg transition-all transform ${
                file1 && !isDetectingType
                  ? 'bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 hover:scale-[1.01]' 
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {isDetectingType ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Analyzing Document...</span>
                  </>
              ) : (
                  <>
                    <span>
                        {docCategory === 'lab' && file2 ? 'Analyze & Compare Reports' : 
                         docCategory === 'radiology' ? 'Analyze Scan' :
                         docCategory === 'prescription' ? 'Decode Prescription' :
                         'Analyze Report'}
                    </span>
                    <ChevronRight className="w-5 h-5" />
                  </>
              )}
            </button>
          </div>
        )}

        {/* Loading / Result View */}
        {(status === AppStatus.ANALYZING || status === AppStatus.SUCCESS) && (
           <>
              {!result ? (
                 <SkeletonAnalysis />
              ) : (
                 <AnalysisDisplay result={result} filePreview={file1Preview} fileType={file1?.type} />
              )}
           </>
        )}

        {/* Error State */}
        {status === AppStatus.ERROR && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <div className="flex justify-center mb-4">
              <AlertCircle className="w-12 h-12 text-red-500" />
            </div>
            <h3 className="text-xl font-semibold text-red-800 mb-2">Analysis Failed</h3>
            <p className="text-red-600 mb-6">{errorMsg}</p>
            <button
              onClick={() => setStatus(AppStatus.IDLE)}
              className="px-6 py-2 bg-white border border-red-300 text-red-700 font-medium rounded-lg hover:bg-red-50 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

      </main>
      
      {/* Web Footer (Only visible when not printing) */}
      <footer className="text-center text-slate-400 text-sm py-8 no-print">
        <p className="font-semibold">© 2025 MediClarify — Built by Prince Tagadiya</p>
        <p>For educational and informational purposes only.</p>
      </footer>

      {/* Print Confirmation Modal */}
      {showPrintConfirm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 no-print animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 transform transition-all scale-100">
            <div className="flex items-center space-x-3 mb-4">
                <div className="bg-indigo-100 p-2 rounded-full">
                  <Printer className="w-6 h-6 text-indigo-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Print Report</h3>
            </div>
            <p className="text-slate-600 mb-6 text-sm leading-relaxed">
              This will open your browser's print dialog. You can print to a connected printer or <b>Save as PDF</b>.
              <br/><span className="text-xs text-slate-400 mt-2 block">Tip: Enable "Background Graphics" in print settings for best results.</span>
            </p>
            <div className="flex justify-end space-x-3">
              <button 
                onClick={() => setShowPrintConfirm(false)}
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-50 rounded-lg transition-colors border border-slate-200"
              >
                Cancel
              </button>
              <button 
                onClick={confirmPrint}
                className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors flex items-center shadow-sm"
              >
                Proceed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;