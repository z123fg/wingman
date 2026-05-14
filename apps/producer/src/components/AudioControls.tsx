import type { AudioSource } from '../hooks/useAudioCapture';

interface Props {
  isCapturing: boolean;
  onStart: (source: AudioSource) => void;
  onStop: () => void;
  error: string | null;
}

export function AudioControls({ isCapturing, onStart, onStop, error }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {!isCapturing ? (
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => onStart('mic')}>🎙 Mic only</button>
          <button onClick={() => onStart('mic+system')}>
            🎙 + 🔊 Mic + system audio
          </button>
        </div>
      ) : (
        <button
          onClick={onStop}
          style={{ background: '#e74c3c', color: '#fff', border: 'none', padding: '6px 14px', cursor: 'pointer' }}
        >
          ⏹ Stop broadcast
        </button>
      )}
      {error && (
        <p style={{ color: '#e74c3c', margin: 0, fontSize: 13 }}>⚠ {error}</p>
      )}
    </div>
  );
}
