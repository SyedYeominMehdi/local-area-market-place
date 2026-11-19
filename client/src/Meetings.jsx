import React, { useEffect, useState } from 'react';
export default function Meetings({ token, revision, onChanged }) {
  const [items, setItems] = useState([]), [error, setError] = useState(''), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError('');
    fetch('http://localhost:5000/api/meetings', { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal })
      .then(async r => { if (!r.ok) throw new Error(); return r.json(); }).then(d => { setItems(d.meetings); setLoading(false); })
      .catch(e => { if (e.name !== 'AbortError') { setError('Could not load meetings.'); setLoading(false); } });
    return () => controller.abort();
  }, [token, revision]);
  async function respond(id, status) {
    setBusy(true); setError('');
    try {
      const r = await fetch(`http://localhost:5000/api/meetings/${id}`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
      const d = await r.json(); if (!r.ok) throw new Error(d.message); onChanged();
    } catch (e) { setError(e.message || 'Could not update meeting.'); } finally { setBusy(false); }
  }
  return <section className="listing-section"><h2>Meeting requests</h2><p>Meetings require the seller’s acceptance. Contact each other to arrange the location.</p>
    {error && <p role="alert" className="error">{error}</p>}{loading ? <p>Loading…</p> : items.length === 0 ? <p>No meeting requests yet.</p> : items.map(m => <article className="manage-item" key={m.id}>
      <h3>{m.title}</h3><p>{m.role === 'seller' ? 'Requested by buyer' : 'Your request'} · {m.status} · {new Date(m.proposedAt).toLocaleString('en-IN')}</p>
      <p>{m.role === 'seller' ? 'Buyer' : 'Seller'}: {m.contact.name} · {m.contact.phone}</p>{m.message && <p>Message: {m.message}</p>}
      {!m.available && <p>This listing is no longer available. Contact the other person before meeting.</p>}
      {m.role === 'seller' && m.status === 'pending' && <div className="actions"><button disabled={busy || !m.available} onClick={() => respond(m.id, 'accepted')}>Accept</button><button disabled={busy} className="secondary" onClick={() => respond(m.id, 'declined')}>Decline</button></div>}
    </article>)}
  </section>;
}
