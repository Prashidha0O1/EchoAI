'use client';

import { useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    ArrowLeft,
    Briefcase,
    CheckCircle,
    ChevronRight,
    FileText,
    Loader2,
    Upload,
    User,
    X,
    Mic,
    MessageSquare,
} from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import { interviewApi, questionGeneratorApi } from '@/lib/api';
import type { GenerateQuestionsResponse, InterviewQuestion } from '@/lib/api';
import DashboardLayout from '@/components/DashboardLayout';
import VerificationGate from '@/components/VerificationGate';

// ─── Helpers ────────────────────────────────────────────────────────────────

const DIFFICULTY_COLOR: Record<string, { bg: string; color: string }> = {
    easy: { bg: 'rgba(16,185,129,0.1)', color: '#6ee7b7' },
    medium: { bg: 'rgba(245,158,11,0.1)', color: '#fcd34d' },
    hard: { bg: 'rgba(248,113,113,0.1)', color: '#fca5a5' },
};

const CATEGORY_COLOR: Record<string, { bg: string; color: string }> = {
    technical: { bg: 'rgba(96,165,250,0.1)', color: '#93c5fd' },
    behavioral: { bg: 'rgba(167,139,250,0.1)', color: '#c4b5fd' },
    situational: { bg: 'rgba(34,211,238,0.1)', color: '#67e8f9' },
    experience: { bg: 'rgba(251,146,60,0.1)', color: '#fdba74' },
};

// ─── Sub-components ─────────────────────────────────────────────────────────

function QuestionCard({ question, index }: { question: InterviewQuestion; index: number }) {
    const diff = DIFFICULTY_COLOR[question.difficulty] ?? { bg: 'rgba(255,255,255,0.06)', color: '#9ca3af' };
    const cat = CATEGORY_COLOR[question.category] ?? { bg: 'rgba(255,255,255,0.06)', color: '#9ca3af' };
    return (
        <div
            className="rounded-xl p-4 space-y-2.5"
            style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}
        >
            <div className="flex items-start gap-3">
                <span
                    className="shrink-0 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center mt-0.5"
                    style={{ background: 'rgba(255,255,255,0.06)', color: '#9ca3af' }}
                >
                    {index + 1}
                </span>
                <p className="text-sm leading-relaxed" style={{ color: '#d1d5db' }}>{question.question}</p>
            </div>
            <div className="flex flex-wrap gap-1.5 pl-9">
                <span className="text-xs px-2 py-0.5 rounded-md capitalize" style={{ background: cat.bg, color: cat.color }}>
                    {question.category}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-md capitalize" style={{ background: diff.bg, color: diff.color }}>
                    {question.difficulty}
                </span>
                {question.keywords.slice(0, 3).map((kw) => (
                    <span
                        key={kw}
                        className="text-xs px-2 py-0.5 rounded-md"
                        style={{ background: 'rgba(255,255,255,0.05)', color: '#6b7280', border: '1px solid rgba(255,255,255,0.07)' }}
                    >
                        {kw}
                    </span>
                ))}
            </div>
        </div>
    );
}

// Shared input / select styles
const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    background: '#0d0d0d',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '10px',
    color: '#e5e7eb',
    fontSize: '14px',
    outline: 'none',
};

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function CreateInterviewPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Pre-select chat mode if coming from the dashboard chat card
    const defaultMode = searchParams.get('mode') === 'chat' ? 'chat' : 'voice';

    const [jobDescription, setJobDescription] = useState('');
    const [role, setRole] = useState('');
    const [experienceLevel, setExperienceLevel] = useState('mid');
    const [cvFile, setCvFile] = useState<File | null>(null);

    const [isGenerating, setIsGenerating] = useState(false);
    const [isStarting, setIsStarting] = useState(false);
    const [startingMode, setStartingMode] = useState<'voice' | 'chat' | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [generatedData, setGeneratedData] = useState<GenerateQuestionsResponse | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] ?? null;
        if (file && !file.name.toLowerCase().endsWith('.pdf')) {
            setError('Only PDF files are supported for resume upload.');
            return;
        }
        setCvFile(file);
        setError(null);
    };

    const removeFile = () => {
        setCvFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleGenerateQuestions = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!role.trim()) { setError('Please enter the job role / position title.'); return; }
        if (!jobDescription.trim()) { setError('Please paste the job description.'); return; }
        setIsGenerating(true);
        try {
            const response = await questionGeneratorApi.generate(jobDescription, role, experienceLevel, cvFile ?? undefined);
            if (response.data) setGeneratedData(response.data);
            else setError(response.error ?? 'Failed to generate questions. Please try again.');
        } catch {
            setError('An unexpected error occurred.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleStartInterview = async (mode: 'voice' | 'chat' = defaultMode as 'voice' | 'chat') => {
        if (!generatedData) return;
        setError(null);
        setIsStarting(true);
        setStartingMode(mode);
        try {
            const startResponse = await interviewApi.start(generatedData.session_id);
            if (startResponse.data) {
                if (mode === 'chat') {
                    router.push(`/chat-interview/${generatedData.session_id}`);
                } else {
                    router.push(`/interview/${generatedData.session_id}`);
                }
            } else {
                setError(startResponse.error ?? 'Failed to start the interview session.');
                setIsStarting(false);
                setStartingMode(null);
            }
        } catch {
            setError('An unexpected error occurred while starting the interview.');
            setIsStarting(false);
            setStartingMode(null);
        }
    };

    // ── Phase 2: questions preview
    if (generatedData) {
        return (
            <DashboardLayout>
                <div className="max-w-3xl mx-auto space-y-5">
                    {/* Header */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setGeneratedData(null)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
                            style={{ background: '#1a1a1a', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.07)' }}
                            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#f9fafb')}
                            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#9ca3af')}
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </button>
                        <div>
                            <h1 className="text-xl font-semibold" style={{ color: '#f9fafb', fontFamily: 'var(--font-space-grotesk)' }}>
                                Interview Ready
                            </h1>
                            <p className="text-sm" style={{ color: '#6b7280' }}>
                                {generatedData.total_questions} questions for{' '}
                                <span style={{ color: '#e5e7eb' }}>{generatedData.role}</span>
                            </p>
                        </div>
                    </div>

                    {/* Success banner */}
                    <div
                        className="flex items-center gap-3 rounded-lg px-4 py-3"
                        style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}
                    >
                        <CheckCircle className="w-4 h-4 shrink-0" style={{ color: '#10b981' }} />
                        <div>
                            <p className="text-sm font-medium" style={{ color: '#34d399' }}>Questions generated successfully</p>
                            <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>
                                Review below, then start your interview when ready.
                            </p>
                        </div>
                    </div>

                    {/* Meta chips */}
                    <div className="flex flex-wrap gap-1.5">
                        {[generatedData.role, `${generatedData.experience_level} level`, `${generatedData.total_questions} questions`].map(label => (
                            <span
                                key={label}
                                className="text-xs px-2.5 py-1 rounded-md capitalize"
                                style={{ background: 'rgba(255,255,255,0.06)', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.08)' }}
                            >
                                {label}
                            </span>
                        ))}
                    </div>

                    {error && (
                        <div
                            className="rounded-lg p-3 text-sm"
                            style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: '#fca5a5' }}
                        >
                            {error}
                        </div>
                    )}

                    {/* Questions */}
                    <div className="space-y-2.5">
                        <p className="text-xs font-medium uppercase tracking-wider" style={{ color: '#6b7280' }}>Question Preview</p>
                        {generatedData.questions.map((q, i) => (
                            <QuestionCard key={i} question={q} index={i} />
                        ))}
                    </div>

                    {/* Mode info banner */}
                    <div
                        className="rounded-lg p-4"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                    >
                        <p className="text-xs font-semibold mb-2.5 uppercase tracking-wider" style={{ color: '#6b7280' }}>Choose your interview mode</p>
                        <div className="grid grid-cols-2 gap-2 text-xs" style={{ color: '#6b7280' }}>
                            <div className="flex items-start gap-2">
                                <Mic className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: '#9ca3af' }} />
                                <span><span style={{ color: '#e5e7eb' }}>Voice</span> — answer out loud, AI reads questions via audio</span>
                            </div>
                            <div className="flex items-start gap-2">
                                <MessageSquare className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: '#10b981' }} />
                                <span><span style={{ color: '#e5e7eb' }}>Chat</span> — type answers, no microphone required</span>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="space-y-2.5 pb-6">
                        {/* Mode buttons */}
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => handleStartInterview('voice')}
                                disabled={isStarting}
                                className="flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors"
                                style={{
                                    background: startingMode === 'voice' ? '#1a1a1a' : 'rgba(255,255,255,0.06)',
                                    color: startingMode === 'voice' ? '#6b7280' : '#e5e7eb',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                }}
                                onMouseEnter={e => { if (!isStarting) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)'; }}
                                onMouseLeave={e => { if (!isStarting) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; }}
                            >
                                {startingMode === 'voice' ? (
                                    <><Loader2 className="w-4 h-4 animate-spin" />Starting…</>
                                ) : (
                                    <><Mic className="w-4 h-4" />Voice Interview</>
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={() => handleStartInterview('chat')}
                                disabled={isStarting}
                                className="flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors"
                                style={{
                                    background: startingMode === 'chat' ? '#1a1a1a' : '#10b981',
                                    color: startingMode === 'chat' ? '#6b7280' : '#fff',
                                }}
                                onMouseEnter={e => { if (!isStarting) (e.currentTarget as HTMLElement).style.background = '#059669'; }}
                                onMouseLeave={e => { if (!isStarting) (e.currentTarget as HTMLElement).style.background = '#10b981'; }}
                            >
                                {startingMode === 'chat' ? (
                                    <><Loader2 className="w-4 h-4 animate-spin" />Starting…</>
                                ) : (
                                    <><MessageSquare className="w-4 h-4" />Chat Interview</>
                                )}
                            </button>
                        </div>

                        {/* Regenerate */}
                        <button
                            type="button"
                            onClick={() => setGeneratedData(null)}
                            disabled={isStarting}
                            className="w-full py-2 rounded-lg text-sm font-medium transition-colors"
                            style={{ background: '#1a1a1a', color: '#6b7280', border: '1px solid rgba(255,255,255,0.06)' }}
                            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#9ca3af')}
                            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#6b7280')}
                        >
                            Regenerate Questions
                        </button>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    // ── Phase 1: creation form
    return (
        <DashboardLayout>
            <VerificationGate feature="create an interview session">
                <div className="max-w-3xl mx-auto space-y-5">

                    {/* Header */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.push('/dashboard')}
                            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
                            style={{ background: '#1a1a1a', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.07)' }}
                            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#f9fafb')}
                            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#9ca3af')}
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </button>
                        <div>
                            <h1 className="text-xl font-semibold" style={{ color: '#f9fafb', fontFamily: 'var(--font-space-grotesk)' }}>
                                New Interview
                            </h1>
                            <p className="text-sm" style={{ color: '#6b7280' }}>Set up your AI-powered practice session</p>
                        </div>
                    </div>

                    <form onSubmit={handleGenerateQuestions} className="space-y-4">

                        {error && (
                            <div
                                className="rounded-lg p-3 text-sm"
                                style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: '#fca5a5' }}
                            >
                                {error}
                            </div>
                        )}

                        {/* Role */}
                        <div
                            className="rounded-xl p-5 space-y-3"
                            style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}
                        >
                            <div>
                                <p className="text-sm font-medium flex items-center gap-2" style={{ color: '#e5e7eb' }}>
                                    <Briefcase className="w-4 h-4" style={{ color: '#6b7280' }} />
                                    Job Role / Position
                                    <span style={{ color: '#f87171', fontSize: '11px' }}>required</span>
                                </p>
                                <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>Enter the exact job title you are interviewing for</p>
                            </div>
                            <input
                                type="text"
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                placeholder="e.g. Senior Full Stack Engineer, Data Scientist…"
                                required
                                style={inputStyle}
                                onFocus={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)')}
                                onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
                            />
                        </div>

                        {/* Experience */}
                        <div
                            className="rounded-xl p-5 space-y-3"
                            style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}
                        >
                            <div>
                                <p className="text-sm font-medium flex items-center gap-2" style={{ color: '#e5e7eb' }}>
                                    <User className="w-4 h-4" style={{ color: '#6b7280' }} />
                                    Experience Level
                                </p>
                                <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>The AI adjusts question difficulty based on your level</p>
                            </div>
                            <select
                                value={experienceLevel}
                                onChange={(e) => setExperienceLevel(e.target.value)}
                                required
                                style={{ ...inputStyle, appearance: 'none' }}
                                onFocus={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)')}
                                onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
                            >
                                <option value="entry">Entry Level (0–1 year)</option>
                                <option value="junior">Junior (1–3 years)</option>
                                <option value="mid">Mid-Level (3–5 years)</option>
                                <option value="senior">Senior (5–8 years)</option>
                                <option value="lead">Lead / Principal (8+ years)</option>
                            </select>
                        </div>

                        {/* Resume upload */}
                        <div
                            className="rounded-xl p-5 space-y-3"
                            style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}
                        >
                            <div>
                                <p className="text-sm font-medium flex items-center gap-2" style={{ color: '#e5e7eb' }}>
                                    <Upload className="w-4 h-4" style={{ color: '#6b7280' }} />
                                    Resume / CV
                                    <span className="font-normal text-xs" style={{ color: '#4b5563' }}>(Optional — PDF)</span>
                                </p>
                                <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>
                                    Upload your resume to get questions tailored to your experience.{' '}
                                    {user?.profile?.cv_file_path && !cvFile && (
                                        <span style={{ color: '#10b981' }}>Your profile CV will be used if no file is uploaded.</span>
                                    )}
                                </p>
                            </div>

                            {cvFile ? (
                                <div
                                    className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg"
                                    style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)' }}
                                >
                                    <FileText className="w-4 h-4 shrink-0" style={{ color: '#10b981' }} />
                                    <span className="text-sm flex-1 truncate" style={{ color: '#d1d5db' }}>{cvFile.name}</span>
                                    <button
                                        type="button"
                                        onClick={removeFile}
                                        className="transition-colors"
                                        style={{ color: '#6b7280' }}
                                        onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#f87171')}
                                        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#6b7280')}
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex flex-col items-center justify-center gap-2 py-7 rounded-lg border-2 border-dashed cursor-pointer transition-all"
                                    style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}
                                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.14)'}
                                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)'}
                                >
                                    <Upload className="w-5 h-5" style={{ color: '#4b5563' }} />
                                    <p className="text-sm" style={{ color: '#9ca3af' }}>Click to upload PDF resume</p>
                                    <p className="text-xs" style={{ color: '#4b5563' }}>PDF only · max 10 MB</p>
                                </div>
                            )}
                            <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />
                        </div>

                        {/* Job Description */}
                        <div
                            className="rounded-xl p-5 space-y-3"
                            style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}
                        >
                            <div>
                                <p className="text-sm font-medium flex items-center gap-2" style={{ color: '#e5e7eb' }}>
                                    <FileText className="w-4 h-4" style={{ color: '#6b7280' }} />
                                    Job Description
                                    <span style={{ color: '#f87171', fontSize: '11px' }}>required</span>
                                </p>
                                <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>
                                    Paste the full job description — the AI generates questions based on required skills and responsibilities
                                </p>
                            </div>
                            <textarea
                                value={jobDescription}
                                onChange={(e) => setJobDescription(e.target.value)}
                                required
                                placeholder={`Paste the job description here…\n\nExample:\nWe are looking for a Full Stack Developer with experience in:\n- React, Node.js, PostgreSQL\n- REST APIs and WebSocket\n- 3+ years of experience`}
                                rows={11}
                                style={{ ...inputStyle, resize: 'none', fontFamily: 'monospace', caretColor: '#10b981' }}
                                onFocus={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)')}
                                onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
                            />
                            <p className="text-xs" style={{ color: '#4b5563' }}>
                                The more detail you provide, the more personalised your questions will be.
                            </p>
                        </div>

                        {/* What happens next */}
                        <div
                            className="rounded-lg p-4"
                            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                        >
                            <p className="text-xs font-semibold mb-2.5 uppercase tracking-wider" style={{ color: '#6b7280' }}>What happens next</p>
                            <ul className="space-y-1.5">
                                {[
                                    'Your resume and job description are analysed by the Gemma 3 AI model',
                                    'Personalised questions (technical, behavioural, situational) are generated',
                                    'You preview the questions, then choose your interview mode',
                                    'Voice mode — the AI reads questions aloud and you answer with your microphone',
                                    'Chat mode — questions appear as text and you type your answers (no mic needed)',
                                ].map((text, i) => (
                                    <li key={i} className="flex items-start gap-2 text-xs" style={{ color: '#6b7280' }}>
                                        <span className="font-semibold mt-0.5 shrink-0" style={{ color: '#4b5563' }}>{i + 1}.</span>
                                        {text}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => router.push('/dashboard')}
                                disabled={isGenerating}
                                className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors"
                                style={{ background: '#1a1a1a', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.08)' }}
                                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#e5e7eb')}
                                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#9ca3af')}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isGenerating}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors"
                                style={{ background: isGenerating ? '#1a1a1a' : '#10b981', color: isGenerating ? '#6b7280' : '#fff' }}
                                onMouseEnter={e => { if (!isGenerating) (e.currentTarget as HTMLElement).style.background = '#059669'; }}
                                onMouseLeave={e => { if (!isGenerating) (e.currentTarget as HTMLElement).style.background = '#10b981'; }}
                            >
                                {isGenerating ? (
                                    <><Loader2 className="w-4 h-4 animate-spin" />Generating Questions…</>
                                ) : (
                                    'Generate Questions'
                                )}
                            </button>
                        </div>
                    </form>

                    {/* No CV warning */}
                    {user && !user.profile?.cv_file_path && !cvFile && (
                        <div
                            className="rounded-lg p-4"
                            style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}
                        >
                            <p className="text-sm font-medium mb-0.5" style={{ color: '#fbbf24' }}>No CV on file</p>
                            <p className="text-xs" style={{ color: '#9ca3af' }}>
                                Upload your resume above, or{' '}
                                <button
                                    onClick={() => router.push('/profile')}
                                    className="underline transition-colors"
                                    style={{ color: '#9ca3af' }}
                                    onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#e5e7eb')}
                                    onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#9ca3af')}
                                >
                                    add one to your profile
                                </button>{' '}
                                for more personalised questions.
                            </p>
                        </div>
                    )}
                </div>
            </VerificationGate>
        </DashboardLayout>
    );
}
