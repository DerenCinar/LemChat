export type VoiceFilterId = 'none' | 'studio' | 'radio' | 'deep' | 'chipmunk' | 'echo';

export const VOICE_FILTERS: { id: VoiceFilterId; label: string; emoji: string; hint: string }[] = [
  { id: 'none', label: 'Original', emoji: '🎙️', hint: 'No effect' },
  { id: 'studio', label: 'Studio Clean', emoji: '✨', hint: 'Cleaner, punchier voice' },
  { id: 'radio', label: 'Walkie-Talkie', emoji: '📻', hint: 'Crackly radio sound' },
  { id: 'deep', label: 'Deep Pitch', emoji: '🐻', hint: 'Low, rumbly voice' },
  { id: 'chipmunk', label: 'Chipmunk', emoji: '🐿️', hint: 'High, squeaky voice' },
  { id: 'echo', label: 'Echo', emoji: '🏔️', hint: 'Canyon-style repeats' },
];

const SAMPLE_RATE = 44100;

function makeDistortionCurve(amount: number): Float32Array {
  const n = 1024;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = ((1 + amount) * x) / (1 + amount * Math.abs(x));
  }
  return curve;
}

function encodeWav(buffer: AudioBuffer): Blob {
  const channels = buffer.numberOfChannels;
  const length = buffer.length * channels * 2 + 44;
  const view = new DataView(new ArrayBuffer(length));
  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };
  writeStr(0, 'RIFF');
  view.setUint32(4, length - 8, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * channels * 2, true);
  view.setUint16(32, channels * 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, buffer.length * channels * 2, true);

  const data = Array.from({ length: channels }, (_, c) => buffer.getChannelData(c));
  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let c = 0; c < channels; c++) {
      const s = Math.max(-1, Math.min(1, data[c][i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;
    }
  }
  return new Blob([view], { type: 'audio/wav' });
}

/**
 * Applies a voice filter to a recorded audio blob using an OfflineAudioContext
 * and returns a WAV blob. Falls back to the original blob on any failure.
 */
export async function applyVoiceFilter(blob: Blob, filter: VoiceFilterId): Promise<Blob> {
  if (filter === 'none') return blob;
  try {
    const decodeCtx = new AudioContext();
    const decoded = await decodeCtx.decodeAudioData(await blob.arrayBuffer());
    void decodeCtx.close();

    const rate = filter === 'deep' ? 0.72 : filter === 'chipmunk' ? 1.55 : 1;
    const tail = filter === 'echo' ? 2.5 : 0.1;
    const frames = Math.ceil((decoded.duration / rate + tail) * SAMPLE_RATE);
    const ctx = new OfflineAudioContext(1, frames, SAMPLE_RATE);

    const source = ctx.createBufferSource();
    source.buffer = decoded;
    source.playbackRate.value = rate;
    let node: AudioNode = source;
    const chain = (next: AudioNode) => {
      node.connect(next);
      node = next;
    };

    if (filter === 'studio') {
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 90;
      chain(hp);
      const presence = ctx.createBiquadFilter();
      presence.type = 'peaking';
      presence.frequency.value = 3200;
      presence.gain.value = 4;
      presence.Q.value = 0.9;
      chain(presence);
      const air = ctx.createBiquadFilter();
      air.type = 'highshelf';
      air.frequency.value = 9000;
      air.gain.value = 2.5;
      chain(air);
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -28;
      comp.ratio.value = 4;
      comp.attack.value = 0.005;
      comp.release.value = 0.15;
      chain(comp);
      const makeup = ctx.createGain();
      makeup.gain.value = 1.4;
      chain(makeup);
    } else if (filter === 'radio') {
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 500;
      chain(hp);
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 3000;
      chain(lp);
      const shaper = ctx.createWaveShaper();
      shaper.curve = makeDistortionCurve(40) as Float32Array<ArrayBuffer>;
      chain(shaper);
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -35;
      comp.ratio.value = 12;
      chain(comp);
      const gain = ctx.createGain();
      gain.gain.value = 0.8;
      chain(gain);
    } else if (filter === 'echo') {
      const dry = ctx.createGain();
      const delay = ctx.createDelay(1);
      delay.delayTime.value = 0.32;
      const feedback = ctx.createGain();
      feedback.gain.value = 0.45;
      const wet = ctx.createGain();
      wet.gain.value = 0.6;
      const sum = ctx.createGain();
      source.connect(dry);
      dry.connect(sum);
      source.connect(delay);
      delay.connect(feedback);
      feedback.connect(delay);
      delay.connect(wet);
      wet.connect(sum);
      node = sum;
    }

    node.connect(ctx.destination);
    source.start();
    const rendered = await ctx.startRendering();
    return encodeWav(rendered);
  } catch (error) {
    console.error('[SkellyTalk] Voice filter failed, using original audio:', error);
    return blob;
  }
}
