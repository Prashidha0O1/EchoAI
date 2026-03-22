'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useWebSocket, TranscriptMessage, WebSocketMessage } from '@/hooks/useWebSocket';
import { interviewApi, getToken } from '@/lib/api';
import LiveTranscript from '@/components/interview/LiveTranscript';
import AudioCapture from '@/components/interview/AudioCapture';
import Button from '@/components/Button';
import {
  ArrowLeft,
  Download,
  AlertCircle,
  Mic,
  MicOff,
  Wifi,
  WifiOff,
  StopCircle,
  Bot,
  User,
  Clock,
} from 'lucide-react';
import STTMonitor from '@/components/interview/STTMonitor';

interface Interview {
  id: number;
  interview_type: string;
  job_description: string | null;
  status: string;
  started_at: string | null;
  completed_at: string | null;
}

function ConnectionDot({ connected }: { connected: boolean }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium ${connected
      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
      : 'bg-red-500/10 border-red-500/30 text-red-400'
      }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
      {connected ? 'Connected' : 'Disconnected'}
    </div>
  );
}

export default function InterviewSessionPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const bottomRef = useRef<HTMLDivElement>(null);

  const interviewId = parseInt(params.id as string);
  const [interview, setInterview] = useState<Interview | null>(null);
  const [messages, setMessages] = useState<TranscriptMessage[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [audioQueue, setAudioQueue] = useState<string[]>([]);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Timer
  useEffect(() => {
    const t = setInterval(() => setElapsedSeconds(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  // Auto-scroll to bottom when messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAIThinking]);

  // Load interview details
  useEffect(() => {
    const loadInterview = async () => {
      if (!interviewId || isNaN(interviewId)) {
        setError('Invalid interview ID');
        setIsInitializing(false);
        return;
      }
      const response = await interviewApi.get(interviewId);
      if (response.data) {
        setInterview(response.data);
        if (response.data.status !== 'in_progress') {
          setError(`Interview is ${response.data.status}. Please start the interview first.`);
        }
      } else {
        setError(response.error || 'Failed to load interview');
      }
      setIsInitializing(false);
    };

    if (!authLoading) loadInterview();
  }, [interviewId, authLoading]);

  const handleWebSocketMessage = useCallback((message: WebSocketMessage) => {
    switch (message.type) {
      case 'connected':
        break;
      case 'user_transcript':
        if (message.text && message.timestamp) {
          setMessages(prev => [...prev, { sender: 'user', content: message.text!, timestamp: message.timestamp! }]);
          setIsAIThinking(true);
        }
        break;
      case 'ai_transcript':
        if (message.text && message.timestamp) {
          setMessages(prev => [...prev, { sender: 'ai', content: message.text!, timestamp: message.timestamp! }]);
          setIsAIThinking(false);
        }
        break;
      case 'ai_audio':
        if (message.data) {
          setAudioQueue(prev => [...prev, message.data!]);
          setIsAIThinking(false);
        }
        break;
      case 'error':
        setError(message.message || 'An error occurred');
        setIsAIThinking(false);
        break;
      case 'interview_ended':
        router.push(`/interviews/${interviewId}/report`);
        break;
    }
  }, [router]);

  useEffect(() => {
    if (audioQueue.length > 0 && !isPlayingAudio) playNextAudio();
  }, [audioQueue, isPlayingAudio]);

  const playNextAudio = async () => {
    if (!audioQueue.length) return;
    setIsPlayingAudio(true);
    const hexData = audioQueue[0];
    try {
      const bytes = new Uint8Array(hexData.match(/.{1,2}/g)!.map(b => parseInt(b, 16)));
      const blob = new Blob([bytes], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => { URL.revokeObjectURL(url); setAudioQueue(p => p.slice(1)); setIsPlayingAudio(false); };
      audio.onerror = () => { URL.revokeObjectURL(url); setAudioQueue(p => p.slice(1)); setIsPlayingAudio(false); };
      await audio.play();
    } catch {
      setAudioQueue(p => p.slice(1));
      setIsPlayingAudio(false);
    }
  };

  const token = getToken();
  const { isConnected, sendAudio, disconnect, error: wsError } = useWebSocket({
    interviewId,
    token: token || '',
    onMessage: handleWebSocketMessage,
    onConnect: () => setError(null),
    onDisconnect: () => { },
    onError: () => setError('WebSocket connection error'),
  });

  const handleAudioChunk = useCallback((blob: Blob) => {
    if (isConnected) sendAudio(blob);
  }, [isConnected, sendAudio]);

  const handleToggleRecording = () => setIsRecording(p => !p);

  const handleEndInterview = async () => {
    if (!window.confirm('End this interview session?')) return;
    setIsRecording(false);
    disconnect();
    const response = await interviewApi.end(interviewId);
    if (response.data) router.push(`/interviews/${interviewId}/report`);
    else setError(response.error || 'Failed to end interview');
  };

  const handleDownloadTranscript = () => {
    const text = messages.map(m =>
      `[${new Date(m.timestamp).toLocaleTimeString()}] ${m.sender.toUpperCase()}: ${m.content}`
    ).join('\n\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `interview-${interviewId}-transcript.txt`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  // Loading
  if (authLoading || isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#060a07' }}>
        <div className="text-center">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3"
            style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'rgba(255,255,255,0.2)', borderTopColor: '#10b981' }} />
          </div>
          <p className="text-sm" style={{ color: '#6b7280' }}>Loading interview session…</p>
        </div>
      </div>
    );
  }

  if (!user) { router.push('/login'); return null; }

  if (error && !interview) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#060a07' }}>
        <div
          className="max-w-md w-full rounded-xl p-8 text-center"
          style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3"
            style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}
          >
            <AlertCircle className="w-6 h-6" style={{ color: '#f87171' }} />
          </div>
          <h2 className="text-lg font-semibold mb-2" style={{ color: '#f9fafb' }}>Unable to Load Interview</h2>
          <p className="text-sm mb-5" style={{ color: '#6b7280' }}>{error}</p>
          <button
            onClick={() => router.push('/interviews')}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ background: '#10b981', color: '#fff' }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = '#059669')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = '#10b981')}
          >
            Back to Interviews
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#060a07', color: '#f0fdf4' }}>

      {/* Top Bar */}
      <header className="sticky top-0 z-20 backdrop-blur-md" style={{ background: 'rgba(6,10,7,0.85)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/interviews')}
                className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h1 className="text-sm font-semibold text-zinc-100 leading-tight">
                  {interview?.interview_type ? `${interview.interview_type.charAt(0).toUpperCase() + interview.interview_type.slice(1)} Interview` : 'Interview Session'}
                </h1>
                <p className="text-xs text-zinc-500">Session #{interviewId}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Timer */}
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-800/80 border border-zinc-700 text-xs font-mono text-zinc-300">
                <Clock className="w-3.5 h-3.5 text-zinc-500" />
                {formatTime(elapsedSeconds)}
              </div>

              <ConnectionDot connected={isConnected} />

              {messages.length > 0 && (
                <button
                  onClick={handleDownloadTranscript}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 text-xs font-medium transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export
                </button>
              )}

              <button
                onClick={handleEndInterview}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 text-xs font-semibold transition-colors"
              >
                <StopCircle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">End</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 flex flex-col gap-4">

        {/* Alerts */}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}
        {wsError && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {wsError}
          </div>
        )}

        {/* ── Real-Time Transcript Panel ── */}
        <div className="flex-1 flex flex-col min-h-[400px]" style={{ minHeight: 'calc(100vh - 340px)' }}>
          <LiveTranscript
            messages={messages}
            isAIThinking={isAIThinking}
          />
        </div>

        {/* ── Audio Controls ── */}
        <div
          className="rounded-xl p-5"
          style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="flex items-center gap-4">
            {/* Big record button */}
            <button
              onClick={handleToggleRecording}
              className="w-14 h-14 rounded-xl shrink-0 flex items-center justify-center transition-all duration-200"
              style={isRecording
                ? { background: '#ef4444', boxShadow: '0 0 20px rgba(239,68,68,0.3)' }
                : { background: '#10b981', boxShadow: '0 0 20px rgba(16,185,129,0.2)' }
              }
            >
              {isRecording ? <MicOff className="w-6 h-6 text-white" /> : <Mic className="w-6 h-6 text-white" />}
            </button>

            <div className="flex-1">
              <p className="text-sm font-medium" style={{ color: '#e5e7eb' }}>
                {isRecording ? 'Recording — speak clearly' : 'Press to start speaking'}
              </p>
              <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>
                {isConnected
                  ? isRecording ? 'Your audio is being streamed to the AI' : 'Microphone is off'
                  : 'Waiting for connection…'}
              </p>
            </div>

            {/* Visual pulse when recording */}
            {isRecording && (
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map(i => (
                  <div
                    key={i}
                    className="w-1 rounded-full bg-red-400 animate-pulse"
                    style={{
                      height: `${8 + Math.random() * 20}px`,
                      animationDelay: `${i * 80}ms`,
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Hidden audio capture */}
          <div className="sr-only">
            <AudioCapture
              onAudioChunk={handleAudioChunk}
              isActive={isRecording}
              onToggle={handleToggleRecording}
            />
          </div>
        </div>

        {/* Instructions on first load */}
        {messages.length === 0 && (
          <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-xs font-medium uppercase tracking-wider mb-2.5" style={{ color: '#6b7280' }}>How it works</p>
            <ul className="space-y-1.5 list-disc list-inside" style={{ color: '#6b7280', fontSize: '13px' }}>
              <li>Press the microphone button to start recording</li>
              <li>Speak your answer clearly — the AI transcribes in real time</li>
              <li>The AI interviewer will respond with questions based on your CV and job description</li>
              <li>Your full conversation is shown above on both sides</li>
              <li>Press "End" when you are finished — a report will be generated</li>
            </ul>
          </div>
        )}
      </main>

      <STTMonitor
        isRecording={isRecording}
        isConnected={isConnected}
        lastTranscript={messages.filter(m => m.sender === 'user').pop()?.content}
      />
    </div>
  );
}
