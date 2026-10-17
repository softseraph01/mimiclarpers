import { ArrowUpRight, Clapperboard, Home, Layers3, Sparkles } from 'lucide-react';
import { Link, NavLink, Route, Routes } from 'react-router-dom';
import BrandMark from './components/BrandMark';
import DashboardPage from './features/dashboard/DashboardPage';
import LobbyPage from './features/rooms/LobbyPage';
import StudioPage from './features/studio/StudioPage';

function AppShell() {
  return (
    <div className="app-frame">
      <div className="demo-ribbon">
        <span className="demo-ribbon__tag"><span className="status-dot" /> LOCAL DEMO</span>
        <span>Rooms and timeline edits are temporary and stay in this browser. Nothing is synced or uploaded.</span>
      </div>
      <header className="topbar">
        <Link className="brand" to="/" aria-label="MIMICLARPERS dashboard">
          <span className="brand-mark"><BrandMark /></span>
          <span className="brand-word">MIMIC<span>LARPERS</span></span>
        </Link>
        <nav className="topnav" aria-label="Main navigation">
          <NavLink to="/" end className={({ isActive }) => `topnav__link${isActive ? ' is-active' : ''}`}><Home size={15} /> Workspace</NavLink>
          <NavLink to="/room/scene-042/lobby" className={({ isActive }) => `topnav__link${isActive ? ' is-active' : ''}`}><Layers3 size={15} /> Demo room</NavLink>
        </nav>
        <div className="topbar__right">
          <span className="environment-pill"><Sparkles size={13} /> Prototype</span>
          <Link className="avatar avatar--cyan" to="/" aria-label="Demo profile: Ava Chen">AC</Link>
        </div>
      </header>
      <div className="workspace-frame">
        <aside className="side-rail" aria-label="Workspace navigation">
          <div className="side-rail__section">
            <span className="eyebrow">YOUR STUDIO</span>
            <NavLink to="/" end className={({ isActive }) => `side-link${isActive ? ' is-active' : ''}`}><Home size={16} /> Overview</NavLink>
            <NavLink to="/room/scene-042/lobby" className={({ isActive }) => `side-link${isActive ? ' is-active' : ''}`}><Clapperboard size={16} /> The Last Train <span className="side-link__badge">DEMO</span></NavLink>
          </div>
          <div className="side-rail__divider" />
          <div className="side-note">
            <span className="side-note__icon"><Sparkles size={15} /></span>
            <p>Every great dub starts with a scene and a friend.</p>
            <Link to="/" className="text-link">Start a room <ArrowUpRight size={14} /></Link>
          </div>
          <div className="side-rail__footer"><span className="side-rail__pulse" /> DEMO WORKSPACE</div>
        </aside>
        <main className="page-view">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/room/:roomId/lobby" element={<LobbyPage />} />
            <Route path="/studio/:roomId" element={<StudioPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
      </div>
      <footer className="app-footer"><span>MIMICLARPERS</span><span>Phase 1 · interface demo · no backend connected</span></footer>
    </div>
  );
}

function NotFoundPage() {
  return <section className="empty-state panel"><span className="panel-icon panel-icon--amber"><Clapperboard size={19} /></span><h1>This page isn't on the call sheet</h1><p>Check the address or return to your workspace to find a room.</p><Link className="button button--primary" to="/">Back to workspace <ArrowUpRight size={16} /></Link></section>;
}

export default function App() {
  return <AppShell />;
}
