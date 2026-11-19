import React, { useEffect, useState } from 'react';
import MyListings from './MyListings.jsx';
import Purchases from './Purchases.jsx';
import Meetings from './Meetings.jsx';
import ImagePreview from './ImagePreview.jsx';

const server = 'http://localhost:5000';
const categories = ['Food', 'Clothing', 'Electronics', 'Furniture', 'Vehicles', 'Other'];

export default function Listings({ token, area, areas, homeArea, user, onAreaChange, view, onViewChange }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [buying, setBuying] = useState(null);
  const [purchaseError, setPurchaseError] = useState('');
  const [purchasing, setPurchasing] = useState(false);
  const [meeting, setMeeting] = useState(null);
  const [meetingError, setMeetingError] = useState('');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (!area) return;
    const controller = new AbortController();
    setLoading(true); setError(''); setItems([]);
    fetch(`${server}/api/listings?area=${encodeURIComponent(area)}`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal })
      .then(async response => { if (!response.ok) throw new Error('Could not load listings.'); return response.json(); })
      .then(data => { setItems(data.listings); setLoading(false); })
      .catch(err => { if (err.name !== 'AbortError') { setError('Could not load listings. Check the server and try again.'); setLoading(false); } });
    return () => controller.abort();
  }, [area, token, refresh]);

  async function create(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setSaving(true); setError(''); setMessage('');
    try {
      const response = await fetch(`${server}/api/listings`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: data });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Could not create listing.');
      const listingArea = data.get('area');
      form.reset(); setMessage('Your listing has been published.');
      onAreaChange(listingArea); setRefresh(value => value + 1); onViewChange('browse');
    } catch (err) { setError(err.message === 'Failed to fetch' ? 'Could not reach the server.' : err.message); }
    finally { setSaving(false); }
  }

  async function purchase(event) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    setPurchasing(true); setPurchaseError('');
    try {
      const response = await fetch(`${server}/api/listings/${buying.id}/purchase`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ ...values, expectedPrice: buying.price }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Could not complete purchase.');
      setBuying(null); setMessage(data.message); setRefresh(value => value + 1);
    } catch (err) { setPurchaseError(err.message === 'Failed to fetch' ? 'Could not reach the server.' : err.message); }
    finally { setPurchasing(false); }
  }

  async function requestMeeting(event) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    setPurchasing(true); setMeetingError('');
    try {
      const date = new Date(data.proposedAt);
      if (!Number.isFinite(date.getTime())) throw new Error('Choose a valid date and time.');
      const response = await fetch(`${server}/api/meetings`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data, listingId: meeting.id, proposedAt: date.toISOString() }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.message);
      setMeeting(null); setMessage(result.message); setRefresh(value => value + 1);
    } catch (err) { setMeetingError(err.message === 'Failed to fetch' ? 'Could not reach the server.' : err.message); }
    finally { setPurchasing(false); }
  }

  const visible = items.filter(item => item.title.toLowerCase().includes(search.trim().toLowerCase()) && (categoryFilter === 'All' || item.category === categoryFilter));

  return <>
    {preview && <ImagePreview item={preview} onClose={() => setPreview(null)} />}
    {message && <p role="status" className="notice">{message}</p>}
    {view === 'post' && <section className="listing-section form-panel"><h2>Post an item</h2><p>Add one photo and a short description. Your account name and phone number will be visible to signed-in users.</p>
      <form onSubmit={create}>
        <label>Title<input name="title" maxLength="80" required /></label>
        <label>Description<textarea name="description" maxLength="500" rows="3" required /></label>
        <label>Price (₹)<input name="price" type="number" min="0" max="10000000" step="0.01" required /></label>
        <label>Category<select name="category" required>{categories.map(category => <option key={category}>{category}</option>)}</select></label>
        <label>Area<select name="area" defaultValue={homeArea} required>{areas.map(name => <option key={name}>{name}</option>)}</select></label>
        <label>Photo (JPEG, PNG or WebP; max 5 MB)<input type="file" name="image" accept="image/jpeg,image/png,image/webp" required /></label>
        <button disabled={saving || areas.length === 0}>{saving ? 'Publishing…' : 'Publish listing'}</button>
      </form>
      {error && <p className="error" role="alert">{error}</p>}
    </section>}
    {view === 'mine' && <MyListings token={token} areas={areas} revision={refresh} onChanged={() => setRefresh(value => value + 1)} />}
    {view === 'purchases' && <Purchases token={token} revision={refresh} />}
    {view === 'meetings' && <Meetings token={token} revision={refresh} onChanged={() => setRefresh(value => value + 1)} />}
    {view === 'browse' && <section className="listing-section"><h2>Available in {area}</h2>
      <div className="filters"><label>Search<input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search items" /></label><label>Category<select value={categoryFilter} onChange={event => setCategoryFilter(event.target.value)}><option>All</option>{categories.map(c => <option key={c}>{c}</option>)}</select></label></div>
      {error && <p className="error" role="alert">{error}</p>}
      {loading ? <p>Loading listings…</p> : !error && visible.length === 0 ? <p>No matching listings in this area.</p> :
        <div className="listing-grid">{visible.map(item => <article key={item.id} className="listing-card">
          <button type="button" className="image-trigger" aria-label={`View larger image of ${item.title}`} onClick={() => setPreview(item)}><img src={`${server}${item.imageUrl}`} alt="" /></button><div><p className="listing-category">{item.category} · {item.area}</p><h3>{item.title}</h3><p className="price">₹{item.price.toLocaleString('en-IN')}</p><p>{item.description}</p><p>Seller: {item.seller?.name || 'Unavailable'}{item.seller?.phone && <> · {item.seller.phone}</>}</p>
          {!item.isOwner && item.category !== 'Food' && <button type="button" onClick={() => { setBuying(item); setMeeting(null); setPurchaseError(''); }}>Buy now</button>}
          {!item.isOwner && <button type="button" className="secondary" onClick={() => { setMeeting(item); setBuying(null); setMeetingError(''); }}>Schedule a meeting</button>}
          {buying?.id === item.id && <form onSubmit={purchase}><h3>Confirm purchase</h3><p>{item.title} · ₹{item.price.toLocaleString('en-IN')}</p><p>No real payment is processed. Arrange payment and pickup directly with the seller.</p>
            <label>Your name<input name="name" defaultValue={user.name} maxLength="80" required /></label><label>Your phone<input name="phone" type="tel" defaultValue={user.phone} maxLength="20" required /></label><label>Message (optional)<textarea name="message" maxLength="300" rows="2" /></label>
            {purchaseError && <p className="error" role="alert">{purchaseError}</p>}<div className="actions"><button disabled={purchasing}>Confirm purchase</button><button type="button" className="secondary" disabled={purchasing} onClick={() => setBuying(null)}>Cancel</button></div>
          </form>}</div>
          {meeting?.id === item.id && <form className="meeting-form" onSubmit={requestMeeting}><h3>Request a meeting</h3><p>The seller must accept. Arrange a location using the contact details.</p><label>Your name<input name="name" defaultValue={user.name} maxLength="80" required /></label><label>Your phone<input name="phone" type="tel" defaultValue={user.phone} maxLength="20" required /></label><label>Date and time<input name="proposedAt" type="datetime-local" required /></label><label>Message (optional)<textarea name="message" maxLength="300" rows="2" /></label>{meetingError && <p role="alert" className="error">{meetingError}</p>}<div className="actions"><button disabled={purchasing}>Send request</button><button type="button" className="secondary" disabled={purchasing} onClick={() => setMeeting(null)}>Cancel</button></div></form>}
        </article>)}</div>}
    </section>}
  </>;
}
