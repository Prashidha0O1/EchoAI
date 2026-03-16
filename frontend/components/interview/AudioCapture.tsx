'use client';

import { useEffect } from 'react';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { cn } from '@/lib/utils';
import { Mic, MicOff, Pause, Play } from 'lucide-react';

interface AudioCaptureProps {
  onAudioChunk: (blob: Blob) => void;
  isActive: boolean;
  onToggle: () => void;
  className?: string;
}

export default function AudioCapture({
  onAudioChunk,
  isActive,
  onToggle,
  className
}: AudioCaptureProps) {
  const {
    isRecording,
    isPaused,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    error,
    permissionGranted
  } = useAudioRecorder({
    onAudioChunk,
    chunkDurationMs: 1000
  });

  useEffect(() => {
    if (isActive && !isRecording) {
      startRecording();
    } else if (!isActive && isRecording) {
      stopRecording();
    }
  }, [isActive, isRecording, startRecording, stopRecording]);

  const handleToggle = () => {
    onToggle();
  };

  const handlePauseResume = () => {
    if (isPaused) {
      resumeRecording();
    } else {
      pauseRecording();
    }
  };

  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      {/* Main Recording Button */}
      <button
        onClick={handleToggle}
        disabled={!!error && !permissionGranted}
        className={cn(
          "relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300",
          "focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-offset-zinc-950",
          isRecording
            ? "bg-linear-to-br from-red-500 to-red-600 focus:ring-red-500/50 shadow-lg shadow-red-500/50 scale-110"
            : "bg-linear-to-br from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 focus:ring-indigo-500/50 shadow-lg shadow-indigo-500/30",
          error && !permissionGranted && "opacity-50 cursor-not-allowed"
        )}
      >
        {isRecording ? (
          <MicOff className="w-8 h-8 text-white" />
        ) : (
          <Mic className="w-8 h-8 text-white" />
        )}

        {/* Pulse animation when recording */}
        {isRecording && (
          <>
            <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-75"></span>
            <span className="absolute inset-0 rounded-full bg-red-500 animate-pulse opacity-50"></span>
          </>
        )}
      </button>

      {/* Status Text */}
      <div className="text-center">
        {error ? (
          <p className="text-red-400 text-sm font-medium">{error}</p>
        ) : isRecording ? (
          <div className="flex flex-col items-center gap-1">
            <p className="text-green-400 text-sm font-medium flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
              Recording...
            </p>
            {isPaused && (
              <p className="text-yellow-400 text-xs">Paused</p>
            )}
          </div>
        ) : (
          <p className="text-zinc-400 text-sm">Click to start recording</p>
        )}
      </div>

      {/* Pause/Resume Button (only shown when recording) */}
      {isRecording && (
        <button
          onClick={handlePauseResume}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
            "bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700",
            "focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-zinc-950"
          )}
        >
          {isPaused ? (
            <span className="flex items-center gap-2">
              <Play className="w-4 h-4" />
              Resume
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Pause className="w-4 h-4" />
              Pause
            </span>
          )}
        </button>
      )}

      {/* Audio Visualizer (optional visual feedback) */}
      {isRecording && !isPaused && (
        <div className="flex items-center gap-1 h-8">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="w-1 bg-linear-to-t from-indigo-600 to-purple-500 rounded-full animate-pulse"
              style={{
                height: `${Math.random() * 100}%`,
                animationDelay: `${i * 50}ms`,
                animationDuration: '600ms'
              }}
            />
          ))}
        </div>
      )}

      {/* Permission Info */}
      {!permissionGranted && !error && (
        <p className="text-xs text-zinc-500 max-w-xs text-center">
          Microphone access is required for voice interviews
        </p>
      )}
    </div>
  );
}
