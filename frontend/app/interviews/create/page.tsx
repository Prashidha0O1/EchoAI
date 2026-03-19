'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
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
} from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import { interviewApi, questionGeneratorApi } from '@/lib/api';
import type { GenerateQuestionsResponse, InterviewQuestion } from '@/lib/api';
import Button from '@/components/Button';
import DashboardLayout from '@/components/DashboardLayout';
import VerificationGate from '@/components/VerificationGate';

// ─── Helpers ────────────────────────────────────────────────────────────────

const DIFFICULTY_STYLES: Record<string, string> = {
  easy: 'bg-emerald-900/40 text-emerald-400 border border-emerald-700/50',
  medium: 'bg-amber-900/40 text-amber-400 border border-amber-700/50',
  hard: 'bg-red-900/40 text-red-400 border border-red-700/50',
};

const CATEGORY_STYLES: Record<string, string> = {
  technical: 'bg-indigo-900/40 text-indigo-400 border border-indigo-700/50',
  behavioral: 'bg-purple-900/40 text-purple-400 border border-purple-700/50',
  situational: 'bg-cyan-900/40 text-cyan-400 border border-cyan-700/50',
  experience: 'bg-orange-900/40 text-orange-400 border border-orange-700/50',
};

// ─── Sub-components ─────────────────────────────────────────────────────────

function QuestionCard({
  question,
  index,
}: {
  question: InterviewQuestion;
  index: number;
}) {
  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 space-y-3">
      <div className="flex items-start gap-3">
        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-600/30 text-indigo-400 text-xs font-bold flex items-center justify-center mt-0.5">
          {index + 1}
        </span>
        <p className="text-zinc-200 text-sm leading-relaxed">{question.question}</p>
      </div>

      <div className="flex flex-wrap gap-2 pl-9">
        <span
          className={`text-xs px-2 py-0.5 rounded-full capitalize ${
            CATEGORY_STYLES[question.category] ?? 'bg-zinc-800 text-zinc-400'
          }`}
        >
          {question.category}
        </span>
        <span
          className={`text-xs px-2 py-0.5 rounded-full capitalize ${
            DIFFICULTY_STYLES[question.difficulty] ?? 'bg-zinc-800 text-zinc-400'
          }`}
        >
          {question.difficulty}
        </span>
        {question.keywords.slice(0, 3).map((kw) => (
          <span
            key={kw}
            className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-500 border border-zinc-700"
          >
            {kw}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function CreateInterviewPage() {
  const router = useRouter();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Form state
  const [jobDescription, setJobDescription] = useState('');
  const [role, setRole] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('mid');
  const [cvFile, setCvFile] = useState<File | null>(null);

  // ── UI state
  const [isGenerating, setIsGenerating] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Phase 2 preview state (after questions are generated)
  const [generatedData, setGeneratedData] =
    useState<GenerateQuestionsResponse | null>(null);

  // ── File handling
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

  // ── Phase 1: Generate questions
  const handleGenerateQuestions = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!role.trim()) {
      setError('Please enter the job role / position title.');
      return;
    }
    if (!jobDescription.trim()) {
      setError('Please paste the job description.');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await questionGeneratorApi.generate(
        jobDescription,
        role,
        experienceLevel,
        cvFile ?? undefined,
      );

      if (response.data) {
        setGeneratedData(response.data);
      } else {
        setError(response.error ?? 'Failed to generate questions. Please try again.');
      }
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Phase 2: Start interview
  const handleStartInterview = async () => {
    if (!generatedData) return;
    setError(null);
    setIsStarting(true);

    try {
      const startResponse = await interviewApi.start(generatedData.session_id);

      if (startResponse.data) {
        router.push(`/interview/${generatedData.session_id}`);
      } else {
        setError(startResponse.error ?? 'Failed to start the interview session.');
        setIsStarting(false);
      }
    } catch {
      setError('An unexpected error occurred while starting the interview.');
      setIsStarting(false);
    }
  };

  // ── Render: questions preview (Phase 2)
  if (generatedData) {
    return (
      <DashboardLayout>
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setGeneratedData(null)}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors border border-zinc-700"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">Interview Ready</h1>
              <p className="text-zinc-500 text-sm">
                {generatedData.total_questions} personalised questions generated for{' '}
                <span className="text-indigo-400">{generatedData.role}</span>
              </p>
            </div>
          </div>

          {/* Success banner */}
          <div className="flex items-center gap-3 bg-emerald-900/20 border border-emerald-700/40 rounded-xl px-4 py-3">
            <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-emerald-400">
                Questions generated successfully!
              </p>
              <p className="text-xs text-zinc-400 mt-0.5">
                Review the questions below, then start your interview when ready.
              </p>
            </div>
          </div>

          {/* Meta chips */}
          <div className="flex flex-wrap gap-2">
            <span className="text-xs px-3 py-1 rounded-full bg-indigo-900/30 text-indigo-400 border border-indigo-700/40">
              {generatedData.role}
            </span>
            <span className="text-xs px-3 py-1 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700 capitalize">
              {generatedData.experience_level} level
            </span>
            <span className="text-xs px-3 py-1 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
              {generatedData.total_questions} questions
            </span>
          </div>

          {/* Error (start phase) */}
          {error && (
            <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Questions list */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
              Question Preview
            </h2>
            {generatedData.questions.map((q, i) => (
              <QuestionCard key={i} question={q} index={i} />
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pb-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setGeneratedData(null)}
              className="flex-1"
              disabled={isStarting}
            >
              Regenerate
            </Button>
            <Button
              type="button"
              variant="primary"
              className="flex-1 flex items-center justify-center gap-2"
              onClick={handleStartInterview}
              isLoading={isStarting}
              disabled={isStarting}
            >
              {!isStarting && <ChevronRight className="w-4 h-4" />}
              {isStarting ? 'Starting Interview…' : 'Start Interview'}
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // ── Render: creation form (Phase 1)
  return (
    <DashboardLayout>
      <VerificationGate feature="create an interview session">
        <div className="max-w-3xl mx-auto space-y-6">

          {/* Header */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors border border-zinc-700"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">New Interview</h1>
              <p className="text-zinc-500 text-sm">
                Set up your AI-powered practice session
              </p>
            </div>
          </div>

          <form onSubmit={handleGenerateQuestions} className="space-y-5">

            {/* Error */}
            {error && (
              <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {/* Role */}
            <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-6">
              <label className="block mb-3">
                <span className="text-sm font-medium text-zinc-200 flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  Job Role / Position
                  <span className="text-red-400 text-xs">*</span>
                </span>
                <p className="text-xs text-zinc-500 mt-1 mb-3">
                  Enter the exact job title you are interviewing for
                </p>
              </label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Senior Full Stack Engineer, Data Scientist, Product Manager"
                required
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Experience level */}
            <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-6">
              <label className="block mb-3">
                <span className="text-sm font-medium text-zinc-200 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Experience Level
                  <span className="text-red-400 text-xs">*</span>
                </span>
                <p className="text-xs text-zinc-500 mt-1 mb-3">
                  The AI adjusts question difficulty based on your level
                </p>
              </label>
              <select
                value={experienceLevel}
                onChange={(e) => setExperienceLevel(e.target.value)}
                required
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="entry">Entry Level (0 – 1 year)</option>
                <option value="junior">Junior (1 – 3 years)</option>
                <option value="mid">Mid-Level (3 – 5 years)</option>
                <option value="senior">Senior (5 – 8 years)</option>
                <option value="lead">Lead / Principal (8+ years)</option>
              </select>
            </div>

            {/* Resume upload */}
            <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-6">
              <label className="block mb-3">
                <span className="text-sm font-medium text-zinc-200 flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Resume / CV
                  <span className="text-zinc-500 text-xs font-normal">(Optional — PDF)</span>
                </span>
                <p className="text-xs text-zinc-500 mt-1 mb-3">
                  Upload your resume to get questions tailored to your specific experience.{' '}
                  {user?.profile?.cv_file_path && !cvFile && (
                    <span className="text-emerald-400">
                      Your profile CV will be used if no file is uploaded.
                    </span>
                  )}
                </p>
              </label>

              {cvFile ? (
                <div className="flex items-center gap-3 px-4 py-3 bg-zinc-800 border border-indigo-600/50 rounded-lg">
                  <FileText className="w-5 h-5 text-indigo-400 flex-shrink-0" />
                  <span className="text-sm text-zinc-200 flex-1 truncate">{cvFile.name}</span>
                  <button
                    type="button"
                    onClick={removeFile}
                    className="text-zinc-500 hover:text-red-400 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-2 px-4 py-8 bg-zinc-800/50 border-2 border-dashed border-zinc-700 rounded-lg cursor-pointer hover:border-indigo-600/50 hover:bg-zinc-800 transition-colors"
                >
                  <Upload className="w-8 h-8 text-zinc-600" />
                  <p className="text-sm text-zinc-400">
                    Click to upload PDF resume
                  </p>
                  <p className="text-xs text-zinc-600">PDF files only, max 10 MB</p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {/* Job Description */}
            <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-6">
              <label className="block mb-3">
                <span className="text-sm font-medium text-zinc-200 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Job Description
                  <span className="text-red-400 text-xs">*</span>
                </span>
                <p className="text-xs text-zinc-500 mt-1 mb-3">
                  Paste the full job description — the AI will generate questions based on
                  the required skills and responsibilities
                </p>
              </label>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                required
                placeholder={`Paste the job description here…\n\nExample:\nWe are looking for a Full Stack Developer with experience in:\n- React, Node.js, PostgreSQL\n- REST APIs and WebSocket\n- Docker and cloud deployment\n- 3+ years of experience`}
                rows={12}
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none font-mono text-sm"
              />
              <p className="text-xs text-zinc-500 mt-2">
                💡 The more detail you provide, the more personalised your questions will be.
              </p>
            </div>

            {/* How it works */}
            <div className="bg-indigo-900/20 border border-indigo-800/50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-indigo-400 mb-2">What happens next?</h3>
              <ul className="text-xs text-zinc-400 space-y-1.5">
                <li className="flex items-start gap-2">
                  <span className="text-indigo-500 font-bold mt-0.5">1.</span>
                  Your resume and job description are analysed by the fine-tuned Gemma 3 AI model
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-500 font-bold mt-0.5">2.</span>
                  Personalised questions (technical, behavioural, situational) are generated
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-500 font-bold mt-0.5">3.</span>
                  You preview the questions before starting the live session
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-500 font-bold mt-0.5">4.</span>
                  The AI reads each question aloud; you answer via voice in real time
                </li>
              </ul>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/dashboard')}
                className="flex-1"
                disabled={isGenerating}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                className="flex-1 flex items-center justify-center gap-2"
                isLoading={isGenerating}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating Questions…
                  </>
                ) : (
                  'Generate Questions'
                )}
              </Button>
            </div>
          </form>

          {/* No CV warning */}
          {user && !user.profile?.cv_file_path && !cvFile && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4">
              <p className="text-sm text-amber-400 font-medium mb-1">No CV on file</p>
              <p className="text-xs text-zinc-400">
                Upload your resume above, or{' '}
                <button
                  onClick={() => router.push('/profile')}
                  className="text-indigo-400 hover:text-indigo-300 transition-colors"
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
