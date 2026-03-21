'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import Input from '@/components/Input';
import Button from '@/components/Button';
import { Brain, Captions, FileSearch, Upload, CheckCircle2, X, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

const HIGHLIGHTS = [
  { icon: Brain,      text: 'AI Interview sessions tailored to your role' },
  { icon: Captions,   text: 'Live transcription inside every interview' },
  { icon: FileSearch, text: 'Resume analysis with gap detection' },
];

export default function SignupPage() {
  const [formData, setFormData] = useState({
    username: '', email: '', password: '', firstName: '', lastName: '',
  });
  const [cvFile, setCvFile]   = useState<File | null>(null);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setCvFile(e.target.files[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await register(
        formData.username, formData.email, formData.password,
        formData.firstName, formData.lastName, cvFile || undefined,
      );
      if (!result.success && result.error && !result.error.toLowerCase().includes('please log in')) {
        setError(result.error);
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex" style={{ background: '#060a07', minHeight: 'calc(100vh - 4rem)' }}>

      {/* ── Left panel ─────────────────────────────────────── */}
      <div
        className="hidden lg:flex flex-col justify-between w-[40%] px-14 py-16 relative overflow-hidden"
        style={{ background: '#080e09', borderRight: '1px solid rgba(16,185,129,0.1)' }}
      >
        {/* Glows */}
        <div className="pointer-events-none absolute -top-32 -left-32" style={{
          width: 440, height: 440, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(16,185,129,0.14) 0%, transparent 65%)',
          filter: 'blur(24px)',
        }} />
        <div className="pointer-events-none absolute bottom-0 right-0" style={{
          width: 280, height: 280, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(52,211,153,0.07) 0%, transparent 65%)',
          transform: 'translate(30%, 20%)',
          filter: 'blur(20px)',
        }} />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: '#10b981' }} />
          <span className="text-lg font-semibold" style={{ fontFamily: 'var(--font-space-grotesk)', color: '#f0fdf4' }}>
            EchoAI
          </span>
        </div>

        {/* Copy */}
        <div className="relative z-10">
          <p className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: '#10b981' }}>
            Get started
          </p>
          <h2
            className="font-bold mb-6"
            style={{ fontSize: 'clamp(2rem, 3vw, 2.6rem)', lineHeight: 1.05, color: '#f0fdf4', fontFamily: 'var(--font-space-grotesk)' }}
          >
            Practice smarter,
            <br />
            <span style={{
              background: 'linear-gradient(120deg, #34d399 0%, #10b981 60%, #059669 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>
              interview better.
            </span>
          </h2>
          <p className="text-sm leading-relaxed mb-10" style={{ color: '#6b7280', maxWidth: 320 }}>
            Create your free account and start your first AI interview session in under a minute.
          </p>

          <div className="flex flex-col gap-4">
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)' }}
                >
                  <Icon className="w-4 h-4" style={{ color: '#10b981' }} />
                </div>
                <span className="text-sm" style={{ color: '#9ca3af' }}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <div className="h-px mb-6" style={{ background: 'rgba(16,185,129,0.1)' }} />
          <p className="text-xs" style={{ color: '#374151' }}>
            Free forever. No credit card required.
          </p>
        </div>
      </div>

      {/* ── Right panel — form ─────────────────────────────── */}
      <div className="flex-1 flex items-start justify-center px-6 py-14 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-lg"
        >
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-10 lg:hidden">
            <div className="w-2 h-2 rounded-full" style={{ background: '#10b981' }} />
            <span className="text-lg font-semibold" style={{ fontFamily: 'var(--font-space-grotesk)', color: '#f0fdf4' }}>
              EchoAI
            </span>
          </div>

          <h1 className="text-2xl font-bold mb-1" style={{ color: '#f0fdf4' }}>Create account</h1>
          <p className="text-sm mb-8" style={{ color: '#6b7280' }}>
            Already have an account?{' '}
            <Link href="/login" className="font-medium transition-colors" style={{ color: '#10b981' }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#34d399')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#10b981')}
            >
              Sign in
            </Link>
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div
                className="px-4 py-3 rounded-xl text-sm text-center"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5' }}
              >
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <Input label="First Name" name="firstName" placeholder="John"
                value={formData.firstName} onChange={handleChange} />
              <Input label="Last Name" name="lastName" placeholder="Doe"
                value={formData.lastName} onChange={handleChange} />
            </div>

            <Input label="Username" name="username" placeholder="johndoe"
              value={formData.username} onChange={handleChange} required />

            <Input label="Email" name="email" type="email" placeholder="john@example.com"
              value={formData.email} onChange={handleChange} required />

            <Input label="Password" name="password" type="password" placeholder="Min. 8 characters"
              value={formData.password} onChange={handleChange} required />

            {/* CV Upload */}
            <div>
              <p className="text-sm font-medium mb-2 ml-1" style={{ color: '#9ca3af' }}>
                Upload CV{' '}
                <span className="text-xs font-normal" style={{ color: '#374151' }}>(optional)</span>
              </p>
              <input
                type="file" id="cv-upload" className="hidden"
                accept=".pdf,.docx,.doc,.txt" onChange={handleFileChange}
              />
              <label
                htmlFor="cv-upload"
                className="flex items-center gap-4 w-full px-5 py-4 rounded-xl cursor-pointer transition-all duration-200"
                style={{
                  background: '#0c1510',
                  border: `1px solid ${cvFile ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.05)'}`,
                }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.borderColor = 'rgba(16,185,129,0.2)')}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.borderColor = cvFile ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.05)')}
              >
                {cvFile ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: '#10b981' }} />
                    <span className="text-sm flex-1 truncate" style={{ color: '#f0fdf4' }}>{cvFile.name}</span>
                    <button
                      type="button"
                      onClick={e => { e.preventDefault(); setCvFile(null); }}
                      className="shrink-0 transition-colors"
                      style={{ color: '#6b7280' }}
                      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#ef4444')}
                      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#6b7280')}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5 shrink-0" style={{ color: '#6b7280' }} />
                    <div>
                      <span className="text-sm font-medium" style={{ color: '#10b981' }}>Click to upload</span>
                      <span className="text-sm" style={{ color: '#6b7280' }}> or drag & drop</span>
                      <p className="text-xs mt-0.5" style={{ color: '#374151' }}>PDF, DOCX, TXT — up to 5 MB</p>
                    </div>
                  </>
                )}
              </label>
              <p className="text-xs mt-2 ml-1" style={{ color: '#374151' }}>
                We use your CV to generate personalized interview questions.
              </p>
            </div>

            <Button type="submit" fullWidth isLoading={loading} className="mt-1 gap-2">
              {!loading && <ArrowRight className="w-4 h-4" />}
              Create account
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
