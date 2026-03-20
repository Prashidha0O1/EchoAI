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
    MessageSquareWarning,
    Sparkles,
    TriangleAlert,
} from 'lucide-react';

// ─── Circular score meter ───────────────────────────────────────────────────

function ScoreMeter({ percentage }: { percentage: number }) {
    const radius = 72;
    const stroke = 10;
    const normalised = Math.min(Math.max(percentage, 0), 100);
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (normalised / 100) * circumference;

    const colorClass =
        normalised >= 75
            ? { stroke: '#34d399', text: 'text-emerald-400', label: 'Strong Match', labelClass: 'text-emerald-400', bg: 'from-emerald-600/10 to-teal-600/5 border-emerald-500/20' }
            : normalised >= 50
            ? { stroke: '#fbbf24', text: 'text-amber-400', label: 'Moderate Match', labelClass: 'text-amber-400', bg: 'from-amber-600/10 to-orange-600/5 border-amber-500/20' }
            : { stroke: '#f87171', text: 'text-rose-400', label: 'Low Match', labelClass: 'text-rose-400', bg: 'from-rose-600/10 to-pink-600/5 border-rose-500/20' };

    return (
        <div className={`flex flex-col items-center gap-6 rounded-2xl border bg-linear-to-br ${colorClass.bg} p-8`}>
            <p className="text-sm font-medium text-zinc-400 uppercase tracking-widest">ATS Match Score</p>

            <div className="relative">
                <svg
                    width={radius * 2 + stroke * 2}
                    height={radius * 2 + stroke * 2}
                    className="-rotate-90"
                >
                    {/* Track */}
                    <circle
                        cx={radius + stroke}
                        cy={radius + stroke}
                        r={radius}
                        fill="none"
                        stroke="rgba(255,255,255,0.07)"
                        strokeWidth={stroke}
                    />
                    {/* Progress */}
                    <circle
                        cx={radius + stroke}
                        cy={radius + stroke}
                        r={radius}
                        fill="none"
                        stroke={colorClass.stroke}
                        strokeWidth={stroke}
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)' }}
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-4xl font-bold ${colorClass.text}`}>
                        {normalised.toFixed(1)}
                    </span>
                    <span className="text-sm text-zinc-500 font-medium">%</span>
                </div>
            </div>

            <div className="text-center">
                <p className={`text-lg font-semibold ${colorClass.labelClass}`}>{colorClass.label}</p>
                <p className="text-sm text-zinc-500 mt-1 max-w-xs">
                    {normalised >= 75
                        ? 'Your resume aligns well with this job description.'
                        : normalised >= 50
                        ? 'Some alignment found. Consider tailoring your resume further.'
                        : 'Your resume may need significant updates to match this role.'}
                </p>
            </div>
        </div>
    );
}

// ─── Main page ───────────────────────────────────────────────────────────────

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
        if (response.error) {
            setError(response.error);
        } else if (response.data) {
            setResult(response.data);
        }
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
            <div className="max-w-5xl mx-auto space-y-8">

                {/* Header */}
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
                            <ScanSearch className="w-5 h-5 text-violet-400" />
                        </div>
                        <h1 className="text-2xl font-bold bg-linear-to-r from-white to-zinc-400 bg-clip-text text-transparent">
                            ATS Resume Checker
                        </h1>
                    </div>
                    <p className="text-zinc-500 text-sm ml-13">
                        Upload your resume and paste a job description to see how well you match.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* ── Left: Input form ─────────────────────────── */}
                    <form onSubmit={handleSubmit} className="space-y-5">

                        {/* File upload zone */}
                        <div>
                            <label className="block text-sm font-medium text-zinc-300 mb-2">
                                Resume / CV <span className="text-zinc-600 font-normal">(PDF or DOCX)</span>
                            </label>
                            <div
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={handleFileDrop}
                                onClick={() => !resumeFile && fileInputRef.current?.click()}
                                className={`relative rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer
                                    ${resumeFile
                                        ? 'border-violet-500/40 bg-violet-500/5 cursor-default'
                                        : 'border-zinc-700 bg-zinc-900/50 hover:border-zinc-500 hover:bg-zinc-800/50'
                                    }`}
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
                                    <div className="flex items-center gap-3 p-4">
                                        <div className="w-10 h-10 rounded-xl bg-violet-500/15 flex items-center justify-center shrink-0">
                                            <FileText className="w-5 h-5 text-violet-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-zinc-200 truncate">{resumeFile.name}</p>
                                            <p className="text-xs text-zinc-500 mt-0.5">
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
                                            className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center gap-3 p-10 text-center">
                                        <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center">
                                            <Upload className="w-6 h-6 text-zinc-500" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-zinc-300">
                                                Drop your resume here, or{' '}
                                                <span className="text-violet-400">browse</span>
                                            </p>
                                            <p className="text-xs text-zinc-600 mt-1">PDF or DOCX · max 10 MB</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Job description */}
                        <div>
                            <label className="block text-sm font-medium text-zinc-300 mb-2">
                                Job Description
                            </label>
                            <textarea
                                value={jobDescription}
                                onChange={(e) => {
                                    setJobDescription(e.target.value);
                                    setResult(null);
                                }}
                                placeholder="Paste the full job description here…"
                                rows={10}
                                className="w-full rounded-xl bg-zinc-900/60 border border-zinc-700 text-zinc-200 placeholder-zinc-600 text-sm p-4 resize-none focus:outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/30 transition-all"
                            />
                            <p className="text-xs text-zinc-600 mt-1.5 text-right">
                                {jobDescription.length} characters
                            </p>
                        </div>

                        {/* Error banner */}
                        {error && (
                            <div className="flex items-start gap-3 rounded-xl bg-rose-500/10 border border-rose-500/20 p-4">
                                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                                <p className="text-sm text-rose-300">{error}</p>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-3">
                            <button
                                type="submit"
                                disabled={!resumeFile || !jobDescription.trim() || loading}
                                className="flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-linear-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 disabled:from-zinc-700 disabled:to-zinc-700 disabled:text-zinc-500 disabled:cursor-not-allowed text-white text-sm font-semibold shadow-lg shadow-violet-500/20 border border-violet-500/30 disabled:border-zinc-600 transition-all duration-200"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Analysing…
                                    </>
                                ) : (
                                    <>
                                        <ScanSearch className="w-4 h-4" />
                                        Check ATS Score
                                    </>
                                )}
                            </button>

                            {(resumeFile || jobDescription || result) && (
                                <button
                                    type="button"
                                    onClick={reset}
                                    className="py-3 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white text-sm font-medium border border-zinc-700 transition-all"
                                >
                                    Reset
                                </button>
                            )}
                        </div>
                    </form>

                    {/* ── Right: Result / placeholder ──────────────── */}
                    <div className="flex flex-col justify-start">
                        {result ? (
                            <div className="space-y-4">
                                {/* Score meter */}
                                <ScoreMeter percentage={result.percentage} />

                                {/* Match score + filename */}
                                <div className="rounded-xl bg-zinc-900/60 border border-zinc-800 p-4 space-y-3">
                                    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Details</p>
                                    <div className="rounded-lg bg-zinc-800/60 p-3">
                                        <p className="text-xs text-zinc-500">Match Score</p>
                                        <p className="text-lg font-bold text-white mt-0.5">{result.percentage.toFixed(2)}%</p>
                                    </div>
                                    <div className="flex items-center gap-2 pt-1 text-xs text-zinc-600">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500/70 shrink-0" />
                                        Analysed: <span className="text-zinc-400 truncate">{result.resume_filename}</span>
                                    </div>
                                </div>

                                {/* Missing keywords */}
                                <div className="rounded-xl bg-zinc-900/60 border border-zinc-800 p-4 space-y-3">
                                    <div className="flex items-center gap-2">
                                        <TriangleAlert className="w-4 h-4 text-amber-400 shrink-0" />
                                        <p className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Missing from Your CV</p>
                                    </div>
                                    {result.missing_keywords.length === 0 ? (
                                        <div className="flex items-center gap-2 text-emerald-400 text-sm">
                                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                                            Great! No major keyword gaps found.
                                        </div>
                                    ) : (
                                        <div className="flex flex-wrap gap-2">
                                            {result.missing_keywords.map((kw) => (
                                                <span
                                                    key={kw}
                                                    className="text-xs px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-300 font-medium"
                                                >
                                                    {kw}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Recommendations */}
                                <div className="rounded-xl bg-zinc-900/60 border border-zinc-800 p-4 space-y-3">
                                    <div className="flex items-center gap-2">
                                        <Lightbulb className="w-4 h-4 text-violet-400 shrink-0" />
                                        <p className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Recommendations</p>
                                    </div>
                                    <ul className="space-y-2">
                                        {result.recommendations.map((rec, i) => (
                                            <li key={i} className="flex items-start gap-2 text-sm text-zinc-400">
                                                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-violet-500/60 shrink-0" />
                                                {rec}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Resume feedback */}
                                <div className="rounded-xl bg-zinc-900/60 border border-zinc-800 p-4 space-y-3">
                                    <div className="flex items-center gap-2">
                                        <Sparkles className="w-4 h-4 text-sky-400 shrink-0" />
                                        <p className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Resume Feedback</p>
                                    </div>
                                    <ul className="space-y-2.5">
                                        {result.feedback.map((tip, i) => (
                                            <li key={i} className="flex items-start gap-2.5 text-sm text-zinc-400">
                                                <CheckCircle2 className="w-4 h-4 text-sky-500/60 shrink-0 mt-0.5" />
                                                {tip}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full min-h-[340px] rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/30 text-center p-10 gap-4">
                                <div className="w-16 h-16 rounded-2xl bg-zinc-800/80 flex items-center justify-center">
                                    <ScanSearch className="w-8 h-8 text-zinc-600" />
                                </div>
                                <div>
                                    <p className="text-zinc-400 font-medium">Your results will appear here</p>
                                    <p className="text-zinc-600 text-sm mt-1 max-w-xs">
                                        Upload a resume and add a job description, then click Check ATS Score.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* How it works */}
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
                    <p className="text-sm font-semibold text-zinc-400 mb-4">How it works</p>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                        {[
                            { step: '01', label: 'Upload Resume', desc: 'PDF or DOCX file' },
                            { step: '02', label: 'Paste Job Description', desc: 'Full JD text' },
                            { step: '03', label: 'BERT Analysis', desc: 'Fine-tuned model scores the match' },
                            { step: '04', label: 'Score, Gaps & Feedback', desc: 'Actionable insights to improve your CV' },
                        ].map(({ step, label, desc }) => (
                            <div key={step} className="flex items-start gap-3">
                                <span className="text-xs font-bold text-violet-500 bg-violet-500/10 border border-violet-500/20 rounded-lg px-2 py-1 shrink-0">
                                    {step}
                                </span>
                                <div>
                                    <p className="text-sm font-medium text-zinc-300">{label}</p>
                                    <p className="text-xs text-zinc-600 mt-0.5">{desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
