import 'dotenv/config';
import express from 'express';
import { createServer as createHttpServer } from 'http';
import { createServer as createHttpsServer } from 'https';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';
import { attachWebSocketServer } from './wsHandler.js';
import logger from './logger.js';

const PORT = Number(process.env.PORT ?? 3000);
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY ?? '';
const SSL_CERT = process.env.SSL_CERT ?? '';
const SSL_KEY = process.env.SSL_KEY ?? '';

if (!DEEPGRAM_API_KEY) {
  logger.warn('DEEPGRAM_API_KEY is not set — transcription will fail');
}

const app = express();
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true, timestamp: Date.now() });
});

// Use HTTPS if cert and key are provided, otherwise fall back to HTTP
const server = SSL_CERT && SSL_KEY
  ? createHttpsServer(
      {
        cert: readFileSync(resolve(fileURLToPath(import.meta.url), '..', '..', '..', '..', SSL_CERT)),
        key: readFileSync(resolve(fileURLToPath(import.meta.url), '..', '..', '..', '..', SSL_KEY)),
      },
      app,
    )
  : createHttpServer(app);

const protocol = SSL_CERT && SSL_KEY ? 'https' : 'http';
const wsProtocol = SSL_CERT && SSL_KEY ? 'wss' : 'ws';

const wss = new WebSocketServer({ server, path: '/ws' });
attachWebSocketServer(wss, DEEPGRAM_API_KEY);

server.listen(PORT, '0.0.0.0', () => {
  logger.info({ port: PORT }, `Server listening on ${protocol}://localhost:${PORT}`);
  logger.info({ port: PORT }, `WebSocket ready at ${wsProtocol}://localhost:${PORT}/ws`);
});
