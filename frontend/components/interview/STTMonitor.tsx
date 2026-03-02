'use client';

import { useState, useEffect } from 'react';
import { Mic, Activity, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface STTMonitorProps {
    isRecording: boolean;
    isConnected: boolean;
    lastTranscript?: string;
}

export default function STTMonitor({ isRecording, isConnected, lastTranscript }: STTMonitorProps) {
    const [micLevel, setMicLevel] = useState(0);

    useEffect(() => {
        if (!isRecording) {
            setMicLevel(0);
            return;
        }

        let audioContext: AudioContext;
        let analyser: AnalyserNode;
        let dataArray: Uint8Array<ArrayBuffer>;
        let animationFrame: number;

        async function setupMic() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                const source = audioContext.createMediaStreamSource(stream);
                analyser = audioContext.createAnalyser();
                analyser.fftSize = 256;
                source.connect(analyser);

                dataArray = new Uint8Array(analyser.frequencyBinCount);

                const update = () => {
                    analyser.getByteFrequencyData(dataArray);
                    const sum = dataArray.reduce((a, b) => a + b, 0);
                    const average = sum / dataArray.length;
                    setMicLevel(average);
                    animationFrame = requestAnimationFrame(update);
                };
                update();
            } catch (err) {
                console.error('Error accessing mic for visualization:', err);
            }
        }

        setupMic();

        return () => {
            if (animationFrame) cancelAnimationFrame(animationFrame);
            if (audioContext) audioContext.close();
        };
    }, [isRecording]);

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
            {/* Transcript Preview Bubble */}
            {isRecording && lastTranscript && (
                <div className="bg-zinc-900/90 backdrop-blur-md border border-zinc-800 rounded-2xl px-4 py-3 shadow-2xl max-w-xs animate-in slide-in-from-right-4 fade-in duration-300">
                    <p className="text-zinc-400 text-[10px] uppercase font-bold tracking-wider mb-1">Last Captured</p>
                    <p className="text-zinc-100 text-sm line-clamp-2 italic">"{lastTranscript}"</p>
                </div>
            )}

            {/* Main Status Bar */}
            <div className={cn(
                "bg-zinc-950/80 backdrop-blur-md border border-zinc-800 rounded-full pl-4 pr-1.5 py-1.5 flex items-center gap-4 shadow-xl transition-all duration-300",
                isRecording ? " ring-1 ring-emerald-500/20" : ""
            )}>
                {/* Connectivity Status */}
                <div className="flex items-center gap-2 pr-2 border-r border-zinc-800">
                    {isConnected ? (
                        <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                            <span className="text-xs font-medium text-emerald-400">STT Live</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 text-zinc-500">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                            <span className="text-xs font-medium">Offline</span>
                        </div>
                    )}
                </div>

                {/* Mic Activity */}
                <div className="flex items-center gap-3">
                    <div className="flex gap-0.5 items-end h-4 w-12">
                        {[...Array(6)].map((_, i) => (
                            <div
                                key={i}
                                className={cn(
                                    "w-1 rounded-full transition-all duration-75 origin-bottom",
                                    isRecording
                                        ? micLevel > 10 + i * 15 ? "bg-emerald-400" : "bg-zinc-700"
                                        : "bg-zinc-800"
                                )}
                                style={{
                                    height: isRecording ? `${Math.min(100, (micLevel / 100) * 100 * (0.4 + Math.random() * 0.6))}%` : '20%'
                                }}
                            />
                        ))}
                    </div>

                    <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                        isRecording ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-800 text-zinc-500"
                    )}>
                        <Mic className={cn("w-4 h-4", isRecording && "animate-pulse")} />
                    </div>
                </div>
            </div>
        </div>
    );
}
