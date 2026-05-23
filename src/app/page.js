'use client';

import { useEffect, useMemo, useState } from 'react';

const profiles = {
  ethan: 'Curious, funny, challenge-heavy, science-loving.',
  valentino: 'Visual, adventurous, movement-friendly, confidence-building.',
  enzo: 'Gentle, sensory, musical, baby-safe, parent-led.',
};

const defaultState = {
  activeChild: 'ethan',
  children: {
    ethan: { stars: 0, level: 1, streakDays: 0, practiceCount: 0, quizCount: 0, lastDifficulty: 'medium', masteredTopics: [], struggleTopics: [], recentTopics: [] },
    valentino: { stars: 0, level: 1, streakDays: 0, practiceCount: 0, quizCount: 0, lastDifficulty: 'medium', masteredTopics: [], struggleTopics: [], recentTopics: [] },
    enzo: { stars: 0, level: 1, streakDays: 0, practiceCount: 0, quizCount: 0, lastDifficulty: 'medium', masteredTopics: [], struggleTopics: [], recentTopics: [] },
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

async function getJson(url) {
  const response = await fetch(url);
  return response.json();
}

function mergeState(nextState) {
  return {
    ...defaultState,
    ...nextState,
    children: {
      ...defaultState.children,
      ...(nextState?.children || {}),
    },
    history: Array.isArray(nextState?.history) ? nextState.history : [],
  };
}

function chipList(items, emptyLabel) {
  if (!items?.length) {
    return <span className="muted small">{emptyLabel}</span>;
  }

  return (
    <div className="chip-row">
      {items.map((item) => (
        <span key={item} className="chip">
          {item}
        </span>
      ))}
    </div>
  );
}

function formatResponse(data) {
  if (!data) return '';
  if (typeof data === 'string') return data;
  if (data.answer) {
    const lines = [
      data.answer,
      data.analogy ? `Analogy: ${data.analogy}` : '',
      data.steps?.length ? `Steps:\n- ${data.steps.join('\n- ')}` : '',
      data.encouragement || '',
    ].filter(Boolean);
    return lines.join('\n\n').trim();
  }
  if (typeof data.score === 'number') {
    return [
      `Score: ${data.score}/100`,
      data.summary || '',
      data.whatWentWell ? `What went well: ${data.whatWentWell}` : '',
      data.whatToTryNext ? `What to try next: ${data.whatToTryNext}` : '',
      data.encouragement || '',
    ]
      .filter(Boolean)
      .join('\n\n');
  }
  if (data.summary?.parentNote) {
    return `${data.summary.parentNote}\n\nPracticed: ${(data.summary.practiced || []).join(', ')}\nStruggled with: ${(data.summary.struggledWith || []).join(', ')}\nImproved on: ${(data.summary.improvedOn || []).join(', ')}`;
  }
  return JSON.stringify(data, null, 2);
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
  const [banner, setBanner] = useState('Pick a child, choose a topic, and start learning.');
  const [loadingAction, setLoadingAction] = useState('');
  const [error, setError] = useState('');

  const currentChild = state.children[child] || defaultState.children.ethan;
  const activeQuestion = practiceQuestions[selectedQuestionIndex] || null;

  useEffect(() => {
    let mounted = true;
    getJson('/api/state')
      .then((data) => {
        if (!mounted) return;
        const nextState = mergeState(data);
        setState(nextState);
        setChild(nextState.activeChild || 'ethan');
      })
      .catch(() => {
        if (mounted) {
          setBanner('Offline mode is ready. You can still use the local learning tools.');
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const currentStats = useMemo(
    () => [
      { label: 'Stars', value: currentChild.stars ?? 0, tone: 'sun' },
      { label: 'Level', value: currentChild.level ?? 1, tone: 'purple' },
      { label: 'Practice', value: currentChild.practiceCount ?? 0, tone: 'mint' },
      { label: 'Quiz', value: currentChild.quizCount ?? 0, tone: 'blue' },
    ],
    [currentChild]
  );

  async function persistChild(nextChild, nextState = state) {
    const updated = mergeState({ ...nextState, activeChild: nextChild });
    setState(updated);
    setChild(nextChild);
    await postJson('/api/state', updated);
  }

  async function runClassicMode(mode) {
    setLoadingAction(mode);
    setError('');
    try {
      const path = mode === 'mission' ? '/api/mission' : mode === 'story' ? '/api/story' : '/api/explain';
      const payload = mode === 'mission' ? { child, subject: topic } : mode === 'story' ? { child, theme: topic } : { child, topic };
      const data = await postJson(path, payload);
      setBanner(
        mode === 'mission'
          ? `${data.title}\n\n${data.summary}\n\n${(data.steps || []).map((step, index) => `${index + 1}. ${step}`).join('\n')}\n\nReward: ${data.reward}`
          : mode === 'story'
            ? data.story
            : data.explanation
      );
      setTutor(null);
      setPracticeQuestions([]);
      setSummary(null);
      setFeedback(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingAction('');
    }
  }

  async function runLearningMode(mode, extra = {}) {
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
      }

      if (mode === 'practice') {
        setPracticeQuestions(data.questions || []);
        setSelectedQuestionIndex(0);
        setAnswer('');
        setBanner('Practice questions are ready. Pick one and try your best.');
      }

      if (mode === 'hint') {
        setBanner(`${data.hint}\n\nNext step: ${data.nextStep}`);
      }

      if (mode === 'feedback') {
        setFeedback(data.feedback);
        setBanner(data.feedback.summary);
        setAnswer('');
        const refreshed = mergeState(await getJson('/api/state'));
        setState(refreshed);
      }

      if (mode === 'encouragement') {
        setBanner(data.message);
      }

      if (mode === 'summary') {
        setSummary(data.summary);
        setBanner(data.summary.parentNote);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingAction('');
    }
  }

  async function saveChildSelection(nextChild) {
    try {
      await persistChild(nextChild);
      setBanner(`Switched to ${nextChild}. Ready for a new learning path.`);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="shell">
      <section className="hero">
        <div className="card hero-main">
          <div className="hero-copy">
            <span className="badge">AI learning lab for kids</span>
            <h1>Kid Genius Lab</h1>
            <p>
              A playful, parent-safe learning companion with an AI tutor, practice questions, hints, feedback, adaptive difficulty, and encouragement.
            </p>
            <div className="hero-actions">
              <button className="btn primary" onClick={() => runLearningMode('tutor')} disabled={!!loadingAction}>
                {loadingAction === 'tutor' ? 'Tutoring...' : 'AI tutor'}
              </button>
              <button className="btn secondary" onClick={() => runLearningMode('practice')} disabled={!!loadingAction}>
                {loadingAction === 'practice' ? 'Preparing...' : 'Practice questions'}
              </button>
              <button className="btn secondary" onClick={() => runLearningMode('hint')} disabled={!!loadingAction}>
                {loadingAction === 'hint' ? 'Hinting...' : 'Hint'}
              </button>
              <button className="btn secondary" onClick={() => runLearningMode('feedback')} disabled={!!loadingAction}>
                {loadingAction === 'feedback' ? 'Checking...' : 'Quiz feedback'}
              </button>
              <button className="btn secondary" onClick={() => runLearningMode('encouragement')} disabled={!!loadingAction}>
                {loadingAction === 'encouragement' ? 'Cheering...' : 'Encouragement'}
              </button>
              <button className="btn secondary" onClick={() => runLearningMode('summary')} disabled={!!loadingAction}>
                {loadingAction === 'summary' ? 'Summarizing...' : 'Parent summary'}
              </button>
            </div>
          </div>

          <div className="hero-output">
            <div className="output-header">
              <span className="badge">Learning response</span>
              <span className="tiny">Adaptive difficulty: {currentChild.lastDifficulty || 'medium'}</span>
            </div>
            <div className="output-box">{banner}</div>
            {error ? <div className="error-box">{error}</div> : null}
          </div>
        </div>

        <aside className="card sidebar">
          <span className="badge">Child mode</span>
          <div className="kid-grid">
            {Object.entries(profiles).map(([key, text]) => (
              <button
                key={key}
                className={`kid ${child === key ? 'active' : ''}`}
                onClick={() => saveChildSelection(key)}
              >
                <h3>{key}</h3>
                <p>{text}</p>
              </button>
            ))}
          </div>

          <div className="stack">
            <label className="field">
              <span>Topic</span>
              <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="space, gravity, counting, music..." />
            </label>

            <label className="field">
              <span>Child answer</span>
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Type the child's answer here before checking feedback."
              />
            </label>
          </div>
        </aside>
      </section>

      <section className="grid-3">
        {currentStats.map((item) => (
          <div key={item.label} className={`stat-card ${item.tone}`}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </section>

      <section className="grid-two">
        <div className="card">
          <div className="section-head">
            <h2>Practice zone</h2>
            <span className="tiny">Questions adapt to the child’s current level.</span>
          </div>
          <div className="toolbar">
            <button className="btn" onClick={() => runLearningMode('practice')} disabled={!!loadingAction}>
              New practice set
            </button>
            <button
              className="btn secondary"
              onClick={() => runLearningMode('hint', { question: activeQuestion?.prompt })}
              disabled={!!loadingAction || !activeQuestion}
            >
              Hint for question
            </button>
            <button
              className="btn secondary"
              onClick={() => runLearningMode('feedback', { question: activeQuestion?.prompt, answer })}
              disabled={!!loadingAction || !answer}
            >
              Check answer
            </button>
          </div>

          <div className="question-list">
            {practiceQuestions.length ? (
              practiceQuestions.map((q, index) => (
                <button
                  key={q.id}
                  className={`question-card ${selectedQuestionIndex === index ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedQuestionIndex(index);
                    setBanner(q.support);
                  }}
                >
                  <span className="tiny">Question {index + 1}</span>
                  <strong>{q.prompt}</strong>
                  <span className="tiny">{q.support}</span>
                </button>
              ))
            ) : (
              <div className="empty-state">
                <p>No practice set yet. Generate one to begin.</p>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="section-head">
            <h2>Progress and growth</h2>
            <span className="tiny">Track mastery, struggles, and next steps.</span>
          </div>

          <div className="stack">
            <div>
              <h3>Mastered topics</h3>
              {chipList(currentChild.masteredTopics, 'No mastered topics yet.')}
            </div>
            <div>
              <h3>Struggle topics</h3>
              {chipList(currentChild.struggleTopics, 'Nothing difficult yet.')}
            </div>
            <div>
              <h3>Recent topics</h3>
              {chipList(currentChild.recentTopics, 'No recent topics yet.')}
            </div>
          </div>

          <div className="response-panel">
            <h3>Tutor and feedback</h3>
            <pre>{formatResponse(tutor || feedback || summary)}</pre>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="section-head">
          <h2>Classic learning modes</h2>
          <span className="tiny">The original story, mission, and explain tools are still available.</span>
        </div>
        <div className="toolbar">
          <button className="btn secondary" onClick={() => runClassicMode('mission')} disabled={!!loadingAction}>
            Mission
          </button>
          <button className="btn secondary" onClick={() => runClassicMode('story')} disabled={!!loadingAction}>
            Story
          </button>
          <button className="btn secondary" onClick={() => runClassicMode('explain')} disabled={!!loadingAction}>
            Explain
          </button>
        </div>
      </section>
    </main>
  );
}
