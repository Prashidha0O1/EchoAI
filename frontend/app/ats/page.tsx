'use client';

import { useRef, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { atsApi, ATSResult } from '@/lib/api';
import {
    Upload,
    FileText,
    X,
    ScanSearch,
    AlertCircle,
    CheckCircle2,
    Loader2,
    Lightbulb,
    Sparkles,
    TriangleAlert,
    RotateCcw,
} from 'lucide-react';

function ScoreRing({ percentage }: { percentage: number }) {
    const radius = 44;
    const stroke = 7;
    const norm = Math.min(Math.max(percentage, 0), 100);
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (norm / 100) * circumference;

    const color =
        norm >= 75 ? '#10b981' :
        norm >= 50 ? '#f59e0b' :
        '#f87171';

    const label =
        norm >= 75 ? 'Strong Match' :
        norm >= 50 ? 'Moderate Match' :
        'Low Match';

    return (
        <div className="flex items-center gap-4">
            <div className="relative shrink-0">
                <svg width={radius * 2 + stroke * 2} height={radius * 2 + stroke * 2} className="-rotate-90">
                    <circle
                        cx={radius + stroke} cy={radius + stroke} r={radius}
                        fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke}
                    />
                    <circle
                        cx={radius + stroke} cy={radius + stroke} r={radius}
                        fill="none" stroke={color} strokeWidth={stroke}
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)' }}
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold" style={{ color }}>{norm.toFixed(0)}</span>
                    <span className="text-xs" style={{ color: '#6b7280' }}>%</span>
                </div>
            </div>
            <div>
                <p className="text-xs font-medium uppercase tracking-wider" style={{ color: '#6b7280' }}>ATS Match Score</p>
                <p className="text-lg font-semibold mt-0.5" style={{ color }}>{label}</p>
                <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>
                    {norm >= 75
                        ? 'Your resume aligns well with this role.'
                        : norm >= 50
                        ? 'Some alignment found — consider tailoring further.'
                        : 'Resume may need significant updates for this role.'}
                </p>
            </div>
        </div>
    );
}

export default function ATSCheckerPage() {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [resumeFile, setResumeFile] = useState<File | null>(null);
    const [jobDescription, setJobDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<ATSResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file) validateAndSetFile(file);
    };

    const validateAndSetFile = (file: File) => {
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (ext !== 'pdf' && ext !== 'docx') {
            setError('Only PDF and DOCX files are supported.');
            return;
        }
        setError(null);
        setResult(null);
        setResumeFile(file);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!resumeFile || !jobDescription.trim()) return;
        setLoading(true);
        setError(null);
        setResult(null);
        const response = await atsApi.check(resumeFile, jobDescription.trim());
        setLoading(false);
        if (response.error) setError(response.error);
        else if (response.data) setResult(response.data);
    };

    const reset = () => {
        setResumeFile(null);
        setJobDescription('');
        setResult(null);
        setError(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <DashboardLayout>
            <div className="max-w-5xl mx-auto space-y-6">

                {/* Header */}
                <div>
                    <h1 className="text-xl font-semibold" style={{ color: '#f9fafb', fontFamily: 'var(--font-space-grotesk)' }}>
                        ATS Resume Checker
                    </h1>
                    <p className="text-sm mt-0.5" style={{ color: '#6b7280' }}>
                        Upload your resume and paste a job description to see how well you match.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                    {/* Left: Input */}
                    <form onSubmit={handleSubmit} className="space-y-4">

                        {/* File upload */}
                        <div>
                            <label className="block text-xs font-medium mb-1.5" style={{ color: '#9ca3af' }}>
                                Resume / CV <span style={{ color: '#4b5563' }}>(PDF or DOCX)</span>
                            </label>
                            <div
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={handleFileDrop}
                                onClick={() => !resumeFile && fileInputRef.current?.click()}
                                className="relative rounded-xl border-2 border-dashed transition-all duration-150"
                                style={{
                                    borderColor: resumeFile ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.08)',
                                    background: resumeFile ? 'rgba(16,185,129,0.04)' : '#111',
                                    cursor: resumeFile ? 'default' : 'pointer',
                                }}
                                onMouseEnter={e => {
                                    if (!resumeFile) (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.15)';
                                }}
                                onMouseLeave={e => {
                                    if (!resumeFile) (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)';
                                }}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".pdf,.docx"
                                    className="hidden"
                                    onChange={(e) => {
                                        const f = e.target.files?.[0];
                                        if (f) validateAndSetFile(f);
                                    }}
                                />
                                {resumeFile ? (
                                    <div className="flex items-center gap-3 p-3.5">
                                        <div
                                            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                                            style={{ background: 'rgba(16,185,129,0.1)' }}
                                        >
                                            <FileText className="w-4 h-4" style={{ color: '#10b981' }} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate" style={{ color: '#e5e7eb' }}>{resumeFile.name}</p>
                                            <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>
                                                {(resumeFile.size / 1024).toFixed(1)} KB
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setResumeFile(null);
                                                setResult(null);
                                                if (fileInputRef.current) fileInputRef.current.value = '';
                                            }}
                                            className="w-7 h-7 flex items-center justify-center rounded-md transition-colors shrink-0"
                                            style={{ color: '#6b7280' }}
                                            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#f87171')}
                                            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#6b7280')}
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                                        <Upload className="w-5 h-5" style={{ color: '#4b5563' }} />
                                        <div>
                                            <p className="text-sm" style={{ color: '#9ca3af' }}>
                                                Drop your resume or{' '}
                                                <span style={{ color: '#10b981' }}>browse</span>
                                            </p>
                                            <p className="text-xs mt-0.5" style={{ color: '#4b5563' }}>PDF or DOCX · max 10 MB</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Job description */}
                        <div>
                            <label className="block text-xs font-medium mb-1.5" style={{ color: '#9ca3af' }}>
                                Job Description
                            </label>
                            <textarea
                                value={jobDescription}
                                onChange={(e) => { setJobDescription(e.target.value); setResult(null); }}
                                placeholder="Paste the full job description here…"
                                rows={10}
                                className="w-full rounded-xl text-sm p-3.5 resize-none focus:outline-none transition-all"
                                style={{
                                    background: '#111',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    color: '#e5e7eb',
                                    caretColor: '#10b981',
                                }}
                                onFocus={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)')}
                                onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
                            />
                            <p className="text-xs mt-1 text-right" style={{ color: '#4b5563' }}>
                                {jobDescription.length} characters
                            </p>
                        </div>

                        {/* Error */}
                        {error && (
                            <div
                                className="flex items-start gap-2.5 rounded-lg p-3"
                                style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}
                            >
                                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#f87171' }} />
                                <p className="text-sm" style={{ color: '#fca5a5' }}>{error}</p>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                            <button
                                type="submit"
                                disabled={!resumeFile || !jobDescription.trim() || loading}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-150"
                                style={{
                                    background: (!resumeFile || !jobDescription.trim() || loading) ? '#1a1a1a' : '#10b981',
                                    color: (!resumeFile || !jobDescription.trim() || loading) ? '#4b5563' : '#fff',
                                    cursor: (!resumeFile || !jobDescription.trim() || loading) ? 'not-allowed' : 'pointer',
                                }}
                                onMouseEnter={e => {
                                    if (resumeFile && jobDescription.trim() && !loading)
                                        (e.currentTarget as HTMLElement).style.background = '#059669';
                                }}
                                onMouseLeave={e => {
                                    if (resumeFile && jobDescription.trim() && !loading)
                                        (e.currentTarget as HTMLElement).style.background = '#10b981';
                                }}
                            >
                                {loading ? (
                                    <><Loader2 className="w-4 h-4 animate-spin" />Analysing…</>
                                ) : (
                                    <><ScanSearch className="w-4 h-4" />Check ATS Score</>
                                )}
                            </button>

                            {(resumeFile || jobDescription || result) && (
                                <button
                                    type="button"
                                    onClick={reset}
                                    className="py-2.5 px-3 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"
                                    style={{ background: '#1a1a1a', color: '#6b7280', border: '1px solid rgba(255,255,255,0.07)' }}
                                    onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#e5e7eb')}
                                    onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#6b7280')}
                                >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    Reset
                                </button>
                            )}
                        </div>
                    </form>

                    {/* Right: Results */}
                    <div>
                        {result ? (
                            <div
                                className="rounded-xl overflow-hidden"
                                style={{ border: '1px solid rgba(255,255,255,0.08)', background: '#111' }}
                            >
                                {/* Score banner */}
                                <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                    <ScoreRing percentage={result.percentage} />
                                </div>

                                {/* File analysed */}
                                <div
                                    className="flex items-center gap-2 px-5 py-2.5 text-xs"
                                    style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#6b7280' }}
                                >
                                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" style={{ color: '#10b981' }} />
                                    Analysed: <span className="truncate" style={{ color: '#9ca3af' }}>{result.resume_filename}</span>
                                </div>

                                {/* Missing keywords */}
                                <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                    <div className="flex items-center gap-2 mb-3">
                                        <TriangleAlert className="w-3.5 h-3.5 shrink-0" style={{ color: '#f59e0b' }} />
                                        <p className="text-xs font-medium uppercase tracking-wider" style={{ color: '#9ca3af' }}>Missing Keywords</p>
                                    </div>
                                    {result.missing_keywords.length === 0 ? (
                                        <div className="flex items-center gap-2 text-sm" style={{ color: '#10b981' }}>
                                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                                            No major keyword gaps found.
                                        </div>
                                    ) : (
                                        <div className="flex flex-wrap gap-1.5">
                                            {result.missing_keywords.map((kw) => (
                                                <span
                                                    key={kw}
                                                    className="text-xs px-2 py-0.5 rounded-md font-medium"
                                                    style={{ background: 'rgba(245,158,11,0.1)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.2)' }}
                                                >
                                                    {kw}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Recommendations */}
                                <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                    <div className="flex items-center gap-2 mb-3">
                                        <Lightbulb className="w-3.5 h-3.5 shrink-0" style={{ color: '#9ca3af' }} />
                                        <p className="text-xs font-medium uppercase tracking-wider" style={{ color: '#9ca3af' }}>Recommendations</p>
                                    </div>
                                    <ul className="space-y-2">
                                        {result.recommendations.map((rec, i) => (
                                            <li key={i} className="flex items-start gap-2 text-sm" style={{ color: '#9ca3af' }}>
                                                <span className="mt-2 w-1 h-1 rounded-full shrink-0" style={{ background: '#4b5563' }} />
                                                {rec}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Feedback */}
                                <div className="px-5 py-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Sparkles className="w-3.5 h-3.5 shrink-0" style={{ color: '#9ca3af' }} />
                                        <p className="text-xs font-medium uppercase tracking-wider" style={{ color: '#9ca3af' }}>Resume Feedback</p>
                                    </div>
                                    <ul className="space-y-2">
                                        {result.feedback.map((tip, i) => (
                                            <li key={i} className="flex items-start gap-2 text-sm" style={{ color: '#9ca3af' }}>
                                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: '#6b7280' }} />
                                                {tip}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        ) : (
                            <div
                                className="flex flex-col items-center justify-center rounded-xl text-center p-10 gap-3 h-full min-h-[300px]"
                                style={{ border: '1px dashed rgba(255,255,255,0.07)', background: '#111' }}
                            >
                                <div
                                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                                    style={{ background: '#1a1a1a' }}
                                >
                                    <ScanSearch className="w-6 h-6" style={{ color: '#4b5563' }} />
                                </div>
                                <div>
                                    <p className="text-sm font-medium" style={{ color: '#e5e7eb' }}>Results will appear here</p>
                                    <p className="text-xs mt-1" style={{ color: '#6b7280' }}>
                                        Upload a resume, paste a job description, and click Check ATS Score.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* How it works */}
                <div
                    className="rounded-xl p-4"
                    style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                    <p className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: '#6b7280' }}>How it works</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {[
                            { step: '01', label: 'Upload Resume', desc: 'PDF or DOCX' },
                            { step: '02', label: 'Paste Job Description', desc: 'Full JD text' },
                            { step: '03', label: 'BERT Analysis', desc: 'Fine-tuned model scores the match' },
                            { step: '04', label: 'Score & Feedback', desc: 'Actionable insights for your CV' },
                        ].map(({ step, label, desc }) => (
                            <div key={step} className="flex items-start gap-2.5">
                                <span
                                    className="text-xs font-semibold rounded-md px-1.5 py-0.5 shrink-0"
                                    style={{ background: 'rgba(255,255,255,0.06)', color: '#6b7280' }}
                                >
                                    {step}
                                </span>
                                <div>
                                    <p className="text-sm font-medium" style={{ color: '#e5e7eb' }}>{label}</p>
                                    <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>{desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </DashboardLayout>
    );
}
