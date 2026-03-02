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
        router.push('/dashboard');
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
    if (response.data) router.push('/dashboard');
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
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center mx-auto mb-4">
            <div className="w-7 h-7 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-zinc-400 text-sm">Loading interview session...</p>
        </div>
      </div>
    );
  }

  if (!user) { router.push('/login'); return null; }

  if (error && !interview) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-zinc-900 rounded-2xl border border-zinc-800 p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-7 h-7 text-red-400" />
          </div>
          <h2 className="text-xl font-semibold text-zinc-100 mb-2">Unable to Load Interview</h2>
          <p className="text-zinc-400 text-sm mb-6">{error}</p>
          <button
            onClick={() => router.push('/interviews')}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-colors"
          >
            Back to Interviews
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col">

      {/* Top Bar */}
      <header className="bg-zinc-950/80 backdrop-blur-md border-b border-white/10 sticky top-0 z-20">
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
        <div className="flex-1 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex flex-col overflow-hidden" style={{ minHeight: 'calc(100vh - 340px)' }}>
          <div className="px-5 py-3.5 border-b border-zinc-800 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-300">Live Transcript</h2>
            <div className="flex items-center gap-1.5 text-xs text-zinc-500">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Real-time
            </div>
          </div>

          {/* Message area */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {messages.length === 0 && !isAIThinking ? (
              <div className="flex flex-col items-center justify-center h-48 text-center">
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4">
                  <Mic className="w-7 h-7 text-indigo-400" />
                </div>
                <p className="text-zinc-400 font-medium text-sm">Ready to start</p>
                <p className="text-zinc-600 text-xs mt-1">Press the microphone button and start speaking</p>
              </div>
            ) : (
              <>
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    {/* Avatar */}
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${msg.sender === 'ai'
                      ? 'bg-gradient-to-br from-indigo-600 to-purple-600'
                      : 'bg-gradient-to-br from-zinc-700 to-zinc-600'
                      }`}>
                      {msg.sender === 'ai' ? <Bot className="w-4 h-4 text-white" /> : <User className="w-4 h-4 text-zinc-300" />}
                    </div>

                    {/* Bubble */}
                    <div className={`max-w-[75%] ${msg.sender === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
                      <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${msg.sender === 'ai'
                        ? 'bg-zinc-800 text-zinc-100 rounded-tl-sm'
                        : 'bg-indigo-600 text-white rounded-tr-sm'
                        }`}>
                        {msg.content}
                      </div>
                      <span className="text-[10px] text-zinc-600 mt-1 px-1">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}

                {/* AI thinking */}
                {isAIThinking && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-zinc-800 text-zinc-400 text-sm flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </>
            )}
          </div>
        </div>

        {/* ── Audio Controls ── */}
        <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800 p-5">
          <div className="flex items-center gap-4">
            {/* Big record button */}
            <button
              onClick={handleToggleRecording}
              className={`w-14 h-14 rounded-2xl shrink-0 flex items-center justify-center transition-all duration-200 ${isRecording
                ? 'bg-red-500 shadow-lg shadow-red-500/30 scale-95 hover:bg-red-600'
                : 'bg-indigo-600 shadow-lg shadow-indigo-500/30 hover:bg-indigo-500 hover:scale-105'
                }`}
            >
              {isRecording ? <MicOff className="w-6 h-6 text-white" /> : <Mic className="w-6 h-6 text-white" />}
            </button>

            <div className="flex-1">
              <p className="text-sm font-semibold text-zinc-200">
                {isRecording ? 'Recording — speak clearly' : 'Press to start speaking'}
              </p>
              <p className="text-xs text-zinc-500 mt-0.5">
                {isConnected
                  ? isRecording ? 'Your audio is being livestreamed to the AI' : 'Microphone is off'
                  : 'Waiting for connection...'}
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
          <div className="rounded-xl bg-zinc-900/40 border border-zinc-800/60 p-4">
            <h3 className="text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wide">How it works</h3>
            <ul className="text-xs text-zinc-500 space-y-1.5 list-disc list-inside">
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
