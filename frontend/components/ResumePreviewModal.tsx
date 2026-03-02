'use client';

import { useEffect, useRef } from 'react';
import { X, Download, ExternalLink } from 'lucide-react';

interface ResumePreviewModalProps {
    /** Pass a URL to render in an iframe (for saved resumes) */
    previewUrl?: string;
    /** Pass raw HTML string for client-side live preview */
    htmlContent?: string;
    title?: string;
    onClose: () => void;
    onDownload?: () => void;
}

export default function ResumePreviewModal({
    previewUrl,
    htmlContent,
    title = 'Resume Preview',
    onClose,
    onDownload,
}: ResumePreviewModalProps) {
    const overlayRef = useRef<HTMLDivElement>(null);

    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    // Prevent body scroll while open
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    return (
        <div
            ref={overlayRef}
            className="fixed inset-0 z-100 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}
            onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
        >
            <div className="relative w-full max-w-4xl h-[90vh] bg-zinc-950 border border-zinc-800 rounded-2xl flex flex-col overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 shrink-0">
                    <h2 className="text-base font-semibold text-white">{title}</h2>
                    <div className="flex items-center gap-2">
                        {previewUrl && (
                            <a
                                href={previewUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                            >
                                <ExternalLink className="w-3.5 h-3.5" />
                                Open in tab
                            </a>
                        )}
                        {onDownload && (
                            <button
                                onClick={onDownload}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
                            >
                                <Download className="w-3.5 h-3.5" />
                                Download PDF
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden bg-zinc-100">
                    {previewUrl ? (
                        <iframe
                            src={previewUrl}
                            className="w-full h-full border-0"
                            title="Resume Preview"
                        />
                    ) : htmlContent ? (
                        <div className="w-full h-full overflow-auto">
                            <div
                                className="min-h-full"
                                dangerouslySetInnerHTML={{ __html: htmlContent }}
                            />
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
                            No preview available
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
