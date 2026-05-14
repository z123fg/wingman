import type WebSocket from 'ws';
import type { ConsumerInitMessage, JoinSessionMessage, LeaveSessionMessage } from '@live-transcription/shared';
import {
  getAllSessions,
  getSession,
  addConsumer,
  removeConsumer,
  getSessionsByConsumer,
  toSessionInfo,
} from '../sessionManager.js';
import { sendTo } from '../broadcast.js';
import logger from '../logger.js';

const log = logger.child({ module: 'consumer' });

export function handleConsumerInit(
  ws: WebSocket,
  _msg: ConsumerInitMessage,
  ip: string,
): void {
  const sessions = getAllSessions().map(toSessionInfo);
  sendTo(ws, { type: 'session_list', sessions });
  log.info({ ip, activeSessions: sessions.length }, 'Consumer initialised');
}

export function handleJoinSession(ws: WebSocket, msg: JoinSessionMessage): void {
  const session = getSession(msg.sessionId);
  if (!session) {
    log.warn({ sessionId: msg.sessionId }, 'Join attempt — session not found');
    sendTo(ws, { type: 'error', message: 'Session not found' });
    return;
  }
  addConsumer(msg.sessionId, ws);
  sendTo(ws, { type: 'session_joined', session: toSessionInfo(session) });
  log.info({ sessionId: msg.sessionId, consumers: session.consumers.size }, 'Consumer joined session');
}

export function handleLeaveSession(ws: WebSocket, msg: LeaveSessionMessage): void {
  removeConsumer(msg.sessionId, ws);
  log.info({ sessionId: msg.sessionId }, 'Consumer left session');
}

export function handleConsumerDisconnect(ws: WebSocket, ip: string): void {
  const sessions = getSessionsByConsumer(ws);
  sessions.forEach((s) => removeConsumer(s.id, ws));
  if (sessions.length > 0) {
    log.info({ ip, sessions: sessions.map((s) => s.id) }, 'Consumer removed from sessions');
  }
}
