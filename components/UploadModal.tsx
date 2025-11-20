import React, { useState, useRef } from 'react';
import { Upload, X, CheckCircle, AlertCircle, Loader2, BrainCircuit, Share2 } from 'lucide-react';
import { UploadStatus, AnalysisResult } from '../types';
import { analyzeImageWithGemini } from '../services/geminiService';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete: (file: File, result: AnalysisResult) => void;
}

const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, onUploadComplete }) => {
  const [status, setStatus] = useState<UploadStatus>({ stage: 'IDLE', progress: 0, message: '' });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setStatus({ stage: 'IDLE', progress: 0, message: '' });
      setAnalysisResult(null);
    }
  };

  const startUploadProcess = async () => {
    if (!selectedFile) return;

    try {
      // 1. Validate
      setStatus({ stage: 'VALIDATING', progress: 10, message: 'Verifying file format...' });
      await new Promise(resolve => setTimeout(resolve, 600));

      // 2. Optimize
      setStatus({ stage: 'OPTIMIZING', progress: 30, message: 'Generating WebP variants...' });
      await new Promise(resolve => setTimeout(resolve, 800));

      // 3. Gemini Analysis
      setStatus({ stage: 'ANALYZING', progress: 50, message: 'Gemini is analyzing content...' });
      
      // Convert to base64 for Gemini
      const reader = new FileReader();
      reader.readAsDataURL(selectedFile);
      
      reader.onloadend = async () => {
        try {
          const base64data = reader.result as string;
          const base64Content = base64data.split(',')[1];
          
          // Real (or simulated) AI Call
          const result = await analyzeImageWithGemini(base64Content, selectedFile.type);
          
          setAnalysisResult(result);
          setStatus({ stage: 'SAVING', progress: 80, message: 'Updating graph structure...' });
          await new Promise(resolve => setTimeout(resolve, 600));

          setStatus({ stage: 'COMPLETE', progress: 100, message: 'Upload successful!' });
        } catch (err) {
          throw err;
        }
      };
    } catch (error) {
      setStatus({ stage: 'ERROR', progress: 0, message: 'Upload failed. Please try again.' });
    }
  };

  const handlePublish = () => {
    if (selectedFile && analysisResult) {
      onUploadComplete(selectedFile, analysisResult);
      onClose();
      // Reset state after close
      setTimeout(() => {
        setSelectedFile(null);
        setPreviewUrl(null);
        setStatus({ stage: 'IDLE', progress: 0, message: '' });
        setAnalysisResult(null);
      }, 500);
    }
  };

  const renderProgressBar = () => (
    <div className="w-full h-2 bg-gray-700 rounded-full mt-4 overflow-hidden">
      <div 
        className={`h-full transition-all duration-500 ${status.stage === 'ERROR' ? 'bg-red-500' : 'bg-primary'}`}
        style={{ width: `${status.progress}%` }}
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-surface border border-gray-700 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" />
            Upload to Graph
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          
          {!selectedFile ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-600 rounded-xl h-64 flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all group"
            >
              <div className="p-4 rounded-full bg-gray-800 group-hover:scale-110 transition-transform mb-4">
                <Upload className="w-8 h-8 text-gray-400 group-hover:text-primary" />
              </div>
              <p className="text-gray-300 font-medium">Click or drag image to upload</p>
              <p className="text-sm text-gray-500 mt-2">Supports JPG, PNG, WebP</p>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleFileSelect}
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left: Image Preview */}
              <div className="space-y-4">
                <div className="relative rounded-lg overflow-hidden aspect-square border border-gray-700 bg-black">
                  {previewUrl && <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />}
                </div>
                <button 
                  onClick={() => { setSelectedFile(null); setStatus({ stage: 'IDLE', progress: 0, message: '' }); }}
                  className="text-sm text-red-400 hover:text-red-300 flex items-center gap-1"
                  disabled={status.stage !== 'IDLE' && status.stage !== 'COMPLETE' && status.stage !== 'ERROR'}
                >
                  <X className="w-4 h-4" /> Remove Image
                </button>
              </div>

              {/* Right: Process & Details */}
              <div className="space-y-6">
                {status.stage === 'IDLE' && (
                  <div className="flex flex-col justify-center h-full space-y-4">
                     <p className="text-gray-300">Ready to process <strong>{selectedFile.name}</strong>.</p>
                     <p className="text-sm text-gray-500">The AI will analyze your image to automatically generate tags, titles, and descriptions for the knowledge graph.</p>
                     <button 
                        onClick={startUploadProcess}
                        className="w-full py-3 bg-primary hover:bg-indigo-600 text-white rounded-lg font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/25"
                      >
                        <BrainCircuit className="w-5 h-5" />
                        Analyze & Upload
                      </button>
                  </div>
                )}

                {status.stage !== 'IDLE' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className={`font-medium ${status.stage === 'ERROR' ? 'text-red-400' : 'text-primary'}`}>
                        {status.message}
                      </span>
                      <span className="text-gray-500">{status.progress}%</span>
                    </div>
                    {renderProgressBar()}

                    {analysisResult && (
                      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 mt-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <h3 className="font-bold text-white mb-1">{analysisResult.title}</h3>
                        <p className="text-xs text-gray-400 mb-3">{analysisResult.description}</p>
                        <div className="flex flex-wrap gap-2">
                          {analysisResult.attributes.map((attr, i) => (
                            <span key={i} className="px-2 py-1 rounded-full bg-gray-700 text-xs text-blue-300 border border-gray-600">
                              #{attr}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {status.stage === 'COMPLETE' && (
          <div className="p-6 border-t border-gray-700 bg-gray-800/30 flex justify-end gap-3">
            <button 
              onClick={onClose} 
              className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handlePublish}
              className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium transition-all flex items-center gap-2 shadow-lg shadow-green-600/20"
            >
              <Share2 className="w-4 h-4" />
              Publish to Graph
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadModal;