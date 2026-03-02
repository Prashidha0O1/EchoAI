'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { ShieldAlert, Mail, Loader2, ArrowRight, CheckCircle2 } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface Props {
    /** The feature name shown in the message, e.g. "create a resume" */
    feature?: string;
    children: React.ReactNode;
}

/**
 * Wraps any page/section and blocks it behind an email-verification wall.
 * Shows an inline send-code → enter-code flow so the user never has to leave.
 */
export default function VerificationGate({ feature = 'use this feature', children }: Props) {
    const { user, isLoading, refreshUser } = useAuth();

    const [step, setStep] = useState<'idle' | 'sending' | 'entering' | 'verifying' | 'done'>('idle');
    const [digits, setDigits] = useState(['', '', '', '', '', '']);
    const [error, setError] = useState('');
    const [resending, setResending] = useState(false);

    // Still loading auth – show neutral spinner
    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    // Email already verified (or step just completed) – render normally
    if (!user || user.email_verified || step === 'done') {
        return <>{children}</>;
    }

    /* ── helpers ────────────────────────────────────────────────── */
    const token = () => localStorage.getItem('access_token') ?? '';

    const sendCode = async (isResend = false) => {
        if (isResend) setResending(true);
        else setStep('sending');
        setError('');

        try {
            const res = await fetch(`${API}/verification/send`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token()}` },
            });
            if (res.ok) {
                setStep('entering');
            } else {
                const d = await res.json().catch(() => ({}));
                setError(d.detail || 'Failed to send code. Try again.');
                setStep('idle');
            }
        } catch {
            setError('Network error. Please check your connection.');
            setStep('idle');
        } finally {
            setResending(false);
        }
    };

    const verifyCode = async () => {
        const code = digits.join('');
        if (code.length !== 6) { setError('Please enter all 6 digits.'); return; }
        setStep('verifying');
        setError('');

        try {
            const res = await fetch(`${API}/verification/verify`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token()}`,
                },
                body: JSON.stringify({ code }),
            });
            if (res.ok) {
                await refreshUser();   // update user.email_verified in context
                setStep('done');
            } else {
                const d = await res.json().catch(() => ({}));
                setError(d.detail || 'Incorrect code. Please try again.');
                setStep('entering');
            }
        } catch {
            setError('Network error. Please try again.');
            setStep('entering');
        }
    };

    const handleDigit = (i: number, val: string) => {
        if (!/^\d?$/.test(val)) return;
        const next = [...digits];
        next[i] = val;
        setDigits(next);
        if (val && i < 5) document.getElementById(`vg-digit-${i + 1}`)?.focus();
    };

    const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !digits[i] && i > 0)
            document.getElementById(`vg-digit-${i - 1}`)?.focus();
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const raw = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (!raw) return;
        const next = raw.split('').concat(Array(6 - raw.length).fill(''));
        setDigits(next.slice(0, 6));
        if (raw.length === 6) document.getElementById('vg-verify-btn')?.focus();
    };

    /* ── gate UI ────────────────────────────────────────────────── */
    return (
        <div className="flex items-center justify-center min-h-[70vh] px-4">
            <div className="w-full max-w-md">
                <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-8 shadow-2xl text-center">

                    {/* Icon */}
                    <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-5">
                        <ShieldAlert className="w-8 h-8 text-amber-400" />
                    </div>

                    {/* Title */}
                    <h2 className="text-xl font-bold text-white mb-2">Email Verification Required</h2>
                    <p className="text-sm text-zinc-400 mb-1">
                        You need to verify your email address to {feature}.
                    </p>
                    <p className="text-xs text-zinc-500 mb-7">
                        A 6-digit code will be sent to <span className="text-zinc-300 font-medium">{user.email}</span>
                    </p>

                    {/* Error */}
                    {error && (
                        <div className="mb-5 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Step: idle → send */}
                    {(step === 'idle' || step === 'sending') && (
                        <button
                            onClick={() => sendCode()}
                            disabled={step === 'sending'}
                            className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-semibold transition-all shadow-lg shadow-indigo-500/25 border border-indigo-500/30 disabled:opacity-60"
                        >
                            {step === 'sending' ? (
                                <><Loader2 className="w-4 h-4 animate-spin" />Sending code…</>
                            ) : (
                                <><Mail className="w-4 h-4" />Send Verification Code<ArrowRight className="w-4 h-4 ml-auto" /></>
                            )}
                        </button>
                    )}

                    {/* Step: enter code */}
                    {(step === 'entering' || step === 'verifying') && (
                        <div>
                            <p className="text-xs text-emerald-400 mb-4 flex items-center justify-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Code sent — check your inbox
                            </p>

                            {/* 6-digit inputs */}
                            <div className="flex gap-2 mb-5 justify-center" onPaste={handlePaste}>
                                {digits.map((d, i) => (
                                    <input
                                        key={i}
                                        id={`vg-digit-${i}`}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={1}
                                        value={d}
                                        onChange={e => handleDigit(i, e.target.value)}
                                        onKeyDown={e => handleKeyDown(i, e)}
                                        autoFocus={i === 0}
                                        className="w-11 h-13 text-center text-xl font-bold bg-zinc-800 border border-zinc-700 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-zinc-100 py-3"
                                    />
                                ))}
                            </div>

                            <button
                                id="vg-verify-btn"
                                onClick={verifyCode}
                                disabled={step === 'verifying' || digits.join('').length !== 6}
                                className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-semibold transition-all shadow-lg shadow-indigo-500/25 border border-indigo-500/30 disabled:opacity-60 mb-3"
                            >
                                {step === 'verifying' ? (
                                    <><Loader2 className="w-4 h-4 animate-spin" />Verifying…</>
                                ) : (
                                    'Confirm & Verify'
                                )}
                            </button>

                            <button
                                onClick={() => sendCode(true)}
                                disabled={resending}
                                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                            >
                                {resending ? 'Resending…' : "Didn't get the code? Resend"}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
