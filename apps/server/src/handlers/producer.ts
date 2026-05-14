import type WebSocket from 'ws';
import type { WebSocketServer } from 'ws';
import type { ProducerInitMessage, EndSessionMessage } from '@live-transcription/shared';
import {
  createSession,
  closeSession,
  getSessionByProducer,
  toSessionInfo,
} from '../sessionManager.js';
import { sendTo, broadcastSessionList, notifySessionEnded } from '../broadcast.js';
import logger from '../logger.js';

const log = logger.child({ module: 'producer' });

export function handleProducerInit(
  ws: WebSocket,
  msg: ProducerInitMessage,
  wss: WebSocketServer,
): void {
  const name = msg.sessionName?.trim();
  if (!name) {
    sendTo(ws, { type: 'error', message: 'sessionName is required' });
    return;
  }
  const session = createSession(name, ws);
  sendTo(ws, { type: 'session_created', session: toSessionInfo(session) });
  broadcastSessionList(wss);
  log.info({ sessionId: session.id, name: session.name }, 'Session created');
}

export function handleEndSession(
  ws: WebSocket,
  _msg: EndSessionMessage,
  wss: WebSocketServer,
): void {
  const session = getSessionByProducer(ws);
  if (!session) return;
  const closed = closeSession(session.id);
  if (!closed) return;
  notifySessionEnded(closed, wss);
  log.info({ sessionId: closed.id, notified: closed.consumers.size }, 'Session ended by producer');
}

/** Called when the producer's WebSocket closes unexpectedly. Returns true if handled. */
export function handleProducerDisconnect(
  ws: WebSocket,
  wss: WebSocketServer,
): boolean {
  const session = getSessionByProducer(ws);
  if (!session) return false;
  const closed = closeSession(session.id);
  if (closed) {
    notifySessionEnded(closed, wss);
    log.info({ sessionId: closed.id, notified: closed.consumers.size }, 'Producer disconnected — session ended');
  }
  return true;
}
