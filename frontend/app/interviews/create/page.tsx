'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { interviewApi } from '@/lib/api';
import Button from '@/components/Button';
import DashboardLayout from '@/components/DashboardLayout';
import VerificationGate from '@/components/VerificationGate';
import { ArrowLeft, Briefcase, FileText } from 'lucide-react';

export default function CreateInterviewPage() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [formData, setFormData] = useState({
    interview_type: 'mixed',
    job_description: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await interviewApi.create({
        interview_type: formData.interview_type,
        job_description: formData.job_description || null
      });

      if (response.data) {
        // Interview created successfully
        const interviewId = response.data.id;
        
        // Start the interview
        const startResponse = await interviewApi.start(interviewId);
        
        if (startResponse.data) {
          // Navigate to interview session
          router.push(`/interview/${interviewId}`);
        } else {
          setError(startResponse.error || 'Failed to start interview');
          setIsSubmitting(false);
        }
      } else {
        setError(response.error || 'Failed to create interview');
        setIsSubmitting(false);
      }
    } catch (err) {
      console.error('Error creating interview:', err);
      setError('An unexpected error occurred');
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

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
            <p className="text-zinc-500 text-sm">Set up your AI-powered practice session</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Interview Type */}
          <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-6">
            <label className="block mb-2">
              <span className="text-sm font-medium text-zinc-200 flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                Interview Type
              </span>
              <p className="text-xs text-zinc-500 mt-1 mb-3">
                Select the type of interview you want to practice
              </p>
            </label>
            
            <select
              name="interview_type"
              value={formData.interview_type}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
            >
              <option value="mixed">Mixed (Technical + Behavioral)</option>
              <option value="technical">Technical Interview</option>
              <option value="behavioral">Behavioral Interview</option>
              <option value="hr">HR Interview</option>
            </select>
          </div>

          {/* Job Description */}
          <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-6">
            <label className="block mb-2">
              <span className="text-sm font-medium text-zinc-200 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Job Description
                <span className="text-zinc-500 text-xs font-normal">(Optional)</span>
              </span>
              <p className="text-xs text-zinc-500 mt-1 mb-3">
                Paste the job description to get relevant interview questions
              </p>
            </label>
            
            <textarea
              name="job_description"
              value={formData.job_description}
              onChange={handleChange}
              placeholder="Paste the job description here...

Example:
We are looking for a Full Stack Developer with experience in:
- React, Node.js, PostgreSQL
- REST APIs and WebSocket
- Docker and cloud deployment
- 3+ years of experience"
              rows={12}
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none font-mono text-sm"
            />
            
            <p className="text-xs text-zinc-500 mt-2">
              💡 Tip: The AI will generate questions based on the skills and requirements mentioned in the job description
            </p>
          </div>

          {/* Info Box */}
          <div className="bg-indigo-900/20 border border-indigo-800/50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-indigo-400 mb-2">What happens next?</h3>
            <ul className="text-xs text-zinc-400 space-y-1">
              <li>1. Your CV will be analyzed along with the job description</li>
              <li>2. The AI will prepare personalized interview questions</li>
              <li>3. You'll enter a live interview session with voice interaction</li>
              <li>4. All conversations will be transcribed in real-time</li>
              <li>5. You can download the full transcript after the interview</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/dashboard')}
              className="flex-1"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1"
              isLoading={isSubmitting}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating Interview...' : 'Start Interview'}
            </Button>
          </div>
        </form>

        {/* CV Check Warning */}
        {user && !user.profile?.cv_file_path && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4">
            <p className="text-sm text-amber-400 font-medium mb-1">No CV uploaded</p>
            <p className="text-xs text-zinc-400">
              Upload your CV from your profile for more personalised interview questions.
            </p>
            <button
              onClick={() => router.push('/profile')}
              className="mt-2 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Go to Profile →
            </button>
          </div>
        )}
      </div>
      </VerificationGate>
    </DashboardLayout>
  );
}
