import React, { useEffect, useRef } from 'react';

export default function ImagePreview({ item, onClose }) {
  const dialog = useRef(null);
  useEffect(() => {
    const element = dialog.current;
    if (!element.open) element.showModal();
  }, []);
  return <dialog ref={dialog} className="image-dialog" aria-label={`Image of ${item.title}`} onClose={onClose}>
    <div className="image-dialog-header"><strong>{item.title}</strong><button type="button" className="secondary" autoFocus onClick={() => dialog.current.close()}>Close</button></div>
    <img src={`http://localhost:5000${item.imageUrl}`} alt={item.title} />
  </dialog>;
}
