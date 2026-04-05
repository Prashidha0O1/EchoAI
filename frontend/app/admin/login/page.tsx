'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Input from '@/components/Input';
import Button from '@/components/Button';
import { Shield, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import Image from 'next/image';

export default function AdminLoginPage() {
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
        if (result.is_admin) {
          router.push('/admin');
        } else {
          setError('Access denied. Admin credentials required.');
        }
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
    <div
      className="flex items-center justify-center"
      style={{ background: '#060a07', minHeight: '100vh' }}
    >
      {/* Subtle background glow */}
      <div className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{
        width: 600, height: 600, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(239,68,68,0.06) 0%, transparent 65%)',
        filter: 'blur(40px)',
      }} />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md px-6"
      >
        {/* Logo */}
        <div className="flex justify-center mb-10">
          <Image src="/EchoAI Logo.png" alt="EchoAI" width={120} height={38} className="object-contain" />
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-8"
          style={{
            background: '#0c1510',
            border: '1px solid rgba(239,68,68,0.12)',
            boxShadow: '0 0 60px rgba(239,68,68,0.04)',
          }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}
            >
              <Shield className="w-5 h-5" style={{ color: '#ef4444' }} />
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ color: '#f0fdf4' }}>Admin Panel</h1>
              <p className="text-xs" style={{ color: '#6b7280' }}>Restricted access</p>
            </div>
          </div>

          <div className="h-px my-6" style={{ background: 'rgba(239,68,68,0.1)' }} />

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div
                className="px-4 py-3 rounded-xl text-sm text-center"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5' }}
              >
                {error}
              </div>
            )}

            <Input
              label="Admin Email"
              type="email"
              placeholder="admin@echo.ai"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              label="Password"
              type="password"
              placeholder="Enter admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Button type="submit" fullWidth isLoading={loading} className="mt-2 gap-2">
              {!loading && <ArrowRight className="w-4 h-4" />}
              Sign in as Admin
            </Button>
          </form>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: '#374151' }}>
          Not an admin?{' '}
          <a href="/login" className="transition-colors" style={{ color: '#6b7280' }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#10b981')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#6b7280')}
          >
            Go to regular login
          </a>
        </p>
      </motion.div>
    </div>
  );
}
