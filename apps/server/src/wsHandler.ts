import WebSocket, { WebSocketServer } from 'ws';
import type { IncomingMessage } from 'http';
import type { ClientMessage } from '@live-transcription/shared';
import { getSessionByProducer } from './sessionManager.js';
import { handleAudioChunk } from './audioHandler.js';
import { sendTo } from './broadcast.js';
import { handleProducerInit, handleEndSession, handleProducerDisconnect } from './handlers/producer.js';
import { handleConsumerInit, handleJoinSession, handleLeaveSession, handleConsumerDisconnect } from './handlers/consumer.js';
import logger from './logger.js';

const log = logger.child({ module: 'ws' });

export function attachWebSocketServer(wss: WebSocketServer, apiKey: string): void {
  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    const ip = req.socket.remoteAddress ?? 'unknown';
    log.info({ ip }, 'Client connected');

    ws.on('message', (data, isBinary) => {
      if (isBinary) {
        const session = getSessionByProducer(ws);
        if (session) handleAudioChunk(session, data as Buffer, apiKey, wss);
        return;
      }

      let msg: ClientMessage;
      try {
        msg = JSON.parse(data.toString()) as ClientMessage;
      } catch {
        sendTo(ws, { type: 'error', message: 'Invalid JSON' });
        return;
      }

      switch (msg.type) {
        case 'producer_init': return handleProducerInit(ws, msg, wss);
        case 'end_session':   return handleEndSession(ws, msg, wss);
        case 'consumer_init': return handleConsumerInit(ws, msg, ip);
        case 'join_session':  return handleJoinSession(ws, msg);
        case 'leave_session': return handleLeaveSession(ws, msg);
        default:              return sendTo(ws, { type: 'error', message: 'Unknown message type' });
      }
    });

    ws.on('close', (code) => {
      log.info({ ip, code }, 'Client disconnected');
      if (!handleProducerDisconnect(ws, wss)) {
        handleConsumerDisconnect(ws, ip);
      }
    });

    ws.on('error', (err) => {
      log.error({ ip, err: err.message }, 'Socket error');
    });
  });
}
