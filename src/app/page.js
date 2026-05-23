'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

const childProfiles = {
  ethan: {
    name: 'Ethan',
    avatar: '🚀',
    tag: 'Science Explorer',
    traits: 'Curious, funny, challenge-heavy, science-loving.',
    mascotLine: 'Ready to launch a brain rocket today?',
    themeLine: 'Space missions, science puzzles, and big questions.',
    glow: 'glow-purple',
  },
  valentino: {
    name: 'Valentino',
    avatar: '🦖',
    tag: 'Adventure Builder',
    traits: 'Visual, adventurous, movement-friendly, confidence-building.',
    mascotLine: 'Let’s stomp through this mission like a genius dinosaur.',
    themeLine: 'Movement, pictures, missions, and brave little wins.',
    glow: 'glow-orange',
  },
  enzo: {
    name: 'Enzo',
    avatar: '🎵',
    tag: 'Tiny Wonder',
    traits: 'Gentle, sensory, musical, baby-safe, parent-led.',
    mascotLine: 'Soft sounds, bright colors, tiny genius energy.',
    themeLine: 'Parent-led discovery with music, shapes, and sensory play.',
    glow: 'glow-blue',
  },
};

const learningActions = [
  { mode: 'tutor', icon: '🧠', label: 'AI Tutor', desc: 'Explain it like a friendly genius', tone: 'primary' },
  { mode: 'practice', icon: '🎯', label: 'Practice', desc: 'Generate questions that adapt', tone: 'blue' },
  { mode: 'hint', icon: '💡', label: 'Hint', desc: 'Give a tiny nudge', tone: 'yellow' },
  { mode: 'feedback', icon: '✅', label: 'Check Answer', desc: 'Score, coach, and improve', tone: 'green' },
  { mode: 'encouragement', icon: '👏', label: 'Cheer Up', desc: 'Confidence boost', tone: 'orange' },
  { mode: 'summary', icon: '📋', label: 'Parent Summary', desc: 'What to work on next', tone: 'purple' },
];

const classicModes = [
  { mode: 'mission', icon: '🗺️', label: 'Mission' },
  { mode: 'story', icon: '📚', label: 'Story' },
  { mode: 'explain', icon: '🔎', label: 'Explain' },
];

const badgeCatalog = [
  { id: 'first-quest', name: 'First Quest', icon: '👣', check: (child) => (child.practiceCount ?? 0) >= 1, requirement: 'Complete 1 practice' },
  { id: 'star-spark', name: 'Star Spark', icon: '⭐', check: (child) => (child.stars ?? 0) >= 5, requirement: 'Collect 5 stars' },
  { id: 'quiz-champ', name: 'Quiz Champ', icon: '🏆', check: (child) => (child.quizCount ?? 0) >= 3, requirement: 'Finish 3 quizzes' },
  { id: 'streak-fire', name: 'Streak Fire', icon: '🔥', check: (child) => (child.streakDays ?? 0) >= 3, requirement: 'Reach 3 streak days' },
  { id: 'topic-traveler', name: 'Topic Traveler', icon: '🗺️', check: (child) => (child.recentTopics || []).length >= 3, requirement: 'Explore 3 topics' },
  { id: 'level-builder', name: 'Level Builder', icon: '💎', check: (child) => (child.level ?? 1) >= 3, requirement: 'Reach level 3' },
];

const defaultChild = {
  stars: 0,
  level: 1,
  streakDays: 0,
  practiceCount: 0,
  quizCount: 0,
  lastDifficulty: 'medium',
  masteredTopics: [],
  struggleTopics: [],
  recentTopics: [],
};

const defaultState = {
  activeChild: 'ethan',
  children: {
    ethan: { ...defaultChild },
    valentino: { ...defaultChild },
    enzo: { ...defaultChild },
  },
  history: [],
};

async function postJson(url, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || 'Something went wrong');
  }

  return data;
}

async function getJson(url, signal) {
  const response = await fetch(url, { signal });
  return response.json();
}

function normalizeChild(childState) {
  return {
    ...defaultChild,
    ...(childState || {}),
    masteredTopics: Array.isArray(childState?.masteredTopics) ? childState.masteredTopics : [],
    struggleTopics: Array.isArray(childState?.struggleTopics) ? childState.struggleTopics : [],
    recentTopics: Array.isArray(childState?.recentTopics) ? childState.recentTopics : [],
  };
}

function mergeState(nextState) {
  const rawChildren = nextState?.children || {};
  return {
    ...defaultState,
    ...nextState,
    children: {
      ethan: normalizeChild(rawChildren.ethan),
      valentino: normalizeChild(rawChildren.valentino),
      enzo: normalizeChild(rawChildren.enzo),
    },
    history: Array.isArray(nextState?.history) ? nextState.history : [],
  };
}

function formatResponse(data) {
  if (!data) return 'Nothing here yet. Run a tutor, practice, feedback, or summary action.';
  if (typeof data === 'string') return data;

  if (data.answer) {
    return [
      data.answer,
      data.analogy ? `Analogy: ${data.analogy}` : '',
      data.steps?.length ? `Steps:\n- ${data.steps.join('\n- ')}` : '',
      data.encouragement || '',
    ].filter(Boolean).join('\n\n').trim();
  }

  if (typeof data.score === 'number') {
    return [
      `Score: ${data.score}/100`,
      data.summary || '',
      data.whatWentWell ? `What went well: ${data.whatWentWell}` : '',
      data.whatToTryNext ? `What to try next: ${data.whatToTryNext}` : '',
      data.encouragement || '',
    ].filter(Boolean).join('\n\n');
  }

  if (data.summary?.parentNote) {
    return `${data.summary.parentNote}\n\nPracticed: ${(data.summary.practiced || []).join(', ') || 'None yet'}\nStruggled with: ${(data.summary.struggledWith || []).join(', ') || 'None yet'}\nImproved on: ${(data.summary.improvedOn || []).join(', ') || 'None yet'}`;
  }

  return JSON.stringify(data, null, 2);
}

function formatClassicResponse(mode, data) {
  if (mode === 'mission') {
    return `${data.title}\n\n${data.summary}\n\n${(data.steps || []).map((step, index) => `${index + 1}. ${step}`).join('\n')}\n\nReward: ${data.reward}`;
  }
  if (mode === 'story') return data.story;
  return data.explanation || 'The explanation is still loading.';
}

function ChipList({ items, emptyLabel }) {
  if (!items?.length) return <span className="text-muted text-small">{emptyLabel}</span>;
  return (
    <div className="chip-row">
      {items.map((item) => <span key={item} className="chip">{item}</span>)}
    </div>
  );
}

function FloatingParticles() {
  const particles = Array.from({ length: 18 }, (_, index) => ({
    id: index,
    left: `${(index * 19) % 100}%`,
    size: 8 + (index % 5) * 4,
    delay: `${index * 0.45}s`,
    duration: `${10 + (index % 6)}s`,
    type: ['star', 'circle', 'triangle'][index % 3],
  }));

  return (
    <div className="floating-particles" aria-hidden="true">
      {particles.map((particle) => (
        <span
          key={particle.id}
          className={`particle ${particle.type}`}
          style={{ left: particle.left, width: particle.size, height: particle.size, animationDelay: particle.delay, animationDuration: particle.duration }}
        />
      ))}
    </div>
  );
}

function Confetti({ show }) {
  if (!show) return null;
  return (
    <div className="confetti" aria-hidden="true">
      {Array.from({ length: 28 }, (_, index) => (
        <span key={index} style={{ left: `${(index * 11) % 100}%`, animationDelay: `${index * 0.045}s` }} />
      ))}
    </div>
  );
}

function BadgeWall({ childData }) {
  return (
    <div className="badge-wall">
      <div className="badge-wall-header">
        <h3>Badge Wall</h3>
        <span>{badgeCatalog.filter((badge) => badge.check(childData)).length}/{badgeCatalog.length} earned</span>
      </div>
      <div className="badge-grid">
        {badgeCatalog.map((badge) => {
          const earned = badge.check(childData);
          return (
            <div key={badge.id} className={`badge-card ${earned ? 'earned' : 'locked'}`} title={badge.requirement}>
              <span className="badge-icon">{earned ? badge.icon : '🔒'}</span>
              <strong>{badge.name}</strong>
              <small>{earned ? 'Unlocked' : badge.requirement}</small>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Home() {
  const [state, setState] = useState(defaultState);
  const [child, setChild] = useState('ethan');
  const [topic, setTopic] = useState('space');
  const [answer, setAnswer] = useState('');
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(0);
  const [practiceQuestions, setPracticeQuestions] = useState([]);
  const [tutor, setTutor] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [summary, setSummary] = useState(null);
  const [banner, setBanner] = useState('Choose a child, pick a topic, and fire up the learning lab.');
  const [loadingAction, setLoadingAction] = useState('');
  const [error, setError] = useState('');
  const [soundOn, setSoundOn] = useState(true);
  const [confettiOn, setConfettiOn] = useState(false);
  const [mascotIndex, setMascotIndex] = useState(0);
  const mountedRef = useRef(true);

  const profile = childProfiles[child] || childProfiles.ethan;
  const currentChild = normalizeChild(state.children?.[child]);
  const activeQuestion = practiceQuestions[selectedQuestionIndex] || null;
  const xpPoints = (currentChild.stars ?? 0) * 10 + (currentChild.practiceCount ?? 0) * 6 + (currentChild.quizCount ?? 0) * 12 + (currentChild.recentTopics?.length ?? 0) * 5;
  const xpPercent = Math.min(100, Math.max(8, xpPoints % 100));
  const earnedBadgeCount = badgeCatalog.filter((badge) => badge.check(currentChild)).length;

  const mascotLines = useMemo(() => [
    profile.mascotLine,
    `${profile.name}, your next idea could be the one that unlocks the whole mission.`,
    `Today’s quest: ${topic || 'pick a topic'} and make your brain sweat a little.`,
    profile.themeLine,
  ], [profile, topic]);

  useEffect(() => {
    const controller = new AbortController();
    getJson('/api/state', controller.signal)
      .then((data) => {
        const nextState = mergeState(data);
        setState(nextState);
        setChild(nextState.activeChild || 'ethan');
      })
      .catch((err) => {
        if (err?.name !== 'AbortError') {
          setBanner('Offline mode is ready. You can still use the local learning tools.');
        }
      });

    return () => {
      mountedRef.current = false;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    setMascotIndex(0);
    const interval = window.setInterval(() => {
      setMascotIndex((value) => (value + 1) % mascotLines.length);
    }, 6500);

    return () => window.clearInterval(interval);
  }, [mascotLines.length, child]);

  function playTone(kind = 'tap') {
    if (!soundOn || typeof window === 'undefined') return;

    const sequences = {
      tap: [420],
      success: [523, 659, 784],
      levelUp: [523, 659, 784, 1047],
      warning: [240, 180],
      encouragement: [440, 554, 659],
    };

    const notes = sequences[kind] || sequences.tap;

    notes.forEach((frequency, index) => {
      window.setTimeout(() => {
        try {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          const audio = new AudioContext();
          const oscillator = audio.createOscillator();
          const gain = audio.createGain();
          oscillator.frequency.value = frequency;
          oscillator.type = 'sine';
          gain.gain.setValueAtTime(0.0001, audio.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.055, audio.currentTime + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.16);
          oscillator.connect(gain);
          gain.connect(audio.destination);
          oscillator.start();
          oscillator.stop(audio.currentTime + 0.18);
        } catch {
          // Audio is optional. Never block learning because the browser blocked sound.
        }
      }, index * 90);
    });
  }

  const currentStats = useMemo(() => [
    { label: 'Stars', value: currentChild.stars ?? 0, icon: '⭐', tone: 'stars' },
    { label: 'Level', value: currentChild.level ?? 1, icon: '🏆', tone: 'level' },
    { label: 'Practice', value: currentChild.practiceCount ?? 0, icon: '🎯', tone: 'practice' },
    { label: 'Quiz', value: currentChild.quizCount ?? 0, icon: '🧩', tone: 'quiz' },
  ], [currentChild.stars, currentChild.level, currentChild.practiceCount, currentChild.quizCount]);

  async function persistChild(nextChild, nextState = state) {
    const updated = mergeState({ ...nextState, activeChild: nextChild });
    await postJson('/api/state', updated);
    if (mountedRef.current) {
      setState(updated);
      setChild(nextChild);
    }
  }

  async function runClassicMode(mode) {
    playTone('tap');
    setLoadingAction(mode);
    setError('');
    try {
      const path = mode === 'mission' ? '/api/mission' : mode === 'story' ? '/api/story' : '/api/explain';
      const payload = mode === 'mission' ? { child, subject: topic } : mode === 'story' ? { child, theme: topic } : { child, topic };
      const data = await postJson(path, payload);
      setBanner(formatClassicResponse(mode, data));
      setTutor(null);
      setPracticeQuestions([]);
      setSummary(null);
      setFeedback(null);
      playTone('success');
    } catch (err) {
      setError(err.message);
      playTone('warning');
    } finally {
      setLoadingAction('');
    }
  }

  async function runLearningMode(mode, extra = {}) {
    playTone('tap');
    setLoadingAction(mode);
    setError('');
    try {
      const data = await postJson('/api/learning', {
        child,
        topic,
        mode,
        question: extra.question || activeQuestion?.prompt || '',
        answer: extra.answer || answer,
      });

      if (mode === 'tutor') {
        setTutor(data);
        setBanner(data.answer);
        playTone('encouragement');
      }

      if (mode === 'practice') {
        setPracticeQuestions(data.questions || []);
        setSelectedQuestionIndex(0);
        setAnswer('');
        setBanner('Practice questions are ready. Pick one card and try your best.');
        playTone('success');
      }

      if (mode === 'hint') {
        setBanner(`${data.hint}\n\nNext step: ${data.nextStep}`);
      }

      if (mode === 'feedback') {
        const score = data.feedback?.score ?? 0;
        setFeedback(data.feedback);
        setBanner(data.feedback.summary);
        setAnswer('');
        if (data.state) setState(mergeState(data.state));
        if (score >= 90) {
          setConfettiOn(true);
          playTone('levelUp');
          window.setTimeout(() => setConfettiOn(false), 1600);
        } else if (score >= 70) {
          setConfettiOn(true);
          playTone('success');
          window.setTimeout(() => setConfettiOn(false), 1200);
        } else {
          playTone('encouragement');
        }
      }

      if (mode === 'encouragement') {
        setBanner(data.message);
        playTone('encouragement');
      }

      if (mode === 'summary') {
        setSummary(data.summary);
        setBanner(data.summary.parentNote);
      }
    } catch (err) {
      setError(err.message);
      playTone('warning');
    } finally {
      setLoadingAction('');
    }
  }

  async function saveChildSelection(nextChild) {
    playTone('tap');
    try {
      await persistChild(nextChild);
      if (mountedRef.current) {
        setBanner(`Switched to ${childProfiles[nextChild].name}. Ready for a fresh learning mission.`);
      }
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="shell">
      <FloatingParticles />
      <Confetti show={confettiOn} />

      <section className="hero">
        <div className={`card hero-main ${profile.glow}`}>
          <div className="hero-copy">
            <span className="hero-badge"><span className="sparkle">✨</span> AI learning adventure</span>
            <h1>Kid Genius Lab</h1>
            <p className="hero-description">A playful, parent-safe learning companion with AI tutoring, adaptive practice, hints, feedback, progress, sound, badges, and tiny bursts of celebration.</p>

            <div className="mascot-area">
              <div className="mascot-avatar">{profile.avatar}</div>
              <div className="mascot-bubble">
                <div className="mascot-line-stack">
                  <span className="mascot-title">{profile.name} mode</span>
                  <p className="mascot-text">{mascotLines[mascotIndex]}</p>
                </div>
              </div>
            </div>

            <div className="mission-strip">
              <div>
                <span className="text-tiny">Today’s mission</span>
                <strong>{topic || 'Pick a topic'}</strong>
              </div>
              <button className="btn btn-primary" onClick={() => runLearningMode('tutor')} disabled={!!loadingAction}>
                {loadingAction === 'tutor' ? 'Launching...' : '🚀 Launch tutor'}
              </button>
            </div>

            <div className="action-grid">
              {learningActions.map((action) => (
                <button key={action.mode} className={`action-card tone-${action.tone} ${loadingAction === action.mode ? 'active' : ''}`} onClick={() => runLearningMode(action.mode)} disabled={!!loadingAction}>
                  <span className="action-icon">{action.icon}</span>
                  <span className="action-label">{loadingAction === action.mode ? 'Working...' : action.label}</span>
                  <span className="action-desc">{action.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="hero-output">
            <div className="output-header">
              <span className="hero-badge"><span className="sparkle">⚡</span> Learning response</span>
              <button className="sound-toggle" onClick={() => setSoundOn((value) => !value)} type="button">{soundOn ? '🔊 Sound on' : '🔇 Sound off'}</button>
            </div>
            <div className="output-box">{banner}</div>
            {loadingAction ? <div className="learning-status"><span className="spinner" />Building the next learning moment...</div> : null}
            {error ? <div className="error-box">{error}</div> : null}
          </div>
        </div>

        <aside className="card sidebar">
          <div className="section-header">
            <div className="section-title"><span className="section-icon">👧</span><div><h2>Child Mode</h2><p className="section-subtitle">Switch the learning personality.</p></div></div>
            <span className="streak-badge">🔥 {currentChild.streakDays ?? 0} day streak</span>
          </div>

          <div className="child-carousel">
            {Object.entries(childProfiles).map(([key, item]) => {
              const childData = normalizeChild(state.children?.[key]);
              return (
                <button key={key} className={`child-card ${key} ${child === key ? 'active' : ''}`} onClick={() => saveChildSelection(key)}>
                  <span className="child-avatar">{item.avatar}<span className="child-status" /></span>
                  <span className="child-info"><span className="child-name">{item.name}</span><span className="child-tag">{item.tag}</span><span className="child-traits">{item.traits}</span></span>
                  <span className="child-stats-mini"><span className="mini-stat"><strong>{childData.stars ?? 0}</strong><small>stars</small></span><span className="mini-stat"><strong>{childData.level ?? 1}</strong><small>lvl</small></span></span>
                </button>
              );
            })}
          </div>

          <div className="input-group"><label className="input-label"><span className="input-icon">🌍</span>Topic</label><input className="input-field" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="space, gravity, counting, music..." /></div>
          <div className="input-group"><label className="input-label"><span className="input-icon">✍️</span>Child answer</label><textarea className="input-field" value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Type the child's answer here before checking feedback." /></div>

          <div className="xp-card"><div className="xp-header"><span>Level {currentChild.level ?? 1} power</span><strong>{xpPercent}%</strong></div><div className="xp-bar"><span style={{ width: `${xpPercent}%` }} /></div><small>{earnedBadgeCount} badges unlocked</small></div>
        </aside>
      </section>

      <section className="stats-grid">
        {currentStats.map((item) => <div key={item.label} className={`stat-card ${item.tone}`}><span className="stat-icon">{item.icon}</span><span className="stat-label">{item.label}</span><strong className="stat-value">{item.value}</strong></div>)}
      </section>

      <section className="layout-two-col">
        <div className="card">
          <div className="section-header"><div className="section-title"><span className="section-icon">🎮</span><div><h2>Practice Zone</h2><p className="section-subtitle">Questions adapt to the child’s current level.</p></div></div></div>
          <div className="practice-toolbar"><button className="btn btn-primary" onClick={() => runLearningMode('practice')} disabled={!!loadingAction}>New practice set</button><button className="btn btn-secondary" onClick={() => runLearningMode('hint', { question: activeQuestion?.prompt })} disabled={!!loadingAction || !activeQuestion}>Hint for question</button><button className="btn btn-success" onClick={() => runLearningMode('feedback', { question: activeQuestion?.prompt, answer })} disabled={!!loadingAction || !answer}>Check answer</button></div>
          <div className="question-list">
            {practiceQuestions.length ? practiceQuestions.map((q, index) => <button key={q.id || index} className={`question-card ${selectedQuestionIndex === index ? 'active' : ''}`} onClick={() => { setSelectedQuestionIndex(index); setBanner(q.support); playTone('tap'); }}><span className="question-number">Question {index + 1}</span><strong>{q.prompt}</strong><span className="question-support">{q.support}</span></button>) : <div className="empty-state"><span>🧪</span><h3>No practice set yet</h3><p>Generate a quest, answer it, and let the app coach the next step.</p><button className="btn btn-primary" onClick={() => runLearningMode('practice')} disabled={!!loadingAction}>Start first quest</button></div>}
          </div>
        </div>

        <div className="card">
          <div className="section-header"><div className="section-title"><span className="section-icon">📈</span><div><h2>Progress and Growth</h2><p className="section-subtitle">Track mastery, struggles, badges, and next steps.</p></div></div></div>
          <BadgeWall childData={currentChild} />
          <div className="progress-grid"><div className="progress-block"><h3>Mastered topics</h3><ChipList items={currentChild.masteredTopics} emptyLabel="No mastered topics yet." /></div><div className="progress-block"><h3>Struggle topics</h3><ChipList items={currentChild.struggleTopics} emptyLabel="Nothing difficult yet." /></div><div className="progress-block"><h3>Recent topics</h3><ChipList items={currentChild.recentTopics} emptyLabel="No recent topics yet." /></div></div>
          <div className="response-panel"><h3>🧠 Tutor and feedback</h3><pre>{formatResponse(tutor || feedback || summary)}</pre></div>
        </div>
      </section>

      <section className="card classic-card">
        <div className="section-header"><div className="section-title"><span className="section-icon">🧰</span><div><h2>Classic Learning Modes</h2><p className="section-subtitle">The original story, mission, and explain tools are still here.</p></div></div></div>
        <div className="classic-grid">{classicModes.map((mode) => <button key={mode.mode} className="action-card classic-action" onClick={() => runClassicMode(mode.mode)} disabled={!!loadingAction}><span className="action-icon">{mode.icon}</span><span className="action-label">{loadingAction === mode.mode ? 'Working...' : mode.label}</span></button>)}</div>
      </section>
    </main>
  );
}
