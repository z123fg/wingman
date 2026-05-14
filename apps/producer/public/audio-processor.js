/**
 * AudioWorklet processor: converts Float32 PCM → Int16 and posts each
 * 128-sample frame to the main thread as a transferable ArrayBuffer.
 *
 * Runs inside the AudioWorklet global scope — no imports allowed.
 */
class AudioProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0];
    if (!input || input.length === 0) return true;

    // Downmix to mono by averaging all channels
    const channelCount = input.length;
    const frameSize = input[0].length; // always 128 samples per spec
    const mono = new Float32Array(frameSize);

    for (let ch = 0; ch < channelCount; ch++) {
      for (let i = 0; i < frameSize; i++) {
        mono[i] += input[ch][i];
      }
    }
    if (channelCount > 1) {
      for (let i = 0; i < frameSize; i++) mono[i] /= channelCount;
    }

    // Convert Float32 [-1, 1] → Int16 [-32768, 32767]
    const int16 = new Int16Array(frameSize);
    for (let i = 0; i < frameSize; i++) {
      const clamped = Math.max(-1, Math.min(1, mono[i]));
      int16[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
    }

    // Transfer the buffer to avoid a copy
    this.port.postMessage(int16.buffer, [int16.buffer]);
    return true;
  }
}

registerProcessor('audio-processor', AudioProcessor);
