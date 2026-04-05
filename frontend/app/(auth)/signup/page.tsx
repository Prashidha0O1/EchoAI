'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import Input from '@/components/Input';
import Button from '@/components/Button';
import { Brain, Captions, FileSearch, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import Image from 'next/image';

const HIGHLIGHTS = [
  { icon: Brain,      text: 'AI Interview sessions tailored to your role' },
  { icon: Captions,   text: 'Live transcription inside every interview' },
  { icon: FileSearch, text: 'Resume analysis with gap detection' },
];

export default function SignupPage() {
  const [formData, setFormData] = useState({
    username: '', email: '', password: '', firstName: '', lastName: '',
  });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await register(
        formData.username, formData.email, formData.password,
        formData.firstName, formData.lastName,
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
    <div className="flex" style={{ background: '#060a07', minHeight: '100vh' }}>

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
        <div className="relative z-10">
          <Image src="/EchoAI Logo.png" alt="EchoAI" width={110} height={34} className="object-contain" />
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
          <div className="mb-10 lg:hidden">
            <Image src="/EchoAI Logo.png" alt="EchoAI" width={110} height={34} className="object-contain" />
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
