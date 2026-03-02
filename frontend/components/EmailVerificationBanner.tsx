'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { AlertCircle, Mail, X, Loader2, CheckCircle2, RefreshCw } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/* ─── Helpers ──────────────────────────────────────────────────── */
const getToken = () =>
    typeof window !== 'undefined' ? localStorage.getItem('access_token') ?? '' : '';

/* ─── Verification Modal ──────────────────────────────────────── */
function VerificationModal({
    isOpen,
    userEmail,
    onClose,
    onSuccess,
}: {
    isOpen: boolean;
    userEmail: string;
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [digits, setDigits] = useState(['', '', '', '', '', '']);
    const [verifying, setVerifying] = useState(false);
    const [sending, setSending] = useState(false);
    const [codeSent, setCodeSent] = useState(false);
    const [sendError, setSendError] = useState('');
    const [verifyError, setVerifyError] = useState('');
    const [devCode, setDevCode] = useState<string | null>(null); // shown when SMTP not configured
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    /* Send code automatically when modal opens */
    useEffect(() => {
        if (isOpen) {
            setDigits(['', '', '', '', '', '']);
            setVerifyError('');
            setSendError('');
            setCodeSent(false);
            setDevCode(null);
            sendCode();
        }
    }, [isOpen]);

    /* Close on Escape */
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    const sendCode = async () => {
        setSending(true);
        setSendError('');
        setDevCode(null);
        try {
            const res = await fetch(`${API}/verification/send`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${getToken()}` },
            });
            const d = await res.json().catch(() => ({}));
            if (res.ok) {
                setCodeSent(true);
                // Backend returns dev_code when SMTP isn't working
                if (d.dev_code) {
                    setDevCode(d.dev_code);
                }
            } else {
                setSendError(d.detail || 'Could not send code. Check your email settings.');
            }
        } catch {
            setSendError('Network error — could not send code.');
        } finally {
            setSending(false);
        }
    };

    const handleDigit = (i: number, val: string) => {
        if (!/^\d?$/.test(val)) return;
        const next = [...digits];
        next[i] = val;
        setDigits(next);
        if (val && i < 5) inputRefs.current[i + 1]?.focus();
    };

    const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !digits[i] && i > 0)
            inputRefs.current[i - 1]?.focus();
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const raw = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (!raw) return;
        const next = raw.split('').concat(Array(6 - raw.length).fill(''));
        setDigits(next.slice(0, 6));
        if (raw.length >= 6) inputRefs.current[5]?.focus();
    };

    const verify = async () => {
        const code = digits.join('');
        if (code.length !== 6) { setVerifyError('Please enter all 6 digits.'); return; }
        setVerifying(true);
        setVerifyError('');
        try {
            const res = await fetch(`${API}/verification/verify`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${getToken()}`,
                },
                body: JSON.stringify({ code }),
            });
            if (res.ok) {
                onSuccess();
                onClose();
            } else {
                const d = await res.json().catch(() => ({}));
                setVerifyError(d.detail || 'Incorrect code. Please try again.');
            }
        } catch {
            setVerifyError('Network error. Please try again.');
        } finally {
            setVerifying(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-8 relative shadow-2xl">
                {/* Close */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>

                {/* Header */}
                <div className="text-center mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/30">
                        <Mail className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-1">Verify Your Email</h2>
                    <p className="text-sm text-zinc-400">
                        Enter the 6-digit code sent to{' '}
                        <span className="text-zinc-200 font-medium">{userEmail}</span>
                    </p>
                </div>

                {/* Send status */}
                <div className="mb-5 text-center text-sm">
                    {sending && (
                        <span className="text-zinc-400 flex items-center justify-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Sending code to your email…
                        </span>
                    )}
                    {!sending && codeSent && (
                        <span className="text-emerald-400 flex items-center justify-center gap-2">
                            <CheckCircle2 className="w-4 h-4" />
                            Code sent! Check your inbox.
                        </span>
                    )}
                    {!sending && sendError && (
                        <div className="px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-xs">
                            {sendError}
                            <button
                                onClick={sendCode}
                                className="ml-2 underline hover:text-amber-300"
                            >
                                Retry
                            </button>
                        </div>
                    )}
                </div>

                {/* Dev fallback: show code when SMTP is not configured */}
                {devCode && (
                    <div className="mb-5 px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-center">
                        <p className="text-xs text-amber-400 font-medium mb-1">Email not configured — use this code:</p>
                        <p className="text-2xl font-bold tracking-[0.3em] text-amber-300">{devCode}</p>
                        <p className="text-xs text-zinc-500 mt-1">Also printed in the backend console</p>
                    </div>
                )}

                {/* 6-digit input */}
                <div className="flex gap-2 justify-center mb-5" onPaste={handlePaste}>
                    {digits.map((d, i) => (
                        <input
                            key={i}
                            ref={el => { inputRefs.current[i] = el; }}
                            id={`verify-digit-${i}`}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={d}
                            onChange={e => handleDigit(i, e.target.value)}
                            onKeyDown={e => handleKeyDown(i, e)}
                            autoFocus={i === 0}
                            className="w-12 h-14 text-center text-2xl font-bold bg-zinc-800 border-2 border-zinc-700 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-white caret-transparent"
                        />
                    ))}
                </div>

                {/* Verify error */}
                {verifyError && (
                    <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center">
                        {verifyError}
                    </div>
                )}

                {/* Verify button */}
                <button
                    onClick={verify}
                    disabled={verifying || digits.join('').length !== 6}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-semibold transition-all shadow-lg shadow-indigo-500/25 border border-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed mb-3"
                >
                    {verifying ? (
                        <><Loader2 className="w-4 h-4 animate-spin" />Verifying…</>
                    ) : (
                        'Confirm & Verify'
                    )}
                </button>

                {/* Resend */}
                <button
                    onClick={sendCode}
                    disabled={sending}
                    className="w-full flex items-center justify-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-50"
                >
                    <RefreshCw className="w-3.5 h-3.5" />
                    {sending ? 'Sending…' : "Didn't receive it? Resend code"}
                </button>
            </div>
        </div>
    );
}

/* ─── Banner ──────────────────────────────────────────────────── */
export default function EmailVerificationBanner() {
    const { user, refreshUser } = useAuth();
    const [dismissed, setDismissed] = useState(false);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        const wasDismissed = sessionStorage.getItem('verification-banner-dismissed');
        setDismissed(!!wasDismissed);
    }, []);

    const handleDismiss = () => {
        setDismissed(true);
        sessionStorage.setItem('verification-banner-dismissed', 'true');
    };

    const handleSuccess = async () => {
        await refreshUser();   // update user.email_verified in context — no reload needed
    };

    if (!user || user.email_verified || dismissed) return null;

    return (
        <>
            <div className="bg-linear-to-r from-indigo-600 to-purple-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            <div className="min-w-0">
                                <p className="text-sm font-semibold truncate">
                                    Verify your email to unlock all features
                                </p>
                                <p className="text-xs text-indigo-100 truncate">
                                    {user.email}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                            <button
                                onClick={() => setShowModal(true)}
                                className="px-4 py-1.5 bg-white text-indigo-600 rounded-lg text-sm font-semibold hover:bg-indigo-50 transition-colors whitespace-nowrap"
                            >
                                Verify Email
                            </button>
                            <button
                                onClick={handleDismiss}
                                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                                aria-label="Dismiss"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <VerificationModal
                isOpen={showModal}
                userEmail={user.email}
                onClose={() => setShowModal(false)}
                onSuccess={handleSuccess}
            />
        </>
    );
}
