import { useEffect, useRef, useState, useCallback } from 'react';

export interface WebSocketMessage {
  type: 'connected' | 'user_transcript' | 'ai_transcript' | 'ai_audio' | 'error' | 'interview_ended' | 'pong';
  text?: string;
  message?: string;
  data?: string;
  timestamp?: string;
  interview_id?: number;
}

export interface TranscriptMessage {
  sender: 'user' | 'ai';
  content: string;
  timestamp: string;
}

interface UseWebSocketProps {
  interviewId: number;
  token: string;
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  sendAudio: (audioData: Blob) => Promise<void>;
  disconnect: () => void;
  error: string | null;
}

export function useWebSocket({
  interviewId,
  token,
  onMessage,
  onConnect,
  onDisconnect,
  onError
}: UseWebSocketProps): UseWebSocketReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    try {
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';
      const url = `${wsUrl}/ws/interview?interview_id=${interviewId}&token=${token}`;
      
      console.log('Connecting to WebSocket:', url);
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
        onConnect?.();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('WebSocket message received:', data);
          onMessage?.(data);
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      ws.onerror = (event) => {
        console.error('WebSocket error:', event);
        setError('WebSocket connection error');
        onError?.(event);
      };

      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        setIsConnected(false);
        onDisconnect?.();

        // Attempt to reconnect if not manually closed
        if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current += 1;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000);
          console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          setError('Failed to reconnect after multiple attempts');
        }
      };

    } catch (err) {
      console.error('Error creating WebSocket:', err);
      setError('Failed to create WebSocket connection');
    }
  }, [interviewId, token, onMessage, onConnect, onDisconnect, onError]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounted');
        wsRef.current = null;
      }
    };
  }, [connect]);

  const sendAudio = useCallback(async (audioBlob: Blob) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected, cannot send audio');
      return;
    }

    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      wsRef.current.send(arrayBuffer);
      console.log('Sent audio data:', arrayBuffer.byteLength, 'bytes');
    } catch (err) {
      console.error('Error sending audio:', err);
      setError('Failed to send audio data');
    }
  }, []);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
      wsRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    setIsConnected(false);
  }, []);

  return {
    isConnected,
    sendAudio,
    disconnect,
    error
  };
}
