import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ArrowRight, ArrowUpRight, Check, Clapperboard, Copy, Globe2, LockKeyhole, Plus, Radio, Sparkles, UsersRound } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { demoLanguages } from '../../demo/seedData';
import { supabaseRoomService } from '../../services/supabaseRooms';
import type { PersistentRoom, RoomVisibility } from '../../types/domain';

function invitationFromInput(value: string): string | null {
  const trimmed = value.trim();
  const pathMatch = trimmed.match(/\/join\/([0-9a-f]{48})(?:[/?#]|$)/i);
  const candidate = pathMatch?.[1] ?? trimmed.replace(/\s+/g, '');
  return /^[0-9a-f]{48}$/i.test(candidate) ? candidate.toUpperCase() : null;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [roomName, setRoomName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<RoomVisibility>('public');
  const [languageChoice, setLanguageChoice] = useState('Spanish');
  const [customLanguage, setCustomLanguage] = useState('');
  const [maxMembers, setMaxMembers] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [formError, setFormError] = useState('');
  const [joinError, setJoinError] = useState('');
  const [rooms, setRooms] = useState<PersistentRoom[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdInvite, setCreatedInvite] = useState<{ room: PersistentRoom; code: string; expiresAt: string | null } | null>(null);
  const [copied, setCopied] = useState(false);

  const targetLanguage = languageChoice === 'custom' ? customLanguage.trim() : languageChoice;
  const inviteUrl = useMemo(() => createdInvite ? `${window.location.origin}/join/${createdInvite.code}` : '', [createdInvite]);
  const displayName = profile?.display_name ?? user?.user_metadata?.display_name ?? user?.email?.split('@')[0] ?? 'Collaborator';

  useEffect(() => {
    if (!user) {
      setRooms([]);
      setLoadingRooms(false);
      return;
    }
    let active = true;
    setLoadingRooms(true);
    void supabaseRoomService.listMyRooms(user.id).then((items) => {
      if (active) setRooms(items);
    }).catch((cause: unknown) => {
      if (active) setFormError(cause instanceof Error ? cause.message : 'Your room list could not be loaded.');
    }).finally(() => {
      if (active) setLoadingRooms(false);
    });
    return () => { active = false; };
  }, [user?.id]);

  async function refreshRooms() {
    if (!user) return;
    setLoadingRooms(true);
    try {
      setRooms(await supabaseRoomService.listMyRooms(user.id));
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : 'Your room list could not be refreshed.');
    } finally {
      setLoadingRooms(false);
    }
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError('');
    const trimmedName = roomName.trim();
    const trimmedDescription = description.trim();
    const numericCapacity = maxMembers.trim() === '' ? null : Number(maxMembers);
    if (trimmedName.length < 3 || trimmedName.length > 64) return setFormError('Room name must be 3–64 characters.');
    if (trimmedDescription.length > 280) return setFormError('Description must be 280 characters or fewer.');
    if (targetLanguage.length < 2 || targetLanguage.length > 48) return setFormError('Choose or enter a target language (2–48 characters).');
    if (numericCapacity !== null && (!Number.isInteger(numericCapacity) || numericCapacity < 2 || numericCapacity > 500)) return setFormError('Member limit must be a whole number from 2 to 500, or left blank.');
    setIsSubmitting(true);
    try {
      const result = await supabaseRoomService.createRoom({
        name: trimmedName,
        description: trimmedDescription,
        visibility,
        targetLanguage,
        maxMembers: numericCapacity,
      });
      setRoomName('');
      setDescription('');
      setMaxMembers('');
      await refreshRooms();
      if (result.inviteCode) {
        setCreatedInvite({ room: result.room, code: result.inviteCode, expiresAt: result.inviteExpiresAt });
      } else {
        navigate(`/room/${result.room.id}/lobby`);
      }
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : 'Could not create the room. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setJoinError('');
    const code = invitationFromInput(joinCode);
    if (!code) {
      setJoinError('Paste a valid 48-character private invitation code or its /join/ link.');
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await supabaseRoomService.joinPrivateRoom(code);
      navigate(`/room/${result.roomId}/lobby`);
    } catch (cause) {
      setJoinError(cause instanceof Error ? cause.message : 'This invitation could not be accepted.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function copyInvitation() {
    if (!createdInvite) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
      setFormError('Clipboard access is blocked. Select and copy the invitation link manually.');
    }
  }

  return (
    <div className="dashboard-page">
      <div className="page-heading-row"><div className="breadcrumb"><span>YOUR STUDIO</span><span className="breadcrumb__slash">/</span><span>OVERVIEW</span></div><span className="updated-note"><span className="status-dot" /> Rooms saved to Supabase</span></div>

      <section className="dashboard-hero">
        <div className="dashboard-hero__copy">
          <span className="section-kicker"><span className="kicker-line" /> THE DUBBING ROOM FOR EVERYONE</span>
          <h1>Give the scene<br />another <em>voice.</em></h1>
          <p>Welcome back, {displayName}. Bring your people, pick a language, and find out what a scene sounds like when you all step into it.</p>
          <a className="button button--primary" href="#create-room"><Plus size={17} /> Create a room <ArrowRight size={16} /></a>
        </div>
        <div className="hero-art" aria-label="Illustration of a retro-futurist screening room">
          <div className="hero-art__topline"><span className="record-dot" /> ROOM 01 <span className="hero-art__mono">LIVE CALL-SHEET</span></div>
          <div className="hero-art__frame"><div className="hero-art__moon" /><div className="hero-art__horizon" /><div className="hero-art__platform" /><div className="hero-art__train"><span /><span /><span /></div><div className="hero-art__caption">EVERY SCENE HAS ANOTHER SIDE <span>— DUBROOM</span></div></div>
          <div className="hero-art__wave" aria-hidden="true">{Array.from({ length: 36 }, (_, index) => <span key={index} style={{ height: `${14 + ((index * 19 + 23) % 75)}%` }} />)}</div>
          <div className="hero-art__bottom"><span><span className="status-dot" /> YOUR ROOMS ARE PERSISTENT</span><span>ON AIR</span></div>
        </div>
      </section>

      <div className="dashboard-section-title"><div><span className="eyebrow">MAKE IT YOURS</span><h2>Start with a room</h2></div><Link to="/rooms" className="text-link">Browse open rooms <ArrowUpRight size={15} /></Link></div>
      <div className="start-grid" id="create-room">
        <section className="panel create-panel">
          <div className="panel-title-row"><span className="panel-icon panel-icon--cyan"><Plus size={17} /></span><div><h3>Create a room</h3><p>Your room and project are saved to the database.</p></div></div>
          <form className="room-form" onSubmit={handleCreate} noValidate>
            <label className="field-label" htmlFor="room-name">Room name<input id="room-name" className="text-input" value={roomName} onChange={(event) => setRoomName(event.target.value)} placeholder="e.g. The midnight scene" maxLength={64} disabled={isSubmitting} /></label>
            <label className="field-label" htmlFor="room-description">Description <span className="optional-label">OPTIONAL</span><textarea id="room-description" className="text-input text-area" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Give your cast a little context" maxLength={280} rows={2} disabled={isSubmitting} /></label>
            <div className="form-row form-row--split">
              <div className="field-wrap"><label className="field-label" htmlFor="target-language">Target language</label><select id="target-language" className="text-input select-input" value={languageChoice} onChange={(event) => setLanguageChoice(event.target.value)} disabled={isSubmitting}>{demoLanguages.map((language) => <option key={language}>{language}</option>)}<option value="custom">Other language…</option></select></div>
              <div className="field-wrap"><span className="field-label">Room access</span><div className="segmented-control" role="group" aria-label="Room access"><button className={visibility === 'public' ? 'is-selected' : ''} type="button" onClick={() => setVisibility('public')} aria-pressed={visibility === 'public'} disabled={isSubmitting}><Globe2 size={14} /> Public</button><button className={visibility === 'private' ? 'is-selected' : ''} type="button" onClick={() => setVisibility('private')} aria-pressed={visibility === 'private'} disabled={isSubmitting}><LockKeyhole size={14} /> Private</button></div></div>
            </div>
            {languageChoice === 'custom' && <label className="field-label" htmlFor="custom-language">Target language<input id="custom-language" className="text-input" value={customLanguage} onChange={(event) => setCustomLanguage(event.target.value)} placeholder="Type a language" maxLength={48} disabled={isSubmitting} /></label>}
            <label className="field-label" htmlFor="room-capacity">Member limit <span className="optional-label">OPTIONAL</span><input id="room-capacity" type="number" className="text-input" inputMode="numeric" min={2} max={500} step={1} value={maxMembers} onChange={(event) => setMaxMembers(event.target.value)} placeholder="No limit" disabled={isSubmitting} /></label>
            {formError && <p className="form-error" role="alert">{formError}</p>}
            <button className="button button--primary button--wide" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Opening the room…' : 'Create room'} <ArrowRight size={16} /></button>
          </form>
        </section>

        <section className="panel join-panel">
          <div className="panel-title-row"><span className="panel-icon panel-icon--violet"><Radio size={17} /></span><div><h3>Join a private room</h3><p>Paste the invite code or the link the owner shared.</p></div></div>
          <form className="join-form" onSubmit={handleJoin} noValidate>
            <label className="field-label" htmlFor="join-code">Private invitation</label>
            <div className="join-code-field"><input id="join-code" className="text-input code-input" value={joinCode} onChange={(event) => setJoinCode(event.target.value)} placeholder="48-character invite code or link" maxLength={500} autoCapitalize="characters" disabled={isSubmitting} /><button className="icon-button" type="submit" aria-label="Accept invitation" disabled={isSubmitting}><ArrowRight size={18} /></button></div>
            {joinError && <p className="form-error" role="alert">{joinError}</p>}
          </form>
          <div className="join-divider"><span>OR BROWSE OPEN ROOMS</span></div>
          <Link className="explore-card" to="/rooms"><span className="explore-card__icon"><Globe2 size={19} /></span><span><strong>Public rooms</strong><small>Find a cast and join their scene.</small></span><ArrowRight size={17} /></Link>
          <div className="demo-separator"><span>JUST LOOKING AROUND?</span></div>
          <Link className="demo-room-card" to="/demo/room/scene-042/lobby"><span className="demo-room-poster"><Clapperboard size={20} /><span>SCENE<br />042</span></span><span className="demo-room-card__info"><span className="demo-room-card__title">The Last Train · sample</span><span className="demo-room-card__meta"><Sparkles size={13} /> Temporary demo lobby and timeline</span></span><ArrowUpRight size={16} className="demo-room-card__arrow" /></Link>
        </section>
      </div>

      <section className="recent-section">
        <div className="dashboard-section-title dashboard-section-title--compact"><div><span className="eyebrow">YOUR CALL-SHEET</span><h2>Recent rooms</h2></div><button className="button button--quiet" type="button" onClick={() => void refreshRooms()} disabled={loadingRooms}>Refresh</button></div>
        {loadingRooms ? <div className="loading-card panel" aria-live="polite"><span className="status-dot" /> Loading rooms…</div> : rooms.length === 0 ? <div className="empty-room-list panel"><span className="panel-icon panel-icon--amber"><UsersRound size={17} /></span><div><strong>No rooms on your call-sheet yet</strong><small>Create a room or join a cast to see it here. Rooms persist even when you disconnect.</small></div></div> : <div className="room-list">{rooms.map((room) => <Link className="room-list-item" to={`/room/${room.id}/lobby`} key={room.id}><span className="room-list-item__poster"><Clapperboard size={17} /></span><span className="room-list-item__name"><strong>{room.name}</strong><small>{room.targetLanguage} · Updated {new Date(room.updatedAt).toLocaleDateString()}</small></span><span className="room-list-item__visibility">{room.visibility === 'public' ? <Globe2 size={14} /> : <LockKeyhole size={14} />}{room.visibility}</span><ArrowRight size={16} className="room-list-item__arrow" /></Link>)}</div>}
      </section>

      {createdInvite && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setCreatedInvite(null); }}><section className="invite-modal panel" role="dialog" aria-modal="true" aria-labelledby="created-invite-title"><span className="panel-icon panel-icon--violet"><LockKeyhole size={19} /></span><span className="section-kicker"><span className="kicker-line" /> ROOM READY</span><h2 id="created-invite-title">Your private room is open.</h2><p>Save this invitation now. For security, the code is not stored in readable form and won't be shown again.</p><label className="field-label" htmlFor="invite-url">Private invitation link<input id="invite-url" className="text-input invite-url-input" readOnly value={inviteUrl} onFocus={(event) => event.currentTarget.select()} /></label><div className="invite-code-preview"><span>INVITE CODE · {createdInvite.expiresAt ? `EXPIRES ${new Date(createdInvite.expiresAt).toLocaleDateString()}` : 'ONE-TIME DISPLAY'}</span><code>{createdInvite.code}</code></div><div className="invite-modal__actions"><button className="button button--quiet" type="button" onClick={() => void copyInvitation()}>{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? 'Link copied' : 'Copy link'}</button><button className="button button--primary" type="button" onClick={() => navigate(`/room/${createdInvite.room.id}/lobby`)}>Open room <ArrowRight size={16} /></button></div></section></div>}
    </div>
  );
}
