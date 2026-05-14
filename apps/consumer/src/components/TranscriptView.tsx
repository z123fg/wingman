import { useEffect, useRef } from 'react';

export interface TranscriptEntry {
  id: number;
  text: string;
  isFinal: boolean;
}

interface Props {
  entries: TranscriptEntry[];
  sessionEnded: boolean;
}

export function TranscriptView({ entries, sessionEnded }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new content
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries]);

  return (
    <div
      style={{
        minHeight: 250,
        maxHeight: 500,
        overflowY: 'auto',
        background: '#f9f9f9',
        border: '1px solid #ddd',
        borderRadius: 6,
        padding: '14px 16px',
        lineHeight: 1.8,
        fontSize: 16,
      }}
    >
      {entries.length === 0 && !sessionEnded && (
        <span style={{ color: '#bbb' }}>Waiting for speech…</span>
      )}

      {entries.map((entry) => (
        <span
          key={entry.id}
          style={{
            color: entry.isFinal ? '#111' : '#aaa',
            fontStyle: entry.isFinal ? 'normal' : 'italic',
            transition: 'color 0.15s',
          }}
        >
          {entry.text}{' '}
        </span>
      ))}

      {sessionEnded && (
        <p style={{ color: '#e74c3c', marginTop: 12, fontStyle: 'italic', fontSize: 13 }}>
          — Session ended —
        </p>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
