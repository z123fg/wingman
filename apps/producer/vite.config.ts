import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync, readdirSync } from 'fs';
import { resolve } from 'path';

const CERT_DIR = resolve(__dirname, '../../certs');

function loadCerts(): { cert: Buffer; key: Buffer } | undefined {
  try {
    const files = readdirSync(CERT_DIR);
    const certFile = files.find((f) => f.endsWith('.pem') && !f.includes('key'));
    const keyFile = files.find((f) => f.endsWith('.pem') && f.includes('key'));
    if (!certFile || !keyFile) return undefined;
    return {
      cert: readFileSync(resolve(CERT_DIR, certFile)),
      key: readFileSync(resolve(CERT_DIR, keyFile)),
    };
  } catch {
    return undefined;
  }
}

const certs = loadCerts();

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    https: certs,
    proxy: {
      '/ws': {
        target: certs ? 'wss://localhost:3000' : 'ws://localhost:3000',
        ws: true,
        rewriteWsOrigin: true,
        secure: false,
      },
    },
  },
});
