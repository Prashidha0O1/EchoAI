'use client';

import Button from '@/components/Button';
import Input from '@/components/Input';
import { useAuth } from '@/context/AuthContext';
import { motion } from 'framer-motion';
import { ArrowRight, Brain, Captions, FileSearch } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const HIGHLIGHTS = [
  { icon: Brain,       text: 'AI Interview — adaptive questions for your role' },
  { icon: Captions,    text: 'Live Transcription — review every word you say' },
  { icon: FileSearch,  text: 'Resume Analyzer — fix your CV before you apply' },
];

export default function LoginPage() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const { login } = useAuth();
  const router    = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await login(email, password);
      if (result.success) {
        const isAdmin = (result as { is_admin?: boolean }).is_admin === true;
        router.push(isAdmin ? '/admin' : '/dashboard');
      } else {
        setError(result.error || 'Failed to sign in');
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex" style={{ background: '#060a07', minHeight: '100vh' }}>

      {/* ── Left panel ─────────────────────────────────────── */}
      <div
        className="hidden lg:flex flex-col justify-between w-[46%] px-14 py-16 relative overflow-hidden"
        style={{ background: '#080e09', borderRight: '1px solid rgba(16,185,129,0.1)' }}
      >
        {/* Glow */}
        <div className="pointer-events-none absolute -top-32 -left-32" style={{
          width: 480, height: 480, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(16,185,129,0.14) 0%, transparent 65%)',
          filter: 'blur(24px)',
        }} />
        <div className="pointer-events-none absolute -bottom-24 -right-24" style={{
          width: 320, height: 320, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(52,211,153,0.08) 0%, transparent 65%)',
          filter: 'blur(20px)',
        }} />

        {/* Logo */}
        <div className="relative z-10">
          <Image src="/EchoAI Logo.png" alt="EchoAI" width={110} height={34} className="object-contain" />
        </div>

        {/* Main copy */}
        <div className="relative z-10">
          <p className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: '#10b981' }}>
            Welcome back
          </p>
          <h2
            className="font-bold mb-6"
            style={{ fontSize: 'clamp(2rem, 3.5vw, 2.75rem)', lineHeight: 1, color: '#f0fdf4', fontFamily: 'var(--font-space-grotesk)' }}
          >
            Pick up where
            <br />
            <span style={{
              background: 'linear-gradient(120deg, #34d399 0%, #10b981 60%, #059669 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>
              you left off.
            </span>
          </h2>
          <p className="text-sm leading-relaxed mb-10" style={{ color: '#6b7280', maxWidth: 340 }}>
            Your practice sessions, feedback history, and resume analysis are all waiting.
          </p>

          {/* Feature highlights */}
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

        {/* Bottom quote */}
        <div className="relative z-10">
          <div className="h-px mb-6" style={{ background: 'rgba(16,185,129,0.1)' }} />
          <p className="text-xs" style={{ color: '#374151' }}>
            Trusted by thousands of professionals preparing for their next role.
          </p>
        </div>
      </div>

      {/* ── Right panel — form ─────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-sm"
        >
          {/* Mobile logo */}
          <div className="mb-10 lg:hidden">
            <Image src="/EchoAI Logo.png" alt="EchoAI" width={110} height={34} className="object-contain" />
          </div>

          <h1 className="text-2xl font-bold mb-1" style={{ color: '#f0fdf4' }}>Sign in</h1>
          <p className="text-sm mb-8" style={{ color: '#6b7280' }}>
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="font-medium transition-colors" style={{ color: '#10b981' }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#34d399')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#10b981')}
            >
              Sign up free
            </Link>
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div
                className="px-4 py-3 rounded-xl text-sm text-center"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5' }}
              >
                {error}
              </div>
            )}

            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />

            <div>
              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              <div className="flex justify-end -mt-2">
                <Link
                  href="/forgot-password"
                  className="text-xs transition-colors"
                  style={{ color: '#6b7280' }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#10b981')}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#6b7280')}
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            <Button type="submit" fullWidth isLoading={loading} className="mt-2 gap-2">
              {!loading && <ArrowRight className="w-4 h-4" />}
              Sign in
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
