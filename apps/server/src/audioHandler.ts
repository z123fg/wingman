import type { WebSocketServer } from 'ws';
import type { Session } from './sessionManager.js';
import { openDeepgramConnection, forwardAudio } from './deepgramRelay.js';
import { broadcastAudioToConsumers } from './broadcast.js';
import logger from './logger.js';

const log = logger.child({ module: 'audio' });

/**
 * Handle a binary PCM audio chunk from the producer:
 *   1. Lazy-open the Deepgram connection on the first chunk.
 *   2. Forward the chunk to Deepgram for transcription.
 *   3. Fan out the chunk to all consumers for live playback.
 */
export function handleAudioChunk(
  session: Session,
  data: Buffer,
  apiKey: string,
  wss: WebSocketServer,
): void {
  if (!session.deepgramWs) {
    log.info({ sessionId: session.id }, 'First audio chunk — opening Deepgram connection');
    openDeepgramConnection(session, apiKey, wss);
  }
  forwardAudio(session, data);
  broadcastAudioToConsumers(session, data);
}
