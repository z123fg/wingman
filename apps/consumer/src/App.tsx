import { useState, useCallback, useEffect } from 'react';
import type { ServerMessage, SessionInfo } from '@live-transcription/shared';
import { useWebSocket } from './hooks/useWebSocket';
import { useAudioPlayer } from './hooks/useAudioPlayer';
import { SessionList } from './components/SessionList';
import { TranscriptView, type TranscriptEntry } from './components/TranscriptView';

const WS_URL = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`;

let entryId = 0;

export default function App() {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [activeSession, setActiveSession] = useState<SessionInfo | null>(null);
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [banner, setBanner] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [volume, setVolumeState] = useState(1.0);

  const { init: initAudio, playChunk, stop: stopAudio, setVolume } = useAudioPlayer();

  const handleBinaryMessage = useCallback((data: ArrayBuffer) => {
    if (!muted) playChunk(data);
  }, [muted, playChunk]);

  const handleMessage = useCallback((msg: ServerMessage) => {
    switch (msg.type) {
      case 'session_list':
        setSessions(msg.sessions);
        break;

      case 'session_joined':
        setActiveSession(msg.session);
        setTranscripts([]);
        break;

      case 'transcript':
        setTranscripts((prev) => {
          const lastIdx = prev.length - 1;
          if (lastIdx >= 0 && !prev[lastIdx].isFinal) {
            const updated = [...prev];
            updated[lastIdx] = { id: prev[lastIdx].id, text: msg.text, isFinal: msg.isFinal, speaker: msg.speaker };
            return updated;
          }
          return [...prev, { id: entryId++, text: msg.text, isFinal: msg.isFinal, speaker: msg.speaker }];
        });
        break;

      case 'session_ended':
        if (activeSession?.id === msg.sessionId) {
          setActiveSession(null);
          setTranscripts([]);
          setBanner('Session was ended by the producer.');
          stopAudio();
        }
        break;

      case 'error':
        console.error('[server]', msg.message);
        break;
    }
  }, [activeSession, stopAudio]);

  const { sendJson } = useWebSocket(WS_URL, handleMessage, handleBinaryMessage);

  // Auto-dismiss banner
  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 4000);
    return () => clearTimeout(t);
  }, [banner]);

  // Announce as consumer on mount
  useEffect(() => {
    const t = setTimeout(() => sendJson({ type: 'consumer_init' }), 100);
    return () => clearTimeout(t);
  }, [sendJson]);

  // Stop audio on unmount
  useEffect(() => () => stopAudio(), [stopAudio]);

  const handleJoin = async (sessionId: string) => {
    // AudioContext must be created on a user gesture
    await initAudio();
    sendJson({ type: 'join_session', sessionId });
  };

  const handleLeave = () => {
    if (activeSession) {
      sendJson({ type: 'leave_session', sessionId: activeSession.id });
      setActiveSession(null);
      setTranscripts([]);
      stopAudio();
    }
  };

  return (
    <div style={{ maxWidth: 700, margin: '40px auto', padding: '0 16px', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 22, marginBottom: 24 }}>👂 Consumer</h1>

      {banner && (
        <div style={{
          marginBottom: 16,
          padding: '10px 14px',
          background: '#fdecea',
          border: '1px solid #f5c6cb',
          borderRadius: 6,
          color: '#c0392b',
          fontSize: 14,
        }}>
          {banner}
        </div>
      )}

      {!activeSession ? (
        <section>
          <h2 style={{ fontSize: 15, marginBottom: 12 }}>Available sessions</h2>
          <SessionList sessions={sessions} onJoin={handleJoin} />
        </section>
      ) : (
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <strong style={{ fontSize: 16 }}>{activeSession.name}</strong>
            <span style={{ color: '#27ae60', fontWeight: 600, fontSize: 13 }}>● LIVE</span>
            <button
              onClick={() => setMuted((m) => !m)}
              title={muted ? 'Unmute audio' : 'Mute audio'}
              style={{ padding: '4px 12px', cursor: 'pointer' }}
            >
              {muted ? '🔇 Unmute' : '🔊 Mute'}
            </button>
            <input
              type="range"
              min={0}
              max={2}
              step={0.05}
              value={volume}
              disabled={muted}
              title={`Volume: ${Math.round(volume * 100)}%`}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                setVolumeState(v);
                setVolume(v);
              }}
              style={{ width: 90, cursor: muted ? 'not-allowed' : 'pointer', opacity: muted ? 0.4 : 1 }}
            />
            <span style={{ fontSize: 12, color: '#555', minWidth: 36 }}>
              {Math.round(volume * 100)}%
            </span>
            <button
              onClick={handleLeave}
              style={{ marginLeft: 'auto', padding: '4px 12px', cursor: 'pointer' }}
            >
              ← Leave session
            </button>
          </div>

          <TranscriptView entries={transcripts} sessionEnded={false} />
        </section>
      )}
    </div>
  );
}
