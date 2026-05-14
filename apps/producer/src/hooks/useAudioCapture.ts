import { useRef, useState, useCallback } from 'react';
import { AUDIO_SAMPLE_RATE } from '@live-transcription/shared';

export type AudioSource = 'mic' | 'mic+system';

interface UseAudioCaptureOptions {
  onAudioChunk: (buffer: ArrayBuffer) => void;
}

interface UseAudioCaptureReturn {
  start: (source: AudioSource) => Promise<void>;
  stop: () => void;
  isCapturing: boolean;
  error: string | null;
}

export function useAudioCapture({
  onAudioChunk,
}: UseAudioCaptureOptions): UseAudioCaptureReturn {
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const streamsRef = useRef<MediaStream[]>([]);

  const stop = useCallback(() => {
    workletNodeRef.current?.disconnect();
    workletNodeRef.current = null;

    streamsRef.current.forEach((s) =>
      s.getTracks().forEach((t) => t.stop()),
    );
    streamsRef.current = [];

    audioCtxRef.current?.close();
    audioCtxRef.current = null;

    setIsCapturing(false);
  }, []);

  const start = useCallback(
    async (source: AudioSource) => {
      setError(null);
      try {
        // ── 1. Acquire media streams ───────────────────────────────────
        const micStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: false,
        });
        streamsRef.current.push(micStream);

        let systemStream: MediaStream | null = null;
        if (source === 'mic+system') {
          try {
            // Chrome: prompts the user to pick a screen/window/tab.
            // Check "Share system audio" in the Chrome dialog for full system audio.
            const displayStream = await navigator.mediaDevices.getDisplayMedia({
              audio: true,
              video: true, // Chrome requires video:true to show the audio checkbox
            });
            // Stop the video track immediately — we only need audio
            displayStream.getVideoTracks().forEach((t) => t.stop());
            if (displayStream.getAudioTracks().length > 0) {
              systemStream = displayStream;
              streamsRef.current.push(systemStream);
            }
          } catch (e) {
            // User cancelled or system audio unavailable — fall back to mic only
            console.warn('[audio] system audio unavailable, mic only:', e);
          }
        }

        // ── 2. Build Web Audio graph ───────────────────────────────────
        // Request 16 kHz natively to skip resampling.
        const ctx = new AudioContext({ sampleRate: AUDIO_SAMPLE_RATE });
        audioCtxRef.current = ctx;

        await ctx.audioWorklet.addModule('/audio-processor.js');

        const workletNode = new AudioWorkletNode(ctx, 'audio-processor', {
          numberOfInputs: 1,
          numberOfOutputs: 0, // no playback output needed
          channelCount: 1,
          channelCountMode: 'explicit',
          channelInterpretation: 'speakers',
        });
        workletNodeRef.current = workletNode;

        // When the worklet posts a processed chunk, forward to WebSocket
        workletNode.port.onmessage = (e: MessageEvent<ArrayBuffer>) => {
          onAudioChunk(e.data);
        };

        // Connect mic
        const micSource = ctx.createMediaStreamSource(micStream);
        micSource.connect(workletNode);

        // Connect system audio if available (Web Audio sums multiple inputs)
        if (systemStream) {
          const sysSource = ctx.createMediaStreamSource(systemStream);
          sysSource.connect(workletNode);
        }

        setIsCapturing(true);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        stop();
      }
    },
    [onAudioChunk, stop],
  );

  return { start, stop, isCapturing, error };
}
