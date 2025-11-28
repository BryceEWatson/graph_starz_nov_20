import React, { useState, useRef } from 'react';
import { Upload, X, CheckCircle, AlertCircle, Loader2, BrainCircuit, Share2 } from 'lucide-react';
import { UploadStatus } from '../types';
import { initUpload, uploadToGCS, completeUpload } from '../services/uploadService';
import { useGraph } from '../contexts/GraphContext';

const TOKEN_KEY = 'graph_starz_jwt_token';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { refreshGraph } = useGraph();
  const [status, setStatus] = useState<UploadStatus>({ stage: 'IDLE', progress: 0, message: '' });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadedImageData, setUploadedImageData] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setStatus({ stage: 'IDLE', progress: 0, message: '' });
      setUploadedImageData(null);
    }
  };

  const startUploadProcess = async () => {
    if (!selectedFile) return;

    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setStatus({ stage: 'ERROR', progress: 0, message: 'Authentication required' });
      return;
    }

    try {
      // 1. Initialize upload
      setStatus({ stage: 'VALIDATING', progress: 10, message: 'Initializing upload...' });
      const initResponse = await initUpload(selectedFile, token);

      // 2. Upload to GCS
      setStatus({ stage: 'OPTIMIZING', progress: 30, message: 'Uploading to cloud storage...' });
      await uploadToGCS(selectedFile, initResponse.uploadUrl, initResponse.contentType);

      // 3. Complete upload (triggers AI analysis)
      setStatus({ stage: 'ANALYZING', progress: 50, message: 'AI Muse is analyzing your image...' });
      const completeResponse = await completeUpload(
        initResponse.imageId,
        initResponse.gcsPath,
        token
      );

      setUploadedImageData(completeResponse);
      setStatus({ stage: 'SAVING', progress: 80, message: 'Adding to your map...' });
      await new Promise((resolve) => setTimeout(resolve, 600));

      setStatus({ stage: 'COMPLETE', progress: 100, message: 'Upload successful!' });
    } catch (error: any) {
      setStatus({
        stage: 'ERROR',
        progress: 0,
        message: error.message || 'Upload failed. Please try again.',
      });
    }
  };

  const handlePublish = async () => {
    if (uploadedImageData) {
      // Refresh the graph to show the new image
      await refreshGraph();

      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }

      onClose();

      // Reset state after close
      setTimeout(() => {
        setSelectedFile(null);
        setPreviewUrl(null);
        setStatus({ stage: 'IDLE', progress: 0, message: '' });
        setUploadedImageData(null);
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
                  onClick={() => {
                    if (previewUrl) URL.revokeObjectURL(previewUrl);
                    setSelectedFile(null);
                    setPreviewUrl(null);
                    setStatus({ stage: 'IDLE', progress: 0, message: '' });
                  }}
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

                    {uploadedImageData && (
                      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 mt-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <h3 className="font-bold text-white mb-1">{uploadedImageData.analysis.title}</h3>
                        <p className="text-xs text-gray-400 mb-3">{uploadedImageData.analysis.description}</p>
                        <div className="flex flex-wrap gap-2">
                          {uploadedImageData.analysis.attributes.map((attr: any, i: number) => (
                            <span key={i} className="px-2 py-1 rounded-full bg-gray-700 text-xs text-blue-300 border border-gray-600">
                              #{attr.value}
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