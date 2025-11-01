import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import './App.css';

const API_URL = 'http://localhost:3001/api/';

export default function App() {
  const [entries, setEntries] = useState([]);

  async function postEntry(e) {
    e.preventDefault();
    const form = e.target;
    const payload = {
      EntryId: uuidv4(),
      Name: form.name.value,
      Message: form.message.value
    };
    try {
      const res = await fetch(`${API_URL}entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`${res.status} ${txt}`);
      }
      form.reset();
      await load();
    } catch (err) {
      console.error('postEntry error', err);
      alert(err.message);
    }
  }

  async function load() {
    const res = await fetch(`${API_URL}entries`);
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`${res.status} ${txt}`);
    }
    const data = await res.json();
    setEntries(data);
  }

  async function deleteEntry(entryId) {
    try {
      const res = await fetch(`${API_URL}entries/${encodeURIComponent(entryId)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      if (![200, 204].includes(res.status)) {
        const txt = await res.text();
        throw new Error(`${res.status} ${txt}`);
      }
      setEntries(prev => prev.filter(e => e.EntryId !== entryId));
    } catch (err) {
      console.error('deleteEntry error', err);
      alert(err.message || 'Delete failed');
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="app-container">
      <h1>Guestbook</h1>
      <div className="form-card">
        <form onSubmit={postEntry} style={{ width: '95%' }}>
          <input name="name" placeholder="Name" required />
          <textarea name="message" placeholder="Message" required />
          <button type="submit">Send</button>
        </form>
      </div>

      <div className="entries-wrapper" aria-live="polite">
        {entries && entries.length > 0 ? (
          entries.map((e) => (
            <div className="entry" key={e.EntryId || e.CreatedAt || Math.random()}>
              <div className="content">
                <div className="title">{e.Name}</div>
                <div className="message">{e.Message}</div>
                <div className="meta">{e.CreatedAt ? new Date(Number(e.CreatedAt)).toLocaleString() : ''}</div>
              </div>
              <div className="actions">
                <button
                  className="delete-btn"
                  onClick={() => { if (confirm('Delete this entry?')) deleteEntry(e.EntryId); }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="no-entries">No entries</div>
        )}
      </div>
    </div>
  );
}