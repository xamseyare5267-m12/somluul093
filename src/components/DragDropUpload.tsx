import React, { useState, useRef } from 'react';
import axios from 'axios';
import { UploadCloud, File, X, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

interface DragDropUploadProps {
  authToken: string;
  onUploadSuccess: () => void;
  onShowToast: (message: string, type: 'success' | 'error') => void;
}

interface UploadingFile {
  id: string;
  name: string;
  size: number;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  errorMsg?: string;
}

export const DragDropUpload: React.FC<DragDropUploadProps> = ({ authToken, onUploadSuccess, onShowToast }) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploadList, setUploadList] = useState<UploadingFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Constants
  const MAX_SIZE = 200 * 1024 * 1024; // 200MB
  const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.jpg', '.jpeg', '.png', '.webp', '.gif', '.mp4'];

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return { valid: false, error: 'File type not permitted. Permitted types: PDF, DOCX, JPG, JPEG, PNG, WEBP, GIF, MP4.' };
    }

    if (file.size > MAX_SIZE) {
      return { valid: false, error: 'File exceeds maximum 200MB size limit.' };
    }

    return { valid: true };
  };

  const processFiles = (files: FileList) => {
    const filesToUpload: UploadingFile[] = [];

    Array.from(files).forEach(file => {
      const validation = validateFile(file);
      const tempId = crypto.randomUUID();

      const newUpload: UploadingFile = {
        id: tempId,
        name: file.name,
        size: file.size,
        progress: 0,
        status: validation.valid ? 'pending' : 'error',
        errorMsg: validation.error
      };

      filesToUpload.push(newUpload);

      if (validation.valid) {
        // Trigger upload
        uploadSingleFile(tempId, file);
      } else {
        onShowToast(`File ${file.name} failed verification: ${validation.error}`, 'error');
      }
    });

    setUploadList(prev => [...filesToUpload, ...prev]);
  };

  const uploadSingleFile = async (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    setUploadList(prev =>
      prev.map(item => (item.id === id ? { ...item, status: 'uploading' } : item))
    );

    try {
      await axios.post('/api/files/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${authToken}`
        },
        onUploadProgress: (progressEvent) => {
          const total = progressEvent.total || file.size;
          const percentage = Math.round((progressEvent.loaded * 100) / total);
          setUploadList(prev =>
            prev.map(item => (item.id === id ? { ...item, progress: percentage } : item))
          );
        }
      });

      setUploadList(prev =>
        prev.map(item => (item.id === id ? { ...item, status: 'success', progress: 100 } : item))
      );

      onUploadSuccess();
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'Upload failed.';
      setUploadList(prev =>
        prev.map(item => (item.id === id ? { ...item, status: 'error', errorMsg: errMsg } : item))
      );
      onShowToast(`Failed to upload ${file.name}: ${errMsg}`, 'error');
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const removeUploadListItem = (id: string) => {
    setUploadList(prev => prev.filter(item => item.id !== id));
  };

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const triggerInputClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div id="uploader-section" className="space-y-4">
      {/* Drag & Drop Area */}
      <div
        id="dropzone"
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={triggerInputClick}
        className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 ${
          isDragActive
            ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-950/20 scale-[0.99]'
            : 'border-gray-200 dark:border-gray-800 hover:border-blue-500/70 hover:bg-gray-50/50 dark:hover:bg-[#141b2d]/30'
        }`}
      >
        <input
          id="file-input"
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
          accept={ALLOWED_EXTENSIONS.join(',')}
        />
        
        <div className="p-4 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded-2xl mb-4 transition-colors">
          <UploadCloud size={32} className={isDragActive ? 'animate-bounce' : ''} />
        </div>

        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1.5 font-sans">
          Drag and drop files here
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-4 leading-relaxed">
          or <span className="text-blue-600 dark:text-blue-400 font-medium hover:underline">browse files</span> on your computer
        </p>

        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-gray-400 dark:text-gray-500 font-medium">
          <span>Max Size: 200 MB</span>
          <span className="hidden sm:inline">•</span>
          <span>PDF, DOCX, JPG, PNG, WEBP, GIF, MP4</span>
        </div>
      </div>

      {/* Uploading Queue Display */}
      {uploadList.length > 0 && (
        <div id="upload-queue" className="bg-white dark:bg-[#141b2d] border border-gray-100 dark:border-gray-800/60 rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-2 mb-1">
            <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Upload Activity Queue
            </h4>
            <button
              id="clear-queue-btn"
              onClick={() => setUploadList([])}
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              Clear All
            </button>
          </div>

          <div className="max-h-60 overflow-y-auto space-y-3.5 pr-1">
            {uploadList.map((file) => (
              <div id={`upload-item-${file.id}`} key={file.id} className="flex items-start gap-3">
                <div className="p-2.5 bg-gray-50 dark:bg-gray-800/40 text-gray-500 dark:text-gray-400 rounded-xl shrink-0">
                  <File size={20} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {file.name}
                    </p>
                    <span className="text-xs text-gray-400 dark:text-gray-500 font-mono shrink-0">
                      {formatSize(file.size)}
                    </span>
                  </div>

                  {/* Progress Line */}
                  <div className="w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-200 ${
                        file.status === 'success'
                          ? 'bg-emerald-500'
                          : file.status === 'error'
                          ? 'bg-red-500'
                          : 'bg-[var(--somluul-primary)]'
                      }`}
                      style={{ width: `${file.progress}%` }}
                    />
                  </div>

                  {/* Status labels */}
                  <div className="flex items-center justify-between mt-1.5 text-xs">
                    <div className="flex items-center gap-1 font-medium">
                      {file.status === 'pending' && (
                        <span className="text-gray-400">Waiting...</span>
                      )}
                      {file.status === 'uploading' && (
                        <span className="text-blue-600 dark:text-blue-400 flex items-center gap-1">
                          <RefreshCw size={12} className="animate-spin" /> Uploading ({file.progress}%)
                        </span>
                      )}
                      {file.status === 'success' && (
                        <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 size={12} /> Complete
                        </span>
                      )}
                      {file.status === 'error' && (
                        <span className="text-red-600 dark:text-red-400 flex items-center gap-1">
                          <AlertCircle size={12} /> {file.errorMsg || 'Failed'}
                        </span>
                      )}
                    </div>

                    <button
                      id={`remove-queue-item-${file.id}`}
                      onClick={() => removeUploadListItem(file.id)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-0.5 rounded-md"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
