import { useEffect, useMemo, useRef, useState, type ChangeEvent, type CSSProperties } from 'react';
import { ArrowLeft, AudioLines, ChevronDown, CircleHelp, Clapperboard, Clock3, Download, FileVideo2, Mic2, MoveLeft, MoveRight, Pause, Play, RotateCcw, Scissors, Settings2, Upload, Volume2, Waves } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { seedClips } from '../../demo/seedData';
import { localDemoRoomService } from '../../services/demoRooms';
import { localDemoTimelineEditor } from '../../services/demoTimeline';
import type { DemoRoom, DialogueClip } from '../../types/domain';

const SCENE_SECONDS = 38;
const TIMELINE_WIDTH = 720;

function timecode(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  return `00:${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
}

export default function StudioPage() {
  const { roomId = '' } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState<DemoRoom | null | undefined>(undefined);
  const [clips, setClips] = useState<DialogueClip[]>(() => localDemoTimelineEditor.reset());
  const [selectedId, setSelectedId] = useState(seedClips[0]?.id ?? '');
  const [playhead, setPlayhead] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [videoName, setVideoName] = useState('');
  const [videoMessage, setVideoMessage] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const videoElement = useRef<HTMLVideoElement>(null);
  const selectedClip = clips.find((clip) => clip.id === selectedId) ?? clips[0];
  const characters = useMemo(() => [...new Set(clips.map((clip) => clip.character))], [clips]);
  const ticks = [...Array.from({ length: Math.floor(SCENE_SECONDS / 5) + 1 }, (_, index) => index * 5), SCENE_SECONDS];

  useEffect(() => {
    let active = true;
    setRoom(undefined);
    void localDemoRoomService.getRoom(roomId).then((item) => {
      if (active) setRoom(item);
    }).catch(() => {
      if (active) setRoom(null);
    });
    return () => { active = false; };
  }, [roomId]);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setPlayhead((current) => {
        if (current + 0.25 >= SCENE_SECONDS) {
          setPlaying(false);
          return 0;
        }
        return current + 0.25;
      });
    }, 250);
    return () => window.clearInterval(timer);
  }, [playing]);

  useEffect(() => () => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
  }, [videoUrl]);

  if (room === undefined) {
    return <section className="empty-state panel" aria-live="polite"><h1>Opening local demo studio…</h1></section>;
  }

  if (room === null) {
    return <section className="empty-state panel"><span className="panel-icon panel-icon--amber"><Clapperboard size={19} /></span><h1>Studio not found</h1><p>This room is not available in the current browser demo.</p><Link className="button button--primary" to="/">Back to workspace</Link></section>;
  }

  function moveClip(id: string, delta: number) {
    setClips((current) => localDemoTimelineEditor.move(current, id, delta, SCENE_SECONDS));
  }

  function trimClip(id: string, delta: number) {
    setClips((current) => localDemoTimelineEditor.trim(current, id, delta, SCENE_SECONDS));
  }

  function splitClip(id: string) {
    const clip = clips.find((item) => item.id === id);
    if (!clip || clip.duration < 3) return;
    setClips((current) => localDemoTimelineEditor.split(current, id));
    setSelectedId(`${id}-a`);
  }

  function resetTimeline() {
    setClips(localDemoTimelineEditor.reset());
    setSelectedId(seedClips[0]?.id ?? '');
    setPlayhead(0);
    setPlaying(false);
  }

  function chooseLocalVideo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      setVideoMessage('Choose a video file to preview on this device.');
      event.target.value = '';
      return;
    }
    if (file.size > 250 * 1024 * 1024) {
      setVideoMessage('For this local preview, choose a file smaller than 250 MB.');
      event.target.value = '';
      return;
    }
    setVideoMessage('');
    setVideoName(file.name);
    setVideoUrl(URL.createObjectURL(file));
  }

  function togglePlayback() {
    if (videoUrl && videoElement.current) {
      if (playing) videoElement.current.pause();
      else void videoElement.current.play().catch(() => setVideoMessage('This video format could not be previewed in your browser.'));
    }
    setPlaying((current) => !current);
  }

  return (
    <div className="studio-page">
      <div className="studio-topline">
        <div className="studio-breadcrumb"><button className="crumb-back" onClick={() => navigate(`/demo/room/${room.id}/lobby`)} aria-label="Back to room lobby"><ArrowLeft size={16} /></button><span className="breadcrumb"><Link to="/">WORKSPACE</Link><span className="breadcrumb__slash">/</span><Link to={`/demo/room/${room.id}/lobby`}>{room.code}</Link><span className="breadcrumb__slash">/</span><span>STUDIO</span></span></div>
        <div className="studio-status"><span className="demo-mini-tag">DEMO TIMELINE</span><span className="studio-status__sync"><span className="status-dot" /> Local edits only</span></div>
      </div>
      <header className="studio-heading"><div><div className="studio-title-row"><h1>{room.name}</h1><button className="quiet-icon-button" aria-label="Studio options"><Settings2 size={17} /></button></div><p><span className="scene-chip"><Clapperboard size={13} /> {room.sceneTitle}</span><span className="heading-divider" /><span>{room.targetLanguage} dub</span><span className="heading-divider" /><span>Editing independently</span></p></div>
        <div className="studio-heading__actions"><button className="button button--quiet button--small" onClick={resetTimeline}><RotateCcw size={14} /> Reset demo</button><button className="button button--export button--small" disabled title="Real export will be added with the media-rendering backend"><Download size={15} /> Export <span className="coming-soon-label">LATER</span></button></div>
      </header>

      <section className="studio-notice"><span className="notice-mark"><Waves size={15} /></span><p><strong>This is a demo timeline.</strong> Clips below are sample data. Edits only affect this open page; no audio is recorded or saved, no teammates are synced, and export is not implemented.</p><button className="notice-help" aria-label="About this demo" title="Phase 1 prototype: no Supabase connection"><CircleHelp size={16} /></button></section>

      <section className="scene-stage panel">
        <div className="scene-stage__toolbar"><span className="eyebrow">SCENE PREVIEW</span><span className="scene-stage__toolbar-right"><span><Volume2 size={14} /> AUDIO MIX <b>DEMO</b></span><button className="quiet-icon-button" aria-label="Preview settings"><Settings2 size={15} /></button></span></div>
        <div className={`scene-canvas${videoUrl ? ' scene-canvas--video' : ''}`}>
          {videoUrl ? <video ref={videoElement} className="local-video" src={videoUrl} controls playsInline onEnded={() => setPlaying(false)} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} aria-label="Temporary local video preview" /> : <div className="scene-placeholder"><div className="placeholder-grain" /><div className="placeholder-moon" /><div className="placeholder-city" /><div className="placeholder-train"><i /><i /><i /></div><span className="scene-timecode">{timecode(playhead)} <span>/ 00:38</span></span><span className="placeholder-caption">NIGHT PLATFORM <i>·</i> DEMO ART</span><span className="placeholder-play"><Play size={20} fill="currentColor" /></span></div>}
        </div>
        <div className="scene-stage__controls"><button className="play-button" onClick={togglePlayback} aria-label={playing ? 'Pause demo timeline' : 'Play demo timeline'}>{playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}</button><span className="playback-time">{timecode(playhead)} <span>/ 00:38</span></span><input className="playback-scrubber" type="range" min={0} max={SCENE_SECONDS} step={0.25} value={playhead} onChange={(event) => setPlayhead(Number(event.target.value))} aria-label="Demo playhead position" /><span className="scene-aspect">00:38 <span>DEMO</span></span></div>
      </section>

      <section className="timeline-panel panel">
        <div className="timeline-panel__header"><div className="timeline-heading"><span className="panel-icon panel-icon--cyan"><AudioLines size={17} /></span><div><h2>Dialogue timeline</h2><p>Sample dialogue · local-only edits</p></div></div><div className="timeline-actions"><input ref={fileInput} type="file" accept="video/*" className="visually-hidden" onChange={chooseLocalVideo} /><button className="button button--quiet button--small" onClick={() => fileInput.current?.click()}><Upload size={14} /> Preview a video</button><button className="button button--quiet button--small" disabled title="Microphone recording is not connected in Phase 1"><Mic2 size={14} /> Record <span className="coming-soon-label">LATER</span></button></div></div>
        <p className="timeline-file-note"><FileVideo2 size={14} /> {videoName ? <><strong>{videoName}</strong> · preview only, not uploaded</> : 'Optional: choose a video to preview locally. The file remains in this browser session and is never uploaded.'}{videoMessage && <span className="form-error inline-error" role="alert">{videoMessage}</span>}</p>
        <div className="timeline-scroll" role="region" aria-label="Scrollable demo dialogue timeline">
          <div className="timeline-grid" style={{ '--timeline-width': `${TIMELINE_WIDTH}px` } as CSSProperties}>
            <div className="timeline-scale-label"><Clock3 size={13} /> TIME</div><div className="timeline-ruler">{ticks.map((tick) => <span className="timeline-tick" key={tick} style={{ left: `${(tick / SCENE_SECONDS) * 100}%`, transform: tick === SCENE_SECONDS || tick === Math.floor(SCENE_SECONDS / 5) * 5 ? 'translateX(-100%)' : tick === 0 ? 'none' : 'translateX(-1px)' }}><i />{timecode(tick)}</span>)}<div className="timeline-playhead" style={{ left: `${(playhead / SCENE_SECONDS) * 100}%` }}><span /></div></div>
            {characters.map((character) => <div className="timeline-lane" key={character}><div className="timeline-lane__label"><span className={`character-dot character-dot--${clips.find((clip) => clip.character === character)?.color ?? 'cyan'}`} />{character}</div><div className="timeline-lane__body">{clips.filter((clip) => clip.character === character).map((clip) => <button key={clip.id} className={`clip-block clip-block--${clip.color}${selectedId === clip.id ? ' is-selected' : ''}`} style={{ left: `${(clip.start / SCENE_SECONDS) * 100}%`, width: `${(clip.duration / SCENE_SECONDS) * 100}%` }} onClick={() => { setSelectedId(clip.id); setPlayhead(clip.start); }} aria-label={`${clip.character} clip at ${timecode(clip.start)}, ${clip.duration.toFixed(1)} seconds: ${clip.transcript}`}><span className="clip-block__wave" aria-hidden="true">{Array.from({ length: 24 }, (_, index) => <i key={index} style={{ height: `${18 + ((index * 19 + clip.id.length * 7) % 62)}%` }} />)}</span><span className="clip-block__text">{clip.transcript}</span></button>)}<div className="lane-playhead" style={{ left: `${(playhead / SCENE_SECONDS) * 100}%` }} /></div></div>)}
          </div>
        </div>
        <div className="timeline-footer"><span><span className="status-dot" /> {clips.length} sample clips <span className="dot-separator">·</span> {characters.length} characters</span><span>Drag-like edit controls below change demo state only</span></div>
      </section>

      <section className="clip-editor panel"><div className="clip-editor__heading"><div><span className="eyebrow">SELECTED LINE</span><h2>{selectedClip?.character ?? 'No clip selected'} <span>{selectedClip ? timecode(selectedClip.start) : ''}</span></h2></div><span className="clip-editor__state"><span className="status-dot" /> Demo edit</span></div>
        {selectedClip ? <><p className="clip-transcript">“{selectedClip.transcript.replace(/ · part [12]$/, '')}”</p><div className="clip-edit-controls"><div className="edit-control-group"><span className="edit-control-label"><MoveLeft size={13} /> POSITION</span><button onClick={() => moveClip(selectedClip.id, -0.5)} aria-label="Move selected demo clip earlier by half a second">−0.5s</button><button onClick={() => moveClip(selectedClip.id, 0.5)} aria-label="Move selected demo clip later by half a second"><MoveRight size={13} /> +0.5s</button></div><div className="edit-control-group"><span className="edit-control-label"><AudioLines size={13} /> TRIM</span><button onClick={() => trimClip(selectedClip.id, -0.5)} aria-label="Shorten selected demo clip by half a second">−0.5s</button><button onClick={() => trimClip(selectedClip.id, 0.5)} aria-label="Lengthen selected demo clip by half a second">+0.5s <ChevronDown size={12} /></button></div><div className="edit-control-group edit-control-group--split"><span className="edit-control-label"><Scissors size={13} /> CLIP</span><button onClick={() => splitClip(selectedClip.id)} disabled={selectedClip.duration < 3} title="Split this sample clip into two local demo blocks"><Scissors size={13} /> Split demo clip</button></div></div></> : <p className="clip-transcript">Select a timeline clip to see its sample line.</p>}
      </section>
      <div className="studio-next-steps"><span><Mic2 size={15} /> Browser recording</span><span><UsersRoundIcon /> Live collaboration</span><span><Download size={15} /> Rendered export</span><span className="studio-next-steps__status">Planned · not connected</span></div>
    </div>
  );
}

function UsersRoundIcon() {
  return <span className="people-icon" aria-hidden="true">2+</span>;
}
