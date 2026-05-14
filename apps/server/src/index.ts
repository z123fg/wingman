import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { attachWebSocketServer } from './wsHandler.js';
import logger from './logger.js';

const PORT = Number(process.env.PORT ?? 3000);
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY ?? '';

if (!DEEPGRAM_API_KEY) {
  logger.warn('DEEPGRAM_API_KEY is not set — transcription will fail');
}

const app = express();
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true, timestamp: Date.now() });
});

const httpServer = createServer(app);

const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
attachWebSocketServer(wss, DEEPGRAM_API_KEY);

httpServer.listen(PORT, () => {
  logger.info({ port: PORT }, `Server listening on http://localhost:${PORT}`);
  logger.info({ port: PORT }, `WebSocket ready at ws://localhost:${PORT}/ws`);
});
