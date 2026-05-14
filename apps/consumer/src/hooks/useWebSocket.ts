import { useEffect, useRef, useCallback } from 'react';
import type { ServerMessage, ClientMessage } from '@live-transcription/shared';

type MessageHandler = (msg: ServerMessage) => void;
type BinaryHandler = (data: ArrayBuffer) => void;

export function useWebSocket(
  url: string,
  onMessage: MessageHandler,
  onBinaryMessage?: BinaryHandler,
) {
  const wsRef = useRef<WebSocket | null>(null);
  const onMessageRef = useRef(onMessage);
  const onBinaryRef = useRef(onBinaryMessage);
  onMessageRef.current = onMessage;
  onBinaryRef.current = onBinaryMessage;

  useEffect(() => {
    const ws = new WebSocket(url);
    ws.binaryType = 'arraybuffer';
    wsRef.current = ws;

    ws.onopen = () => console.log('[WS] connected');
    ws.onclose = () => console.log('[WS] disconnected');
    ws.onerror = (e) => console.error('[WS] error', e);

    ws.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer) {
        onBinaryRef.current?.(event.data);
        return;
      }
      try {
        const msg = JSON.parse(event.data as string) as ServerMessage;
        onMessageRef.current(msg);
      } catch {
        console.error('[WS] parse error');
      }
    };

    return () => ws.close();
  }, [url]);

  const sendJson = useCallback((msg: ClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  return { sendJson };
}
