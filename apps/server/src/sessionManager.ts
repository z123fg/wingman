import { randomUUID } from 'crypto';
import type WebSocket from 'ws';
import type { SessionInfo } from '@live-transcription/shared';

export interface Session {
  id: string;
  name: string;
  createdAt: number;
  producerWs: WebSocket | null;
  consumers: Set<WebSocket>;
  deepgramWs: WebSocket | null;
  /** Fires when Deepgram has not returned any speech for too long — ends the session. */
  audioIdleTimer: ReturnType<typeof setTimeout> | null;
}

const sessions = new Map<string, Session>();

export function createSession(name: string, producerWs: WebSocket): Session {
  const session: Session = {
    id: randomUUID(),
    name,
    createdAt: Date.now(),
    producerWs,
    consumers: new Set(),
    deepgramWs: null,
    audioIdleTimer: null,
  };
  sessions.set(session.id, session);
  return session;
}

export function getSession(id: string): Session | undefined {
  return sessions.get(id);
}

export function getAllSessions(): Session[] {
  return Array.from(sessions.values());
}

export function addConsumer(sessionId: string, ws: WebSocket): boolean {
  const session = sessions.get(sessionId);
  if (!session) return false;
  session.consumers.add(ws);
  return true;
}

export function removeConsumer(sessionId: string, ws: WebSocket): void {
  sessions.get(sessionId)?.consumers.delete(ws);
}

/** Called when the producer disconnects. Cleans up Deepgram and marks session inactive. */
export function closeSession(sessionId: string): Session | undefined {
  const session = sessions.get(sessionId);
  if (!session) return undefined;

  if (session.audioIdleTimer) {
    clearTimeout(session.audioIdleTimer);
    session.audioIdleTimer = null;
  }
  session.deepgramWs?.close();
  session.deepgramWs = null;
  session.producerWs = null;
  sessions.delete(sessionId);
  return session;
}

/** Find which session a producer WebSocket belongs to. */
export function getSessionByProducer(ws: WebSocket): Session | undefined {
  return Array.from(sessions.values()).find((s) => s.producerWs === ws);
}

/** Find all sessions a consumer WebSocket has joined. */
export function getSessionsByConsumer(ws: WebSocket): Session[] {
  return Array.from(sessions.values()).filter((s) => s.consumers.has(ws));
}

export function toSessionInfo(session: Session): SessionInfo {
  return {
    id: session.id,
    name: session.name,
    createdAt: session.createdAt,
    active: session.producerWs !== null,
  };
}
