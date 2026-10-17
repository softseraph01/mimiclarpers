import { useEffect, useState, type FormEvent } from 'react';
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, Sparkles, UserRound } from 'lucide-react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import BrandMark from '../../components/BrandMark';
import { supabaseConfigured } from '../../lib/supabase';

type Mode = 'sign-in' | 'sign-up';

function safeNextPath(candidate: string | null) {
  if (!candidate || !candidate.startsWith('/') || candidate.startsWith('//') || candidate.includes('\\') || candidate.startsWith('/auth')) return '/';
  return candidate;
}

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>('sign-in');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, authReady, signIn, signUp } = useAuth();
  const nextPath = safeNextPath(params.get('next'));

  useEffect(() => {
    if (authReady && user) navigate(nextPath, { replace: true });
  }, [authReady, user, nextPath, navigate]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice('');
    const normalizedEmail = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setError('Enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setError('Use a password with at least 8 characters.');
      return;
    }
    if (mode === 'sign-up' && displayName.trim().length < 2) {
      setError('Your display name must be at least 2 characters.');
      return;
    }

    setBusy(true);
    try {
      if (mode === 'sign-in') {
        await signIn(normalizedEmail, password);
        navigate(nextPath, { replace: true });
      } else {
        const result = await signUp(normalizedEmail, password, displayName, nextPath);
        if (result.requiresConfirmation) {
          setNotice('Account created. Check your inbox for a confirmation link, then sign in here; your requested destination will be preserved.');
        } else {
          navigate(nextPath, { replace: true });
        }
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Authentication did not complete. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  function switchMode(nextMode: Mode) {
    setMode(nextMode);
    setError('');
    setNotice('');
  }

  if (!authReady) {
    return <div className="auth-page"><section className="auth-card panel" aria-live="polite"><span className="auth-orb"><Sparkles size={18} /></span><h1>Restoring your session</h1><p>Checking your place in the studio…</p></section></div>;
  }

  return (
    <div className="auth-page">
      <section className="auth-card panel">
        <div className="auth-card__brand"><span className="brand-mark brand-mark--large"><BrandMark /></span><span className="brand-word">DUB<span>ROOM</span></span></div>
        <span className="section-kicker"><span className="kicker-line" /> YOUR NEXT SCENE STARTS HERE</span>
        <h1>{mode === 'sign-in' ? <>Step back<br />into the <em>booth.</em></> : <>Join the<br /><em>cast.</em></>}</h1>
        <p className="auth-lede">A shared room for lending new voices to the scenes you love.</p>

        {!supabaseConfigured && <div className="config-callout" role="status"><strong>Connect the room service</strong><span>Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> for the local app, then restart the dev server.</span></div>}
        {location.search.includes('confirmed') && <p className="form-success" role="status">Email confirmed. Sign in to continue to your requested destination.</p>}

        <div className="auth-tabs" role="tablist" aria-label="Account action">
          <button type="button" role="tab" aria-selected={mode === 'sign-in'} className={mode === 'sign-in' ? 'is-active' : ''} onClick={() => switchMode('sign-in')}>Sign in</button>
          <button type="button" role="tab" aria-selected={mode === 'sign-up'} className={mode === 'sign-up' ? 'is-active' : ''} onClick={() => switchMode('sign-up')}>Create account</button>
        </div>

        <form className="auth-form" onSubmit={submit} noValidate>
          {mode === 'sign-up' && <label className="field-label" htmlFor="auth-display-name">Display name<input id="auth-display-name" autoComplete="name" className="text-input" value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={48} placeholder="How your cast sees you" disabled={!supabaseConfigured || busy} /></label>}
          <label className="field-label" htmlFor="auth-email">Email address<span className="input-icon-wrap"><Mail size={16} /><input id="auth-email" type="email" autoComplete="email" className="text-input" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} placeholder="you@example.com" disabled={!supabaseConfigured || busy} /></span></label>
          <label className="field-label" htmlFor="auth-password">Password<span className="input-icon-wrap"><LockKeyhole size={16} /><input id="auth-password" type={showPassword ? 'text' : 'password'} autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'} className="text-input" value={password} onChange={(event) => setPassword(event.target.value)} maxLength={128} placeholder="At least 8 characters" disabled={!supabaseConfigured || busy} /><button className="password-toggle" type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((visible) => !visible)} disabled={!supabaseConfigured || busy}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          {notice && <p className="form-success" role="status">{notice}</p>}
          <button className="button button--primary button--wide auth-submit" type="submit" disabled={!supabaseConfigured || busy}>{busy ? 'Checking credentials…' : mode === 'sign-in' ? 'Enter the room' : 'Create my account'} <ArrowRight size={17} /></button>
        </form>
        <p className="auth-footnote"><UserRound size={14} /> Email/password sign-in · Secure room access is enforced by Supabase policies.</p>
        <Link to="/demo/room/scene-042/lobby" className="auth-demo-link">Look around the sample room without signing in <ArrowRight size={14} /></Link>
      </section>
    </div>
  );
}
