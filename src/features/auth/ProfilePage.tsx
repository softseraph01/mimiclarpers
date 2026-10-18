import { useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, Check, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';

export default function ProfilePage() {
  const { user, profile, profileLoading, updateDisplayName } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setDisplayName(profile?.display_name ?? '');
  }, [profile?.display_name]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSaved(false);
    setBusy(true);
    try {
      await updateDisplayName(displayName);
      setSaved(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Your profile could not be updated.');
    } finally {
      setBusy(false);
    }
  }

  return <div className="content-page profile-page">
    <div className="page-heading-row"><div className="breadcrumb"><Link to="/">WORKSPACE</Link><span className="breadcrumb__slash">/</span><span>PROFILE</span></div><Link className="back-link" to="/"><ArrowLeft size={15} /> Back to the room list</Link></div>
    <section className="profile-card panel">
      <span className="panel-icon panel-icon--violet"><UserRound size={19} /></span>
      <span className="section-kicker"><span className="kicker-line" /> ACCOUNT DETAILS</span>
      <h1>Your call-sheet name</h1>
      <p className="auth-lede">This is the name other members can see in rooms you share.</p>
      <form className="profile-form" onSubmit={save}>
        <label className="field-label" htmlFor="profile-email">Sign-in email<input id="profile-email" className="text-input" value={user?.email ?? ''} readOnly /></label>
        <label className="field-label" htmlFor="profile-name">Display name<input id="profile-name" className="text-input" value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={48} minLength={2} required disabled={profileLoading || busy} /></label>
        {error && <p className="form-error" role="alert">{error}</p>}
        {saved && <p className="form-success" role="status"><Check size={15} /> Profile updated.</p>}
        <button className="button button--primary" type="submit" disabled={profileLoading || busy || displayName.trim().length < 2}>{busy ? 'Saving…' : 'Save display name'}</button>
      </form>
    </section>
  </div>;
}
