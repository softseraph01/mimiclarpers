import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, AudioLines, Clapperboard, Download, Play, Upload, Waves } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { supabaseRoomService } from '../../services/supabaseRooms';
import type { PersistentProject, PersistentRoom } from '../../types/domain';
import LocalRecorder from './LocalRecorder';

export default function PersistentStudioPage() {
  const { roomId = '' } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [room, setRoom] = useState<PersistentRoom | null>(null);
  const [project, setProject] = useState<PersistentProject | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const loadedRoom = await supabaseRoomService.getRoom(roomId);
      setRoom(loadedRoom);
      if (!loadedRoom) {
        setIsMember(false);
        setProject(null);
        return;
      }
      const membership = await supabaseRoomService.getMyMembership(roomId, user.id);
      setIsMember(Boolean(membership));
      setProject(membership ? await supabaseRoomService.getProject(roomId) : null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The studio could not be loaded.');
      setRoom(null);
      setProject(null);
    } finally {
      setLoading(false);
    }
  }, [roomId, user?.id]);

  useEffect(() => { void load(); }, [load]);

  async function joinRoom() {
    setBusy(true);
    setError('');
    try {
      await supabaseRoomService.joinPublicRoom(roomId);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'This room could not be joined.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <section className="empty-state panel" aria-live="polite"><span className="status-dot" /> Opening the project workspace…</section>;
  if (!room) return <section className="empty-state panel"><span className="panel-icon panel-icon--amber"><Clapperboard size={19} /></span><h1>Studio not available</h1><p>{error || 'This project may be private or your account may not have access.'}</p><Link className="button button--primary" to="/">Back to workspace <ArrowRight size={16} /></Link></section>;
  if (room.status === 'archived') return <section className="empty-state panel"><span className="panel-icon panel-icon--amber"><Clapperboard size={19} /></span><h1>This room is archived</h1><p>Archived rooms are read-only and cannot be opened in the studio.</p><Link className="button button--primary" to={`/room/${room.id}/lobby`}>Return to room lobby <ArrowRight size={16} /></Link></section>;

  return <div className="studio-page persistent-studio-page">
    <div className="studio-topline"><div className="studio-breadcrumb"><button className="crumb-back" type="button" onClick={() => navigate(`/room/${room.id}/lobby`)} aria-label="Back to room lobby"><ArrowLeft size={16} /></button><span className="breadcrumb"><Link to="/">WORKSPACE</Link><span className="breadcrumb__slash">/</span><Link to={`/room/${room.id}/lobby`}>ROOM</Link><span className="breadcrumb__slash">/</span><span>STUDIO</span></span></div><div className="studio-status"><span className="room-status-pill"><span className="status-dot" /> DATABASE ROOM</span><span className="studio-status__sync">{project ? 'PROJECT SAVED' : 'PROJECT NOT AVAILABLE'}</span></div></div>
    <header className="studio-heading"><div><div className="studio-title-row"><h1>{room.name}</h1></div><p><span className="scene-chip"><Clapperboard size={13} /> {project?.title ?? 'Room project'}</span><span className="heading-divider" /><span>{room.targetLanguage} dub</span><span className="heading-divider" /><span>Persistent project</span></p></div><div className="studio-heading__actions"><Link className="button button--quiet button--small" to={`/demo/studio/scene-042`}><Waves size={14} /> Open sample timeline</Link><button className="button button--export button--small" type="button" disabled title="A real video export is not implemented in Phase 2"><Download size={15} /> Export <span className="coming-soon-label">LATER</span></button></div></header>
    {error && <p className="form-error" role="alert">{error}</p>}
    {!isMember && room.visibility === 'public' ? <section className="panel join-required-panel"><span className="panel-icon panel-icon--cyan"><Clapperboard size={19} /></span><h2>Join the room to enter its studio</h2><p>Public room details are visible, but project details are protected until you become a member.</p><button className="button button--primary" type="button" onClick={() => void joinRoom()} disabled={busy}>{busy ? 'Joining…' : 'Join this public room'} <ArrowRight size={16} /></button></section> : !isMember ? <section className="panel join-required-panel"><span className="panel-icon panel-icon--violet"><Clapperboard size={19} /></span><h2>Membership required</h2><p>Only room members can open a private project. Use the owner’s invitation link to join.</p><Link className="button button--quiet" to="/">Back to workspace</Link></section> : <>
      <section className="studio-notice"><span className="notice-mark"><Waves size={15} /></span><p><strong>Phase 3 capture milestone.</strong> Room and project metadata are saved, and this browser can now capture a local voice take. Storage uploads, durable clip records, collaborative editing, and rendering remain separate milestones.</p></section>
      <section className="scene-stage panel">
        <div className="scene-stage__toolbar"><span className="eyebrow">SCENE PREVIEW</span><span className="scene-stage__toolbar-right"><span>PROJECT <b>{project?.id.slice(0, 8).toUpperCase() ?? 'PENDING'}</b></span></span></div>
        <div className="scene-canvas live-scene-canvas"><div className="live-scene-orbit" aria-hidden="true" /><span className="live-scene-icon"><Clapperboard size={28} /></span><strong>No scene media yet</strong><span>Uploads are intentionally not enabled in this phase.</span></div>
        <div className="scene-stage__controls"><button className="play-button" type="button" disabled aria-label="Playback unavailable"><Play size={16} fill="currentColor" /></button><span className="playback-time">00:00:00 <span>/ —</span></span><input className="playback-scrubber" type="range" min={0} max={1} value={0} readOnly aria-label="Playback is unavailable until media is added" /><span className="scene-aspect">NO MEDIA <span>YET</span></span></div>
      </section>
      <LocalRecorder />
      <section className="timeline-panel panel live-timeline-panel">
        <div className="timeline-panel__header"><div className="timeline-heading"><span className="panel-icon panel-icon--cyan"><AudioLines size={17} /></span><div><h2>Dialogue timeline</h2><p>Saved clip records and character tracks are the next persistence milestone.</p></div></div><div className="timeline-actions"><button className="button button--quiet button--small" type="button" disabled title="Media uploads are not implemented yet"><Upload size={14} /> Upload video</button><span className="coming-soon-label">TIMELINE LATER</span></div></div>
        <div className="live-timeline-empty"><span className="live-timeline-empty__wave"><AudioLines size={20} /></span><strong>No saved dialogue clips yet</strong><p>Your local take can be previewed or downloaded above. The next step will upload it to private storage and create an authorized, timestamped clip record.</p></div>
        <div className="timeline-footer"><span><span className="status-dot" /> Saved project · no media yet</span><span>Editing and export are not available</span></div>
      </section>
    </>}
  </div>;
}
