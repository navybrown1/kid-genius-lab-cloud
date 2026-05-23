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
    badgeTone: 'primary',
  },
  valentino: {
    name: 'Valentino',
    avatar: '🦖',
    tag: 'Adventure Builder',
    traits: 'Visual, adventurous, movement-friendly, confidence-building.',
    mascotLine: 'Let’s stomp through this mission like a genius dinosaur.',
    themeLine: 'Movement, pictures, missions, and brave little wins.',
    glow: 'glow-orange',
    badgeTone: 'orange',
  },
  enzo: {
    name: 'Enzo',
    avatar: '🎵',
    tag: 'Tiny Wonder',
    traits: 'Gentle, sensory, musical, baby-safe, parent-led.',
    mascotLine: 'Soft sounds, bright colors, tiny genius energy.',
    themeLine: 'Parent-led discovery with music, shapes, and sensory play.',
    glow: 'glow-blue',
    badgeTone: 'blue',
  },
};

const suggestedTopics = [
  { name: 'Space', icon: '🌌' },
  { name: 'Gravity', icon: '🍎' },
  { name: 'Photosynthesis', icon: '🌱' },
  { name: 'Water Cycle', icon: '💧' },
  { name: 'Coding', icon: '🤖' },
  { name: 'Architecture', icon: '📐' }
];

const badgeCatalog = [
  { id: 'first-quest', name: 'First Quest', icon: '👣', check: (child) => (child.practiceCount ?? 0) >= 1, requirement: 'Complete 1 practice session' },
  { id: 'star-spark', name: 'Star Spark', icon: '⭐', check: (child) => (child.stars ?? 0) >= 5, requirement: 'Collect 5 laboratory stars' },
  { id: 'quiz-champ', name: 'Quiz Champ', icon: '🏆', check: (child) => (child.quizCount ?? 0) >= 3, requirement: 'Finish 3 quiz sets' },
  { id: 'streak-fire', name: 'Streak Fire', icon: '🔥', check: (child) => (child.streakDays ?? 0) >= 3, requirement: 'Reach a 3-day learning streak' },
  { id: 'topic-traveler', name: 'Topic Traveler', icon: '🗺️', check: (child) => (child.recentTopics || []).length >= 3, requirement: 'Explore 3 different science topics' },
  { id: 'level-builder', name: 'Level Builder', icon: '💎', check: (child) => (child.level ?? 1) >= 3, requirement: 'Reach Genius Level 3' },
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

export default function Home() {
  const [state, setState] = useState(defaultState);
  const [child, setChild] = useState('ethan');
  const [topic, setTopic] = useState('space');
  const [answer, setAnswer] = useState('');
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(0);
  const [practiceQuestions, setPracticeQuestions] = useState([]);
  
  // Custom states for interactive view
  const [activeConsoleTab, setActiveConsoleTab] = useState('chat'); // 'chat' | 'mission' | 'storybook' | 'quiz'
  
  // Rich details loaded from AI
  const [tutor, setTutor] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [summary, setSummary] = useState(null);
  const [missionData, setMissionData] = useState(null);
  const [missionCheckedSteps, setMissionCheckedSteps] = useState({});
  const [storyData, setStoryData] = useState('');
  const [hintData, setHintData] = useState(null);
  
  const [aiOnline, setAiOnline] = useState(false);
  const [loadingAction, setLoadingAction] = useState('');
  const [error, setError] = useState('');
  const [soundOn, setSoundOn] = useState(true);
  const [confettiOn, setConfettiOn] = useState(false);
  const [mascotIndex, setMascotIndex] = useState(0);
  const [showLevelUpAlert, setShowLevelUpAlert] = useState(false);
  const [prevLevel, setPrevLevel] = useState(1);
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [userDismissedOnboarding, setUserDismissedOnboarding] = useState(false);
  
  const mountedRef = useRef(true);

  const profile = childProfiles[child] || childProfiles.ethan;
  const currentChild = normalizeChild(state.children?.[child]);
  const activeQuestion = practiceQuestions[selectedQuestionIndex] || null;
  const xpPoints = (currentChild.stars ?? 0) * 12 + (currentChild.practiceCount ?? 0) * 8 + (currentChild.quizCount ?? 0) * 15 + (currentChild.recentTopics?.length ?? 0) * 5;
  const xpPercent = Math.min(100, Math.max(8, xpPoints % 100));
  const earnedBadgeCount = badgeCatalog.filter((badge) => badge.check(currentChild)).length;

  const mascotLines = useMemo(() => [
    profile.mascotLine,
    `${profile.name}, every question we answer unlocks more of the secret science lab.`,
    `Current Lab Mission: let's explore "${topic || 'something new'}" together!`,
    profile.themeLine,
  ], [profile, topic]);

  // Check AI Health and Load State
  useEffect(() => {
    const controller = new AbortController();
    
    // Check AI connection status
    getJson('/api/health?ai=1', controller.signal)
      .then((health) => {
        if (health?.ai?.ok) {
          setAiOnline(true);
        }
      })
      .catch(() => {
        setAiOnline(false);
      });

    // Load persisted state
    getJson('/api/state', controller.signal)
      .then((data) => {
        const nextState = mergeState(data);
        setState(nextState);
        const savedChild = nextState.activeChild || 'ethan';
        setChild(savedChild);
        setPrevLevel(normalizeChild(nextState.children?.[savedChild]).level || 1);
      })
      .catch(() => {
        // Safe local offline execution
      });

    return () => {
      mountedRef.current = false;
      controller.abort();
    };
  }, []);

  // Set up mascot conversation intervals
  useEffect(() => {
    setMascotIndex(0);
    const interval = window.setInterval(() => {
      setMascotIndex((value) => (value + 1) % mascotLines.length);
    }, 6500);

    return () => window.clearInterval(interval);
  }, [mascotLines.length, child]);

  // Auto-manage onboarding steps based on actions
  useEffect(() => {
    if (!child) {
      setOnboardingStep(1);
    } else if (!topic || topic.trim() === '') {
      setOnboardingStep(2);
    } else if (!tutor && practiceQuestions.length === 0 && !missionData) {
      setOnboardingStep(3);
    } else {
      setOnboardingStep(4); // Fully onboarded
    }
  }, [child, topic, tutor, practiceQuestions.length, missionData]);

  // Play game tone audio effects
  function playTone(kind = 'tap') {
    if (!soundOn || typeof window === 'undefined') return;

    const sequences = {
      tap: [420],
      success: [523, 659, 784],
      levelUp: [523, 659, 784, 1047],
      warning: [240, 180],
      encouragement: [440, 554, 659],
      badgeUnlocked: [587, 659, 698, 784, 880, 988, 1047],
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
          gain.gain.exponentialRampToValueAtTime(0.06, audio.currentTime + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.16);
          oscillator.connect(gain);
          gain.connect(audio.destination);
          oscillator.start();
          oscillator.stop(audio.currentTime + 0.18);
        } catch {
          // Audio elements are designed as optional enhancements
        }
      }, index * 90);
    });
  }

  // Handle Child Profile Selection
  async function saveChildSelection(nextChild) {
    playTone('tap');
    try {
      const updated = mergeState({ ...state, activeChild: nextChild });
      setState(updated);
      setChild(nextChild);
      setPrevLevel(normalizeChild(updated.children?.[nextChild]).level || 1);
      await postJson('/api/state', updated);
    } catch (err) {
      setError(err.message);
    }
  }

  // Core persistence of learning progress and level up verification
  async function saveStateUpdate(updated) {
    try {
      const saved = await postJson('/api/state', updated);
      const normalizedState = mergeState(saved);
      const nextChildLevel = normalizeChild(normalizedState.children?.[child]).level || 1;
      
      setState(normalizedState);
      
      if (nextChildLevel > prevLevel) {
        setPrevLevel(nextChildLevel);
        playTone('levelUp');
        setConfettiOn(true);
        setShowLevelUpAlert(true);
        window.setTimeout(() => setConfettiOn(false), 2500);
      }
    } catch (err) {
      setError('Unable to save state to server');
    }
  }

  // Launches the primary AI Tutor explanation tab
  async function runTutor() {
    if (!topic.trim()) {
      playTone('warning');
      setError('Please type a topic first!');
      return;
    }
    playTone('tap');
    setLoadingAction('tutor');
    setError('');
    setActiveConsoleTab('chat');
    try {
      const data = await postJson('/api/learning', {
        child,
        topic,
        mode: 'tutor',
      });
      setTutor(data);
      setFeedback(null);
      setHintData(null);
      playTone('encouragement');
    } catch (err) {
      setError(err.message);
      playTone('warning');
    } finally {
      setLoadingAction('');
    }
  }

  // Generates the adaptive Practice Quiz Cards
  async function runPractice() {
    if (!topic.trim()) {
      playTone('warning');
      setError('Please type a topic first!');
      return;
    }
    playTone('tap');
    setLoadingAction('practice');
    setError('');
    setActiveConsoleTab('quiz');
    try {
      const data = await postJson('/api/learning', {
        child,
        topic,
        mode: 'practice',
      });
      setPracticeQuestions(data.questions || []);
      setSelectedQuestionIndex(0);
      setAnswer('');
      setFeedback(null);
      setHintData(null);
      playTone('success');
    } catch (err) {
      setError(err.message);
      playTone('warning');
    } finally {
      setLoadingAction('');
    }
  }

  // Request a friendly AI hint for the selected question
  async function runHint() {
    if (!activeQuestion) return;
    playTone('tap');
    setLoadingAction('hint');
    setError('');
    try {
      const data = await postJson('/api/learning', {
        child,
        topic,
        mode: 'hint',
        question: activeQuestion.prompt,
      });
      setHintData(data);
    } catch (err) {
      setError(err.message);
      playTone('warning');
    } finally {
      setLoadingAction('');
    }
  }

  // Submits the child's answer for real-time grading, coaching, and rewards
  async function checkQuizAnswer() {
    if (!activeQuestion || !answer.trim()) {
      playTone('warning');
      return;
    }
    playTone('tap');
    setLoadingAction('feedback');
    setError('');
    try {
      const data = await postJson('/api/learning', {
        child,
        topic,
        mode: 'feedback',
        question: activeQuestion.prompt,
        answer: answer,
      });
      
      const score = data.feedback?.score ?? 0;
      setFeedback(data.feedback);
      setHintData(null);
      
      if (data.state) {
        await saveStateUpdate(data.state);
      }

      if (score >= 80) {
        setConfettiOn(true);
        playTone('success');
        window.setTimeout(() => setConfettiOn(false), 2000);
      } else {
        playTone('encouragement');
      }
    } catch (err) {
      setError(err.message);
      playTone('warning');
    } finally {
      setLoadingAction('');
    }
  }

  // Generates and sets up an interactive hands-on Lab Mission
  async function runMission() {
    if (!topic.trim()) {
      playTone('warning');
      setError('Please type a topic first!');
      return;
    }
    playTone('tap');
    setLoadingAction('mission');
    setError('');
    setActiveConsoleTab('mission');
    try {
      const data = await postJson('/api/mission', { child, subject: topic });
      setMissionData(data);
      setMissionCheckedSteps({});
      playTone('success');
    } catch (err) {
      setError(err.message);
      playTone('warning');
    } finally {
      setLoadingAction('');
    }
  }

  // Claims reward stars upon completing the mission tasks
  async function claimMissionReward() {
    if (!missionData) return;
    playTone('levelUp');
    setConfettiOn(true);
    window.setTimeout(() => setConfettiOn(false), 2200);

    const updated = updateChildProgress(state, child, {
      topic: topic,
      performance: 1.0,
      starsDelta: 3, // Reward 3 stars for complete lab mission!
      practiceCountDelta: 1,
      historyEntry: {
        kind: 'mission-complete',
        topic: topic,
        title: missionData.title,
      },
    });

    setMissionData(null);
    setMissionCheckedSteps({});
    await saveStateUpdate(updated);
  }

  // Generates a cozy bedtime educational story
  async function runStory() {
    if (!topic.trim()) {
      playTone('warning');
      setError('Please type a topic first!');
      return;
    }
    playTone('tap');
    setLoadingAction('story');
    setError('');
    setActiveConsoleTab('storybook');
    try {
      const data = await postJson('/api/story', { child, theme: topic });
      setStoryData(data.story || '');
      playTone('encouragement');
    } catch (err) {
      setError(err.message);
      playTone('warning');
    } finally {
      setLoadingAction('');
    }
  }

  // Triggers a coaching summary report for parents
  async function runSummary() {
    playTone('tap');
    setLoadingAction('summary');
    setError('');
    try {
      const data = await postJson('/api/learning', {
        child,
        topic,
        mode: 'summary',
      });
      setSummary(data.summary);
    } catch (err) {
      setError(err.message);
      playTone('warning');
    } finally {
      setLoadingAction('');
    }
  }

  // Helper utility for state generation and history
  function updateChildProgress(state, childKey, patch) {
    const nextState = mergeState(state);
    const current = nextState.children[childKey] || { ...defaultChild };
    const stars = Math.max(0, current.stars + (patch.starsDelta || 0));
    
    // Star multiplier for levels (level = sqrt(stars/4) + 1)
    const nextLevel = Math.max(1, Math.floor(Math.sqrt(stars / 4) + 1));
    
    const next = {
      ...current,
      stars,
      level: nextLevel,
      streakDays: current.streakDays + (patch.streakDelta || 0),
      practiceCount: current.practiceCount + (patch.practiceCountDelta || 0),
      quizCount: current.quizCount + (patch.quizCountDelta || 0),
      masteredTopics: patch.masteredTopic && !current.masteredTopics.includes(patch.masteredTopic)
        ? [patch.masteredTopic, ...current.masteredTopics].slice(0, 8)
        : current.masteredTopics,
      recentTopics: patch.topic
        ? [patch.topic, ...current.recentTopics.filter((t) => t !== patch.topic)].slice(0, 5)
        : current.recentTopics,
    };

    const historyEntry = patch.historyEntry
      ? {
          ...patch.historyEntry,
          child: childKey,
          timestamp: new Date().toISOString(),
        }
      : null;

    return mergeState({
      ...nextState,
      children: {
        ...nextState.children,
        [childKey]: next,
      },
      history: historyEntry ? [historyEntry, ...nextState.history].slice(0, 15) : nextState.history,
    });
  }

  // Fast-select topic trigger
  function handleSelectTopic(name) {
    playTone('tap');
    setTopic(name);
    setError('');
  }

  // Toggle mission checkbox locally
  function toggleMissionStep(index) {
    playTone('tap');
    setMissionCheckedSteps((prev) => ({
      ...prev,
      [index]: !prev[index]
    }));
  }

  const allMissionStepsChecked = useMemo(() => {
    if (!missionData || !missionData.steps) return false;
    return missionData.steps.every((_, i) => !!missionCheckedSteps[i]);
  }, [missionData, missionCheckedSteps]);

  return (
    <main className="shell">
      {/* Floating Sparkles Background */}
      <div className="floating-particles" aria-hidden="true">
        {Array.from({ length: 15 }, (_, i) => (
          <span
            key={i}
            className={`particle ${['star', 'circle', 'triangle'][i % 3]}`}
            style={{
              left: `${(i * 23) % 95}%`,
              width: `${10 + (i % 4) * 5}px`,
              height: `${10 + (i % 4) * 5}px`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: `${12 + (i % 5) * 3}s`
            }}
          />
        ))}
      </div>

      {/* Screen Confetti Celebrations */}
      {confettiOn && (
        <div className="confetti" aria-hidden="true">
          {Array.from({ length: 30 }, (_, i) => (
            <span
              key={i}
              style={{
                left: `${(i * 12) % 98}%`,
                animationDelay: `${i * 0.05}s`
              }}
            />
          ))}
        </div>
      )}

      {/* Onboarding Assistant */}
      {!userDismissedOnboarding && onboardingStep < 4 && (
        <div className="onboarding-banner">
          <div className="onboarding-content">
            <span className="onboarding-badge">🧪</span>
            <div className="onboarding-text">
              <h4>Genius Onboarding Guide — Step {onboardingStep} of 3</h4>
              <p>
                {onboardingStep === 1 && "Choose Ethan, Valentino, or Enzo in the Child Mode panel to set up your learning companion vibe."}
                {onboardingStep === 2 && "Enter a cool science subject or tap one of the suggested labs like 'Photosynthesis' or 'Space'!"}
                {onboardingStep === 3 && "Awesome! Now hit '🚀 Launch Tutor' below to start chatting with your AI companion, or try the quiz zone!"}
              </p>
            </div>
          </div>
          <button className="btn-onboarding-skip" onClick={() => setUserDismissedOnboarding(true)}>Dismiss Helper</button>
        </div>
      )}

      {/* Level Up Celebration Card Modal */}
      {showLevelUpAlert && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(30, 27, 75, 0.7)',
          backdropFilter: 'blur(10px)',
          zIndex: 999,
          display: 'grid',
          placeItems: 'center',
          animation: 'fadeIn 0.3s ease'
        }}>
          <div className="card" style={{
            maxWidth: '460px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 20,
            border: '4px solid var(--primary-yellow)',
            background: 'white',
            padding: '40px 30px'
          }}>
            <span style={{ fontSize: '70px', animation: 'mascotBob 1s infinite' }}>🏆</span>
            <h2 style={{ fontSize: '32px', color: 'var(--primary-yellow)' }}>Level Up!</h2>
            <p style={{ fontSize: '18px', fontWeight: 800 }}>
              Congratulations! {profile.name} has advanced to <span style={{ color: 'var(--primary-purple)' }}>Genius Level {currentChild.level}</span>!
            </p>
            <div style={{
              background: '#fef3c7',
              borderRadius: '20px',
              padding: '12px 20px',
              border: '2px solid rgba(245, 158, 11, 0.3)',
              fontSize: '14px',
              fontWeight: 700,
              color: '#92400e'
            }}>
              ✨ Earn more stars to unlock legendary badges!
            </div>
            <button className="btn btn-primary" onClick={() => setShowLevelUpAlert(false)}>Awesome! Keep Learning</button>
          </div>
        </div>
      )}

      {/* Main Header Bento Grid Area */}
      <header className="hero">
        <div className={`card hero-main ${profile.glow}`}>
          <div className="hero-header">
            <span className="hero-badge"><span className="sparkle">✨</span> AI Genius Lab Console</span>
            <div className={`lab-status ${aiOnline ? 'online' : 'offline'}`}>
              <span />
              {aiOnline ? 'AI Core: Online' : 'Local Core: Ready'}
            </div>
          </div>
          
          <div className="hero-copy">
            <h1>Kid Genius Lab</h1>
            <p className="hero-description">
              A premium, interactive AI learning laboratory for curious kids. Pick a science topic, launch your tutor, and complete missions to claim Genius Stars and badges!
            </p>

            {/* Mascot Character Interactive Dialogue Box */}
            <div className="mascot-area">
              <div className="mascot-avatar-container">
                <div className="mascot-avatar">{profile.avatar}</div>
              </div>
              <div className="mascot-bubble">
                <div className="mascot-line-stack">
                  <span className="mascot-title">{profile.name} Mode Active</span>
                  <p className="mascot-text">{'"' + mascotLines[mascotIndex] + '"'}</p>
                </div>
              </div>
            </div>

            {/* Active Learning Quest Buttons Panel */}
            <div className="action-grid">
              <button
                className={`action-card tone-primary ${loadingAction === 'tutor' ? 'active' : ''}`}
                onClick={runTutor}
                disabled={!!loadingAction}
              >
                <span className="action-icon">🧠</span>
                <span className="action-label">AI Tutor</span>
                <span className="action-desc">Explain with stories &amp; analogies</span>
              </button>

              <button
                className={`action-card tone-yellow ${loadingAction === 'practice' ? 'active' : ''}`}
                onClick={runPractice}
                disabled={!!loadingAction}
              >
                <span className="action-icon">🎯</span>
                <span className="action-label">Brain Quizzes</span>
                <span className="action-desc">Interactive adaptive cards</span>
              </button>

              <button
                className={`action-card tone-orange ${loadingAction === 'mission' ? 'active' : ''}`}
                onClick={runMission}
                disabled={!!loadingAction}
              >
                <span className="action-icon">🗺️</span>
                <span className="action-label">Lab Missions</span>
                <span className="action-desc">Hands-on offline blueprints</span>
              </button>

              <button
                className={`action-card tone-blue ${loadingAction === 'story' ? 'active' : ''}`}
                onClick={runStory}
                disabled={!!loadingAction}
              >
                <span className="action-icon">📚</span>
                <span className="action-label">Quest Stories</span>
                <span className="action-desc">Bedtime stories on topic</span>
              </button>

              <button
                className={`action-card tone-green`}
                onClick={() => {
                  playTone('tap');
                  setActiveConsoleTab('quiz');
                }}
              >
                <span className="action-icon">📝</span>
                <span className="action-label">Quiz Zone</span>
                <span className="action-desc">Verify answers &amp; claim stars</span>
              </button>

              <button
                className="action-card tone-purple"
                onClick={runSummary}
                disabled={!!loadingAction}
              >
                <span className="action-icon">📋</span>
                <span className="action-label">Parent Summary</span>
                <span className="action-desc">Track progress &amp; goals</span>
              </button>
            </div>
          </div>
        </div>

        {/* Lab Controls Sidebar Panel */}
        <aside className="card sidebar">
          <div className="section-header">
            <div className="section-title">
              <span className="section-icon">👧</span>
              <div>
                <h2>Child Companions</h2>
                <p className="section-subtitle">{"Switch your lab buddy's vibe"}</p>
              </div>
            </div>
            <span className="streak-badge">🔥 {currentChild.streakDays ?? 0} Days</span>
          </div>

          {/* Child Mascot Mode Selector */}
          <div className="child-carousel">
            {Object.entries(childProfiles).map(([key, item]) => {
              const childData = normalizeChild(state.children?.[key]);
              return (
                <button
                  key={key}
                  className={`child-card ${key} ${child === key ? 'active' : ''}`}
                  onClick={() => saveChildSelection(key)}
                >
                  <span className="child-avatar">
                    {item.avatar}
                    {child === key && <span className="child-status" />}
                  </span>
                  <span className="child-info">
                    <span className="child-name">{item.name}</span>
                    <span className="child-tag">{item.tag}</span>
                    <span className="child-traits">{item.traits}</span>
                  </span>
                  <span className="child-stats-mini">
                    <span className="mini-stat">
                      <strong>{childData.stars ?? 0}</strong>
                      <small>stars</small>
                    </span>
                    <span className="mini-stat">
                      <strong>{childData.level ?? 1}</strong>
                      <small>lvl</small>
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* Subject Setting controls */}
          <div className="input-group">
            <label className="input-label">
              <span className="input-icon">🌎</span>
              Active Science Subject:
            </label>
            <input
              className="input-field"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Space, Gravity, Water Cycle, Photosynthesis..."
            />
            {/* Quick click topic chips */}
            <div className="chip-row" style={{ marginTop: '4px' }}>
              {suggestedTopics.map((topicItem) => (
                <button
                  key={topicItem.name}
                  onClick={() => handleSelectTopic(topicItem.name)}
                  className={`chip ${topic.toLowerCase().trim() === topicItem.name.toLowerCase() ? 'active' : ''}`}
                  style={{
                    cursor: 'pointer',
                    background: topic.toLowerCase().trim() === topicItem.name.toLowerCase() ? 'var(--primary-purple)' : '',
                    color: topic.toLowerCase().trim() === topicItem.name.toLowerCase() ? 'white' : ''
                  }}
                >
                  {topicItem.icon} {topicItem.name}
                </button>
              ))}
            </div>
          </div>

          {/* XP Progress Bar indicator */}
          <div className="xp-card">
            <div className="xp-header">
              <span>Mascot Power: Level {currentChild.level ?? 1}</span>
              <strong>{xpPercent}%</strong>
            </div>
            <div className="xp-bar">
              <span style={{ width: `${xpPercent}%` }} />
            </div>
            <small>🏆 {earnedBadgeCount} out of {badgeCatalog.length} laboratory badges claimed</small>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', marginTop: 10 }}>
            <button className="sound-toggle" onClick={() => setSoundOn(!soundOn)}>
              {soundOn ? '🔊 Audio on' : '🔇 Audio off'}
            </button>
            <span className="text-tiny" style={{ alignSelf: 'center' }}>
              XP Count: {xpPoints}
            </span>
          </div>
        </aside>
      </header>

      {/* Stage Center: Bento Genius Console & Quiz Desk */}
      <section className="layout-two-col">
        {/* main interactive Genius Console Card */}
        <div className="card console-viewport">
          <div className="console-tab-header">
            <div className="console-tab-title">
              <span className="console-tab-icon">
                {activeConsoleTab === 'chat' && '🧠'}
                {activeConsoleTab === 'mission' && '🗺️'}
                {activeConsoleTab === 'storybook' && '📚'}
                {activeConsoleTab === 'quiz' && '🎯'}
              </span>
              <div>
                <h2>
                  {activeConsoleTab === 'chat' && 'AI Chat Companion'}
                  {activeConsoleTab === 'mission' && 'Active Blueprint Mission'}
                  {activeConsoleTab === 'storybook' && 'Interactive Storybook'}
                  {activeConsoleTab === 'quiz' && 'Genius Quiz Zone'}
                </h2>
                <p className="section-subtitle">
                  {activeConsoleTab === 'chat' && 'Speak directly with your laboratory mascot'}
                  {activeConsoleTab === 'mission' && 'Hands-on steps for home experiments'}
                  {activeConsoleTab === 'storybook' && 'Beautiful stories built around your topic'}
                  {activeConsoleTab === 'quiz' && 'Answer custom cards to prove your smarts'}
                </p>
              </div>
            </div>

            {/* Quick View switcher tabs inside console */}
            <div className="chip-row">
              <button
                className={`chip ${activeConsoleTab === 'chat' ? 'active' : ''}`}
                onClick={() => setActiveConsoleTab('chat')}
                style={{
                  background: activeConsoleTab === 'chat' ? 'var(--primary-purple)' : 'white',
                  color: activeConsoleTab === 'chat' ? 'white' : 'var(--text-primary)'
                }}
              >
                Chat
              </button>
              <button
                className={`chip ${activeConsoleTab === 'mission' ? 'active' : ''}`}
                onClick={() => setActiveConsoleTab('mission')}
                style={{
                  background: activeConsoleTab === 'mission' ? 'var(--primary-purple)' : 'white',
                  color: activeConsoleTab === 'mission' ? 'white' : 'var(--text-primary)'
                }}
              >
                Mission Map
              </button>
              <button
                className={`chip ${activeConsoleTab === 'storybook' ? 'active' : ''}`}
                onClick={() => setActiveConsoleTab('storybook')}
                style={{
                  background: activeConsoleTab === 'storybook' ? 'var(--primary-purple)' : 'white',
                  color: activeConsoleTab === 'storybook' ? 'white' : 'var(--text-primary)'
                }}
              >
                Story
              </button>
              <button
                className={`chip ${activeConsoleTab === 'quiz' ? 'active' : ''}`}
                onClick={() => setActiveConsoleTab('quiz')}
                style={{
                  background: activeConsoleTab === 'quiz' ? 'var(--primary-purple)' : 'white',
                  color: activeConsoleTab === 'quiz' ? 'white' : 'var(--text-primary)'
                }}
              >
                Quizzes
              </button>
            </div>
          </div>

          {/* Error alerts rendering */}
          {error && <div className="error-box">{error}</div>}

          {/* Loading state indicator */}
          {loadingAction && (
            <div className="learning-status" style={{ margin: '10px 0' }}>
              <span className="spinner" />
              Powering up the AI core engine for {loadingAction}...
            </div>
          )}

          {/* TAB 1: Chat Companion */}
          {activeConsoleTab === 'chat' && (
            <div className="chat-stream">
              {tutor ? (
                <>
                  <div className="chat-bubble assistant">
                    <strong>{profile.avatar} {profile.name} says:</strong>
                    <p>{tutor.answer}</p>
                    
                    {tutor.analogy && (
                      <div className="analogy-callout">
                        💡 Analogy Alert: {tutor.analogy}
                      </div>
                    )}
                  </div>

                  {tutor.steps && (
                    <div className="chat-bubble assistant" style={{ background: '#f8fafc' }}>
                      <strong>🎯 Easy steps to understand {topic}:</strong>
                      <ol className="steps-list">
                        {tutor.steps.map((step, i) => (
                          <li key={i}>{step}</li>
                        ))}
                      </ol>
                    </div>
                  )}

                  <div className="chat-bubble assistant">
                    <p>{tutor.encouragement || "You are doing an awesome job. Let's try some practice cards next!"}</p>
                  </div>
                </>
              ) : (
                <div className="empty-state">
                  <span>🧠</span>
                  <h3>AI Lab Tutor is Ready!</h3>
                  <p>{"Pick a subject like \"Photosynthesis\" or \"Gravity\" on the right, then hit the launch button to start your lessons."}</p>
                  <button className="btn btn-primary" onClick={runTutor} disabled={!!loadingAction}>
                    🚀 Launch AI Tutor
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Mission Checklist Map */}
          {activeConsoleTab === 'mission' && (
            <div className="mission-checklist">
              {missionData ? (
                <>
                  <div className="mission-title-header">
                    <h3>🗺️ Mission: {missionData.title}</h3>
                    <p style={{ marginTop: '6px', fontSize: '15px', color: 'var(--text-secondary)' }}>
                      {missionData.summary}
                    </p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {missionData.steps?.map((step, idx) => (
                      <div key={idx} className="mission-step-card" onClick={() => toggleMissionStep(idx)}>
                        <button className={`mission-checkbox ${missionCheckedSteps[idx] ? 'checked' : ''}`}>
                          {missionCheckedSteps[idx] ? '✓' : ''}
                        </button>
                        <span className="mission-step-text" style={{
                          textDecoration: missionCheckedSteps[idx] ? 'line-through' : 'none',
                          color: missionCheckedSteps[idx] ? 'var(--text-muted)' : 'var(--text-primary)'
                        }}>
                          {step}
                        </span>
                      </div>
                    ))}
                  </div>

                  {missionData.reward && (
                    <div className="mission-reward-badge">
                      <span>🎁 Reward:</span> {missionData.reward}
                    </div>
                  )}

                  <button
                    className="btn btn-success"
                    style={{ marginTop: '10px' }}
                    onClick={claimMissionReward}
                    disabled={!allMissionStepsChecked}
                  >
                    ✨ {allMissionStepsChecked ? 'Verify & Claim Stars (+3 Stars!)' : 'Complete All Steps to Claim Reward!'}
                  </button>
                </>
              ) : (
                <div className="empty-state">
                  <span>🗺️</span>
                  <h3>Interactive Science Missions</h3>
                  <p>Generate a parent-guided hands-on experiment for your topic. Complete steps to gain massive stars!</p>
                  <button className="btn btn-primary" onClick={runMission} disabled={!!loadingAction}>
                    📐 Create Lab Mission
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Storybook Reader */}
          {activeConsoleTab === 'storybook' && (
            <div className="storybook">
              {storyData ? (
                <>
                  <div className="story-text">
                    {storyData.split('\n\n').map((para, i) => (
                      <p key={i} style={{ marginBottom: '14px' }}>{para}</p>
                    ))}
                  </div>
                  <div className="storybook-controls">
                    <span className="text-tiny" style={{ background: '#fffbeb', padding: '4px 12px', borderRadius: '999px', border: '1.5px solid rgba(245,158,11,0.2)' }}>
                      📖 Lab Quest Storybook Complete!
                    </span>
                  </div>
                </>
              ) : (
                <div className="empty-state">
                  <span>📚</span>
                  <h3>Science bed-time Stories</h3>
                  <p>Read an immersive adventure about your active topic! Helps lock in your knowledge before sleep.</p>
                  <button className="btn btn-primary" onClick={runStory} disabled={!!loadingAction}>
                    ✍ Write Cozy Story
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Interactive Quiz Zone */}
          {activeConsoleTab === 'quiz' && (
            <div>
              {practiceQuestions.length ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="text-tiny" style={{ background: '#ecfdf5', color: 'var(--primary-green)', padding: '4px 12px', borderRadius: '999px' }}>
                      Card {selectedQuestionIndex + 1} of {practiceQuestions.length}
                    </span>
                    <span className="text-tiny" style={{
                      color: activeQuestion?.difficulty === 'hard' ? 'var(--primary-pink)' : activeQuestion?.difficulty === 'medium' ? 'var(--primary-orange)' : 'var(--primary-green)'
                    }}>
                      Difficulty: {activeQuestion?.difficulty}
                    </span>
                  </div>

                  {/* Active Question Panel */}
                  <div className="question-card active" style={{ cursor: 'default' }}>
                    <span className="question-number">Question Card</span>
                    <strong className="question-prompt" style={{ fontSize: '18px' }}>
                      {activeQuestion.prompt}
                    </strong>
                    <p className="question-support" style={{ borderLeft: '3.5px solid var(--primary-green)', paddingLeft: '10px', marginTop: '4px' }}>
                      {activeQuestion.support}
                    </p>
                  </div>

                  {/* Dynamic Hints presentation */}
                  {hintData && (
                    <div style={{
                      background: '#fffbeb',
                      border: '2px solid rgba(245, 158, 11, 0.3)',
                      borderRadius: '20px',
                      padding: '16px',
                      animation: 'slideDown 0.3s ease'
                    }}>
                      <strong style={{ color: 'var(--primary-yellow)', display: 'block', marginBottom: '4px' }}>
                        💡 Mascot Clue:
                      </strong>
                      <p style={{ fontSize: '14px', fontWeight: 700 }}>{hintData.hint}</p>
                      <small style={{ display: 'block', marginTop: '6px', color: 'var(--text-secondary)', fontWeight: 800 }}>
                        Next Step: {hintData.nextStep}
                      </small>
                    </div>
                  )}

                  {/* Active Answer verification details */}
                  {feedback && (
                    <div style={{
                      background: feedback.score >= 80 ? '#ecfdf5' : '#fff7ed',
                      border: `2px solid ${feedback.score >= 80 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(249, 115, 22, 0.3)'}`,
                      borderRadius: '22px',
                      padding: '16px',
                      animation: 'slideDown 0.3s ease'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <strong style={{
                          color: feedback.score >= 80 ? 'var(--primary-green)' : 'var(--primary-orange)',
                          fontSize: '17px'
                        }}>
                          {feedback.score >= 80 ? '🌟 Awesome Answer!' : '👏 Good Attempt!'}
                        </strong>
                        <span style={{
                          fontWeight: 900,
                          fontSize: '18px',
                          color: 'var(--text-primary)',
                          background: 'white',
                          padding: '4px 10px',
                          borderRadius: '999px',
                          border: '1.5px solid var(--border-light)'
                        }}>
                          Score: {feedback.score}/100
                        </span>
                      </div>
                      <p style={{ fontSize: '14px', fontWeight: 800, marginBottom: '6px' }}>{feedback.summary}</p>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        <strong>What went well:</strong> {feedback.whatWentWell}
                        <br />
                        <strong>What to work on:</strong> {feedback.whatToTryNext}
                      </div>
                      <p style={{ marginTop: '8px', fontSize: '13px', fontStyle: 'italic', fontWeight: 700, color: 'var(--primary-purple)' }}>
                        {'"' + feedback.encouragement + '"'}
                      </p>
                    </div>
                  )}

                  {/* Child response inputs */}
                  <div className="input-group">
                    <label className="input-label">
                      <span className="input-icon">✍️</span>
                      {"Type the child's smart answer here:"}
                    </label>
                    <textarea
                      className="input-field"
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      placeholder="Type the answer spoken by the child... (e.g. Gravity pulls objects back to the ground so they do not float away!)"
                    />
                  </div>

                  <div className="practice-toolbar">
                    <button className="btn btn-secondary" onClick={runHint} disabled={!!loadingAction}>
                      💡 Ask Mascot for a Hint
                    </button>
                    <button className="btn btn-primary" onClick={checkQuizAnswer} disabled={!!loadingAction || !answer.trim()}>
                      🚀 Check Answer! (+stars)
                    </button>
                  </div>

                  {/* Question Cards select bar */}
                  <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                    {practiceQuestions.map((q, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setSelectedQuestionIndex(idx);
                          setFeedback(null);
                          setHintData(null);
                          playTone('tap');
                        }}
                        className={`chip ${selectedQuestionIndex === idx ? 'active' : ''}`}
                        style={{
                          background: selectedQuestionIndex === idx ? 'var(--primary-green)' : '',
                          color: selectedQuestionIndex === idx ? 'white' : ''
                        }}
                      >
                        Card {idx + 1}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="empty-state">
                  <span>🎯</span>
                  <h3>Start the Practice Quest</h3>
                  <p>{"Pick a subject like \"Gravity\", then hit the button to generate a fresh deck of adaptive quiz cards!"}</p>
                  <button className="btn btn-primary" onClick={runPractice} disabled={!!loadingAction}>
                    ⚡ Load Quiz Deck
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Dashboard 2: Progress, Analytics, and parent Coaching cards */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="section-header">
            <div className="section-title">
              <span className="section-icon">📈</span>
              <div>
                <h2>Progress &amp; Lab Growth</h2>
                <p className="section-subtitle">Track topics explored, struggled, and won</p>
              </div>
            </div>
          </div>

          <BadgeWall childData={currentChild} />

          {/* Core Mastered vs Struggling visual summary */}
          <div className="progress-grid">
            <div className="progress-block" style={{ borderLeft: '4px solid var(--primary-green)' }}>
              <h3>Mastered Topics</h3>
              {currentChild.masteredTopics?.length ? (
                <div className="chip-row">
                  {currentChild.masteredTopics.map((item) => (
                    <span key={item} className="chip" style={{ background: '#ecfdf5', color: 'var(--primary-green)', borderColor: 'rgba(16,185,129,0.2)' }}>
                      🏆 {item}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-small text-muted">Complete cards with 80+ score to master a topic!</span>
              )}
            </div>

            <div className="progress-block" style={{ borderLeft: '4px solid var(--primary-orange)' }}>
              <h3>Needs Work</h3>
              {currentChild.struggleTopics?.length ? (
                <div className="chip-row">
                  {currentChild.struggleTopics.map((item) => (
                    <span key={item} className="chip" style={{ background: '#fff7ed', color: 'var(--primary-orange)', borderColor: 'rgba(249,115,22,0.2)' }}>
                      💡 {item}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-small text-muted">No struggling topics yet. Excellent!</span>
              )}
            </div>

            <div className="progress-block" style={{ borderLeft: '4px solid var(--primary-purple)' }}>
              <h3>Recent Labs</h3>
              {currentChild.recentTopics?.length ? (
                <div className="chip-row">
                  {currentChild.recentTopics.map((item) => (
                    <span key={item} className="chip" style={{ background: '#f5f3ff', color: 'var(--primary-purple)', borderColor: 'rgba(139,92,246,0.2)' }}>
                      ⚙️ {item}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-small text-muted">Start an action to list recent topics.</span>
              )}
            </div>
          </div>

          {/* Parent coaching analytics and notes */}
          <div className="response-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h3>🧠 Parent Insights &amp; Coaching Tips</h3>
              <button
                className="btn-onboarding-skip"
                style={{ fontSize: '11px', padding: '4px 10px' }}
                onClick={runSummary}
                disabled={!!loadingAction}
              >
                {loadingAction === 'summary' ? 'Loading...' : 'Refresh Insights'}
              </button>
            </div>
            <pre>
              {summary ? (
                <>
                  {summary.parentNote}
                  {"\n\n"}
                  <strong>Struggles to address:</strong> {summary.struggledWith?.join(', ') || 'None log.'}
                  {"\n"}
                  <strong>Masteries:</strong> {summary.improvedOn?.join(', ') || 'None log.'}
                </>
              ) : (
                "Tap the 'Parent Summary' button above or 'Refresh Insights' to view custom coaching advice from the AI tutor based on the child's answers."
              )}
            </pre>
          </div>
        </div>
      </section>

      {/* Lab Stats row indicator */}
      <section className="stats-grid">
        <div className="stat-card stars">
          <span className="stat-icon">⭐</span>
          <span className="stat-label">Total Stars</span>
          <strong className="stat-value">{currentChild.stars ?? 0}</strong>
        </div>
        <div className="stat-card level">
          <span className="stat-icon">🏆</span>
          <span className="stat-label">Genius Level</span>
          <strong className="stat-value">{currentChild.level ?? 1}</strong>
        </div>
        <div className="stat-card practice">
          <span className="stat-icon">🎯</span>
          <span className="stat-label">Practice Runs</span>
          <strong className="stat-value">{currentChild.practiceCount ?? 0}</strong>
        </div>
        <div className="stat-card quiz">
          <span className="stat-icon">🧩</span>
          <span className="stat-label">Quizzes Completed</span>
          <strong className="stat-value">{currentChild.quizCount ?? 0}</strong>
        </div>
      </section>

      {/* Lab Quest log history */}
      {state.history?.length > 0 && (
        <section className="card" style={{ marginTop: '28px' }}>
          <div className="section-header" style={{ marginBottom: '14px' }}>
            <h2>Laboratory Activity Logs</h2>
            <span className="text-tiny" style={{ background: '#f1f5f9', color: 'var(--text-secondary)', padding: '4px 12px', borderRadius: '999px' }}>
              Persisted in local database
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto', paddingRight: '10px' }}>
            {state.history.map((item, idx) => (
              <div key={idx} style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '10px 14px',
                border: '1.5px solid var(--border-light)',
                borderRadius: '16px',
                background: 'white',
                fontSize: '13px',
                fontWeight: 700
              }}>
                <div>
                  <span style={{ textTransform: 'uppercase', fontSize: '10px', color: 'var(--primary-purple)', marginRight: '8px' }}>
                    [{item.kind}]
                  </span>
                  <span>
                    {item.child?.toUpperCase()} explored topic <strong>{'"' + item.topic + '"'}</strong>
                    {item.score && ` with a quiz score of ${item.score}`}
                  </span>
                </div>
                <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                  {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function BadgeWall({ childData }) {
  return (
    <div className="badge-wall">
      <div className="badge-wall-header">
        <h3>Laboratory Badges Showcase</h3>
        <span>{badgeCatalog.filter((badge) => badge.check(childData)).length}/{badgeCatalog.length} Claimed</span>
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
