/**
 * AudioWorklet processor for real-time PCM playback.
 *
 * The main thread posts Int16 ArrayBuffers (16kHz mono) via port.postMessage.
 * This processor maintains a Float32 queue and drains it on each process() call,
 * outputting silence on underrun to avoid glitches.
 *
 * Runs inside the AudioWorklet global scope — no imports allowed.
 */
class AudioPlayer extends AudioWorkletProcessor {
  constructor() {
    super();
    /** @type {Float32Array[]} */
    this._queue = [];
    this._queueSamples = 0;
    this._offset = 0;

    this.port.onmessage = (e) => {
      const int16 = new Int16Array(e.data);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] / 0x8000;
      }
      this._queue.push(float32);
      this._queueSamples += float32.length;
    };
  }

  process(_inputs, outputs) {
    const output = outputs[0][0]; // mono channel
    let written = 0;

    while (written < output.length && this._queue.length > 0) {
      const chunk = this._queue[0];
      const available = chunk.length - this._offset;
      const needed = output.length - written;
      const toCopy = Math.min(available, needed);

      output.set(chunk.subarray(this._offset, this._offset + toCopy), written);
      written += toCopy;
      this._offset += toCopy;
      this._queueSamples -= toCopy;

      if (this._offset >= chunk.length) {
        this._queue.shift();
        this._offset = 0;
      }
    }

    // Silence on underrun
    if (written < output.length) {
      output.fill(0, written);
    }

    return true;
  }
}

registerProcessor('audio-player', AudioPlayer);
