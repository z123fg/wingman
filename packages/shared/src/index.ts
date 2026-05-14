// ── Session ────────────────────────────────────────────────────────────────

export interface SessionInfo {
  id: string;
  name: string;
  createdAt: number;
  /** true while the producer WebSocket is connected */
  active: boolean;
}

// ── Server → Client messages ───────────────────────────────────────────────

export interface SessionCreatedMessage {
  type: 'session_created';
  session: SessionInfo;
}

export interface SessionListMessage {
  type: 'session_list';
  sessions: SessionInfo[];
}

export interface SessionJoinedMessage {
  type: 'session_joined';
  session: SessionInfo;
}

export interface SessionEndedMessage {
  type: 'session_ended';
  sessionId: string;
}

export interface TranscriptMessage {
  type: 'transcript';
  sessionId: string;
  text: string;
  /** false = interim (live, may change); true = final (committed) */
  isFinal: boolean;
  timestamp: number;
}

export interface ErrorMessage {
  type: 'error';
  message: string;
}

export type ServerMessage =
  | SessionCreatedMessage
  | SessionListMessage
  | SessionJoinedMessage
  | SessionEndedMessage
  | TranscriptMessage
  | ErrorMessage;

// ── Client → Server messages ───────────────────────────────────────────────

export interface ProducerInitMessage {
  type: 'producer_init';
  sessionName: string;
}

export interface ConsumerInitMessage {
  type: 'consumer_init';
}

export interface JoinSessionMessage {
  type: 'join_session';
  sessionId: string;
}

export interface LeaveSessionMessage {
  type: 'leave_session';
  sessionId: string;
}

export interface EndSessionMessage {
  type: 'end_session';
}

export type ClientMessage =
  | ProducerInitMessage
  | ConsumerInitMessage
  | JoinSessionMessage
  | LeaveSessionMessage
  | EndSessionMessage;

// ── Audio constants shared between producer worklet and server ─────────────

/** PCM encoding sent over the wire: signed 16-bit little-endian mono */
export const AUDIO_SAMPLE_RATE = 16_000;
