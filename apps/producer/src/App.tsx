import { useState, useCallback } from 'react';
import type { ServerMessage, SessionInfo, TranscriptMessage } from '@live-transcription/shared';
import { useWebSocket } from './hooks/useWebSocket';
import { useAudioCapture } from './hooks/useAudioCapture';
import { SessionCreator } from './components/SessionCreator';
import { AudioControls } from './components/AudioControls';

const WS_URL = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`;

interface TranscriptEntry {
  id: number;
  text: string;
  isFinal: boolean;
  speaker?: number;
}

let entryId = 0;

export default function App() {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);

  const handleMessage = useCallback((msg: ServerMessage) => {
    switch (msg.type) {
      case 'session_created':
        setSession(msg.session);
        break;

      case 'transcript':
        handleTranscript(msg);
        break;

      case 'error':
        console.error('[server error]', msg.message);
        break;
    }
  }, []);

  const handleTranscript = (msg: TranscriptMessage) => {
    setTranscripts((prev) => {
      // Replace last interim entry, or append
      const lastIdx = prev.length - 1;
      if (lastIdx >= 0 && !prev[lastIdx].isFinal) {
        const updated = [...prev];
        updated[lastIdx] = { id: prev[lastIdx].id, text: msg.text, isFinal: msg.isFinal, speaker: msg.speaker };
        return updated;
      }
      return [...prev, { id: entryId++, text: msg.text, isFinal: msg.isFinal, speaker: msg.speaker }];
    });
  };

  const { sendJson, sendBinary } = useWebSocket(WS_URL, handleMessage);

  const { start, stop, isCapturing, error } = useAudioCapture({
    onAudioChunk: sendBinary,
  });

  const handleCreateSession = (name: string) => {
    sendJson({ type: 'producer_init', sessionName: name });
  };

  const handleStop = () => {
    stop();
  };

  const handleEndSession = () => {
    stop();
    sendJson({ type: 'end_session' });
    setSession(null);
    setTranscripts([]);
  };

  return (
    <div style={{ maxWidth: 700, margin: '40px auto', padding: '0 16px', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 22, marginBottom: 24 }}>🎙 Producer</h1>

      {!session ? (
        <section>
          <h2 style={{ fontSize: 15, marginBottom: 10 }}>Create a session</h2>
          <SessionCreator onCreate={handleCreateSession} />
        </section>
      ) : (
        <>
          <section style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <strong style={{ fontSize: 16 }}>{session.name}</strong>
              <code style={{ fontSize: 12, color: '#888' }}>{session.id}</code>
              {isCapturing && (
                <span style={{ color: '#27ae60', fontWeight: 600, fontSize: 13 }}>● LIVE</span>
              )}
              <button
                onClick={handleEndSession}
                style={{
                  marginLeft: 'auto',
                  padding: '5px 14px',
                  background: '#c0392b',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                End Session
              </button>
            </div>
            <AudioControls
              isCapturing={isCapturing}
              onStart={start}
              onStop={handleStop}
              error={error}
            />
          </section>

          <section>
            <h2 style={{ fontSize: 15, marginBottom: 10 }}>Transcript (your view)</h2>
            <div
              style={{
                minHeight: 200,
                maxHeight: 450,
                overflowY: 'auto',
                background: '#f9f9f9',
                border: '1px solid #ddd',
                borderRadius: 6,
                padding: 12,
                lineHeight: 1.7,
                fontSize: 15,
              }}
            >
              {transcripts.length === 0 && (
                <span style={{ color: '#aaa' }}>Transcript will appear here…</span>
              )}
              {transcripts.map((entry, idx) => {
                const prevSpeaker = idx > 0 ? transcripts[idx - 1].speaker : undefined;
                const speakerChanged = entry.speaker !== undefined && entry.speaker !== prevSpeaker;
                const COLORS = ['#2563eb', '#16a34a', '#dc2626', '#9333ea', '#ea580c', '#0891b2'];
                const color = entry.speaker !== undefined ? COLORS[entry.speaker % COLORS.length] : undefined;
                return (
                  <span key={entry.id}>
                    {entry.speaker !== undefined && (speakerChanged || idx === 0) && (
                      <span style={{
                        display: 'block',
                        fontSize: 11,
                        fontWeight: 600,
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase',
                        color,
                        marginTop: idx === 0 ? 0 : 10,
                        marginBottom: 2,
                      }}>
                        Speaker {entry.speaker}
                      </span>
                    )}
                    <span style={{ color: entry.isFinal ? (color ?? '#111') : '#999' }}>
                      {entry.text}{' '}
                    </span>
                  </span>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
