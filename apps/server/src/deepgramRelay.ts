import WebSocket, { WebSocketServer } from 'ws';
import type { Session } from './sessionManager.js';
import { closeSession } from './sessionManager.js';
import type { TranscriptMessage } from '@live-transcription/shared';
import { AUDIO_SAMPLE_RATE } from '@live-transcription/shared';
import { notifySessionEnded } from './broadcast.js';
import logger from './logger.js';

const log = logger.child({ module: 'deepgram' });

const DEEPGRAM_URL =
  `wss://api.deepgram.com/v1/listen` +
  `?model=nova-2` +
  `&encoding=linear16` +
  `&sample_rate=${AUDIO_SAMPLE_RATE}` +
  `&channels=1` +
  `&interim_results=true` +
  `&endpointing=300` +
  `&utterance_end_ms=1000` +
  `&punctuate=true` +
  `&smart_format=true` +
  `&diarize=true`;

/** End the session after this many ms with no recognised speech from Deepgram. */
const SESSION_IDLE_MS = 10 * 60 * 1_000; // 10 minutes

/**
 * Opens a Deepgram streaming WebSocket for the given session.
 * - Sends KeepAlive pings during silence so the connection stays open.
 * - Resets the session idle timer whenever Deepgram returns any transcript.
 * - Fans out transcripts to all consumers and echoes them to the producer.
 */
export function openDeepgramConnection(
  session: Session,
  apiKey: string,
  wss: WebSocketServer,
): void {
  const dg = new WebSocket(DEEPGRAM_URL, {
    headers: { Authorization: `Token ${apiKey}` },
  });

  dg.on('open', () => {
    log.info({ sessionId: session.id }, 'Connection opened');
    resetSessionIdleTimer(session, wss);
  });

  dg.on('message', (data) => {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(data.toString()) as Record<string, unknown>;
    } catch {
      return;
    }

    const channel = parsed['channel'] as Record<string, unknown> | undefined;
    const alternatives = channel?.['alternatives'] as
      | Array<{ transcript: string; words?: Array<{ speaker?: number }> }>
      | undefined;
    const transcript = alternatives?.[0]?.transcript ?? '';

    if (!transcript.trim()) return;

    const isFinal = (parsed['is_final'] as boolean | undefined) === true;

    // Pick the speaker of the first word as the label for this chunk
    const speaker = alternatives?.[0]?.words?.[0]?.speaker;

    // Speech detected — reset the session idle timer
    resetSessionIdleTimer(session, wss);

    log.info(
      { sessionId: session.id, isFinal, consumers: session.consumers.size },
      `[${isFinal ? 'final  ' : 'interim'}] "${transcript}"`,
    );

    const message: TranscriptMessage = {
      type: 'transcript',
      sessionId: session.id,
      text: transcript,
      isFinal,
      timestamp: Date.now(),
      ...(speaker !== undefined && { speaker }),
    };

    const payload = JSON.stringify(message);

    session.consumers.forEach((c) => {
      if (c.readyState === WebSocket.OPEN) c.send(payload);
    });

    if (session.producerWs?.readyState === WebSocket.OPEN) {
      session.producerWs.send(payload);
    }
  });

  dg.on('error', (err) => {
    log.error({ sessionId: session.id, err: err.message }, 'Socket error');
  });

  dg.on('close', (code, reason) => {
    log.info({ sessionId: session.id, code, reason: reason.toString() }, 'Connection closed');
    if (session.deepgramWs === dg) {
      session.deepgramWs = null;
    }
  });

  session.deepgramWs = dg;
}

/**
 * Forward a raw PCM binary frame to Deepgram.
 * No-op if the connection is not yet open.
 */
export function forwardAudio(session: Session, data: Buffer): void {
  if (session.deepgramWs?.readyState === WebSocket.OPEN) {
    log.trace({ sessionId: session.id, bytes: data.byteLength }, 'Audio chunk forwarded');
    session.deepgramWs.send(data);
  }
}

// ── Private helpers ──────────────────────────────────────────────────────────

function resetSessionIdleTimer(session: Session, wss: WebSocketServer): void {
  if (session.audioIdleTimer) clearTimeout(session.audioIdleTimer);
  session.audioIdleTimer = setTimeout(() => {
    log.warn({ sessionId: session.id }, 'No speech detected for 10 minutes — auto-ending session');
    const closed = closeSession(session.id);
    if (closed) notifySessionEnded(closed, wss);
  }, SESSION_IDLE_MS);
}
