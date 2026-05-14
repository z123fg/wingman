import type { SessionInfo } from '@live-transcription/shared';

interface Props {
  sessions: SessionInfo[];
  onJoin: (sessionId: string) => void;
}

export function SessionList({ sessions, onJoin }: Props) {
  if (sessions.length === 0) {
    return (
      <p style={{ color: '#999', fontStyle: 'italic' }}>
        No active sessions. Waiting for a producer to start one…
      </p>
    );
  }

  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {sessions.map((s) => (
        <li
          key={s.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            border: '1px solid #ddd',
            borderRadius: 6,
            background: '#fff',
          }}
        >
          <div>
            <strong style={{ fontSize: 15 }}>{s.name}</strong>
            <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>
              {s.id} · started {new Date(s.createdAt).toLocaleTimeString()}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: s.active ? '#27ae60' : '#e74c3c',
              }}
            >
              {s.active ? '● LIVE' : '○ Ended'}
            </span>
            <button
              onClick={() => onJoin(s.id)}
              disabled={!s.active}
              style={{ padding: '5px 12px', cursor: s.active ? 'pointer' : 'not-allowed' }}
            >
              Join
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
