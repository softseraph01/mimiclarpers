import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Mic2, Square, Trash2, Waves } from 'lucide-react';

export type RecordedClip = {
  id: string;
  label: string;
  blob: Blob;
  durationSeconds: number;
  createdAt: string;
};

type LocalRecorderProps = {
  onClipSaved?: (clip: RecordedClip) => void;
};

function preferredMimeType() {
  if (typeof MediaRecorder === 'undefined') return '';
  return ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']
    .find((type) => MediaRecorder.isTypeSupported(type)) ?? '';
}

function formatDuration(seconds: number) {
  const total = Math.max(0, Math.round(seconds));
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function makeId() {
  return typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `take-${Date.now()}`;
}

export default function LocalRecorder({ onClipSaved }: LocalRecorderProps) {
  const [label, setLabel] = useState('Voice take 01');
  const [isRecording, setIsRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [clip, setClip] = useState<RecordedClip | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const startedAt = useRef(0);
  const objectUrl = useRef<string | null>(null);
  const audioUrl = useMemo(() => {
    if (!clip) return '';
    const nextUrl = URL.createObjectURL(clip.blob);
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = nextUrl;
    return nextUrl;
  }, [clip]);

  useEffect(() => () => {
    stream.current?.getTracks().forEach((track) => track.stop());
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
  }, []);

  function clearClip() {
    setClip(null);
    setError('');
  }

  async function startRecording() {
    setError('');
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('This browser does not support microphone recording. Try the latest Chrome on Android.');
      return;
    }
    setBusy(true);
    try {
      const nextStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = preferredMimeType();
      const recorder = new MediaRecorder(nextStream, mimeType ? { mimeType } : undefined);
      stream.current = nextStream;
      mediaRecorder.current = recorder;
      chunks.current = [];
      startedAt.current = performance.now();
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.current.push(event.data);
      };
      recorder.onstop = () => {
        const durationSeconds = (performance.now() - startedAt.current) / 1000;
        const savedClip: RecordedClip = {
          id: makeId(),
          label: label.trim() || 'Untitled voice take',
          blob: new Blob(chunks.current, { type: recorder.mimeType || 'audio/webm' }),
          durationSeconds,
          createdAt: new Date().toISOString(),
        };
        setClip(savedClip);
        onClipSaved?.(savedClip);
        nextStream.getTracks().forEach((track) => track.stop());
        stream.current = null;
        mediaRecorder.current = null;
        setIsRecording(false);
        setBusy(false);
      };
      recorder.onerror = () => {
        setError('The browser could not finish this recording. Please try again.');
        nextStream.getTracks().forEach((track) => track.stop());
        setIsRecording(false);
        setBusy(false);
      };
      recorder.start();
      setIsRecording(true);
      setBusy(false);
    } catch (cause) {
      stream.current?.getTracks().forEach((track) => track.stop());
      setBusy(false);
      setError(cause instanceof DOMException && cause.name === 'NotAllowedError'
        ? 'Microphone access was blocked. Allow microphone access in Chrome site settings, then try again.'
        : 'Microphone access could not be started. Check the tablet microphone and try again.');
    }
  }

  function stopRecording() {
    if (!mediaRecorder.current || mediaRecorder.current.state === 'inactive') return;
    setBusy(true);
    mediaRecorder.current.stop();
  }

  function downloadClip() {
    if (!clip || !audioUrl) return;
    const anchor = document.createElement('a');
    anchor.href = audioUrl;
    anchor.download = `${clip.label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'voice-take'}.webm`;
    anchor.click();
  }

  return <section className="recorder-card" aria-label="Microphone recorder">
    <div className="recorder-card__heading"><div><span className="eyebrow">LOCAL CAPTURE</span><h3>Record a voice take</h3></div><span className={`recorder-led${isRecording ? ' is-live' : ''}`}><span className="status-dot" /> {isRecording ? 'RECORDING' : 'READY'}</span></div>
    <p className="recorder-card__copy">Capture a real microphone take, preview it, and save it to your private participant track. The studio uploads it only after recording stops.</p>
    <label className="field-label" htmlFor="voice-take-label">Take label<input id="voice-take-label" className="text-input" value={label} onChange={(event) => setLabel(event.target.value)} maxLength={64} disabled={isRecording || busy} /></label>
    <div className="recorder-card__actions">
      {!isRecording ? <button className="button button--record" type="button" onClick={() => void startRecording()} disabled={busy}>{busy ? 'Opening microphone…' : <><Mic2 size={15} /> Start recording</>}</button> : <button className="button button--record is-recording" type="button" onClick={stopRecording} disabled={busy}><Square size={14} fill="currentColor" /> Stop recording</button>}
      {clip && <button className="button button--quiet button--small" type="button" onClick={clearClip} disabled={isRecording}><Trash2 size={14} /> Clear take</button>}
    </div>
    {error && <p className="form-error" role="alert">{error}</p>}
    {clip && audioUrl && <div className="recorded-clip" role="status"><div className="recorded-clip__icon"><Waves size={17} /></div><div className="recorded-clip__body"><strong>{clip.label}</strong><span>{formatDuration(clip.durationSeconds)} · ready to save · {new Date(clip.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span><audio controls src={audioUrl}>Your browser cannot play this audio preview.</audio></div><button className="icon-button" type="button" onClick={downloadClip} aria-label="Download recorded voice take" title="Download recorded voice take"><Download size={16} /></button></div>}
  </section>;
}
