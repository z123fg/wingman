import { useEffect, useRef } from 'react';

export interface TranscriptEntry {
  id: number;
  text: string;
  isFinal: boolean;
  speaker?: number;
}

interface Props {
  entries: TranscriptEntry[];
  sessionEnded: boolean;
}

// Distinct colors for up to 6 speakers
const SPEAKER_COLORS = ['#2563eb', '#16a34a', '#dc2626', '#9333ea', '#ea580c', '#0891b2'];

function speakerColor(speaker: number): string {
  return SPEAKER_COLORS[speaker % SPEAKER_COLORS.length];
}

function speakerLabel(speaker: number): string {
  return `Speaker ${speaker}`;
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

      {entries.map((entry, idx) => {
        const prevSpeaker = idx > 0 ? entries[idx - 1].speaker : undefined;
        const speakerChanged = entry.speaker !== undefined && entry.speaker !== prevSpeaker;
        const hasSpeaker = entry.speaker !== undefined;

        return (
          <span key={entry.id}>
            {/* Show speaker label when speaker changes or on first entry with a speaker */}
            {hasSpeaker && (speakerChanged || idx === 0) && (
              <span
                style={{
                  display: 'block',
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  color: speakerColor(entry.speaker!),
                  marginTop: idx === 0 ? 0 : 10,
                  marginBottom: 2,
                }}
              >
                {speakerLabel(entry.speaker!)}
              </span>
            )}
            <span
              style={{
                color: entry.isFinal
                  ? hasSpeaker ? speakerColor(entry.speaker!) : '#111'
                  : '#aaa',
                fontStyle: entry.isFinal ? 'normal' : 'italic',
                transition: 'color 0.15s',
              }}
            >
              {entry.text}{' '}
            </span>
          </span>
        );
      })}

      {sessionEnded && (
        <p style={{ color: '#e74c3c', marginTop: 12, fontStyle: 'italic', fontSize: 13 }}>
          — Session ended —
        </p>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
