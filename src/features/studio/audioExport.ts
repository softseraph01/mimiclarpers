export type AudioExportClip = {
  id: string;
  audioUrl: string;
  start: number;
  duration: number;
  sourceOffset: number;
  ownerId: string;
};

export type AudioExportMix = Record<string, { muted: boolean; volume: number }>;

const EXPORT_SAMPLE_RATE = 44_100;
const MAX_EXPORT_SECONDS = 30 * 60;
const MAX_EXPORT_BYTES = 512 * 1024 * 1024;

function getOfflineContext() {
  if (typeof window === 'undefined' || typeof window.OfflineAudioContext !== 'function') {
    throw new Error('This browser does not support offline audio export. Try the latest Chrome, Edge, or Safari.');
  }
  return new window.OfflineAudioContext(2, 1, EXPORT_SAMPLE_RATE);
}

async function decodeClip(clip: AudioExportClip, context: OfflineAudioContext) {
  let response: Response;
  try {
    response = await fetch(clip.audioUrl);
  } catch {
    throw new Error(`The private audio asset for take ${clip.id} could not be retrieved.`);
  }
  if (!response.ok) throw new Error(`The private audio asset for take ${clip.id} could not be retrieved.`);
  let bytes: ArrayBuffer;
  try {
    bytes = await response.arrayBuffer();
    return await context.decodeAudioData(bytes.slice(0));
  } catch {
    throw new Error(`The audio asset for take ${clip.id} could not be decoded for export.`);
  }
}

function writeString(view: DataView, offset: number, value: string) {
  for (let index = 0; index < value.length; index += 1) view.setUint8(offset + index, value.charCodeAt(index));
}

function encodeWav(buffer: AudioBuffer) {
  const channels = Math.min(2, Math.max(1, buffer.numberOfChannels));
  const frameCount = buffer.length;
  const bytesPerSample = 2;
  const dataLength = frameCount * channels * bytesPerSample;
  const output = new ArrayBuffer(44 + dataLength);
  const view = new DataView(output);
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * channels * bytesPerSample, true);
  view.setUint16(32, channels * bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);

  const channelData = Array.from({ length: channels }, (_, channel) => buffer.getChannelData(Math.min(channel, buffer.numberOfChannels - 1)));
  let offset = 44;
  for (let frame = 0; frame < frameCount; frame += 1) {
    for (let channel = 0; channel < channels; channel += 1) {
      const sample = Math.max(-1, Math.min(1, channelData[channel][frame] ?? 0));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }
  return new Blob([output], { type: 'audio/wav' });
}

export async function exportDubAudio(input: {
  clips: AudioExportClip[];
  trackMix: AudioExportMix;
  sceneDuration: number;
}) {
  if (input.clips.length === 0) throw new Error('Add at least one saved dubbed take before exporting audio.');
  const timelineEnd = Math.max(input.sceneDuration, ...input.clips.map((clip) => clip.start + clip.duration));
  if (!Number.isFinite(timelineEnd) || timelineEnd <= 0) throw new Error('The project timeline has no exportable duration.');
  if (timelineEnd > MAX_EXPORT_SECONDS) throw new Error('This project is longer than the safe browser export limit of 30 minutes.');
  const estimatedBytes = timelineEnd * EXPORT_SAMPLE_RATE * 2 * 4;
  if (estimatedBytes > MAX_EXPORT_BYTES) throw new Error('This project is too large for a safe browser audio export.');

  const context = getOfflineContext();
  const decoded = await Promise.all(input.clips.map(async (clip) => ({ clip, buffer: await decodeClip(clip, context) })));
  for (const { clip, buffer } of decoded) {
    if (clip.start < 0 || clip.duration <= 0 || clip.sourceOffset < 0) throw new Error(`Take ${clip.id} has invalid timeline metadata.`);
    if (clip.sourceOffset >= buffer.duration || clip.sourceOffset + clip.duration > buffer.duration + 0.05) {
      throw new Error(`Take ${clip.id} is trimmed beyond the available audio and could not be exported accurately.`);
    }
  }

  const renderLength = Math.ceil(timelineEnd * EXPORT_SAMPLE_RATE);
  const renderContext = new window.OfflineAudioContext(2, renderLength, EXPORT_SAMPLE_RATE);
  for (const { clip, buffer } of decoded) {
    const mix = input.trackMix[clip.ownerId] ?? { muted: false, volume: 1 };
    if (mix.muted || mix.volume <= 0) continue;
    const source = renderContext.createBufferSource();
    const gain = renderContext.createGain();
    source.buffer = buffer;
    gain.gain.value = Math.max(0, Math.min(1, mix.volume));
    source.connect(gain).connect(renderContext.destination);
    source.start(clip.start, clip.sourceOffset, clip.duration);
  }
  return encodeWav(await renderContext.startRendering());
}

export function downloadWav(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
