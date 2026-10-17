import { useEffect, useState, type FormEvent } from 'react';
import { ArrowRight, ArrowUpRight, Globe2, LockKeyhole, Plus, Radio, UsersRound, Video } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { demoLanguages, seedRoom } from '../../demo/seedData';
import { localDemoRoomService } from '../../services/demoRooms';
import type { DemoRoom, RoomVisibility } from '../../types/domain';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [roomName, setRoomName] = useState('');
  const [displayName, setDisplayName] = useState('Ava');
  const [visibility, setVisibility] = useState<RoomVisibility>('public');
  const [languageChoice, setLanguageChoice] = useState('Spanish');
  const [customLanguage, setCustomLanguage] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [formError, setFormError] = useState('');
  const [joinError, setJoinError] = useState('');
  const [rooms, setRooms] = useState<DemoRoom[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    void localDemoRoomService.listRooms().then((items) => {
      if (active) setRooms(items);
    }).catch(() => {
      if (active) setFormError('Rooms in this browser session could not be loaded.');
    });
    return () => { active = false; };
  }, []);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError('');
    const targetLanguage = languageChoice === 'custom' ? customLanguage : languageChoice;
    if (roomName.trim().length < 3) return setFormError('Room name needs at least 3 characters.');
    if (displayName.trim().length < 2) return setFormError('Display name needs at least 2 characters.');
    if (targetLanguage.trim().length < 2) return setFormError('Choose or enter a target language.');
    setIsSubmitting(true);
    try {
      const room = await localDemoRoomService.createRoom({ name: roomName, creator: displayName, targetLanguage, visibility });
      navigate(`/room/${room.id}/lobby`);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not create this demo room.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setJoinError('');
    const code = joinCode.trim().toUpperCase();
    if (!/^[A-Z0-9]{3,5}-[A-Z0-9]{3,5}$/.test(code)) {
      setJoinError('Enter a room code in the format SCN-042.');
      return;
    }
    setIsSubmitting(true);
    try {
      const room = await localDemoRoomService.joinRoom(code);
      navigate(`/room/${room.id}/lobby`);
    } catch (error) {
      setJoinError(error instanceof Error ? error.message : 'Could not join a local demo room.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="dashboard-page">
      <div className="page-heading-row">
        <div className="breadcrumb"><span>WORKSPACE</span><span className="breadcrumb__slash">/</span><span>OVERVIEW</span></div>
        <span className="updated-note"><span className="status-dot" /> Demo data · this browser only</span>
      </div>

      <section className="dashboard-hero">
        <div className="dashboard-hero__copy">
          <span className="section-kicker"><span className="kicker-line" /> THE DUBBING ROOM FOR EVERYONE</span>
          <h1>Give the scene<br />another <em>voice.</em></h1>
          <p>Bring your people, pick a language, and find out what the scene sounds like when you all step into it.</p>
          <a className="button button--primary" href="#create-room"><Plus size={17} /> Create a room <ArrowRight size={16} /></a>
        </div>
        <div className="hero-art" aria-label="A demo scene timeline illustration">
          <div className="hero-art__topline"><span className="record-dot" /> SCENE 01 <span className="hero-art__mono">00:24:08</span></div>
          <div className="hero-art__frame">
            <div className="hero-art__moon" />
            <div className="hero-art__horizon" />
            <div className="hero-art__platform" />
            <div className="hero-art__train"><span /><span /><span /></div>
            <div className="hero-art__caption">THE LAST TRAIN <span>— SAMPLE SCENE</span></div>
          </div>
          <div className="hero-art__wave"><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /></div>
          <div className="hero-art__bottom"><span><span className="status-dot" /> LOCAL DEMO TIMELINE</span><span>00:38</span></div>
        </div>
      </section>

      <div className="dashboard-section-title"><div><span className="eyebrow">MAKE IT YOURS</span><h2>Start with a room</h2></div><span className="section-side-note">A quick demo room is ready if you want to look around.</span></div>
      <div className="start-grid" id="create-room">
        <section className="panel create-panel">
          <div className="panel-title-row"><span className="panel-icon panel-icon--cyan"><Plus size={17} /></span><div><h3>Create a room</h3><p>Set the scene; invite your cast later.</p></div><span className="demo-mini-tag">LOCAL</span></div>
          <form className="room-form" onSubmit={handleCreate} noValidate>
            <label className="field-label" htmlFor="room-name">Room name</label>
            <input id="room-name" className="text-input" value={roomName} onChange={(event) => setRoomName(event.target.value)} placeholder="e.g. The midnight scene" maxLength={48} />
            <label className="field-label" htmlFor="display-name">Your name in the credits</label>
            <input id="display-name" className="text-input" value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Display name" maxLength={28} />
            <div className="form-row form-row--split">
              <div className="field-wrap"><label className="field-label" htmlFor="target-language">Dub language</label><select id="target-language" className="text-input select-input" value={languageChoice} onChange={(event) => setLanguageChoice(event.target.value)}>{demoLanguages.map((language) => <option key={language}>{language}</option>)}<option value="custom">Other language…</option></select></div>
              <div className="field-wrap"><span className="field-label">Room visibility</span><div className="segmented-control" role="group" aria-label="Room visibility"><button className={visibility === 'public' ? 'is-selected' : ''} type="button" onClick={() => setVisibility('public')} aria-pressed={visibility === 'public'}><Globe2 size={14} /> Public</button><button className={visibility === 'private' ? 'is-selected' : ''} type="button" onClick={() => setVisibility('private')} aria-pressed={visibility === 'private'}><LockKeyhole size={14} /> Private</button></div></div>
            </div>
            {languageChoice === 'custom' && <><label className="field-label" htmlFor="custom-language">Target language</label><input id="custom-language" className="text-input" value={customLanguage} onChange={(event) => setCustomLanguage(event.target.value)} placeholder="Type a language" maxLength={32} /></>}
            {visibility === 'private' && <p className="field-hint">Demo only: this setting is a label, not access control until authentication and room policies are connected.</p>}
            {formError && <p className="form-error" role="alert">{formError}</p>}
            <button className="button button--primary button--wide" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Staging…' : 'Stage this room'} <ArrowRight size={16} /></button>
          </form>
        </section>

        <section className="panel join-panel">
          <div className="panel-title-row"><span className="panel-icon panel-icon--violet"><Radio size={17} /></span><div><h3>Join a room</h3><p>Got a code? Step right in.</p></div></div>
          <form className="join-form" onSubmit={handleJoin} noValidate>
            <label className="field-label" htmlFor="join-code">Room code</label>
            <div className="join-code-field"><input id="join-code" className="text-input code-input" value={joinCode} onChange={(event) => setJoinCode(event.target.value.toUpperCase())} placeholder="SCN-042" maxLength={11} autoCapitalize="characters" /><button className="icon-button" type="submit" aria-label="Join room" disabled={isSubmitting}><ArrowRight size={18} /></button></div>
            {joinError && <p className="form-error" role="alert">{joinError}</p>}
          </form>
          <div className="join-divider"><span>OR EXPLORE THE DEMO</span></div>
          <button className="demo-room-card" type="button" onClick={() => navigate(`/room/${seedRoom.id}/lobby`)}>
            <span className="demo-room-poster"><Video size={22} /><span>SCENE<br />042</span></span>
            <span className="demo-room-card__info"><span className="demo-room-card__title">{seedRoom.name}</span><span className="demo-room-card__meta"><span className="status-dot" /> {seedRoom.targetLanguage} dub · 3 sample cast</span></span>
            <ArrowUpRight size={17} className="demo-room-card__arrow" />
          </button>
          <p className="join-footnote"><UsersRound size={14} /> A sample room to explore the lobby and studio layout.</p>
        </section>
      </div>

      <section className="recent-section">
        <div className="dashboard-section-title dashboard-section-title--compact"><div><span className="eyebrow">YOUR RECENT CUTS</span><h2>Rooms on this device</h2></div><span className="demo-mini-tag">DEMO DATA</span></div>
        <div className="room-list">{rooms.map((room: DemoRoom) => <Link className="room-list-item" to={`/room/${room.id}/lobby`} key={room.id}><span className="room-list-item__poster"><Video size={18} /></span><span className="room-list-item__name"><strong>{room.name}</strong><small>{room.targetLanguage} · {room.code} · {room.updatedLabel}</small></span><span className="room-list-item__visibility">{room.visibility === 'public' ? <Globe2 size={14} /> : <LockKeyhole size={14} />}{room.visibility}</span><ArrowRight size={16} className="room-list-item__arrow" /></Link>)}</div>
        <p className="recent-disclaimer">Created rooms are held in memory for this demo. Refreshing this page clears them.</p>
      </section>
    </div>
  );
}
