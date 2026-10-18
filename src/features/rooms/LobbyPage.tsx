import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Clapperboard, Copy, Globe2, LockKeyhole, Play, UsersRound } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { localDemoRoomService } from '../../services/demoRooms';
import type { DemoRoom } from '../../types/domain';

export default function LobbyPage() {
  const { roomId = '' } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState<DemoRoom | null | undefined>(undefined);
  const [copied, setCopied] = useState(false);

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

  async function copyRoomCode() {
    if (!room) return;
    try {
      await navigator.clipboard.writeText(room.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  if (room === undefined) {
    return <section className="empty-state panel" aria-live="polite"><h1>Opening local demo room…</h1></section>;
  }

  if (room === null) {
    return <section className="empty-state panel"><span className="panel-icon panel-icon--amber"><Clapperboard size={19} /></span><h1>This demo room isn't here</h1><p>Return to the dashboard to create another sample room.</p><Link className="button button--primary" to="/">Back to workspace <ArrowRight size={16} /></Link></section>;
  }

  return (
    <div className="lobby-page">
      <div className="page-heading-row">
        <div className="breadcrumb"><Link to="/">WORKSPACE</Link><span className="breadcrumb__slash">/</span><span>ROOM LOBBY</span></div>
        <span className="demo-mini-tag">LOCAL DEMO</span>
      </div>
      <Link className="back-link" to="/"><ArrowLeft size={15} /> All rooms</Link>
      <section className="lobby-hero">
        <div className="lobby-hero__scene"><div className="lobby-scene-art"><span className="scene-art__stars" /><span className="scene-art__moon" /><span className="scene-art__city" /><span className="scene-art__train"><i /><i /><i /></span><span className="scene-art__label">SCENE 01 <b>00:38</b></span></div></div>
        <div className="lobby-hero__details">
          <div className="breadcrumb breadcrumb--muted"><span>READY ROOM</span><span className="breadcrumb__slash">/</span><span>{room.code}</span></div>
          <h1>{room.name}</h1>
          <p className="lobby-description">A shared table for trying new voices on this scene. Pick a character, warm up, and find the moment together.</p>
          <div className="room-meta-row"><span className="meta-chip"><Globe2 size={14} /> {room.targetLanguage} dub</span><span className="meta-chip">{room.visibility === 'public' ? <Globe2 size={14} /> : <LockKeyhole size={14} />} {room.visibility}</span><span className="meta-chip"><Clapperboard size={14} /> 1 scene</span></div>
          {room.visibility === 'private' && <p className="field-hint field-hint--lobby">Visibility is only a demo label here; this lobby has no authentication or access control.</p>}
          <div className="lobby-hero__actions"><button className="button button--primary" onClick={() => navigate(`/demo/studio/${room.id}`)}><Play size={15} fill="currentColor" /> Enter studio <ArrowRight size={16} /></button><button className="button button--quiet" onClick={copyRoomCode}>{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? 'Code copied' : `Copy ${room.code}`}</button></div>
        </div>
      </section>

      <div className="lobby-content-grid">
        <section className="panel cast-panel"><div className="panel-title-row"><span className="panel-icon panel-icon--cyan"><UsersRound size={17} /></span><div><h2>On the call sheet</h2><p>Sample cast for the lobby preview</p></div><span className="cast-count">{room.participants.length} <span>DEMO</span></span></div>
          <div className="participant-list">{room.participants.map((person) => <div className="participant-row" key={person.id}><span className={`avatar avatar--${person.color}`}>{person.initials}</span><span className="participant-row__name"><strong>{person.name}</strong><small>{person.role === 'host' ? 'Room host' : 'Voice actor'} · sample participant</small></span><span className="participant-status"><span className="status-dot" /> In room</span></div>)}</div>
          <div className="empty-invite"><span className="empty-invite__plus">+</span><span><strong>Your friends will show up here</strong><small>Real invites and presence come with the collaboration backend.</small></span></div>
        </section>
        <section className="panel scene-panel"><div className="panel-title-row"><span className="panel-icon panel-icon--amber"><Clapperboard size={17} /></span><div><h2>Scene card</h2><p>The material on the table</p></div></div>
          <div className="scene-info"><span className="scene-info__poster"><Clapperboard size={20} /><span>SCENE<br />042</span></span><div className="scene-info__copy"><span className="eyebrow">FEATURED SCENE</span><strong>{room.sceneTitle}</strong><small>00:38 · Night exterior · Demo card</small></div></div>
          <div className="scene-language-row"><span>Target language</span><strong><span className="status-dot" /> {room.targetLanguage}</strong></div>
          <div className="scene-footnote">Scene and cast details are illustrative. No media asset is stored in this room.</div>
        </section>
      </div>
      <div className="lobby-bottom-note"><span className="status-dot" /> Explore the sample room and try the timeline.</div>
    </div>
  );
}
