'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

export interface TranscriptMessage {
  sender: 'user' | 'ai';
  content: string;
  timestamp: string;
}

interface LiveTranscriptProps {
  messages: TranscriptMessage[];
  isAIThinking?: boolean;
  className?: string;
}

export default function LiveTranscript({ 
  messages, 
  isAIThinking = false,
  className 
}: LiveTranscriptProps) {
  const userScrollRef = useRef<HTMLDivElement>(null);
  const aiScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (userScrollRef.current) {
      userScrollRef.current.scrollTop = userScrollRef.current.scrollHeight;
    }
    if (aiScrollRef.current) {
      aiScrollRef.current.scrollTop = aiScrollRef.current.scrollHeight;
    }
  }, [messages]);

  const userMessages = messages.filter(msg => msg.sender === 'user');
  const aiMessages = messages.filter(msg => msg.sender === 'ai');

  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return '';
    }
  };

  return (
    <div className={cn("flex gap-4 h-full", className)}>
      {/* User Column */}
      <div className="flex-1 flex flex-col bg-zinc-900/50 rounded-xl border border-zinc-800 overflow-hidden">
        <div className="bg-zinc-800/80 px-4 py-3 border-b border-zinc-700">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <h3 className="text-sm font-semibold text-zinc-100">You</h3>
          </div>
        </div>
        
        <div 
          ref={userScrollRef}
          className="flex-1 overflow-y-auto p-4 space-y-3"
        >
          {userMessages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
              Your responses will appear here...
            </div>
          ) : (
            userMessages.map((msg, idx) => (
              <div 
                key={`user-${idx}`}
                className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50"
              >
                <p className="text-zinc-200 text-sm leading-relaxed">{msg.content}</p>
                <span className="text-xs text-zinc-500 mt-2 block">
                  {formatTime(msg.timestamp)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* AI Column */}
      <div className="flex-1 flex flex-col bg-zinc-900/50 rounded-xl border border-zinc-800 overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-900/50 to-purple-900/50 px-4 py-3 border-b border-indigo-700/50">
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-2 h-2 rounded-full",
              isAIThinking ? "bg-yellow-500 animate-pulse" : "bg-indigo-500"
            )}></div>
            <h3 className="text-sm font-semibold text-zinc-100">AI Interviewer</h3>
            {isAIThinking && (
              <span className="text-xs text-zinc-400 ml-auto">Thinking...</span>
            )}
          </div>
        </div>
        
        <div 
          ref={aiScrollRef}
          className="flex-1 overflow-y-auto p-4 space-y-3"
        >
          {aiMessages.length === 0 && !isAIThinking ? (
            <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
              AI responses will appear here...
            </div>
          ) : (
            <>
              {aiMessages.map((msg, idx) => (
                <div 
                  key={`ai-${idx}`}
                  className="bg-gradient-to-br from-indigo-900/20 to-purple-900/20 rounded-lg p-3 border border-indigo-700/30"
                >
                  <p className="text-zinc-200 text-sm leading-relaxed">{msg.content}</p>
                  <span className="text-xs text-indigo-400 mt-2 block">
                    {formatTime(msg.timestamp)}
                  </span>
                </div>
              ))}
              
              {isAIThinking && (
                <div className="bg-gradient-to-br from-indigo-900/20 to-purple-900/20 rounded-lg p-3 border border-indigo-700/30">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                    <span className="text-sm text-zinc-400">AI is thinking...</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
