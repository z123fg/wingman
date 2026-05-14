import { useEffect, useRef, useCallback } from 'react';
import type { ServerMessage, ClientMessage } from '@live-transcription/shared';

type MessageHandler = (msg: ServerMessage) => void;

interface UseWebSocketReturn {
  sendJson: (msg: ClientMessage) => void;
  sendBinary: (data: ArrayBuffer) => void;
  isConnected: boolean;
}

export function useWebSocket(
  url: string,
  onMessage: MessageHandler,
): UseWebSocketReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const connectedRef = useRef(false);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    const ws = new WebSocket(url);
    ws.binaryType = 'arraybuffer';
    wsRef.current = ws;

    ws.onopen = () => {
      connectedRef.current = true;
      console.log('[WS] connected');
    };

    ws.onmessage = (event) => {
      if (typeof event.data === 'string') {
        try {
          const msg = JSON.parse(event.data) as ServerMessage;
          onMessageRef.current(msg);
        } catch {
          console.error('[WS] failed to parse message');
        }
      }
    };

    ws.onclose = () => {
      connectedRef.current = false;
      console.log('[WS] disconnected');
    };

    ws.onerror = (err) => {
      console.error('[WS] error', err);
    };

    return () => {
      ws.close();
    };
  }, [url]);

  const sendJson = useCallback((msg: ClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const sendBinary = useCallback((data: ArrayBuffer) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(data);
    }
  }, []);

  return { sendJson, sendBinary, isConnected: connectedRef.current };
}
