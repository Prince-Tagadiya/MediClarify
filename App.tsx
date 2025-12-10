
import React, { useState, useRef } from 'react';
import { Upload, FileText, AlertCircle, Loader2, Camera, ChevronRight, Activity, Plus, X, Printer } from 'lucide-react';
import { analyzeDocument } from './services/geminiService';
import { AppStatus, AnalysisResult } from './types';
import AnalysisDisplay from './components/AnalysisDisplay';

const App: React.FC = () => {
  const [file1, setFile1] = useState<File | null>(null);
  const [file1Preview, setFile1Preview] = useState<string | null>(null);
  
  const [file2, setFile2] = useState<File | null>(null);
  const [file2Preview, setFile2Preview] = useState<string | null>(null);

  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const fileInputRef1 = useRef<HTMLInputElement>(null);
  const fileInputRef2 = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, isSecondary: boolean) => {
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
        }
      };
      reader.readAsDataURL(selectedFile);
      
      setStatus(AppStatus.IDLE);
      setResult(null);
      setErrorMsg(null);
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
    }
  };

  const handleSubmit = async () => {
    if (!file1) return;

    setStatus(AppStatus.ANALYZING);
    setErrorMsg(null);

    const filesToUpload = [file1];
    if (file2) filesToUpload.push(file2);

    try {
      const analysis = await analyzeDocument(filesToUpload, notes);
      setResult(analysis);
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
    setNotes('');
    setResult(null);
    setStatus(AppStatus.IDLE);
    if (fileInputRef1.current) fileInputRef1.current.value = '';
    if (fileInputRef2.current) fileInputRef2.current.value = '';
  };

  const handlePrint = () => {
    window.print();
  };

  const renderFilePreview = (file: File, preview: string, isSecondary: boolean) => (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-white rounded-lg p-2">
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
            
            {status !== AppStatus.IDLE && (
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
        {!result && (
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Primary File Input */}
              <div 
                className={`relative border-2 border-dashed rounded-xl p-6 transition-all duration-200 text-center h-64 flex flex-col items-center justify-center ${
                  file1 ? 'border-indigo-300 bg-indigo-50/50' : 'border-slate-300 hover:border-indigo-400 hover:bg-white'
                }`}
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
                  <>
                    <div className="bg-indigo-100 p-3 rounded-full mb-3">
                      <FileText className="h-6 w-6 text-indigo-600" />
                    </div>
                    <h3 className="text-base font-semibold text-slate-900">Main Report</h3>
                    <p className="text-xs text-slate-500 mt-1">Upload recent report (PDF/Image)</p>
                  </>
                )}
              </div>

              {/* Secondary File Input */}
              <div 
                className={`relative border-2 border-dashed rounded-xl p-6 transition-all duration-200 text-center h-64 flex flex-col items-center justify-center ${
                  file2 ? 'border-indigo-300 bg-indigo-50/50' : 'border-slate-300 hover:border-indigo-400 hover:bg-white'
                }`}
              >
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
                    <h3 className="text-base font-semibold text-slate-900">Compare (Optional)</h3>
                    <p className="text-xs text-slate-500 mt-1">Upload older report to compare</p>
                  </>
                )}
              </div>
            </div>

            {/* Additional Notes */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <label htmlFor="notes" className="block text-sm font-medium text-slate-700 mb-2">
                Additional Notes / Symptoms (Optional)
              </label>
              <textarea
                id="notes"
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all resize-none"
                placeholder="E.g., I've been feeling tired lately, or I had a fever yesterday..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {/* Action Button */}
            <button
              onClick={handleSubmit}
              disabled={!file1}
              className={`w-full py-4 px-6 rounded-xl flex items-center justify-center space-x-2 font-semibold text-lg transition-all transform ${
                file1 
                  ? 'bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 hover:scale-[1.01]' 
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <span>{file2 ? 'Analyze & Compare Reports' : 'Analyze Report'}</span>
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Loading State */}
        {status === AppStatus.ANALYZING && (
          <div className="flex flex-col items-center justify-center py-20 text-center animate-pulse">
            <Loader2 className="w-16 h-16 text-indigo-600 animate-spin mb-6" />
            <h3 className="text-2xl font-semibold text-slate-800 mb-2">Analyzing Document...</h3>
            <p className="text-slate-500 max-w-md">
              Extracting values, identifying patterns, and generating simple explanations. This may take a moment.
            </p>
          </div>
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

        {/* Success / Result View */}
        {status === AppStatus.SUCCESS && result && (
           <AnalysisDisplay result={result} />
        )}

      </main>
      
      {/* Web Footer (Only visible when not printing) */}
      <footer className="text-center text-slate-400 text-sm py-8 no-print">
        <p className="font-semibold">© 2025 MediClarify — Built by Prince Tagadiya</p>
        <p>For educational and informational purposes only.</p>
      </footer>
    </div>
  );
};

export default App;
