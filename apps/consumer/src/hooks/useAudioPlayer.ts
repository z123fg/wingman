import { useRef, useCallback } from 'react';
import { AUDIO_SAMPLE_RATE } from '@live-transcription/shared';

interface UseAudioPlayerReturn {
  init: () => Promise<void>;
  playChunk: (data: ArrayBuffer) => void;
  stop: () => void;
}

/**
 * Manages a Web Audio playback pipeline for streaming PCM audio.
 *
 * Call init() once on a user gesture (e.g. joining a session),
 * then feed chunks via playChunk() as they arrive over WebSocket.
 */
export function useAudioPlayer(): UseAudioPlayerReturn {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);

  const init = useCallback(async () => {
    if (audioCtxRef.current) return; // already initialised

    const ctx = new AudioContext({ sampleRate: AUDIO_SAMPLE_RATE });
    await ctx.audioWorklet.addModule('/audio-player.js');

    const node = new AudioWorkletNode(ctx, 'audio-player', {
      numberOfInputs: 0,
      numberOfOutputs: 1,
      outputChannelCount: [1],
    });
    node.connect(ctx.destination);

    audioCtxRef.current = ctx;
    workletNodeRef.current = node;
  }, []);

  const playChunk = useCallback((data: ArrayBuffer) => {
    workletNodeRef.current?.port.postMessage(data, [data]);
  }, []);

  const stop = useCallback(() => {
    workletNodeRef.current?.disconnect();
    workletNodeRef.current = null;
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
  }, []);

  return { init, playChunk, stop };
}
