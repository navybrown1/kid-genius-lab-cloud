'use client';

import { useState } from 'react';

const profiles = {
  ethan: 'Curious, funny, challenge-heavy, science-loving.',
  valentino: 'Visual, adventurous, movement-friendly, confidence-building.',
  enzo: 'Gentle, sensory, musical, baby-safe, parent-led.'
};

async function post(url, body) {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return res.json();
}

export default function Home() {
  const [child, setChild] = useState('ethan');
  const [input, setInput] = useState('science');
  const [output, setOutput] = useState('Choose a child mode and generate a learning mission.');
  const [loading, setLoading] = useState(false);
  const [stars, setStars] = useState(0);

  async function run(type) {
    setLoading(true);
    try {
      if (type === 'mission') {
        const data = await post('/api/mission', { child, subject: input });
        setOutput(`${data.title}\n\n${data.summary}\n\n${(data.steps || []).map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\nReward: ${data.reward}`);
        setStars(stars + 1);
        await post('/api/state', { stars: stars + 1, lastChild: child, lastInput: input, lastOutput: data });
      }
      if (type === 'story') {
        const data = await post('/api/story', { child, theme: input });
        setOutput(data.story);
      }
      if (type === 'explain') {
        const data = await post('/api/explain', { child, topic: input });
        setOutput(data.explanation);
      }
    } catch {
      setOutput('The app is running, but the cloud brain needs DATABASE_URL and MISTRAL_API_KEY configured.');
    }
    setLoading(false);
  }

  return (
    <main className="shell">
      <section className="hero">
        <div className="card hero-main">
          <span className="badge">Parent-led AI learning lab</span>
          <h1>Kid Genius Lab</h1>
          <p>Missions, bedtime stories, and explain-it-like-I-am-7 lessons for Ethan, Valentino, and Enzo. Cloud-first. PostgreSQL-ready. Mistral-powered.</p>
          <div className="cta-row">
            <button className="btn" onClick={() => run('mission')} disabled={loading}>{loading ? 'Thinking...' : 'Generate mission'}</button>
            <button className="btn secondary" onClick={() => run('story')} disabled={loading}>Story</button>
            <button className="btn secondary" onClick={() => run('explain')} disabled={loading}>Explain</button>
          </div>
          <div className="stats"><div className="stat"><strong>{stars}</strong><span>Genius stars</span></div><div className="stat"><strong>3</strong><span>Kid modes</span></div></div>
        </div>
        <aside className="card">
          <span className="badge">Kid mode</span>
          <div className="kid-grid">
            {Object.entries(profiles).map(([key, text]) => <button key={key} className={`kid ${child === key ? 'active' : ''}`} onClick={() => setChild(key)}><h3>{key}</h3><p>{text}</p></button>)}
          </div>
        </aside>
      </section>
      <section className="card" style={{ marginTop: 22 }}>
        <h2>Prompt</h2>
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="science, space, gravity, Spanish" />
        <div className="output">{output}</div>
      </section>
      <p className="footer">Add DATABASE_URL and MISTRAL_API_KEY in Vercel to unlock cloud memory and AI generation.</p>
    </main>
  );
}
