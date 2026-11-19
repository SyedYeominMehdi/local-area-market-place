import React, { useEffect, useState } from 'react';
import Listings from './Listings.jsx';
import Admin from './Admin.jsx';
import './style.css';

const API = 'http://localhost:5000/api/auth';
const empty = { name: '', email: '', password: '', area: '', phone: '' };

export default function App() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState(empty);
  const [token, setToken] = useState(() => sessionStorage.getItem('marketplaceToken') || '');
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [areas, setAreas] = useState([]);
  const [areaError, setAreaError] = useState('');
  const [selectedArea, setSelectedArea] = useState('');
  const [view, setView] = useState('browse');

  useEffect(() => {
    fetch('http://localhost:5000/api/areas')
      .then(response => { if (!response.ok) throw new Error(); return response.json(); })
      .then(data => setAreas(data.areas))
      .catch(() => setAreaError('Could not load areas. Start the backend and refresh the page.'));
  }, []);

  useEffect(() => { if (user) setSelectedArea(user.area); }, [user]);

  useEffect(() => {
    if (!token) { setUser(null); return; }
    fetch(`${API}/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async response => {
        if (response.status === 401) { sessionStorage.removeItem('marketplaceToken'); setToken(''); return; }
        if (!response.ok) throw new Error('Unable to load your account.');
        setUser((await response.json()).user);
      }).catch(() => setError('Unable to reach the server. Check that it is running.'));
  }, [token]);

  function update(event) { setForm({ ...form, [event.target.name]: event.target.value }); }
  async function submit(event) {
    event.preventDefault(); setError(''); setBusy(true);
    try {
      const response = await fetch(`${API}/${mode === 'admin' ? 'login' : mode}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Request failed.');
      if (mode === 'admin' && data.user.role !== 'admin') throw new Error('This account is not an admin account.');
      sessionStorage.setItem('marketplaceToken', data.token);
      setToken(data.token); setUser(data.user); setForm(empty);
    } catch (err) { setError(err.message === 'Failed to fetch' ? 'Unable to reach the server. Check that it is running.' : err.message); }
    finally { setBusy(false); }
  }
  function logout() { sessionStorage.removeItem('marketplaceToken'); setToken(''); setUser(null); setError(''); }
  if (user) return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span>Local Area<br />Market Place</span></div>
        <div className="sidebar-location"><p className="sidebar-heading">YOUR MARKET</p>
          <label>City<select value="Dehradun" onChange={() => {}}><option>Dehradun</option></select></label>
          {user.role !== 'admin' && <label>Area<select value={selectedArea} onChange={event => { setSelectedArea(event.target.value); setView('browse'); }}><option value="">Select an area</option>{areas.map(area => <option key={area}>{area}</option>)}</select></label>}
          {areaError && <p role="alert" className="error">{areaError}</p>}
        </div>
        {user.role !== 'admin' && <nav className="side-nav" aria-label="Marketplace navigation">
          {[['browse', 'Browse items'], ['post', 'Post an item'], ['mine', 'My listings'], ['purchases', 'Purchase records'], ['meetings', 'Meeting requests']].map(([key, label]) => <button type="button" key={key} className={view === key ? 'nav-item active' : 'nav-item'} aria-current={view === key ? 'page' : undefined} onClick={() => setView(key)}>{label}</button>)}
        </nav>}
        <div className="sidebar-account"><span className="sidebar-heading">SIGNED IN AS</span><strong>{user.name}</strong><span className="account-email">{user.email}</span><button className="logout" onClick={logout}>Log out</button></div>
      </aside>
      <main className="workspace">
        <header className="workspace-header"><div><p className="eyebrow">DEHRADUN · {user.role === 'admin' ? 'ADMIN' : selectedArea.toUpperCase()}</p>{user.role !== 'admin' && view === 'browse' ? <p>Built for local communities, this marketplace gives residents a simple way to share food, list items and discover nearby sellers. Connect with your neighbours and help create a more welcoming, connected community.</p> : <h1>{user.role === 'admin' ? 'Admin dashboard' : ({ post: 'Post an item', mine: 'My listings', purchases: 'Purchase records', meetings: 'Meeting requests' }[view])}</h1>}</div></header>
        {user.role === 'admin' ? <Admin token={token} /> : selectedArea && areas.length > 0 && <Listings token={token} area={selectedArea} areas={areas} homeArea={user.area} user={user} onAreaChange={setSelectedArea} view={view} onViewChange={setView} />}
      </main>
    </div>
  );
  return (
    <main className="auth-main">
      <p className="label">LOCAL AREA MARKET PLACE</p>
      <section><h1>{mode === 'admin' ? 'Admin login' : mode === 'login' ? 'Welcome back' : 'Join your local market'}</h1>
        <p>No real payments are processed.</p>
        <form onSubmit={submit}>
          {mode === 'register' && <><label>Name<input name="name" value={form.name} onChange={update} maxLength="80" required /></label>
            <label>City<select value="Dehradun" onChange={() => {}}><option>Dehradun</option></select></label>
            <label>Area<select name="area" value={form.area} onChange={update} required><option value="">Select your area</option>{areas.map(area => <option key={area} value={area}>{area}</option>)}</select></label>
            {areaError && <p role="alert" className="error">{areaError}</p>}
            <label>Phone<input name="phone" type="tel" value={form.phone} onChange={update} maxLength="20" required /></label></>}
          <label>Email<input name="email" type="email" value={form.email} onChange={update} required /></label>
          <label>Password<input name="password" type="password" value={form.password} onChange={update} minLength={mode === 'register' ? 8 : undefined} maxLength="72" required /></label>
          {error && <p role="alert" className="error">{error}</p>}
          <button disabled={busy || (mode === 'register' && areas.length === 0)}>{busy ? 'Please wait…' : mode === 'register' ? 'Create account' : 'Log in'}</button>
        </form>
        <p><button className="link" type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); setForm(empty); }}>{mode === 'login' ? 'New here? Create an account' : 'Resident login'}</button></p>
        {mode === 'login' && <p><button className="link" type="button" onClick={() => { setMode('admin'); setError(''); setForm(empty); }}>Admin login</button></p>}
      </section>
    </main>
  );
}
