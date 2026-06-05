import { useRef, useCallback } from 'react';
import { AUDIO_SAMPLE_RATE } from '@live-transcription/shared';

interface UseAudioPlayerReturn {
  init: () => Promise<void>;
  playChunk: (data: ArrayBuffer) => void;
  stop: () => void;
  setVolume: (value: number) => void;
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
  const gainNodeRef = useRef<GainNode | null>(null);

  const init = useCallback(async () => {
    if (audioCtxRef.current) return; // already initialised

    const ctx = new AudioContext({ sampleRate: AUDIO_SAMPLE_RATE });
    await ctx.audioWorklet.addModule('/audio-player.js');

    const node = new AudioWorkletNode(ctx, 'audio-player', {
      numberOfInputs: 0,
      numberOfOutputs: 1,
      outputChannelCount: [1],
    });

    const gain = ctx.createGain();
    gain.gain.value = 1.0; // default: full volume

    node.connect(gain);
    gain.connect(ctx.destination);

    audioCtxRef.current = ctx;
    workletNodeRef.current = node;
    gainNodeRef.current = gain;
  }, []);

  const playChunk = useCallback((data: ArrayBuffer) => {
    workletNodeRef.current?.port.postMessage(data, [data]);
  }, []);

  const setVolume = useCallback((value: number) => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = value;
    }
  }, []);

  const stop = useCallback(() => {
    workletNodeRef.current?.disconnect();
    workletNodeRef.current = null;
    gainNodeRef.current?.disconnect();
    gainNodeRef.current = null;
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
  }, []);

  return { init, playChunk, stop, setVolume };
}
