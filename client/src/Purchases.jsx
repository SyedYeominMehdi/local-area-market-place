import React, { useEffect, useState } from 'react';
import ImagePreview from './ImagePreview.jsx';

export default function Purchases({ token, revision }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    fetch('http://localhost:5000/api/listings/purchases', { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal })
      .then(async response => { if (!response.ok) throw new Error(); return response.json(); })
      .then(data => { setItems(data.purchases); setLoading(false); })
      .catch(err => { if (err.name !== 'AbortError') { setError('Could not load purchase records.'); setLoading(false); } });
    return () => controller.abort();
  }, [token, revision]);
  return <section className="listing-section"><h2>Purchase records</h2><p>No real payment is processed; arrange payment and pickup directly.</p>
    {preview && <ImagePreview item={preview} onClose={() => setPreview(null)} />}
    {loading ? <p>Loading purchase records…</p> : error ? <p className="error" role="alert">{error}</p> : items.length === 0 ? <p>No purchases yet.</p> : items.map(item => <article className="manage-item purchase-record" key={item.id}>
      {item.imageUrl && <button type="button" className="purchase-photo" aria-label={`View larger image of ${item.title}`} onClick={() => setPreview(item)}><img src={`http://localhost:5000${item.imageUrl}`} alt="" /></button>}
      <div>
      <h3>{item.title}</h3><p>{item.role === 'buyer' ? 'You bought' : 'You sold'} · ₹{item.amount.toLocaleString('en-IN')} · {new Date(item.purchasedAt).toLocaleString('en-IN')}</p>
      <p>{item.role === 'buyer' ? 'Seller' : 'Buyer'}: {item.contact.name} · {item.contact.phone}</p>{item.message && <p>Buyer’s message: {item.message}</p>}
      </div>
    </article>)}
  </section>;
}
