import { lazy, Suspense, useState, type ReactNode } from 'react';
import { ArrowUpRight, Clapperboard, Compass, Home, Instagram, LogOut } from 'lucide-react';
import { Link, NavLink, Navigate, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import BrandMark from './components/BrandMark';

const AuthPage = lazy(() => import('./features/auth/AuthPage'));
const ProfilePage = lazy(() => import('./features/auth/ProfilePage'));
const DashboardPage = lazy(() => import('./features/dashboard/DashboardPage'));
const InviteJoinPage = lazy(() => import('./features/rooms/InviteJoinPage'));
const PersistentLobbyPage = lazy(() => import('./features/rooms/PersistentLobbyPage'));
const PublicRoomsPage = lazy(() => import('./features/rooms/PublicRoomsPage'));
const DemoLobbyPage = lazy(() => import('./features/rooms/LobbyPage'));
const PersistentStudioPage = lazy(() => import('./features/studio/PersistentStudioPage'));
const DemoStudioPage = lazy(() => import('./features/studio/StudioPage'));

function RouteLoading() {
  return <main className="route-loading" aria-live="polite"><span className="status-dot" /> Loading a studio page…</main>;
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, authReady } = useAuth();
  const location = useLocation();
  if (!authReady) return <section className="empty-state panel" aria-live="polite"><span className="status-dot" /> Restoring your session…</section>;
  if (!user) {
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={`/auth?next=${encodeURIComponent(next)}`} replace />;
  }
  return <>{children}</>;
}

function AppShell({ demo = false }: { demo?: boolean }) {
  const { user, profile, signOut, authNotice } = useAuth();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState('');
  const displayName = profile?.display_name ?? user?.user_metadata?.display_name ?? user?.email?.split('@')[0] ?? '';
  const initials = displayName.trim().slice(0, 2).toUpperCase() || 'DR';

  async function leaveAccount() {
    setSigningOut(true);
    setSignOutError('');
    try {
      await signOut();
      navigate('/auth', { replace: true });
    } catch (cause) {
      setSignOutError(cause instanceof Error ? cause.message : 'Sign out could not be completed.');
    } finally {
      setSigningOut(false);
    }
  }

  return <div className={`app-frame${demo ? ' app-frame--demo' : ''}`}>
    <div className="ambient-backdrop" aria-hidden="true"><span /><span /><span /></div>
    <header className="topbar">
      <Link className="brand" to={user ? '/' : '/rooms'} aria-label="DUBROOM workspace"><span className="brand-mark"><BrandMark /></span><span className="brand-word">DUB<span>ROOM</span></span></Link>
      <nav className="topnav" aria-label="Main navigation">
        {user && <NavLink to="/" end className={({ isActive }) => `topnav__link${isActive ? ' is-active' : ''}`}><Home size={16} /> Workspace</NavLink>}
        <NavLink to="/rooms" className={({ isActive }) => `topnav__link${isActive ? ' is-active' : ''}`}><Compass size={16} /> Public rooms</NavLink>
      </nav>
      <div className="topbar__right">
        <a className="environment-pill" href="https://www.instagram.com/btw_beast07/" target="_blank" rel="noreferrer" aria-label="Open developer Instagram profile"><Instagram size={13} /> DEV'S @</a>
        {user ? <><Link className="user-chip" to="/profile" aria-label={`Profile for ${displayName}`}><span className="avatar avatar--cyan">{initials}</span><span>{displayName}</span></Link><button className="sign-out-button" type="button" onClick={() => void leaveAccount()} disabled={signingOut} aria-label="Sign out"><LogOut size={16} /></button></> : <Link className="button button--quiet button--small" to="/auth">Sign in <ArrowUpRight size={14} /></Link>}
      </div>
    </header>
    {authNotice && <div className="shell-error" role="status">{authNotice}</div>}
    {signOutError && <div className="shell-error" role="alert">{signOutError}</div>}
    <main className="page-view"><Outlet /></main>
    <footer className="app-footer"><span>DUBROOM</span><span><a className="app-footer__social" href="https://www.instagram.com/btw_beast07/" target="_blank" rel="noreferrer"><Instagram size={13} /> Instagram · @btw_beast07</a></span></footer>
  </div>;
}

function NotFoundPage() {
  return <section className="empty-state panel"><span className="panel-icon panel-icon--amber"><Clapperboard size={19} /></span><h1>This page isn't on the call-sheet</h1><p>Check the address or return to your workspace to find a room.</p><Link className="button button--primary" to="/">Back to workspace <ArrowUpRight size={16} /></Link></section>;
}

export default function App() {
  return <Suspense fallback={<RouteLoading />}><Routes>
    <Route path="/auth" element={<AuthPage />} />
    <Route element={<AppShell />}>
      <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/rooms" element={<PublicRoomsPage />} />
      <Route path="/join/:inviteCode" element={<ProtectedRoute><InviteJoinPage /></ProtectedRoute>} />
      <Route path="/room/:roomId/lobby" element={<ProtectedRoute><PersistentLobbyPage /></ProtectedRoute>} />
      <Route path="/studio/:roomId" element={<ProtectedRoute><PersistentStudioPage /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="*" element={<NotFoundPage />} />
    </Route>
    <Route element={<AppShell demo />}>
      <Route path="/demo/room/:roomId/lobby" element={<DemoLobbyPage />} />
      <Route path="/demo/studio/:roomId" element={<DemoStudioPage />} />
    </Route>
  </Routes></Suspense>;
}
