'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { interviewApi, getToken } from '@/lib/api';
import DashboardLayout from '@/components/DashboardLayout';
import {
    ArrowLeft,
    Bot,
    User,
    Send,
    StopCircle,
    Clock,
    Wifi,
    WifiOff,
    Loader2,
    MessageSquare,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatMessage {
    id: string;
    sender: 'ai' | 'user';
    text: string;
    timestamp: string;
}

interface Interview {
    id: number;
    interview_type: string;
    job_description: string | null;
    status: string;
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function ConnectionDot({ connected }: { connected: boolean }) {
    return (
        <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium ${
                connected
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}
        >
            {connected ? (
                <Wifi className="w-3 h-3" />
            ) : (
                <WifiOff className="w-3 h-3" />
            )}
            {connected ? 'Connected' : 'Disconnected'}
        </div>
    );
}

function AiBubble({ message }: { message: ChatMessage }) {
    return (
        <div className="flex items-start gap-3 max-w-[80%]">
            {/* Avatar */}
            <div
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)' }}
            >
                <Bot className="w-4 h-4" style={{ color: '#10b981' }} />
            </div>
            {/* Bubble */}
            <div>
                <div
                    className="px-4 py-3 rounded-2xl rounded-tl-sm text-sm leading-relaxed"
                    style={{ background: '#1a1a1a', color: '#e5e7eb', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                    {message.text}
                </div>
                <p className="text-xs mt-1 ml-1" style={{ color: '#4b5563' }}>
                    AI Interviewer · {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
            </div>
        </div>
    );
}

function UserBubble({ message }: { message: ChatMessage }) {
    return (
        <div className="flex items-start gap-3 max-w-[80%] ml-auto flex-row-reverse">
            {/* Avatar */}
            <div
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: '#064e3b', border: '1px solid rgba(16,185,129,0.25)' }}
            >
                <User className="w-4 h-4" style={{ color: '#10b981' }} />
            </div>
            {/* Bubble */}
            <div className="flex flex-col items-end">
                <div
                    className="px-4 py-3 rounded-2xl rounded-tr-sm text-sm leading-relaxed"
                    style={{ background: '#064e3b', color: '#d1fae5', border: '1px solid rgba(16,185,129,0.2)' }}
                >
                    {message.text}
                </div>
                <p className="text-xs mt-1 mr-1" style={{ color: '#4b5563' }}>
                    You · {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
            </div>
        </div>
    );
}

function ThinkingIndicator() {
    return (
        <div className="flex items-start gap-3 max-w-[80%]">
            <div
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)' }}
            >
                <Bot className="w-4 h-4" style={{ color: '#10b981' }} />
            </div>
            <div
                className="px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-2"
                style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)' }}
            >
                <span className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                        <span
                            key={i}
                            className="w-1.5 h-1.5 rounded-full animate-bounce"
                            style={{
                                background: '#6b7280',
                                animationDelay: `${i * 0.15}s`,
                                animationDuration: '0.9s',
                            }}
                        />
                    ))}
                </span>
                <span className="text-xs" style={{ color: '#6b7280' }}>AI is thinking…</span>
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ChatInterviewPage() {
    const params = useParams();
    const router = useRouter();
    const { user, isLoading: authLoading } = useAuth();

    const interviewId = parseInt(params.id as string);

    const [interview, setInterview] = useState<Interview | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const [isAiThinking, setIsAiThinking] = useState(false);
    const [isEnding, setIsEnding] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isInitializing, setIsInitializing] = useState(true);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);

    const wsRef = useRef<WebSocket | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Timer
    useEffect(() => {
        const t = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
        return () => clearInterval(t);
    }, []);

    const formatTime = (s: number) =>
        `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

    // Auto-scroll
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isAiThinking]);

    // Load interview metadata
    useEffect(() => {
        if (!interviewId || isNaN(interviewId)) return;
        interviewApi.get(interviewId).then((res) => {
            if (res.data) setInterview(res.data as unknown as Interview);
        });
    }, [interviewId]);

    // Connect WebSocket
    const connect = useCallback(async () => {
        if (!interviewId || isNaN(interviewId)) return;
        const token = getToken();
        if (!token) {
            setError('Not authenticated. Please log in.');
            setIsInitializing(false);
            return;
        }

        const wsUrl = `ws://localhost:8000/ws/chat-interview?interview_id=${interviewId}&token=${token}`;
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
            setIsConnected(true);
            setError(null);
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                if (data.type === 'connected') {
                    setIsInitializing(false);
                    setIsAiThinking(true); // waiting for the greeting
                }

                if (data.type === 'ai_message') {
                    setIsAiThinking(false);
                    setIsInitializing(false);
                    const msg: ChatMessage = {
                        id: `ai-${Date.now()}-${Math.random()}`,
                        sender: 'ai',
                        text: data.text,
                        timestamp: data.timestamp ?? new Date().toISOString(),
                    };
                    setMessages((prev) => [...prev, msg]);
                }

                if (data.type === 'error') {
                    setError(data.message);
                    setIsAiThinking(false);
                    setIsInitializing(false);
                }

                if (data.type === 'interview_ended') {
                    setIsEnding(false);
                    router.push(`/interviews/${interviewId}/report`);
                }
            } catch {
                /* ignore malformed messages */
            }
        };

        ws.onclose = () => {
            setIsConnected(false);
        };

        ws.onerror = () => {
            setError('Connection error. Please refresh and try again.');
            setIsConnected(false);
            setIsInitializing(false);
        };
    }, [interviewId, router]);

    useEffect(() => {
        if (!authLoading && user) {
            connect();
        }
        return () => {
            wsRef.current?.close();
        };
    }, [authLoading, user, connect]);

    // Send a message
    const sendMessage = useCallback(() => {
        const text = inputText.trim();
        if (!text || !isConnected || isAiThinking) return;

        // Optimistically add user bubble
        const userMsg: ChatMessage = {
            id: `user-${Date.now()}`,
            sender: 'user',
            text,
            timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, userMsg]);
        setInputText('');
        setIsAiThinking(true);

        wsRef.current?.send(JSON.stringify({ type: 'user_message', text }));
        inputRef.current?.focus();
    }, [inputText, isConnected, isAiThinking]);

    // End interview
    const endInterview = useCallback(async () => {
        if (isEnding) return;
        setIsEnding(true);
        try {
            await interviewApi.end(interviewId);
        } catch {
            /* ignore — we'll redirect anyway */
        }
        wsRef.current?.send(JSON.stringify({ type: 'end_interview' }));
        // Fallback redirect in case the WS message doesn't arrive
        setTimeout(() => router.push(`/interviews/${interviewId}/report`), 2000);
    }, [interviewId, isEnding, router]);

    // Handle Enter key in textarea
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    // ── Render ────────────────────────────────────────────────────────────────

    if (isInitializing && !error) {
        return (
            <DashboardLayout>
                <div className="flex flex-col items-center justify-center h-[70vh] gap-4">
                    <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#10b981' }} />
                    <p className="text-sm" style={{ color: '#6b7280' }}>Connecting to interview session…</p>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="max-w-3xl mx-auto flex flex-col" style={{ height: 'calc(100vh - 80px)' }}>

                {/* ── Top bar ── */}
                <div
                    className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl mb-3 shrink-0"
                    style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.push('/interviews')}
                            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors shrink-0"
                            style={{ background: '#1a1a1a', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.07)' }}
                            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#f9fafb')}
                            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#9ca3af')}
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </button>
                        <div>
                            <div className="flex items-center gap-2">
                                <MessageSquare className="w-4 h-4" style={{ color: '#10b981' }} />
                                <p className="text-sm font-medium" style={{ color: '#e5e7eb' }}>
                                    Chat Interview
                                    {interview && (
                                        <span className="ml-1.5 capitalize" style={{ color: '#6b7280' }}>
                                            · {interview.interview_type}
                                        </span>
                                    )}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                        {/* Timer */}
                        <div
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono font-medium"
                            style={{ background: 'rgba(255,255,255,0.05)', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.08)' }}
                        >
                            <Clock className="w-3 h-3" />
                            {formatTime(elapsedSeconds)}
                        </div>

                        <ConnectionDot connected={isConnected} />

                        {/* End button */}
                        <button
                            onClick={endInterview}
                            disabled={isEnding}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
                            style={{
                                background: isEnding ? 'rgba(239,68,68,0.05)' : 'rgba(239,68,68,0.1)',
                                color: isEnding ? '#6b7280' : '#f87171',
                                border: '1px solid rgba(239,68,68,0.2)',
                            }}
                            onMouseEnter={e => { if (!isEnding) (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.18)'; }}
                            onMouseLeave={e => { if (!isEnding) (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.1)'; }}
                        >
                            {isEnding ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                                <StopCircle className="w-3 h-3" />
                            )}
                            {isEnding ? 'Ending…' : 'End Interview'}
                        </button>
                    </div>
                </div>

                {/* ── Error banner ── */}
                {error && (
                    <div
                        className="px-4 py-3 rounded-xl text-sm mb-3 shrink-0"
                        style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: '#fca5a5' }}
                    >
                        {error}
                    </div>
                )}

                {/* ── Messages area ── */}
                <div
                    className="flex-1 overflow-y-auto rounded-xl p-4 space-y-5 min-h-0"
                    style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                    {messages.length === 0 && !isAiThinking && (
                        <div className="flex flex-col items-center justify-center h-full gap-3 py-12">
                            <div
                                className="w-12 h-12 rounded-xl flex items-center justify-center"
                                style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)' }}
                            >
                                <MessageSquare className="w-6 h-6" style={{ color: '#4b5563' }} />
                            </div>
                            <p className="text-sm" style={{ color: '#6b7280' }}>Waiting for interviewer…</p>
                        </div>
                    )}

                    {messages.map((msg) =>
                        msg.sender === 'ai' ? (
                            <AiBubble key={msg.id} message={msg} />
                        ) : (
                            <UserBubble key={msg.id} message={msg} />
                        )
                    )}

                    {isAiThinking && <ThinkingIndicator />}

                    <div ref={bottomRef} />
                </div>

                {/* ── Input bar ── */}
                <div
                    className="flex items-end gap-3 p-3 mt-3 rounded-xl shrink-0"
                    style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                    <textarea
                        ref={inputRef}
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={!isConnected || isAiThinking}
                        placeholder={
                            !isConnected
                                ? 'Connecting…'
                                : isAiThinking
                                ? 'Waiting for AI response…'
                                : 'Type your answer… (Enter to send, Shift+Enter for new line)'
                        }
                        rows={2}
                        className="flex-1 resize-none text-sm leading-relaxed outline-none bg-transparent"
                        style={{
                            color: '#e5e7eb',
                            caretColor: '#10b981',
                        }}
                    />
                    <button
                        onClick={sendMessage}
                        disabled={!inputText.trim() || !isConnected || isAiThinking}
                        className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors shrink-0"
                        style={{
                            background:
                                !inputText.trim() || !isConnected || isAiThinking
                                    ? 'rgba(255,255,255,0.05)'
                                    : '#10b981',
                            color:
                                !inputText.trim() || !isConnected || isAiThinking ? '#4b5563' : '#fff',
                        }}
                        onMouseEnter={e => {
                            if (inputText.trim() && isConnected && !isAiThinking)
                                (e.currentTarget as HTMLElement).style.background = '#059669';
                        }}
                        onMouseLeave={e => {
                            if (inputText.trim() && isConnected && !isAiThinking)
                                (e.currentTarget as HTMLElement).style.background = '#10b981';
                        }}
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>

                <p className="text-center text-xs mt-2 shrink-0" style={{ color: '#374151' }}>
                    Press Enter to send · Shift+Enter for new line · Click "End Interview" when finished
                </p>
            </div>
        </DashboardLayout>
    );
}
