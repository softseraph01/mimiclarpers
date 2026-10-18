import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, Check, Clapperboard, Copy, Globe2, KeyRound, LockKeyhole, LogOut, Play, RefreshCw, Settings2, UsersRound } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { useRoomPresence } from '../../hooks/useRoomPresence';
import { supabaseRoomService } from '../../services/supabaseRooms';
import type { PersistentProject, PersistentRoom, PersistentRoomMember } from '../../types/domain';
import type { RotateRoomInviteResult } from '../../services/contracts';

type LobbyData = {
  room: PersistentRoom;
  membership: PersistentRoomMember | null;
  members: PersistentRoomMember[];
  project: PersistentProject | null;
};

export default function PersistentLobbyPage() {
  const { roomId = '' } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState<LobbyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [newInvite, setNewInvite] = useState<RotateRoomInviteResult | null>(null);
  const [actionMessage, setActionMessage] = useState('');
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', description: '', targetLanguage: '', maxMembers: '' });
  const [nextOwnerId, setNextOwnerId] = useState('');

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const room = await supabaseRoomService.getRoom(roomId);
      if (!room) {
        setData(null);
        return;
      }
      const membership = await supabaseRoomService.getMyMembership(roomId, user.id);
      if (!membership) {
        setData({ room, membership: null, members: [], project: null });
        return;
      }
      const [members, project] = await Promise.all([
        supabaseRoomService.listMembers(roomId),
        supabaseRoomService.getProject(roomId),
      ]);
      setData({ room, membership, members, project });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'This room could not be loaded.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [roomId, user?.id]);

  useEffect(() => { void load(); }, [load]);

  const isMember = Boolean(data?.membership);
  const { onlineUserIds, status: presenceStatus } = useRoomPresence(roomId, isMember);
  const members = (data?.members ?? []).map((member) => ({ ...member, online: onlineUserIds.has(member.userId) }));
  const isOwner = data?.membership?.role === 'owner';
  const inviteUrl = newInvite ? `${window.location.origin}/join/${newInvite.inviteCode}` : '';

  async function joinPublicRoom() {
    setBusy(true);
    setError('');
    try {
      await supabaseRoomService.joinPublicRoom(roomId);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'This public room could not be joined.');
    } finally {
      setBusy(false);
    }
  }

  async function shareRoom() {
    if (!data?.room) return;
    setBusy(true);
    setError('');
    setActionMessage('');
    try {
      if (data.room.visibility === 'private') {
        if (!isOwner) throw new Error('Only the room owner can generate a private invitation.');
        const invite = await supabaseRoomService.rotateInvite(roomId);
        setNewInvite(invite);
        const link = `${window.location.origin}/join/${invite.inviteCode}`;
        try {
          await navigator.clipboard.writeText(link);
          setCopied(true);
          setActionMessage('A fresh private invitation was created and copied. Previous links have been invalidated.');
        } catch {
          setCopied(false);
          setActionMessage('A fresh private invitation was created. Copy the visible link below; previous links have been invalidated.');
        }
      } else {
        setNewInvite(null);
        const link = `${window.location.origin}/room/${roomId}/lobby`;
        try {
          await navigator.clipboard.writeText(link);
          setCopied(true);
          setActionMessage('Public room link copied.');
        } catch {
          setCopied(false);
          setActionMessage(`Clipboard unavailable. Copy this public room link manually: ${link}`);
        }
      }
      window.setTimeout(() => setCopied(false), 1800);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The room link could not be created.');
    } finally {
      setBusy(false);
    }
  }

  async function leaveRoom() {
    setBusy(true);
    setError('');
    try {
      await supabaseRoomService.leaveRoom(roomId);
      navigate('/', { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'You could not leave this room.');
    } finally {
      setBusy(false);
    }
  }

  async function transferOwnership() {
    const nextOwner = members.find((member) => member.userId === nextOwnerId);
    if (!data || !isOwner || !nextOwner) return setError('Choose a current room member before transferring ownership.');
    if (!window.confirm(`Transfer room ownership to ${nextOwner.displayName}? You will become a regular member.`)) return;
    setBusy(true);
    setError('');
    try {
      await supabaseRoomService.transferOwnership(roomId, nextOwner.userId);
      setNextOwnerId('');
      setNewInvite(null);
      setActionMessage(`Ownership transferred to ${nextOwner.displayName}. You can now leave the room if needed.`);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Ownership could not be transferred.');
    } finally {
      setBusy(false);
    }
  }

  function startEditing() {
    if (!data) return;
    setEditForm({
      name: data.room.name,
      description: data.room.description,
      targetLanguage: data.room.targetLanguage,
      maxMembers: data.room.maxMembers === null ? '' : String(data.room.maxMembers),
    });
    setError('');
    setEditing(true);
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data || !isOwner) return;
    const name = editForm.name.trim();
    const description = editForm.description.trim();
    const targetLanguage = editForm.targetLanguage.trim();
    const maxMembers = editForm.maxMembers.trim() === '' ? null : Number(editForm.maxMembers);
    if (name.length < 3 || name.length > 64) return setError('Room name must be 3–64 characters.');
    if (description.length > 280) return setError('Description must be 280 characters or fewer.');
    if (targetLanguage.length < 2 || targetLanguage.length > 48) return setError('Target language must be 2–48 characters.');
    if (maxMembers !== null && (!Number.isInteger(maxMembers) || maxMembers < 2 || maxMembers > 500)) return setError('Member limit must be a whole number from 2 to 500, or left blank.');
    if (maxMembers !== null && maxMembers < members.length) return setError('The member limit cannot be below the current member count.');
    setBusy(true);
    setError('');
    try {
      await supabaseRoomService.updateRoomSettings({ roomId, name, description, targetLanguage, maxMembers });
      setActionMessage('Room settings saved.');
      setEditing(false);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Room settings could not be saved.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <section className="empty-state panel" aria-live="polite"><span className="status-dot" /> Loading the room call-sheet…</section>;
  if (!data) return <section className="empty-state panel"><span className="panel-icon panel-icon--amber"><Clapperboard size={19} /></span><h1>This room isn't available</h1><p>{error || 'It may be private, archived, or you may not have access.'}</p><Link className="button button--primary" to="/">Back to workspace <ArrowRight size={16} /></Link></section>;

  const { room, membership, project } = data;
  const isPublicNonMember = room.visibility === 'public' && !membership;
  const memberLimit = room.maxMembers ? `${members.length} / ${room.maxMembers}` : `${members.length}`;
  const transferableMembers = members.filter((member) => member.userId !== user?.id);

  return <div className="lobby-page persistent-lobby-page">
    <div className="page-heading-row"><div className="breadcrumb"><Link to="/">WORKSPACE</Link><span className="breadcrumb__slash">/</span><span>ROOM LOBBY</span></div><span className="room-status-pill"><span className="status-dot" /> {room.status === 'open' ? 'OPEN ROOM' : 'ARCHIVED'}</span></div>
    <Link className="back-link" to="/"><ArrowLeft size={15} /> Your rooms</Link>
    <section className="lobby-hero persistent-lobby-hero">
      <div className="lobby-hero__scene"><div className="lobby-scene-art"><span className="scene-art__stars" /><span className="scene-art__moon" /><span className="scene-art__city" /><span className="scene-art__train"><i /><i /><i /></span><span className="scene-art__label">ROOM <b>{room.id.slice(0, 8).toUpperCase()}</b></span></div></div>
      <div className="lobby-hero__details">
        <div className="breadcrumb breadcrumb--muted"><span>{isOwner ? 'ROOM OWNER' : membership ? 'ROOM MEMBER' : 'OPEN CALL'}</span><span className="breadcrumb__slash">/</span><span>{room.visibility.toUpperCase()}</span></div>
        <h1>{room.name}</h1>
        <p className="lobby-description">{room.description || 'A shared table for trying new voices on this scene.'}</p>
        <div className="room-meta-row"><span className="meta-chip"><Globe2 size={14} /> {room.targetLanguage} dub</span><span className="meta-chip">{room.visibility === 'public' ? <Globe2 size={14} /> : <LockKeyhole size={14} />} {room.visibility}</span><span className="meta-chip"><UsersRound size={14} /> {memberLimit} member{members.length === 1 ? '' : 's'}</span></div>
        {error && <p className="form-error" role="alert">{error}</p>}
        {actionMessage && <p className="form-success" role="status">{actionMessage}</p>}
        {isPublicNonMember ? <div className="lobby-hero__actions"><button className="button button--primary" type="button" onClick={() => void joinPublicRoom()} disabled={busy || room.status !== 'open' || (room.maxMembers !== null && members.length >= room.maxMembers)}>{busy ? 'Joining…' : 'Join this public room'} <ArrowRight size={16} /></button><span className="field-hint">Room data is public; membership is created only when you join.</span></div> : <div className="lobby-hero__actions"><button className="button button--primary" type="button" onClick={() => navigate(`/studio/${room.id}`)} disabled={room.status !== 'open'}><Play size={15} fill="currentColor" /> Enter studio <ArrowRight size={16} /></button><button className="button button--quiet" type="button" onClick={() => void shareRoom()} disabled={busy || room.status !== 'open'}>{copied ? <Check size={15} /> : room.visibility === 'private' ? <KeyRound size={15} /> : <Copy size={15} />}{room.visibility === 'private' ? 'Create invite' : copied ? 'Link copied' : 'Copy room link'}</button>{isOwner && <button className="button button--quiet" type="button" onClick={startEditing} disabled={busy}><Settings2 size={15} /> Edit room</button>}<button className="button button--quiet" type="button" onClick={() => void leaveRoom()} disabled={busy || isOwner} title={isOwner ? 'Transfer ownership before leaving.' : undefined}><LogOut size={15} /> Leave room</button></div>}
        {newInvite && <div className="generated-invite"><span>FRESH PRIVATE INVITATION · EXPIRES {new Date(newInvite.expiresAt).toLocaleDateString()}</span><code>{newInvite.inviteCode}</code><a href={inviteUrl} className="text-link invite-link-url" aria-label="Private invitation link">{inviteUrl}</a></div>}
      </div>
    </section>

    {editing && isOwner && <form className="panel room-settings-panel" onSubmit={(event) => void saveSettings(event)}>
      <div className="panel-title-row"><span className="panel-icon panel-icon--violet"><Settings2 size={17} /></span><div><h2>Edit room details</h2><p>Only the current room owner can save these settings.</p></div></div>
      <div className="room-settings-grid"><label className="field-label" htmlFor="settings-name">Room name<input id="settings-name" className="text-input" value={editForm.name} onChange={(event) => setEditForm({ ...editForm, name: event.target.value })} maxLength={64} /></label><label className="field-label" htmlFor="settings-language">Target language<input id="settings-language" className="text-input" value={editForm.targetLanguage} onChange={(event) => setEditForm({ ...editForm, targetLanguage: event.target.value })} maxLength={48} /></label><label className="field-label room-settings-grid__wide" htmlFor="settings-description">Description<textarea id="settings-description" className="text-input text-area" value={editForm.description} onChange={(event) => setEditForm({ ...editForm, description: event.target.value })} maxLength={280} rows={2} /></label><label className="field-label" htmlFor="settings-capacity">Member limit<input id="settings-capacity" type="number" inputMode="numeric" min={2} max={500} step={1} className="text-input" value={editForm.maxMembers} onChange={(event) => setEditForm({ ...editForm, maxMembers: event.target.value })} placeholder="No limit" /></label></div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="room-settings-actions"><button className="button button--quiet" type="button" onClick={() => setEditing(false)} disabled={busy}>Cancel</button><button className="button button--primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save changes'} <Check size={15} /></button></div>
    </form>}

    <div className="lobby-content-grid">
      <section className="panel cast-panel"><div className="panel-title-row"><span className="panel-icon panel-icon--cyan"><UsersRound size={17} /></span><div><h2>On the call-sheet</h2><p>Room membership is stored; online state is temporary.</p></div><span className="cast-count">{memberLimit} <span>MEMBERS</span></span></div>
        {isPublicNonMember ? <div className="empty-invite"><span className="empty-invite__plus">+</span><span><strong>Join to see the cast</strong><small>Member names are visible only to room members.</small></span></div> : members.length === 0 ? <div className="empty-invite"><span className="empty-invite__plus">+</span><span><strong>No members are listed yet</strong><small>Refresh the call-sheet or re-enter the lobby.</small></span></div> : <div className="participant-list">{members.map((person) => <div className="participant-row" key={person.userId}><span className={`avatar avatar--${person.role === 'owner' ? 'cyan' : 'violet'}`}>{person.displayName.trim().slice(0, 2).toUpperCase()}</span><span className="participant-row__name"><strong>{person.displayName}{person.userId === user?.id ? ' · you' : ''}</strong><small>{person.role === 'owner' ? 'Room owner' : 'Room member'}</small></span><span className={`participant-status${person.online ? ' is-online' : ''}`}><span className="status-dot" /> {presenceStatus === 'unavailable' ? 'Status unavailable' : presenceStatus === 'connecting' ? 'Checking…' : person.online ? 'Online' : 'Offline'}</span></div>)}</div>}
        <div className="presence-note"><span className={`status-dot${presenceStatus === 'connected' ? '' : ' status-dot--muted'}`} />{presenceStatus === 'connected' ? 'Live status connected · short database heartbeat, not permanent membership' : presenceStatus === 'unavailable' ? 'Live status is unavailable · database membership is unchanged' : presenceStatus === 'not-applicable' ? 'Join this room to see member status' : 'Connecting to live status…'}<button className="button button--quiet" type="button" onClick={() => void load()} aria-label="Refresh room data"><RefreshCw size={14} /></button></div>
      </section>
      <section className="panel scene-panel"><div className="panel-title-row"><span className="panel-icon panel-icon--amber"><Clapperboard size={17} /></span><div><h2>Project card</h2><p>Persistent room workspace</p></div></div>
        <div className="scene-info"><span className="scene-info__poster"><Clapperboard size={20} /><span>ROOM<br />FILE</span></span><div className="scene-info__copy"><span className="eyebrow">{project ? 'SAVED PROJECT' : 'PROJECT PENDING'}</span><strong>{project?.title ?? room.name}</strong><small>{project ? `Updated ${new Date(project.updatedAt).toLocaleString()}` : 'Project data is not available in this view.'}</small></div></div>
        <div className="scene-language-row"><span>Target language</span><strong><span className="status-dot" /> {room.targetLanguage}</strong></div>
        <div className="scene-footnote">Rooms and projects persist in PostgreSQL. Presence is temporary. Video and audio assets are not implemented yet.</div>
        {isOwner && <div className="owner-handoff-panel"><p>Transfer ownership explicitly before leaving. The room will not automatically nominate another member.</p>{transferableMembers.length > 0 ? <><label htmlFor="next-room-owner">New owner<select id="next-room-owner" value={nextOwnerId} onChange={(event) => setNextOwnerId(event.target.value)}><option value="">Select a current member…</option>{transferableMembers.map((member) => <option value={member.userId} key={member.userId}>{member.displayName}</option>)}</select></label><button className="button button--quiet" type="button" onClick={() => void transferOwnership()} disabled={busy || !nextOwnerId}><UsersRound size={15} /> {busy ? 'Transferring…' : 'Transfer ownership'}</button></> : <small>Invite a collaborator first; then select them here to transfer ownership.</small>}</div>}
      </section>
    </div>
  </div>;
}
