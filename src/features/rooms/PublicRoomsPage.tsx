import { useEffect, useState } from 'react';
import { ArrowRight, Globe2, UsersRound } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { supabaseRoomService } from '../../services/supabaseRooms';
import type { PublicRoomSummary } from '../../types/domain';

export default function PublicRoomsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<PublicRoomSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState('');
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      setRooms(await supabaseRoomService.listPublicRooms());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Public rooms could not be loaded.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function join(room: PublicRoomSummary) {
    if (!user) {
      navigate(`/auth?next=${encodeURIComponent(`/room/${room.id}/lobby`)}`);
      return;
    }
    setJoining(room.id);
    setError('');
    try {
      await supabaseRoomService.joinPublicRoom(room.id);
      navigate(`/room/${room.id}/lobby`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'This room could not be joined.');
    } finally {
      setJoining('');
    }
  }

  return <div className="content-page public-rooms-page">
    <div className="page-heading-row"><div className="breadcrumb"><Link to="/">WORKSPACE</Link><span className="breadcrumb__slash">/</span><span>PUBLIC ROOMS</span></div><Link className="back-link" to="/"><ArrowRight size={15} /> Your workspace</Link></div>
    <header className="section-intro"><span className="section-kicker"><span className="kicker-line" /> OPEN CALLS</span><h1>Find your <em>scene.</em></h1><p>Open rooms only. Private rooms never appear in this list.</p></header>
    {error && <p className="form-error public-error" role="alert">{error}</p>}
    {loading ? <section className="loading-card panel" aria-live="polite"><span className="status-dot" /> Listening for open rooms…</section> : rooms.length === 0 ? <section className="empty-state panel"><span className="panel-icon panel-icon--cyan"><Globe2 size={19} /></span><h2>No open rooms yet</h2><p>Create a public room and it will be listed here for other collaborators.</p><Link to="/" className="button button--primary">Create the first room <ArrowRight size={16} /></Link></section> : <div className="public-room-grid">{rooms.map((room) => {
      const isFull = room.maxMembers !== null && room.memberCount >= room.maxMembers;
      return <article className="public-room-card panel" key={room.id}>
        <div className="public-room-card__top"><span className="panel-icon panel-icon--cyan"><Globe2 size={17} /></span><span className="public-room-tag"><span className="status-dot" /> OPEN CALL</span></div>
        <h2>{room.name}</h2>
        <p>{room.description || 'A new scene looking for voices.'}</p>
        <div className="public-room-meta"><span>{room.targetLanguage} dub</span><span><UsersRound size={14} /> {room.memberCount}{room.maxMembers ? ` / ${room.maxMembers}` : ''}</span></div>
        <button type="button" className="button button--primary button--wide" onClick={() => void join(room)} disabled={isFull || joining === room.id}>{joining === room.id ? 'Joining…' : isFull ? 'Room is full' : user ? 'Join this room' : 'Sign in to join'} <ArrowRight size={16} /></button>
      </article>;
    })}</div>}
    <button className="button button--quiet public-refresh" type="button" onClick={() => void load()} disabled={loading}>Refresh room list</button>
  </div>;
}
