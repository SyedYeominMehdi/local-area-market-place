import React, { useEffect, useState } from 'react';

const base = 'http://localhost:5000';
const categories = ['Food', 'Clothing', 'Electronics', 'Furniture', 'Vehicles', 'Other'];

export default function MyListings({ token, areas, revision, onChanged }) {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetch(`${base}/api/listings/mine`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal })
      .then(async response => { if (!response.ok) throw new Error('Could not load your listings.'); return response.json(); })
      .then(data => { setItems(data.listings); setLoading(false); })
      .catch(err => { if (err.name !== 'AbortError') { setError(err.message); setLoading(false); } });
    return () => controller.abort();
  }, [token, revision]);

  async function change(id, method, suffix = '', body) {
    setError(''); setMessage(''); setBusy(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      if (body) headers['Content-Type'] = 'application/json';
      const response = await fetch(`${base}/api/listings/${id}${suffix}`, { method, headers, ...(body ? { body: JSON.stringify(body) } : {}) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Could not update the listing.');
      setEditing(null); setMessage(result.message); onChanged();
    } catch (err) { setError(err.message === 'Failed to fetch' ? 'Could not reach the server.' : err.message); }
    finally { setBusy(false); }
  }

  function save(event) {
    event.preventDefault();
    const fields = Object.fromEntries(new FormData(event.currentTarget).entries());
    change(editing.id, 'PUT', '', fields);
  }

  return <section className="listing-section"><h2>My listings</h2>
    {message && <p role="status">{message}</p>}{error && <p className="error" role="alert">{error}</p>}
    {loading ? <p>Loading your listings…</p> : items.length === 0 ? <p>You haven’t posted any items yet.</p> : items.map(item =>
      <article className="manage-item" key={item.id}>
        <h3>{item.title}</h3><p>{item.area} · ₹{item.price.toLocaleString('en-IN')} · {item.status === 'sold' ? 'Sold' : item.status === 'removed' ? 'Removed by admin' : 'Available'}</p>
        {editing?.id === item.id ? <form onSubmit={save}>
          <label>Title<input name="title" defaultValue={item.title} maxLength="80" required /></label>
          <label>Description<textarea name="description" defaultValue={item.description} maxLength="500" rows="3" required /></label>
          <label>Price (₹)<input name="price" type="number" defaultValue={item.price} min="0" max="10000000" step="0.01" required /></label>
          <label>Category<select name="category" defaultValue={item.category}>{categories.map(value => <option key={value}>{value}</option>)}</select></label>
          <label>Area<select name="area" defaultValue={item.area}>{areas.map(value => <option key={value}>{value}</option>)}</select></label>
          <p>The current photo will stay the same.</p><div className="actions"><button disabled={busy}>Save changes</button><button type="button" className="secondary" disabled={busy} onClick={() => setEditing(null)}>Cancel</button></div>
        </form> : <div className="actions">
          {item.status === 'available' && <><button disabled={busy} onClick={() => { setEditing(item); setMessage(''); setError(''); }}>Edit</button><button className="secondary" disabled={busy} onClick={() => { if (window.confirm('Mark this item as sold? It will no longer appear in available listings.')) change(item.id, 'PATCH', '/sold'); }}>Mark sold</button></>}
          {!item.purchased && <button className="secondary" disabled={busy} onClick={() => { if (window.confirm('Delete this listing and its photo? This cannot be undone.')) change(item.id, 'DELETE'); }}>Delete</button>}
          {item.purchased && <p>Kept for the purchase record.</p>}
        </div>}
      </article>)}
  </section>;
}
