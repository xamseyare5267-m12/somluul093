import React from 'react';
import { X, Download, FileText, File, Video, Eye, Calendar, HardDrive, Info } from 'lucide-react';
import { FileMetadata } from '../types';
import { VideoPlayer } from './VideoPlayer';

interface FilePreviewModalProps {
  file: FileMetadata | null;
  onClose: () => void;
  onDownload: (file: FileMetadata) => void;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({ file, onClose, onDownload }) => {
  if (!file) return null;

  const isImage = file.mime_type.startsWith('image/');
  const isPdf = file.mime_type === 'application/pdf';
  const isVideo = file.mime_type.startsWith('video/');

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (isoStr: string): string => {
    return new Date(isoStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div id="preview-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-200">
      <div
        id="preview-modal-card"
        className="relative w-full max-w-4xl bg-white dark:bg-[#141b2d] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh] transition-all duration-300 transform scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded-xl">
              {isImage && <Eye size={18} />}
              {isPdf && <FileText size={18} />}
              {isVideo && <Video size={18} />}
              {!isImage && !isPdf && !isVideo && <File size={18} />}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate" title={file.original_name}>
                {file.original_name}
              </h3>
              <p className="text-xs text-gray-400 dark:text-gray-500 font-mono mt-0.5">
                {file.mime_type} • {formatSize(file.file_size)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              id="modal-download-btn"
              onClick={() => onDownload(file)}
              className="p-2 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white bg-gray-50 hover:bg-gray-100 dark:bg-[#1f293d] dark:hover:bg-gray-800 rounded-lg transition-colors"
              title="Download File"
            >
              <Download size={16} />
            </button>
            <button
              id="modal-close-btn"
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white bg-gray-50 hover:bg-gray-100 dark:bg-[#1f293d] dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content viewer */}
        <div className="flex-1 bg-gray-50 dark:bg-[#0b0f19] p-6 overflow-y-auto flex items-center justify-center min-h-[300px]">
          {isImage && (
            <img
              id="preview-img"
              src={file.public_url}
              alt={file.original_name}
              referrerPolicy="no-referrer"
              className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-md bg-white dark:bg-[#141b2d]"
            />
          )}

          {isPdf && (
            <iframe
              id="preview-pdf-frame"
              src={file.public_url}
              title={file.original_name}
              className="w-full h-[60vh] rounded-lg border border-gray-200 dark:border-gray-800 bg-white"
            />
          )}

          {isVideo && (
            <VideoPlayer
              src={file.public_url}
              controls
              className="w-full max-h-[60vh] rounded-lg shadow-md bg-black"
              playsInline
              preload="metadata"
            />
          )}

          {!isImage && !isPdf && !isVideo && (
            <div id="preview-fallback-card" className="max-w-md w-full bg-white dark:bg-[#141b2d] border border-gray-100 dark:border-gray-800/80 rounded-2xl p-8 text-center shadow-lg">
              <div className="w-16 h-16 bg-gray-50 dark:bg-[#1f293d] text-gray-400 dark:text-gray-500 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <FileText size={36} />
              </div>

              <h4 className="text-base font-bold text-gray-900 dark:text-white truncate mb-1">
                {file.original_name}
              </h4>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-6">
                Preview is not available for this file type.
              </p>

              <div className="bg-gray-50 dark:bg-[#0b0f19] rounded-xl p-4 text-left space-y-3 mb-6 border border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <HardDrive size={14} className="text-gray-400" />
                  <span className="font-semibold">Size:</span>
                  <span className="font-mono ml-auto">{formatSize(file.file_size)}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <Calendar size={14} className="text-gray-400" />
                  <span className="font-semibold">Uploaded on:</span>
                  <span className="ml-auto">{formatDate(file.created_at)}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <Info size={14} className="text-gray-400" />
                  <span className="font-semibold">Storage Path:</span>
                  <span className="font-mono truncate ml-auto text-[10px] max-w-[180px]" title={file.storage_path}>
                    {file.storage_path}
                  </span>
                </div>
              </div>

              <button
                id="fallback-download-btn"
                onClick={() => onDownload(file)}
                className="w-full bg-[var(--somluul-primary)] hover:brightness-110 text-white font-medium py-3 rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/15"
              >
                <Download size={16} />
                Download This File
              </button>
            </div>
          )}
        </div>

        {/* Footer info (for previews) */}
        {(isImage || isPdf || isVideo) && (
          <div className="px-6 py-4 bg-gray-50 dark:bg-[#111625] border-t border-gray-100 dark:border-gray-800 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <Calendar size={13} />
              Uploaded: {formatDate(file.created_at)}
            </span>
            <span className="font-mono bg-white dark:bg-[#1a233a] border border-gray-200 dark:border-gray-800 px-2 py-0.5 rounded text-[10px]">
              {file.storage_path}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
