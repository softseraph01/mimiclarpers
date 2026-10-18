import { useEffect, useState } from 'react';
import { ArrowRight, LockKeyhole } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabaseRoomService } from '../../services/supabaseRooms';

export default function InviteJoinPage() {
  const { inviteCode = '' } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState<'joining' | 'error'>('joining');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const normalized = inviteCode.toUpperCase();
    if (!/^[0-9A-F]{48}$/.test(normalized)) {
      setState('error');
      setError('This invitation is invalid or expired.');
      return () => { active = false; };
    }
    void supabaseRoomService.joinPrivateRoom(normalized).then((result) => {
      if (active) navigate(`/room/${result.roomId}/lobby`, { replace: true });
    }).catch((cause: unknown) => {
      if (!active) return;
      setState('error');
      setError(cause instanceof Error ? cause.message : 'The room could not be joined. Check the invitation and try again.');
    });
    return () => { active = false; };
  }, [inviteCode, navigate]);

  return <div className="content-page invite-page">
    <section className="invite-card panel" aria-live="polite">
      <span className="panel-icon panel-icon--violet"><LockKeyhole size={19} /></span>
      {state === 'joining' ? <><span className="section-kicker"><span className="kicker-line" /> PRIVATE CALL-SHEET</span><h1>Checking your <em>invitation.</em></h1><p>Verifying access with the room server…</p><span className="loading-line" /></> : <><span className="section-kicker"><span className="kicker-line" /> INVITATION NOT ACCEPTED</span><h1>That key didn't <em>fit.</em></h1><p className="form-error" role="alert">{error}</p><p>Check the link with the room owner. Private rooms are never opened by guessing an ID.</p><Link className="button button--primary" to="/">Back to your workspace <ArrowRight size={16} /></Link></>}
    </section>
  </div>;
}
