import WebSocket, { WebSocketServer } from 'ws';
import type { ServerMessage } from '@live-transcription/shared';
import { getAllSessions, toSessionInfo } from './sessionManager.js';
import type { Session } from './sessionManager.js';

/** Send a typed message to a single WebSocket, no-op if not open. */
export function sendTo(ws: WebSocket, msg: ServerMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

/** Broadcast the current session list to every connected client. */
export function broadcastSessionList(wss: WebSocketServer): void {
  const sessions = getAllSessions().map(toSessionInfo);
  const payload = JSON.stringify({ type: 'session_list', sessions } satisfies ServerMessage);
  wss.clients.forEach((c) => {
    if (c.readyState === WebSocket.OPEN) c.send(payload);
  });
}

/** Fan out a raw PCM binary audio chunk to all consumers in a session. */
export function broadcastAudioToConsumers(session: Session, data: Buffer): void {
  session.consumers.forEach((c) => {
    if (c.readyState === WebSocket.OPEN) c.send(data);
  });
}

/**
 * Notify all consumers in a session that it has ended,
 * then broadcast the updated session list to everyone.
 */
export function notifySessionEnded(session: Session, wss: WebSocketServer): void {
  const payload = JSON.stringify(
    { type: 'session_ended', sessionId: session.id } satisfies ServerMessage,
  );
  session.consumers.forEach((c) => {
    if (c.readyState === WebSocket.OPEN) c.send(payload);
  });
  broadcastSessionList(wss);
}
