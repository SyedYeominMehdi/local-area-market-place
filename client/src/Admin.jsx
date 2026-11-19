import React, { useEffect, useState } from 'react';
export default function Admin({ token }) {
  const [data, setData] = useState(null), [error, setError] = useState(''), [revision, setRevision] = useState(0), [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch('http://localhost:5000/api/admin/overview', { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal }).then(async r => { if (!r.ok) throw new Error('Could not load admin data.'); return r.json(); }).then(setData).catch(e => { if (e.name !== 'AbortError') setError(e.message); });
    return () => controller.abort();
  }, [token, revision]);
  async function remove(item) {
    if (!window.confirm(`Remove "${item.title}" from browsing?`)) return;
    setBusy(true); setError('');
    try { const r = await fetch(`http://localhost:5000/api/admin/listings/${item.id}/remove`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } }); const d = await r.json(); if (!r.ok) throw new Error(d.message); setRevision(v => v + 1); }
    catch (e) { setError(e.message || 'Could not remove listing.'); } finally { setBusy(false); }
  }
  return <section><h2>Admin dashboard</h2>{error && <p className="error" role="alert">{error}</p>}{!data ? <p>Loading…</p> : <><p>{data.users.length} users · {data.listings.length} listings</p><h3>Listings</h3>{data.listings.length === 0 ? <p>No listings yet.</p> : data.listings.map(item => <article className="manage-item" key={item.id}><strong>{item.title}</strong><p>{item.area} · {item.seller} · {item.status}</p>{item.status === 'available' && <button className="secondary" disabled={busy} onClick={() => remove(item)}>Remove listing</button>}</article>)}<h3>Users</h3>{data.users.map(u => <p key={u.id}>{u.name} · {u.email} · {u.area} · {u.role}</p>)}</>}</section>;
}
