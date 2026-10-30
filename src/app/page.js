'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CHILD_KEYS,
  FEATURED_TOPICS,
  QUICK_PROMPTS,
  STARTERS,
  badgeCatalog,
  childProfiles,
  dateKey,
  flattenAssistantMessage,
  formatElapsed,
  levelFromXp,
  levelProgress,
  nextDifficulty,
  pickDailySpark,
  randomTopic,
  rankForLevel,
  splitStoryIntoPages,
  starsFromScore,
  titleCase,
  weekDays,
  wonderQuestions,
  xpFromScore,
} from '../lib/game';
import { playSound, setSoundEnabled } from '../lib/sound';
import { canListen, canSpeak, listenOnce, speak, stopSpeaking } from '../lib/speech';

const defaultChild = {
  stars: 0,
  xp: 0,
  level: 1,
  streakDays: 0,
  practiceCount: 0,
  quizCount: 0,
  missionsDone: 0,
  storiesRead: 0,
  lastDifficulty: 'medium',
  masteredTopics: [],
  struggleTopics: [],
  recentTopics: [],
  lastActiveDate: null,
  dailyDate: null,
  dailyStars: 0,
  dailyGoal: 30,
  lastPerformance: null,
  updatedAt: null,
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

const emptyQuiz = {
  questions: [],
  index: 0,
  drafts: {},
  responses: {},
  combo: 0,
  sessionStars: 0,
  sessionXp: 0,
  done: false,
};

const TABS = [
  { id: 'tutor', label: 'Tutor', icon: '🧠' },
  { id: 'quiz', label: 'Quiz', icon: '🎯' },
  { id: 'mission', label: 'Mission', icon: '🧪' },
  { id: 'story', label: 'Story', icon: '📖' },
];

const TAB_META = {
  tutor: { title: 'Talk it out.', sub: 'Your AI lab partner turns any topic into a conversation.' },
  quiz: { title: 'Prove the spark.', sub: 'Adaptive questions with kind, specific coaching.' },
  mission: { title: 'Build something real.', sub: 'Hands-on steps for curious hands and brave messes.' },
  story: { title: 'Wonder, then dream.', sub: 'A cozy story that makes the topic stick.' },
};

const LOADING_COPY = {
  tutor: 'Waking the tutor...',
  chat: 'Thinking about your question...',
  practice: 'Building a fresh quiz deck...',
  hint: 'Finding a gentle clue...',
  feedback: 'Reading your answer like a scientist...',
  mission: 'Designing a hands-on mission...',
  story: 'Writing a cozy adventure...',
  summary: 'Reading the lab notebook...',
};

let localId = 0;
function uid(prefix = 'id') {
  localId += 1;
  return `${prefix}-${Date.now()}-${localId}`;
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(data?.error || 'The lab engine hit a snag. Try again in a moment.');
  }

  return data;
}

function normalizeChild(childState) {
  const source = childState || {};
  const stars = Number.isFinite(source.stars) ? source.stars : 0;
  const xp = Number.isFinite(source.xp) ? source.xp : stars * 10;

  return {
    ...defaultChild,
    ...source,
    stars,
    xp,
    level: levelFromXp(xp),
    streakDays: Number.isFinite(source.streakDays) ? source.streakDays : 0,
    practiceCount: Number.isFinite(source.practiceCount) ? source.practiceCount : 0,
    quizCount: Number.isFinite(source.quizCount) ? source.quizCount : 0,
    missionsDone: Number.isFinite(source.missionsDone) ? source.missionsDone : 0,
    storiesRead: Number.isFinite(source.storiesRead) ? source.storiesRead : 0,
    dailyStars: Number.isFinite(source.dailyStars) ? source.dailyStars : 0,
    dailyGoal: Number.isFinite(source.dailyGoal) ? source.dailyGoal : 30,
    masteredTopics: Array.isArray(source.masteredTopics) ? source.masteredTopics : [],
    struggleTopics: Array.isArray(source.struggleTopics) ? source.struggleTopics : [],
    recentTopics: Array.isArray(source.recentTopics) ? source.recentTopics : [],
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

function kindIcon(kind) {
  if (kind === 'quiz') return '🎯';
  if (kind === 'mission') return '🧪';
  if (kind === 'story') return '📖';
  return '✨';
}

function kindTitle(kind, item) {
  if (kind === 'quiz') return `Quiz · ${item.score ?? 0}/100`;
  if (kind === 'mission') return item.title || 'Hands-on mission complete';
  if (kind === 'story') return item.title || 'Bedtime story finished';
  return 'Lab activity';
}

function formatWhen(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';
  const today = dateKey();
  const day = dateKey(date);
  const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return day === today ? `Today · ${time}` : `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} · ${time}`;
}

export default function Home() {
  const [state, setState] = useState(defaultState);
  const stateRef = useRef(defaultState);
  const [activeChild, setActiveChild] = useState('ethan');
  const [topic, setTopic] = useState('Space');
  const [tab, setTab] = useState('tutor');

  const [chat, setChat] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [quiz, setQuiz] = useState(emptyQuiz);
  const [mission, setMission] = useState(null);
  const [story, setStory] = useState(null);
  const [summary, setSummary] = useState(null);

  const [loading, setLoading] = useState('');
  const [error, setError] = useState('');
  const [aiOnline, setAiOnline] = useState(null);
  const [toast, setToast] = useState(null);
  const [badgeToast, setBadgeToast] = useState(null);
  const [levelUp, setLevelUp] = useState(null);
  const [showParent, setShowParent] = useState(false);
  const [parentTab, setParentTab] = useState('overview');
  const [parentLoading, setParentLoading] = useState(false);

  const [soundOn, setSoundOn] = useState(true);
  const [voiceOn, setVoiceOn] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [prefsReady, setPrefsReady] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [dailySpark, setDailySpark] = useState(null);
  const [mascotIndex, setMascotIndex] = useState(0);
  const [listening, setListening] = useState('');
  const [speakingId, setSpeakingId] = useState(null);
  const [onboardingStep, setOnboardingStep] = useState(-1);
  const [confetti, setConfetti] = useState(false);
  const [clock, setClock] = useState(Date.now());

  const recognitionRef = useRef(null);
  const speechToken = useRef(0);
  const confettiTimer = useRef(null);
  const consoleRef = useRef(null);

  const profile = childProfiles[activeChild] || childProfiles.ethan;
  const child = normalizeChild(state.children?.[activeChild]);
  const progress = levelProgress(child.xp || 0);
  const earnedBadges = badgeCatalog.filter((badge) => badge.check(child));
  const elapsed = mission
    ? mission.completed
      ? mission.elapsed
      : Math.max(0, Math.floor((clock - mission.startedAt) / 1000))
    : 0;

  const week = useMemo(() => weekDays(), []);
  const activityByDay = useMemo(() => {
    const counts = {};
    for (const item of state.history || []) {
      if (item.child !== activeChild || !item.timestamp) continue;
      const parsed = new Date(item.timestamp);
      if (Number.isNaN(parsed.getTime())) continue;
      const key = dateKey(parsed);
      counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
  }, [state.history, activeChild]);

  const childHistory = useMemo(
    () => (state.history || []).filter((item) => item.child === activeChild).slice(0, 24),
    [state.history, activeChild]
  );

  const mascotLines = useMemo(
    () => [
      profile.mascotLine,
      `Today we’re exploring ${topic || 'something wonderful'}.`,
      profile.themeLine,
      `${child.streakDays > 0 ? `${child.streakDays}-day streak. ` : ''}Every question makes your brain a little bigger.`,
    ],
    [profile, topic, child.streakDays]
  );

  const spark = dailySpark || {
    q: 'What would you invent if you could build anything?',
    topic: 'Inventions',
    emoji: '💡',
    kicker: 'The best inventions start with a curious question.',
  };

  useEffect(() => {
    setMounted(true);
    const controller = new AbortController();

    fetch('/api/health?ai=1', { signal: controller.signal })
      .then((response) => response.json())
      .then((data) => setAiOnline(Boolean(data?.ai?.ok)))
      .catch(() => {
        if (!controller.signal.aborted) setAiOnline(false);
      });

    fetch('/api/state', { signal: controller.signal })
      .then((response) => response.json())
      .then((data) => {
        const next = mergeState(data);
        stateRef.current = next;
        setState(next);
        const savedChild = childProfiles[next.activeChild] ? next.activeChild : 'ethan';
        setActiveChild(savedChild);
      })
      .catch(() => {});

    try {
      const stored = JSON.parse(window.localStorage.getItem('kgl:prefs') || '{}');
      if (typeof stored.sound === 'boolean') setSoundOn(stored.sound);
      if (typeof stored.voice === 'boolean') setVoiceOn(stored.voice);
      const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      setReduceMotion(typeof stored.reduceMotion === 'boolean' ? stored.reduceMotion : Boolean(prefersReduced));
      setOnboardingStep(window.localStorage.getItem('kgl:onboarded') === '1' ? -1 : 0);
    } catch {
      // Preferences are optional.
    }
    setPrefsReady(true);

    return () => {
      controller.abort();
      stopSpeaking();
      if (confettiTimer.current) window.clearTimeout(confettiTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!prefsReady) return;
    setSoundEnabled(soundOn);
    try {
      window.localStorage.setItem('kgl:prefs', JSON.stringify({ sound: soundOn, voice: voiceOn, reduceMotion }));
    } catch {
      // Preferences are optional.
    }
  }, [soundOn, voiceOn, reduceMotion, prefsReady]);

  useEffect(() => {
    setDailySpark(pickDailySpark(activeChild));
  }, [activeChild]);

  useEffect(() => {
    setMascotIndex(0);
    const timer = window.setInterval(() => {
      setMascotIndex((value) => (value + 1) % mascotLines.length);
    }, 7000);
    return () => window.clearInterval(timer);
  }, [mascotLines.length, activeChild]);

  useEffect(() => {
    if (!mission || mission.completed) return undefined;
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [mission]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 4400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!badgeToast) return undefined;
    const timer = window.setTimeout(() => setBadgeToast(null), 5000);
    return () => window.clearTimeout(timer);
  }, [badgeToast]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setShowParent(false);
        setLevelUp(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const locked = showParent || Boolean(levelUp) || onboardingStep >= 0;
    document.body.style.overflow = locked ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [showParent, levelUp, onboardingStep]);

  function toastMessage(text, tone = 'info') {
    setToast({ id: uid('toast'), text, tone });
  }

  function celebrate(duration = 2200) {
    setConfetti(true);
    if (confettiTimer.current) window.clearTimeout(confettiTimer.current);
    confettiTimer.current = window.setTimeout(() => setConfetti(false), duration);
  }

  function persistState(nextState) {
    fetch('/api/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nextState),
    }).catch(() => {});
  }

  function commit(nextState, options = {}) {
    const previous = stateRef.current;
    const previousChild = normalizeChild(previous.children?.[activeChild]);
    const nextChild = normalizeChild(nextState.children?.[activeChild]);
    const previousLevel = levelFromXp(previousChild.xp || 0);
    const nextLevel = levelFromXp(nextChild.xp || 0);
    const previousBadges = new Set(badgeCatalog.filter((badge) => badge.check(previousChild)).map((badge) => badge.id));
    const unlocked = badgeCatalog.filter((badge) => badge.check(nextChild) && !previousBadges.has(badge.id));

    stateRef.current = nextState;
    setState(nextState);

    if (options.persist !== false) persistState(nextState);

    if (nextLevel > previousLevel && !options.silent) {
      setLevelUp({ level: nextLevel, rank: rankForLevel(nextLevel) });
      playSound('levelUp');
      celebrate(2800);
    }

    if (unlocked.length && !options.silent) {
      setBadgeToast(unlocked[0]);
      playSound('badge');
    }
  }

  function applyActivity(patch) {
    const base = mergeState(stateRef.current);
    const current = base.children[activeChild];
    const today = dateKey();
    let streakDays = current.streakDays || 0;

    if (patch.countActivity !== false) {
      if (current.lastActiveDate !== today) {
        const yesterday = dateKey(new Date(Date.now() - 86400000));
        streakDays = current.lastActiveDate === yesterday ? streakDays + 1 : 1;
      } else if (streakDays < 1) {
        streakDays = 1;
      }
    }

    const starsDelta = patch.starsDelta || 0;
    const xpDelta = patch.xpDelta || 0;
    const stars = Math.max(0, (current.stars || 0) + starsDelta);
    const xp = Math.max(0, (current.xp || 0) + xpDelta);
    const dailyBase = current.dailyDate === today ? current.dailyStars || 0 : 0;
    const dailyStars = Math.max(0, dailyBase + Math.max(0, starsDelta));

    const nextChild = {
      ...current,
      stars,
      xp,
      level: levelFromXp(xp),
      streakDays,
      lastActiveDate: patch.countActivity === false ? current.lastActiveDate : today,
      dailyDate: today,
      dailyStars,
      practiceCount: (current.practiceCount || 0) + (patch.practiceCountDelta || 0),
      quizCount: (current.quizCount || 0) + (patch.quizCountDelta || 0),
      missionsDone: (current.missionsDone || 0) + (patch.missionsDoneDelta || 0),
      storiesRead: (current.storiesRead || 0) + (patch.storiesReadDelta || 0),
      lastDifficulty: patch.lastDifficulty || current.lastDifficulty,
      masteredTopics:
        patch.masteredTopic && !current.masteredTopics.includes(patch.masteredTopic)
          ? [patch.masteredTopic, ...current.masteredTopics].slice(0, 8)
          : current.masteredTopics,
      struggleTopics: patch.struggleTopic
        ? Array.from(new Set([patch.struggleTopic, ...current.struggleTopics])).slice(0, 8)
        : current.struggleTopics,
      recentTopics: patch.topic
        ? [patch.topic, ...current.recentTopics.filter((item) => item !== patch.topic)].slice(0, 6)
        : current.recentTopics,
      lastPerformance: patch.performance ?? current.lastPerformance,
      updatedAt: new Date().toISOString(),
    };

    const entry = patch.historyEntry
      ? { ...patch.historyEntry, child: activeChild, timestamp: new Date().toISOString() }
      : null;

    const nextState = mergeState({
      ...base,
      activeChild,
      children: { ...base.children, [activeChild]: nextChild },
      history: entry ? [entry, ...base.history].slice(0, 40) : base.history,
      updatedAt: new Date().toISOString(),
    });

    commit(nextState);
    return nextState;
  }

  function focusConsole() {
    window.setTimeout(() => {
      consoleRef.current?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    }, 90);
  }

  function selectChild(key) {
    if (!childProfiles[key] || key === activeChild) return;
    playSound('pop');
    const base = mergeState(stateRef.current);
    const next = mergeState({ ...base, activeChild: key });
    commit(next, { silent: true });
    setActiveChild(key);
    setChat([]);
    setQuiz(emptyQuiz);
    setMission(null);
    setStory(null);
    setSummary(null);
    setError('');
    toastMessage(`${childProfiles[key].name} is in the lab.`, 'info');
  }

  function handleTopic(name) {
    setTopic(name);
    playSound('tap');
  }

  function surprise() {
    const pick = randomTopic(topic);
    setTopic(pick.name);
    playSound('swoosh');
    toastMessage(`New wonder unlocked: ${pick.name}`, 'info');
    runTutor(pick.name);
  }

  function speakText(text, id) {
    if (!canSpeak()) return;
    const token = ++speechToken.current;
    const started = speak(text, {
      onEnd: () => {
        if (speechToken.current === token) setSpeakingId(null);
      },
    });
    if (started) setSpeakingId(id);
  }

  function toggleRead(text, id) {
    if (speakingId === id) {
      speechToken.current += 1;
      stopSpeaking();
      setSpeakingId(null);
      return;
    }
    if (!canSpeak()) {
      toastMessage('This browser cannot read aloud yet. Try Chrome, Edge, or Safari.', 'warn');
      return;
    }
    speakText(text, id);
    playSound('tap');
  }

  function startListening(field) {
    if (listening) {
      recognitionRef.current?.stop?.();
      recognitionRef.current = null;
      setListening('');
      return;
    }
    if (!canListen()) {
      toastMessage('Voice input works best in Chrome, Edge, and Safari.', 'warn');
      return;
    }

    const targetIndex = quiz.index;
    setListening(field);
    playSound('tap');

    const recognition = listenOnce({
      onResult: (text) => {
        if (field === 'chat') {
          setChatInput((previous) => (previous ? `${previous} ${text}` : text));
        } else {
          setQuiz((previous) => {
            const existing = previous.drafts[targetIndex] || '';
            return {
              ...previous,
              drafts: {
                ...previous.drafts,
                [targetIndex]: existing ? `${existing} ${text}` : text,
              },
            };
          });
        }
      },
      onEnd: () => {
        setListening('');
        recognitionRef.current = null;
      },
      onError: (code) => {
        setListening('');
        recognitionRef.current = null;
        if (code === 'unsupported') {
          toastMessage('Voice input needs Chrome, Edge, or Safari.', 'warn');
        } else if (code !== 'aborted' && code !== 'no-speech') {
          toastMessage('I could not hear that. Try again a little closer to the mic.', 'warn');
        }
      },
    });

    recognitionRef.current = recognition;
  }

  async function runTutor(topicOverride) {
    const quest = String(topicOverride ?? topic).trim();
    if (!quest) {
      toastMessage('Type a wonder first, or tap a topic chip.', 'warn');
      playSound('error');
      return;
    }
    if (topicOverride) setTopic(quest);

    playSound('tap');
    setTab('tutor');
    focusConsole();
    setLoading('tutor');
    setError('');
    setChat([]);

    try {
      const data = await postJson('/api/learning', {
        child: activeChild,
        topic: quest,
        mode: 'tutor',
      });
      const message = { id: uid('msg'), role: 'assistant', kind: 'tutor', content: data.answer, data };
      setChat([message]);
      playSound('success');
      if (voiceOn) speakText(data.answer, message.id);
    } catch (err) {
      setError(err.message);
      toastMessage(err.message, 'error');
      playSound('error');
    } finally {
      setLoading('');
    }
  }

  async function sendChat(textOverride) {
    const text = String(textOverride ?? chatInput).trim();
    if (!text || loading) return;
    if (!topic.trim()) {
      toastMessage('Pick a topic first so the tutor stays on track.', 'warn');
      return;
    }

    const userMessage = { id: uid('msg'), role: 'user', content: text };
    const history = [...chat, userMessage];
    setChat(history);
    setChatInput('');
    setLoading('chat');
    setError('');

    try {
      const data = await postJson('/api/learning', {
        child: activeChild,
        topic,
        mode: 'chat',
        messages: history.slice(-10).map((message) => ({
          role: message.role,
          content: flattenAssistantMessage(message),
        })),
      });
      const reply = data?.reply || 'That is a great question. Let me think of one more clue for you.';
      const message = { id: uid('msg'), role: 'assistant', content: reply };
      setChat((previous) => [...previous, message]);
      playSound('pop');
      if (voiceOn) speakText(reply, message.id);
    } catch (err) {
      setError(err.message);
      toastMessage(err.message, 'error');
      playSound('error');
    } finally {
      setLoading('');
    }
  }

  async function runPractice(topicOverride) {
    const quest = String(topicOverride ?? topic).trim();
    if (!quest) {
      toastMessage('Type a wonder first, or tap a topic chip.', 'warn');
      playSound('error');
      return;
    }
    if (topicOverride) setTopic(quest);

    playSound('tap');
    setTab('quiz');
    focusConsole();
    setLoading('practice');
    setError('');
    setQuiz(emptyQuiz);

    try {
      const data = await postJson('/api/learning', {
        child: activeChild,
        topic: quest,
        mode: 'practice',
      });
      setQuiz({ ...emptyQuiz, questions: data.questions || [] });
      playSound('success');
    } catch (err) {
      setError(err.message);
      toastMessage(err.message, 'error');
      playSound('error');
    } finally {
      setLoading('');
    }
  }

  function selectQuestion(index) {
    if (index < 0 || index >= quiz.questions.length) return;
    setQuiz((previous) => ({ ...previous, index }));
    playSound('tap');
  }

  function updateDraft(value) {
    setQuiz((previous) => ({
      ...previous,
      drafts: { ...previous.drafts, [previous.index]: value },
    }));
  }

  async function runHint() {
    const index = quiz.index;
    const question = quiz.questions[index];
    if (!question) return;

    setLoading('hint');
    setError('');
    try {
      const data = await postJson('/api/learning', {
        child: activeChild,
        topic,
        mode: 'hint',
        question: question.prompt,
      });
      setQuiz((previous) => {
        const existing = previous.responses[index] || {};
        return {
          ...previous,
          responses: { ...previous.responses, [index]: { ...existing, hint: data } },
        };
      });
      playSound('pop');
    } catch (err) {
      setError(err.message);
      toastMessage(err.message, 'error');
      playSound('error');
    } finally {
      setLoading('');
    }
  }

  async function checkAnswer() {
    const index = quiz.index;
    const question = quiz.questions[index];
    const answer = (quiz.drafts[index] || '').trim();
    if (!question || !answer) {
      toastMessage('Give it a try first — even a tiny answer counts.', 'warn');
      playSound('error');
      return;
    }

    setLoading('feedback');
    setError('');
    try {
      const data = await postJson('/api/learning', {
        child: activeChild,
        topic,
        mode: 'feedback',
        question: question.prompt,
        answer,
      });

      const feedback = data.feedback || {};
      const score = feedback.score ?? 0;
      const starsEarned = data.award?.stars ?? starsFromScore(score);
      const xpEarned = data.award?.xp ?? xpFromScore(score);

      setQuiz((previous) => ({
        ...previous,
        combo: score >= 80 ? previous.combo + 1 : 0,
        sessionStars: previous.sessionStars + starsEarned,
        sessionXp: previous.sessionXp + xpEarned,
        responses: {
          ...previous.responses,
          [index]: { answer, feedback, starsEarned, xpEarned },
        },
      }));

      applyActivity({
        topic,
        performance: score / 100,
        starsDelta: starsEarned,
        xpDelta: xpEarned,
        quizCountDelta: 1,
        practiceCountDelta: 1,
        lastDifficulty: nextDifficulty(child.lastDifficulty, score / 100),
        masteredTopic: score >= 75 ? topic : undefined,
        struggleTopic: score < 55 ? topic : undefined,
        historyEntry: { kind: 'quiz', topic, score, question: question.prompt },
      });

      if (score >= 80) {
        playSound('success');
        celebrate(1800);
      } else {
        playSound('pop');
      }
    } catch (err) {
      setError(err.message);
      toastMessage(err.message, 'error');
      playSound('error');
    } finally {
      setLoading('');
    }
  }

  function finishDeck() {
    setQuiz((previous) => ({ ...previous, done: true }));
    playSound('levelUp');
    celebrate(2600);
  }

  function nextQuestion() {
    setQuiz((previous) => {
      const nextIndex = previous.index + 1;
      if (nextIndex < previous.questions.length) {
        return { ...previous, index: nextIndex };
      }
      const firstUnanswered = previous.questions.findIndex((_, index) => !previous.responses[index]);
      return { ...previous, index: firstUnanswered >= 0 ? firstUnanswered : previous.index };
    });
    playSound('tap');
  }

  async function runMission(topicOverride) {
    const quest = String(topicOverride ?? topic).trim();
    if (!quest) {
      toastMessage('Type a wonder first, or tap a topic chip.', 'warn');
      playSound('error');
      return;
    }
    if (topicOverride) setTopic(quest);

    playSound('tap');
    setTab('mission');
    focusConsole();
    setLoading('mission');
    setError('');

    try {
      const data = await postJson('/api/mission', { child: activeChild, subject: quest });
      setMission({
        data,
        checked: {},
        completed: false,
        startedAt: Date.now(),
        elapsed: 0,
      });
      setClock(Date.now());
      playSound('success');
    } catch (err) {
      setError(err.message);
      toastMessage(err.message, 'error');
      playSound('error');
    } finally {
      setLoading('');
    }
  }

  function toggleMissionStep(index) {
    setMission((previous) =>
      previous
        ? { ...previous, checked: { ...previous.checked, [index]: !previous.checked[index] } }
        : previous
    );
    playSound('tap');
  }

  function claimMission() {
    if (!mission) return;
    const steps = mission.data.steps || [];
    const complete = steps.length > 0 && steps.every((_, index) => Boolean(mission.checked[index]));
    if (!complete) {
      toastMessage('Check every step first — then the lab unlocks the reward.', 'warn');
      playSound('error');
      return;
    }

    const elapsedSeconds = Math.floor((Date.now() - mission.startedAt) / 1000);
    applyActivity({
      topic,
      starsDelta: 10,
      xpDelta: 50,
      missionsDoneDelta: 1,
      practiceCountDelta: 1,
      historyEntry: {
        kind: 'mission',
        topic,
        title: mission.data.title,
        minutes: Math.max(1, Math.round(elapsedSeconds / 60)),
      },
    });
    setMission((previous) => ({ ...previous, completed: true, elapsed: elapsedSeconds }));
    playSound('levelUp');
    celebrate(3000);
    toastMessage('Mission complete! +10 stars, +50 XP', 'success');
  }

  async function runStory(topicOverride) {
    const quest = String(topicOverride ?? topic).trim();
    if (!quest) {
      toastMessage('Type a wonder first, or tap a topic chip.', 'warn');
      playSound('error');
      return;
    }
    if (topicOverride) setTopic(quest);

    playSound('tap');
    setTab('story');
    focusConsole();
    setLoading('story');
    setError('');

    try {
      const data = await postJson('/api/story', { child: activeChild, theme: quest });
      const text = data.story || '';
      setStory({
        text,
        pages: splitStoryIntoPages(text),
        page: 0,
        rewarded: false,
        title: `The Secret of ${titleCase(quest)}`,
      });
      playSound('success');
    } catch (err) {
      setError(err.message);
      toastMessage(err.message, 'error');
      playSound('error');
    } finally {
      setLoading('');
    }
  }

  function finishStory() {
    if (!story || story.rewarded) return;
    applyActivity({
      topic,
      starsDelta: 2,
      xpDelta: 15,
      storiesReadDelta: 1,
      historyEntry: { kind: 'story', topic, title: story.title },
    });
    setStory((previous) => ({ ...previous, rewarded: true }));
    playSound('badge');
    celebrate(2000);
    toastMessage('Story complete! +2 stars, +15 XP', 'success');
  }

  async function runSummary({ open = false } = {}) {
    if (open) {
      setShowParent(true);
      setParentTab('overview');
    }
    setParentLoading(true);
    setError('');
    try {
      const data = await postJson('/api/learning', {
        child: activeChild,
        topic,
        mode: 'summary',
      });
      setSummary(data.summary || null);
      playSound('pop');
    } catch (err) {
      toastMessage(err.message, 'error');
      playSound('error');
    } finally {
      setParentLoading(false);
    }
  }

  function openParent() {
    setShowParent(true);
    setParentTab('overview');
    playSound('tap');
  }

  function setDailyGoal(goal) {
    const base = mergeState(stateRef.current);
    const next = mergeState({
      ...base,
      children: {
        ...base.children,
        [activeChild]: { ...base.children[activeChild], dailyGoal: goal },
      },
    });
    commit(next, { silent: true });
    playSound('pop');
  }

  function finishOnboarding() {
    try {
      window.localStorage.setItem('kgl:onboarded', '1');
    } catch {
      // Optional.
    }
    setOnboardingStep(-1);
    playSound('success');
  }

  async function exploreSpark() {
    if (loading) return;
    const quest = spark.topic;
    const question = spark.q;
    setTopic(quest);
    setTab('tutor');
    focusConsole();
    setLoading('chat');
    setError('');
    playSound('tap');

    const userMessage = { id: uid('msg'), role: 'user', content: question };
    setChat([userMessage]);

    try {
      const data = await postJson('/api/learning', {
        child: activeChild,
        topic: quest,
        mode: 'chat',
        messages: [{ role: 'user', content: question }],
      });
      const reply = data?.reply || 'That is a great question. Let me think of one more clue for you.';
      const message = { id: uid('msg'), role: 'assistant', content: reply };
      setChat((previous) => [...previous, message]);
      playSound('pop');
      if (voiceOn) speakText(reply, message.id);
    } catch (err) {
      setError(err.message);
      toastMessage(err.message, 'error');
      playSound('error');
    } finally {
      setLoading('');
    }
  }

  const actions = [
    { id: 'tutor', icon: '🧠', title: 'AI Tutor', desc: 'A patient explainer that talks like a friend.', onClick: () => runTutor(), color: '#8b5cf6', color2: '#22d3ee', loading: 'tutor' },
    { id: 'quiz', icon: '🎯', title: 'Brain Quiz', desc: 'Three adaptive questions. Instant coaching.', onClick: () => runPractice(), color: '#f59e0b', color2: '#fb7185', loading: 'practice' },
    { id: 'mission', icon: '🧪', title: 'Lab Mission', desc: 'A hands-on experiment for the real world.', onClick: () => runMission(), color: '#fb923c', color2: '#f43f5e', loading: 'mission' },
    { id: 'story', icon: '📖', title: 'Bedtime Story', desc: 'A cozy adventure built around your topic.', onClick: () => runStory(), color: '#ec4899', color2: '#a855f7', loading: 'story' },
    { id: 'spark', icon: '💫', title: 'Daily Spark', desc: 'One big question. One curious conversation.', onClick: exploreSpark, color: '#22d3ee', color2: '#34d399' },
    { id: 'parent', icon: '🛰️', title: 'Parent Zone', desc: 'Insights, activity, and lab controls.', onClick: openParent, color: '#34d399', color2: '#38bdf8' },
  ];

  return (
    <div
      className="app"
      data-child={activeChild}
      data-motion={reduceMotion ? 'off' : 'on'}
      style={{
        '--accent': profile.accent,
        '--accent-2': profile.accent2,
        '--accent-soft': profile.accentSoft,
      }}
    >
      <Starfield />
      {confetti && <Confetti />}

      <header className="topbar">
        <div className="topbar-inner">
          <a href="#top" className="brand" aria-label="Kid Genius Lab home">
            <span className="brand-mark">
              <LogoMark />
            </span>
            <span className="brand-word">
              Kid Genius <em>Lab</em>
            </span>
          </a>

          <div className="topbar-status">
            <span className={`status-pill ${aiOnline === null ? 'pending' : aiOnline ? 'online' : 'local'}`}>
              <i />
              {aiOnline === null ? 'Waking the AI core' : aiOnline ? 'AI core online' : 'Local brain ready'}
            </span>
            <span className="topbar-divider" />
            <span className="topbar-note">Parent-supervised · ages 4–9</span>
          </div>

          <div className="topbar-actions">
            <button
              type="button"
              className="icon-button"
              onClick={() => {
                const next = !soundOn;
                setSoundOn(next);
                setSoundEnabled(next);
                if (next) playSound('pop');
              }}
              aria-label={soundOn ? 'Mute sound' : 'Enable sound'}
              title={soundOn ? 'Mute sound' : 'Enable sound'}
            >
              {soundOn ? '🔊' : '🔇'}
            </button>
            <button type="button" className="streak-pill" onClick={openParent}>
              <span>🔥</span>
              {child.streakDays > 0 ? `${child.streakDays}-day streak` : 'Start a streak'}
            </button>
            <button type="button" className="parent-button" onClick={openParent}>
              <span className="parent-avatar">👤</span>
              <span>Parent zone</span>
            </button>
          </div>
        </div>
      </header>

      <main className="page" id="top">
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="eyebrow-line" />
              A PLAYGROUND FOR BIG QUESTIONS
            </div>
            <h1>
              Small questions.
              <br />
              <span className="serif">Wild</span> answers.
              <br />
              Real genius.
            </h1>
            <p className="hero-lede">
              Welcome back, <strong>{profile.name}</strong>. Pick a wonder and the lab turns it into a
              conversation, a challenge, a hands-on mission, or a story worth dreaming about.
            </p>

            <form
              className="composer"
              onSubmit={(event) => {
                event.preventDefault();
                runTutor();
              }}
            >
              <span className="composer-icon">🔭</span>
              <input
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                placeholder="What should we explore today?"
                aria-label="Learning topic"
              />
              <button type="submit" className="btn btn-primary composer-submit" disabled={Boolean(loading)}>
                {loading === 'tutor' ? <span className="spinner" /> : <>Start learning <span className="arrow">→</span></>}
              </button>
            </form>

            <div className="hero-chips">
              <span className="chips-label">TRY</span>
              {FEATURED_TOPICS.map((item) => (
                <button
                  type="button"
                  key={item.name}
                  className={`chip ${topic.toLowerCase() === item.name.toLowerCase() ? 'active' : ''}`}
                  onClick={() => handleTopic(item.name)}
                >
                  <span>{item.icon}</span> {item.name}
                </button>
              ))}
              <button type="button" className="chip chip-dice" onClick={surprise}>
                🎲 Surprise me
              </button>
            </div>

            <div className="hero-meta">
              <div>
                <strong>{child.stars}</strong>
                <span>genius stars</span>
              </div>
              <div>
                <strong>{child.quizCount}</strong>
                <span>quiz decks</span>
              </div>
              <div>
                <strong>{earnedBadges.length}/{badgeCatalog.length}</strong>
                <span>badges</span>
              </div>
              <div>
                <strong>🔥 {child.streakDays}</strong>
                <span>day streak</span>
              </div>
            </div>
          </div>

          <div className="hero-visual">
            <div className="spark-panel">
              <div className="spark-head">
                <span className="mono-label">TODAY&apos;S SPARK</span>
                <span className="spark-date">
                  {mounted ? new Date().toLocaleDateString([], { month: 'short', day: 'numeric' }) : '—'}
                </span>
              </div>

              <div className="orbital" aria-hidden="true">
                <span className="orbital-ring ring-a" />
                <span className="orbital-ring ring-b" />
                <span className="orbital-ring ring-c" />
                <span className="orbital-dot dot-a">✨</span>
                <span className="orbital-dot dot-b">🪐</span>
                <span className="orbital-dot dot-c">⭐</span>
                <span className="orbital-core">{profile.avatar}</span>
              </div>

              <div className="spark-speech">
                <span className="spark-name">{profile.name} · {progress.rank.name}</span>
                <p>“{mascotLines[mascotIndex]}”</p>
              </div>

              <div className="spark-question">
                <span className="spark-q-icon">{spark.emoji}</span>
                <div>
                  <small>Big question of the day</small>
                  <strong>{spark.q}</strong>
                </div>
              </div>

              <button type="button" className="btn btn-spark" onClick={exploreSpark} disabled={Boolean(loading)}>
                Explore this wonder <span>→</span>
              </button>

              <div className="streak-strip">
                <div className="streak-strip-head">
                  <span>This week</span>
                  <strong>{child.streakDays} day streak</strong>
                </div>
                <div className="streak-days">
                  {week.map((day) => {
                    const active = (activityByDay[day.key] || 0) > 0;
                    return (
                      <div key={day.key} className={`streak-day ${active ? 'active' : ''} ${day.isToday ? 'today' : ''}`}>
                        <span>{day.label}</span>
                        <i>{active ? '✓' : day.day}</i>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="marquee" aria-hidden="true">
          <div className="marquee-track">
            {[...wonderQuestions.slice(0, 10), ...wonderQuestions.slice(0, 10)].map((item, index) => (
              <span key={`${item.q}-${index}`}>
                {item.q} <i>✦</i>
              </span>
            ))}
          </div>
        </div>

        <section className="section crew-section">
          <SectionHead
            index="01"
            kicker="THE CREW"
            title="Who’s exploring today?"
            note="Progress saves separately for each explorer."
          />
          <div className="crew-grid">
            {CHILD_KEYS.map((key) => {
              const person = childProfiles[key];
              const personState = normalizeChild(state.children[key]);
              const personProgress = levelProgress(personState.xp || 0);
              return (
                <button
                  type="button"
                  key={key}
                  className={`crew-card ${activeChild === key ? 'is-active' : ''}`}
                  onClick={() => selectChild(key)}
                  style={{ '--crew-accent': person.accent, '--crew-accent-2': person.accent2 }}
                >
                  <span className="crew-orb">
                    {person.avatar}
                    <span className="crew-ring" />
                  </span>
                  <span className="crew-body">
                    <span className="crew-top">
                      <strong>{person.name}</strong>
                      <span className="crew-level">LV {personProgress.level}</span>
                    </span>
                    <span className="crew-tag">{person.tag}</span>
                    <span className="crew-bar">
                      <i style={{ width: `${personProgress.percent}%` }} />
                    </span>
                    <span className="crew-stats">
                      ⭐ {personState.stars} · 🔥 {personState.streakDays} · {personProgress.rank.name}
                    </span>
                  </span>
                  <span className="crew-action">{activeChild === key ? 'In the lab' : 'Switch'}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="section dock-section">
          <SectionHead
            index="02"
            kicker="PICK A PATH"
            title="Six ways to grow a brain."
            note="Every path earns stars, XP, and badges."
          />
          <div className="dock-grid">
            {actions.map((action, index) => (
              <button
                type="button"
                key={action.id}
                className={`dock-card ${loading === action.loading ? 'is-loading' : ''}`}
                onClick={action.onClick}
                disabled={Boolean(loading)}
                style={{ '--tile': action.color, '--tile-2': action.color2 }}
              >
                <span className="dock-number">{String(index + 1).padStart(2, '0')}</span>
                <span className="dock-icon">{action.icon}</span>
                <span className="dock-title">{action.title}</span>
                <span className="dock-desc">{action.desc}</span>
                <span className="dock-arrow">↗</span>
              </button>
            ))}
          </div>
        </section>

        <section className="section workspace" id="lab">
          <div className="console-shell" ref={consoleRef}>
            <div className="console-top">
              <div className="console-title">
                <span className="mono-label">LIVE WORKSPACE</span>
                <h2>{TAB_META[tab].title}</h2>
                <p>{TAB_META[tab].sub}</p>
              </div>
              <div className="tab-bar" role="tablist" aria-label="Lab workspace">
                {TABS.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    role="tab"
                    aria-selected={tab === item.id}
                    className={`tab ${tab === item.id ? 'active' : ''}`}
                    onClick={() => {
                      setTab(item.id);
                      playSound('tap');
                    }}
                  >
                    <span>{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="console-body">
              {error && (
                <div className="alert" role="alert">
                  <span>⚠️</span>
                  <p>{error}</p>
                  <button type="button" onClick={() => setError('')} aria-label="Dismiss error">✕</button>
                </div>
              )}

              {loading && (
                <div className="loading-bar" role="status">
                  <span className="spinner" />
                  {LOADING_COPY[loading] || 'Powering up the lab...'}
                </div>
              )}

              {tab === 'tutor' && (
                <TutorPanel
                  chat={chat}
                  profile={profile}
                  topic={topic}
                  chatInput={chatInput}
                  setChatInput={setChatInput}
                  onSend={sendChat}
                  onStart={() => runTutor()}
                  loading={loading === 'tutor' || loading === 'chat'}
                  onRead={toggleRead}
                  speakingId={speakingId}
                  onListen={startListening}
                  listening={listening}
                  voiceOn={voiceOn}
                />
              )}

              {tab === 'quiz' && (
                <QuizPanel
                  quiz={quiz}
                  topic={topic}
                  loading={['practice', 'feedback', 'hint'].includes(loading)}
                  onBuild={() => runPractice()}
                  onSelect={selectQuestion}
                  onDraft={updateDraft}
                  onCheck={checkAnswer}
                  onHint={runHint}
                  onFinish={finishDeck}
                  onNew={() => runPractice()}
                  onNext={nextQuestion}
                  onListen={startListening}
                  listening={listening}
                  onRead={toggleRead}
                  speakingId={speakingId}
                  onStory={() => runStory()}
                />
              )}

              {tab === 'mission' && (
                <MissionPanel
                  mission={mission}
                  topic={topic}
                  elapsed={elapsed}
                  loading={loading === 'mission'}
                  onBuild={() => runMission()}
                  onToggle={toggleMissionStep}
                  onClaim={claimMission}
                  onNew={() => runMission()}
                  onRead={toggleRead}
                  speakingId={speakingId}
                />
              )}

              {tab === 'story' && (
                <StoryPanel
                  story={story}
                  topic={topic}
                  loading={loading === 'story'}
                  onBuild={() => runStory()}
                  onPage={(page) =>
                    setStory((previous) =>
                      previous
                        ? { ...previous, page: Math.max(0, Math.min(previous.pages.length - 1, page)) }
                        : previous
                    )
                  }
                  onRead={toggleRead}
                  speakingId={speakingId}
                  onFinish={finishStory}
                />
              )}
            </div>
          </div>

          <aside className="rail">
            <LevelCard child={child} progress={progress} />
            <DailyGoalCard
              child={child}
              onQuiz={() => runPractice()}
              onMission={() => runMission()}
            />
            <BadgeCabinet child={child} earned={earnedBadges} />
            <TopicPulse child={child} />
            <InsightCard
              summary={summary}
              loading={parentLoading}
              onRefresh={() => runSummary()}
              onOpen={openParent}
            />
          </aside>
        </section>

        <footer className="footer">
          <div className="footer-brand">
            <LogoMark />
            <span>Kid Genius Lab</span>
          </div>
          <p>Built for big questions, brave answers, and grown-up supervision.</p>
          <div className="footer-links">
            <button type="button" onClick={openParent}>Parent zone</button>
            <span>·</span>
            <a href="/api/health" target="_blank" rel="noreferrer">System health</a>
          </div>
        </footer>
      </main>

      {showParent && (
        <ParentModal
          tab={parentTab}
          setTab={setParentTab}
          onClose={() => setShowParent(false)}
          child={child}
          profile={profile}
          summary={summary}
          onSummary={() => runSummary()}
          loading={parentLoading}
          history={childHistory}
          soundOn={soundOn}
          setSoundOn={setSoundOn}
          voiceOn={voiceOn}
          setVoiceOn={setVoiceOn}
          reduceMotion={reduceMotion}
          setReduceMotion={setReduceMotion}
          dailyGoal={child.dailyGoal}
          onDailyGoal={setDailyGoal}
        />
      )}

      {levelUp && <LevelUpModal data={levelUp} onClose={() => setLevelUp(null)} />}
      {badgeToast && <BadgeToast badge={badgeToast} onClose={() => setBadgeToast(null)} />}
      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
      {onboardingStep >= 0 && (
        <Onboarding step={onboardingStep} setStep={setOnboardingStep} onFinish={finishOnboarding} />
      )}
    </div>
  );
}

function Starfield() {
  const stars = Array.from({ length: 84 }, (_, index) => ({
    left: (index * 47 + 13) % 100,
    top: (index * 71 + 7) % 100,
    size: 1 + (index % 3),
    delay: (index % 9) * 0.6,
    duration: 3 + (index % 6),
  }));

  return (
    <div className="cosmos" aria-hidden="true">
      <div className="aurora aurora-a" />
      <div className="aurora aurora-b" />
      <div className="starfield">
        {stars.map((star, index) => (
          <span
            key={index}
            className="star"
            style={{
              left: `${star.left}%`,
              top: `${star.top}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              animationDelay: `${star.delay}s`,
              animationDuration: `${star.duration}s`,
            }}
          />
        ))}
      </div>
      <div className="grain" />
    </div>
  );
}

function LogoMark() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <defs>
        <linearGradient id="logoPlanet" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--accent)" />
          <stop offset="1" stopColor="var(--accent-2)" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="10" fill="url(#logoPlanet)" />
      <ellipse
        cx="24"
        cy="24"
        rx="19"
        ry="6.5"
        fill="none"
        stroke="url(#logoPlanet)"
        strokeWidth="2"
        transform="rotate(-20 24 24)"
      />
      <circle cx="39" cy="12" r="1.8" fill="#fbbf24" />
      <circle cx="9" cy="34" r="1.3" fill="#67e8f9" />
    </svg>
  );
}

function SectionHead({ index, kicker, title, note }) {
  return (
    <div className="section-head">
      <div className="section-head-left">
        <span className="section-index">{index}</span>
        <div>
          <span className="mono-label">{kicker}</span>
          <h2>{title}</h2>
        </div>
      </div>
      {note && <p className="section-note">{note}</p>}
    </div>
  );
}

function TutorPanel({
  chat,
  profile,
  topic,
  chatInput,
  setChatInput,
  onSend,
  onStart,
  loading,
  onRead,
  speakingId,
  onListen,
  listening,
  voiceOn,
}) {
  const streamRef = useRef(null);
  const lastAssistantRef = useRef(null);
  const lastMessage = chat[chat.length - 1];
  const lastRole = lastMessage?.role || null;

  useEffect(() => {
    const stream = streamRef.current;
    if (!stream) return;

    if (loading) {
      stream.scrollTo({ top: stream.scrollHeight, behavior: 'smooth' });
      return;
    }

    const target = lastRole === 'assistant' ? lastAssistantRef.current : null;
    if (target) {
      const streamTop = stream.getBoundingClientRect().top;
      const targetTop = target.getBoundingClientRect().top;
      stream.scrollTo({
        top: Math.max(0, targetTop - streamTop + stream.scrollTop - 8),
        behavior: 'smooth',
      });
    } else {
      stream.scrollTo({ top: stream.scrollHeight, behavior: 'smooth' });
    }
  }, [chat.length, lastRole, loading]);

  if (!chat.length) {
    return (
      <div className="empty-panel tutor-empty">
        <div className="empty-orb">{profile.avatar}</div>
        <span className="mono-label">AI LAB PARTNER</span>
        <h3>Ask {profile.name}’s tutor anything.</h3>
        <p>
          Start with one wonder. The tutor explains it with real examples, a wild analogy, three easy
          steps, and a tiny challenge to lock it in.
        </p>
        <div className="starter-grid">
          {['What is it?', 'Why does it matter?', 'Show me an example'].map((label) => (
            <button
              type="button"
              key={label}
              className="starter-card"
              onClick={() => onSend(label)}
              disabled={loading}
            >
              <span>✨</span>
              {label}
            </button>
          ))}
        </div>
        <button type="button" className="btn btn-primary" onClick={onStart} disabled={loading}>
          🚀 Start with “{topic}”
        </button>
      </div>
    );
  }

  return (
    <div className="chat-panel">
      <div className="chat-toolbar">
        <span className="topic-pill">🔭 {topic}</span>
        <div className="chat-tools">
          {voiceOn && <span className="voice-on">🔈 auto-read on</span>}
          <button type="button" className="mini-btn" onClick={onStart} disabled={loading}>
            ↻ New lesson
          </button>
        </div>
      </div>

      <div className="chat-stream" ref={streamRef}>
        {chat.map((message) =>
          message.role === 'assistant' ? (
            <div
              key={message.id}
              className="chat-row assistant"
              ref={message.role === 'assistant' ? lastAssistantRef : null}
            >
              <span className="chat-avatar">{profile.avatar}</span>
              <div className="chat-bubble">
                {message.kind === 'tutor' && message.data ? (
                  <>
                    <p>{message.data.answer}</p>
                    {message.data.analogy && (
                      <div className="callout">
                        <span>💡</span>
                        <div>
                          <strong>Wild analogy</strong>
                          <p>{message.data.analogy}</p>
                        </div>
                      </div>
                    )}
                    {message.data.steps?.length > 0 && (
                      <div className="mini-steps">
                        <strong>3 easy steps</strong>
                        <ol>
                          {message.data.steps.map((step, index) => (
                            <li key={index}>{step}</li>
                          ))}
                        </ol>
                      </div>
                    )}
                    {message.data.encouragement && <p className="encouragement">{message.data.encouragement}</p>}
                  </>
                ) : (
                  <p>{message.content}</p>
                )}
                <div className="bubble-tools">
                  <button
                    type="button"
                    className="bubble-tool"
                    onClick={() => onRead(flattenAssistantMessage(message), message.id)}
                  >
                    {speakingId === message.id ? '⏹ Stop' : '🔈 Read aloud'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div key={message.id} className="chat-row user">
              <div className="chat-bubble">{message.content}</div>
            </div>
          )
        )}

        {loading && (
          <div className="chat-row assistant">
            <span className="chat-avatar">{profile.avatar}</span>
            <div className="chat-bubble typing" aria-label="Tutor is thinking">
              <i />
              <i />
              <i />
            </div>
          </div>
        )}
      </div>

      <div className="quick-prompts">
        {QUICK_PROMPTS.map((prompt) => (
          <button type="button" key={prompt} className="chip" onClick={() => onSend(prompt)} disabled={loading}>
            {prompt}
          </button>
        ))}
      </div>

      <form
        className="chat-composer"
        onSubmit={(event) => {
          event.preventDefault();
          onSend();
        }}
      >
        <input
          value={chatInput}
          onChange={(event) => setChatInput(event.target.value)}
          placeholder={`Ask a follow-up about ${topic}...`}
          aria-label="Ask the tutor a follow-up question"
        />
        <button
          type="button"
          className={`mic-btn ${listening === 'chat' ? 'listening' : ''}`}
          onClick={() => onListen('chat')}
          aria-label="Talk instead of typing"
          title="Talk instead of typing"
        >
          🎙️
        </button>
        <button type="submit" className="send-btn" disabled={!chatInput.trim() || loading} aria-label="Send message">
          →
        </button>
      </form>
    </div>
  );
}

function QuizPanel({
  quiz,
  topic,
  loading,
  onBuild,
  onSelect,
  onDraft,
  onCheck,
  onHint,
  onFinish,
  onNew,
  onNext,
  onListen,
  listening,
  onRead,
  speakingId,
  onStory,
}) {
  if (!quiz.questions.length) {
    return (
      <div className="empty-panel quiz-empty">
        <div className="empty-orb">🎯</div>
        <span className="mono-label">ADAPTIVE QUIZ ARENA</span>
        <h3>Three questions. Real coaching.</h3>
        <p>
          The lab builds a fresh deck around your topic and adapts the difficulty as you go. Answers
          can be typed or spoken — perfect sentences are not required.
        </p>
        <button type="button" className="btn btn-primary" onClick={onBuild} disabled={loading}>
          ⚡ Build my quiz deck
        </button>
      </div>
    );
  }

  if (quiz.done) {
    return <QuizResults quiz={quiz} topic={topic} onNew={onNew} onStory={onStory} />;
  }

  const question = quiz.questions[quiz.index];
  const response = quiz.responses[quiz.index];
  const draft = quiz.drafts[quiz.index] || '';

  return (
    <div className="quiz-panel">
      <div className="quiz-head">
        <div className="quiz-progress">
          <span className="mono-label">DECK PROGRESS</span>
          <div className="quiz-dots">
            {quiz.questions.map((_, index) => (
              <span
                key={index}
                className={`quiz-dot ${quiz.responses[index] ? 'done' : ''} ${index === quiz.index ? 'current' : ''}`}
              />
            ))}
          </div>
        </div>
        <div className="quiz-stats">
          <span className="combo-pill">🔥 {quiz.combo} combo</span>
          <span className="star-pill">⭐ {quiz.sessionStars} earned</span>
        </div>
      </div>

      <div className="question-card">
        <div className="question-top">
          <span className={`difficulty ${question.difficulty || 'medium'}`}>{question.difficulty || 'medium'}</span>
          <span className="question-count">
            Question {quiz.index + 1} / {quiz.questions.length}
          </span>
        </div>
        <h3>{question.prompt}</h3>
        {question.support && <p className="question-support">{question.support}</p>}
      </div>

      {response?.hint && (
        <div className="hint-card">
          <span>💡</span>
          <div>
            <strong>Mascot clue</strong>
            <p>{response.hint.hint}</p>
            <small>Next: {response.hint.nextStep}</small>
          </div>
        </div>
      )}

      {response?.feedback ? (
        <FeedbackCard
          feedback={response.feedback}
          stars={response.starsEarned}
          xp={response.xpEarned}
          onNext={onNext}
          isLast={quiz.index === quiz.questions.length - 1}
          all={quiz.questions.every((_, index) => Boolean(quiz.responses[index]))}
          onFinish={onFinish}
        />
      ) : (
        <>
          <div className="answer-box">
            <textarea
              value={draft}
              onChange={(event) => onDraft(event.target.value)}
              placeholder={`Explain ${topic} in your own words...`}
              rows={4}
              aria-label="Your answer"
            />
            <div className="answer-tools">
              <button
                type="button"
                className={`mic-btn ${listening === 'quiz' ? 'listening' : ''}`}
                onClick={() => onListen('quiz')}
              >
                🎙️ <span>{listening === 'quiz' ? 'Listening...' : 'Speak'}</span>
              </button>
              <span className="answer-hint">No perfect words needed — just your best thinking.</span>
            </div>
          </div>

          <div className="starter-row">
            <span>Start with</span>
            {STARTERS.map((starter) => (
              <button
                type="button"
                key={starter}
                className="chip"
                onClick={() => onDraft(`${draft} ${starter}`.trim())}
              >
                {starter}
              </button>
            ))}
          </div>

          <div className="quiz-actions">
            <button type="button" className="btn btn-ghost" onClick={onHint} disabled={loading}>
              💡 Ask for a hint
            </button>
            <button type="button" className="btn btn-primary" onClick={onCheck} disabled={loading || !draft.trim()}>
              {loading ? 'Checking...' : 'Check my answer →'}
            </button>
          </div>
        </>
      )}

      <div className="quiz-nav">
        <button type="button" className="mini-btn" onClick={() => onSelect(quiz.index - 1)} disabled={quiz.index === 0}>
          ← Previous
        </button>
        <div className="quiz-pills">
          {quiz.questions.map((_, index) => (
            <button
              type="button"
              key={index}
              className={`quiz-pill ${index === quiz.index ? 'active' : ''} ${quiz.responses[index] ? 'done' : ''}`}
              onClick={() => onSelect(index)}
            >
              Q{index + 1}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="mini-btn"
          onClick={() => onSelect(quiz.index + 1)}
          disabled={quiz.index === quiz.questions.length - 1}
        >
          Next →
        </button>
      </div>
    </div>
  );
}

function FeedbackCard({ feedback, stars, xp, onNext, isLast, all, onFinish }) {
  const score = feedback.score || 0;
  return (
    <div className={`feedback-card ${score >= 80 ? 'great' : score >= 55 ? 'good' : 'grow'}`}>
      <div className="feedback-top">
        <ScoreRing value={score} />
        <div className="feedback-copy">
          <span className="mono-label">
            {score >= 80 ? 'SPARK CONFIRMED' : score >= 55 ? 'GOOD THINKING' : 'BRAVE ATTEMPT'}
          </span>
          <h4>
            {score >= 80
              ? 'That answer has lift-off.'
              : score >= 55
                ? 'You’re close — add one detail.'
                : 'Every scientist starts here.'}
          </h4>
          <p>{feedback.summary}</p>
        </div>
        <div className="reward-pills">
          <span>⭐ +{stars}</span>
          <span>⚡ +{xp} XP</span>
        </div>
      </div>

      <div className="feedback-grid">
        <div>
          <strong>What worked</strong>
          <p>{feedback.whatWentWell}</p>
        </div>
        <div>
          <strong>Try next</strong>
          <p>{feedback.whatToTryNext}</p>
        </div>
      </div>

      <p className="feedback-quote">“{feedback.encouragement}”</p>

      <div className="feedback-actions">
        {isLast && all ? (
          <button type="button" className="btn btn-primary" onClick={onFinish}>
            See my deck results →
          </button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={onNext}>
            {isLast ? 'Review unanswered →' : 'Next question →'}
          </button>
        )}
      </div>
    </div>
  );
}

function QuizResults({ quiz, topic, onNew, onStory }) {
  const scores = Object.values(quiz.responses).map((response) => response.feedback?.score || 0);
  const average = scores.length ? Math.round(scores.reduce((total, score) => total + score, 0) / scores.length) : 0;

  return (
    <div className="results-card">
      <span className="results-burst">🎉</span>
      <span className="mono-label">DECK COMPLETE</span>
      <h3>{average >= 80 ? 'Genius level unlocked.' : average >= 55 ? 'Strong thinking.' : 'Brave start.'}</h3>
      <p>
        You explored <strong>{topic}</strong> with {scores.length} answers and kept your brain moving.
      </p>
      <div className="results-grid">
        <div>
          <strong>{average}</strong>
          <span>average score</span>
        </div>
        <div>
          <strong>⭐ {quiz.sessionStars}</strong>
          <span>stars earned</span>
        </div>
        <div>
          <strong>⚡ {quiz.sessionXp}</strong>
          <span>XP earned</span>
        </div>
        <div>
          <strong>🔥 {quiz.combo}</strong>
          <span>final combo</span>
        </div>
      </div>
      <div className="results-actions">
        <button type="button" className="btn btn-primary" onClick={onNew}>
          Build a new deck →
        </button>
        <button type="button" className="btn btn-ghost" onClick={onStory}>
          Read a story instead
        </button>
      </div>
    </div>
  );
}

function MissionPanel({ mission, topic, elapsed, loading, onBuild, onToggle, onClaim, onNew, onRead, speakingId }) {
  if (!mission) {
    return (
      <div className="empty-panel mission-empty">
        <div className="empty-orb">🧪</div>
        <span className="mono-label">HANDS-ON MISSION BOARD</span>
        <h3>Turn curiosity into action.</h3>
        <p>
          The lab writes a parent-led experiment around your topic. Gather a few everyday things, follow
          the steps, and claim a big reward when the mission is complete.
        </p>
        <button type="button" className="btn btn-primary" onClick={onBuild} disabled={loading}>
          📐 Create a lab mission
        </button>
      </div>
    );
  }

  if (mission.completed) {
    return (
      <div className="mission-complete">
        <span className="complete-trophy">🏆</span>
        <span className="mono-label">MISSION COMPLETE</span>
        <h3>{mission.data.title}</h3>
        <p>You turned curiosity into action. That’s what real scientists do.</p>
        <div className="mission-complete-stats">
          <div>
            <strong>⭐ 10</strong>
            <span>stars</span>
          </div>
          <div>
            <strong>⚡ 50</strong>
            <span>XP</span>
          </div>
          <div>
            <strong>{formatElapsed(mission.elapsed)}</strong>
            <span>lab time</span>
          </div>
        </div>
        <button type="button" className="btn btn-primary" onClick={onNew}>
          Start another mission →
        </button>
      </div>
    );
  }

  const steps = mission.data.steps || [];
  const checked = Object.values(mission.checked).filter(Boolean).length;
  const percent = steps.length ? Math.round((checked / steps.length) * 100) : 0;

  return (
    <div className="mission-panel">
      <div className="mission-head">
        <div>
          <span className="mono-label">HANDS-ON BLUEPRINT</span>
          <h3>{mission.data.title}</h3>
          <p>{mission.data.summary}</p>
        </div>
        <ProgressRing value={percent} size={104} stroke={8} label={`${checked}/${steps.length}`} sub="steps" />
      </div>

      <div className="mission-meta">
        <span>⏱ {formatElapsed(elapsed)}</span>
        <span>🧪 {steps.length} steps</span>
        <span>⭐ 10 stars</span>
        <span>⚡ 50 XP</span>
      </div>

      <div className="mission-steps">
        {steps.map((step, index) => (
          <button
            type="button"
            key={index}
            className={`mission-step ${mission.checked[index] ? 'checked' : ''}`}
            onClick={() => onToggle(index)}
          >
            <span className="step-node">{mission.checked[index] ? '✓' : index + 1}</span>
            <span className="step-text">{step}</span>
          </button>
        ))}
      </div>

      <div className="mission-reward">
        <span>🎁</span>
        <div>
          <strong>Mission reward</strong>
          <p>{mission.data.reward || '10 genius stars + 50 XP'}</p>
        </div>
      </div>

      <button type="button" className="btn btn-primary mission-claim" onClick={onClaim} disabled={checked < steps.length}>
        {checked < steps.length ? `Check all ${steps.length} steps to claim` : 'Claim mission reward →'}
      </button>

      <button
        type="button"
        className="text-link mission-read"
        onClick={() => onRead(`${mission.data.summary}. Steps: ${steps.join('. ')}`, 'mission')}
      >
        {speakingId === 'mission' ? '⏹ Stop reading' : '🔈 Read the mission aloud'}
      </button>
    </div>
  );
}

function StoryPanel({ story, topic, loading, onBuild, onPage, onRead, speakingId, onFinish }) {
  if (!story) {
    return (
      <div className="empty-panel story-empty">
        <div className="empty-orb">📖</div>
        <span className="mono-label">BEDTIME STORYBOOK</span>
        <h3>Wonder, then dream.</h3>
        <p>
          A cozy story written around your topic — perfect for winding down while making the learning
          stick. Read it page by page, or let the lab read it to you.
        </p>
        <button type="button" className="btn btn-primary" onClick={onBuild} disabled={loading}>
          ✍ Write my cozy story
        </button>
      </div>
    );
  }

  const page = story.pages[story.page] || '';
  const lastPage = story.page >= story.pages.length - 1;
  const paragraphs = page.split('\n\n');

  return (
    <div className="story-panel">
      <div className="story-head">
        <div>
          <span className="mono-label">A COZY ADVENTURE</span>
          <h3>{story.title}</h3>
        </div>
        <span className="story-page-count">
          Page {story.page + 1} of {story.pages.length}
        </span>
      </div>

      <div className="story-paper">
        <div className="story-paper-top">
          <span>✦</span>
          <span>{topic}</span>
          <span>✦</span>
        </div>
        <p className="story-text">
          {paragraphs.map((paragraph, index) => (
            <span key={index} className={index === 0 && story.page === 0 ? 'drop-cap' : ''}>
              {paragraph}
              {index < paragraphs.length - 1 ? (
                <>
                  <br />
                  <br />
                </>
              ) : null}
            </span>
          ))}
        </p>
        <div className="story-paper-foot">
          <span>Kid Genius Lab</span>
          <span>{story.page + 1}</span>
        </div>
      </div>

      <div className="story-controls">
        <button type="button" className="mini-btn" onClick={() => onPage(story.page - 1)} disabled={story.page === 0}>
          ← Back
        </button>
        <div className="story-dots">
          {story.pages.map((_, index) => (
            <button
              type="button"
              key={index}
              className={index === story.page ? 'active' : ''}
              onClick={() => onPage(index)}
              aria-label={`Page ${index + 1}`}
            />
          ))}
        </div>
        <button type="button" className="mini-btn" onClick={() => onRead(page, `story-${story.page}`)}>
          {speakingId === `story-${story.page}` ? '⏹ Stop' : '🔈 Read page'}
        </button>
        {lastPage ? (
          <button type="button" className="btn btn-primary" onClick={onFinish} disabled={story.rewarded}>
            {story.rewarded ? '✓ Story complete' : 'Finish story +2 ⭐'}
          </button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={() => onPage(story.page + 1)}>
            Next page →
          </button>
        )}
      </div>
    </div>
  );
}

function ProgressRing({ value = 0, size = 96, stroke = 8, label, sub }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = circumference * (Math.min(100, Math.max(0, value)) / 100);

  return (
    <div className="progress-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <defs>
          <linearGradient id="progressGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--accent)" />
            <stop offset="1" stopColor="var(--accent-2)" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#progressGradient)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="ring-label">
        <strong>{label}</strong>
        {sub && <span>{sub}</span>}
      </div>
    </div>
  );
}

function ScoreRing({ value = 0 }) {
  const size = 92;
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = circumference * (Math.min(100, Math.max(0, value)) / 100);

  return (
    <div className="score-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <defs>
          <linearGradient id="scoreGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fbbf24" />
            <stop offset="1" stopColor="#34d399" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#scoreGradient)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <strong>{value}</strong>
      <span>score</span>
    </div>
  );
}

function LevelCard({ child, progress }) {
  return (
    <div className="rail-card level-card">
      <div className="rail-card-head">
        <span className="mono-label">GENIUS LEVEL</span>
        <span className="level-rank">{progress.rank.icon} {progress.rank.name}</span>
      </div>
      <div className="level-main">
        <ProgressRing value={progress.percent} size={112} stroke={9} label={`LV ${progress.level}`} sub="level" />
        <div className="level-copy">
          <strong>{child.xp} XP</strong>
          <span>{progress.remaining} XP to Level {progress.level + 1}</span>
          <div className="mini-bar">
            <i style={{ width: `${progress.percent}%` }} />
          </div>
        </div>
      </div>
      <div className="level-next">
        {progress.nextRank ? (
          <>Next rank: <strong>{progress.nextRank.name}</strong> at Level {progress.nextRank.min}</>
        ) : (
          'Top rank reached. Keep exploring!'
        )}
      </div>
      <div className="rail-stats">
        <div><strong>{child.stars}</strong><span>Stars</span></div>
        <div><strong>{child.quizCount}</strong><span>Quiz decks</span></div>
        <div><strong>{child.missionsDone}</strong><span>Missions</span></div>
        <div><strong>{child.storiesRead}</strong><span>Stories</span></div>
      </div>
    </div>
  );
}

function DailyGoalCard({ child, onQuiz, onMission }) {
  const percent = child.dailyGoal ? Math.min(100, Math.round((child.dailyStars / child.dailyGoal) * 100)) : 0;
  return (
    <div className="rail-card goal-card">
      <div className="rail-card-head">
        <span className="mono-label">TODAY&apos;S GOAL</span>
        <span className="goal-count">{child.dailyStars}/{child.dailyGoal}</span>
      </div>
      <div className="goal-bar">
        <i style={{ width: `${percent}%` }} />
      </div>
      <p>
        {child.dailyStars >= child.dailyGoal
          ? 'Goal smashed. Bonus curiosity unlocked!'
          : `Earn ${Math.max(0, child.dailyGoal - child.dailyStars)} more stars today.`}
      </p>
      <div className="goal-actions">
        <button type="button" className="mini-btn" onClick={onQuiz}>🎯 Quick quiz</button>
        <button type="button" className="mini-btn" onClick={onMission}>🧪 Mission</button>
      </div>
    </div>
  );
}

function BadgeCabinet({ child, earned }) {
  return (
    <div className="rail-card badge-card">
      <div className="rail-card-head">
        <span className="mono-label">BADGE CABINET</span>
        <span>{earned.length}/{badgeCatalog.length}</span>
      </div>
      <div className="badge-grid">
        {badgeCatalog.map((badge) => {
          const unlocked = badge.check(child);
          return (
            <div key={badge.id} className={`badge ${unlocked ? 'earned' : 'locked'}`} title={badge.requirement}>
              <span>{unlocked ? badge.icon : '🔒'}</span>
              <small>{badge.name}</small>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TopicPulse({ child }) {
  return (
    <div className="rail-card topic-card">
      <div className="rail-card-head">
        <span className="mono-label">TOPIC PULSE</span>
      </div>
      <div className="pulse-row">
        <span className="pulse-label">Mastered</span>
        <div className="pulse-chips">
          {child.masteredTopics.length ? (
            child.masteredTopics.map((topic) => (
              <span key={topic} className="mini-chip green">🏆 {topic}</span>
            ))
          ) : (
            <em>Score 75+ to master a topic</em>
          )}
        </div>
      </div>
      <div className="pulse-row">
        <span className="pulse-label">Needs work</span>
        <div className="pulse-chips">
          {child.struggleTopics.length ? (
            child.struggleTopics.map((topic) => (
              <span key={topic} className="mini-chip orange">💡 {topic}</span>
            ))
          ) : (
            <em>No struggle spots logged yet</em>
          )}
        </div>
      </div>
      <div className="pulse-row">
        <span className="pulse-label">Recent</span>
        <div className="pulse-chips">
          {child.recentTopics.length ? (
            child.recentTopics.map((topic) => (
              <span key={topic} className="mini-chip violet">{topic}</span>
            ))
          ) : (
            <em>Start a path to fill this list</em>
          )}
        </div>
      </div>
    </div>
  );
}

function InsightCard({ summary, loading, onRefresh, onOpen }) {
  return (
    <div className="rail-card insight-card">
      <div className="rail-card-head">
        <span className="mono-label">PARENT INSIGHT</span>
        <button type="button" className="mini-btn" onClick={onRefresh} disabled={loading}>
          {loading ? '...' : 'Refresh'}
        </button>
      </div>
      {summary ? (
        <>
          <p>{summary.parentNote}</p>
          <div className="insight-tags">
            {(summary.improvedOn || []).slice(0, 3).map((topic) => (
              <span key={topic} className="mini-chip green">{topic}</span>
            ))}
            {(summary.struggledWith || []).slice(0, 2).map((topic) => (
              <span key={topic} className="mini-chip orange">{topic}</span>
            ))}
          </div>
        </>
      ) : (
        <p className="muted">
          Generate a quick coaching note from the lab data — what clicked, what needs another pass, and
          one conversation starter for today.
        </p>
      )}
      <button type="button" className="text-link" onClick={onOpen}>
        Open parent zone →
      </button>
    </div>
  );
}

function ParentModal({
  tab,
  setTab,
  onClose,
  child,
  profile,
  summary,
  onSummary,
  loading,
  history,
  soundOn,
  setSoundOn,
  voiceOn,
  setVoiceOn,
  reduceMotion,
  setReduceMotion,
  dailyGoal,
  onDailyGoal,
}) {
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal parent-modal" role="dialog" aria-modal="true" aria-label="Parent zone">
        <div className="modal-head">
          <div>
            <span className="mono-label">GROWN-UP VIEW</span>
            <h2>Parent Zone</h2>
            <p>{profile.name}’s lab notebook, insights, and controls.</p>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close parent zone">✕</button>
        </div>

        <div className="modal-tabs">
          {['overview', 'activity', 'settings'].map((item) => (
            <button
              type="button"
              key={item}
              className={tab === item ? 'active' : ''}
              onClick={() => setTab(item)}
            >
              {item}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <ParentOverview
            child={child}
            profile={profile}
            summary={summary}
            onSummary={onSummary}
            loading={loading}
          />
        )}
        {tab === 'activity' && <ParentActivity history={history} profile={profile} />}
        {tab === 'settings' && (
          <ParentSettings
            soundOn={soundOn}
            setSoundOn={setSoundOn}
            voiceOn={voiceOn}
            setVoiceOn={setVoiceOn}
            reduceMotion={reduceMotion}
            setReduceMotion={setReduceMotion}
            dailyGoal={dailyGoal}
            onDailyGoal={onDailyGoal}
          />
        )}
      </div>
    </div>
  );
}

function ParentOverview({ child, profile, summary, onSummary, loading }) {
  return (
    <div className="parent-overview">
      <div className="parent-stats">
        <div><strong>{child.stars}</strong><span>stars</span></div>
        <div><strong>LV {child.level}</strong><span>level</span></div>
        <div><strong>{child.quizCount}</strong><span>quiz decks</span></div>
        <div><strong>{child.missionsDone}</strong><span>missions</span></div>
        <div><strong>{child.storiesRead}</strong><span>stories</span></div>
        <div><strong>🔥 {child.streakDays}</strong><span>day streak</span></div>
      </div>

      <div className="insight-panel">
        <div className="insight-panel-head">
          <div>
            <span className="mono-label">AI COACHING NOTE</span>
            <h3>What {profile.name} is showing us</h3>
          </div>
          <button type="button" className="mini-btn" onClick={onSummary} disabled={loading}>
            {loading ? 'Thinking...' : 'Refresh insight'}
          </button>
        </div>

        {summary ? (
          <>
            <p className="insight-note">{summary.parentNote}</p>
            <div className="insight-lists">
              <div>
                <strong>Practiced</strong>
                <div className="pulse-chips">
                  {(summary.practiced || []).map((topic) => (
                    <span key={topic} className="mini-chip violet">{topic}</span>
                  ))}
                  {!(summary.practiced || []).length && <em>No topics yet</em>}
                </div>
              </div>
              <div>
                <strong>Clicked</strong>
                <div className="pulse-chips">
                  {(summary.improvedOn || []).map((topic) => (
                    <span key={topic} className="mini-chip green">{topic}</span>
                  ))}
                  {!(summary.improvedOn || []).length && <em>No wins logged yet</em>}
                </div>
              </div>
              <div>
                <strong>Needs another pass</strong>
                <div className="pulse-chips">
                  {(summary.struggledWith || []).map((topic) => (
                    <span key={topic} className="mini-chip orange">{topic}</span>
                  ))}
                  {!(summary.struggledWith || []).length && <em>Nothing flagged</em>}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="insight-empty">
            <p>
              Generate a quick coaching note from the lab data — what clicked, what needs another pass,
              and one conversation starter for today.
            </p>
            <button type="button" className="btn btn-primary" onClick={onSummary} disabled={loading}>
              {loading ? 'Reading the lab...' : 'Generate insight →'}
            </button>
          </div>
        )}
      </div>

      <p className="privacy-note">
        AI coaching is a helper, not a diagnosis. It uses only the topics and scores saved in this lab.
      </p>
    </div>
  );
}

function ParentActivity({ history, profile }) {
  return (
    <div className="activity-panel">
      <div className="activity-head">
        <span className="mono-label">RECENT LAB NOTES</span>
        <span>{history.length} entries</span>
      </div>
      {history.length ? (
        <div className="activity-list">
          {history.map((item, index) => (
            <div key={`${item.timestamp}-${index}`} className="activity-item">
              <span className="activity-icon">{kindIcon(item.kind)}</span>
              <div>
                <strong>{kindTitle(item.kind, item)}</strong>
                <p>
                  {item.topic}
                  {item.score ? ` · score ${item.score}` : ''}
                  {item.minutes ? ` · ${item.minutes} min` : ''}
                </p>
              </div>
              <time>{formatWhen(item.timestamp)}</time>
            </div>
          ))}
        </div>
      ) : (
        <div className="activity-empty">
          <span>🧪</span>
          <p>No lab notes yet for {profile.name}. Start a quiz, mission, or story to fill this notebook.</p>
        </div>
      )}
    </div>
  );
}

function ParentSettings({
  soundOn,
  setSoundOn,
  voiceOn,
  setVoiceOn,
  reduceMotion,
  setReduceMotion,
  dailyGoal,
  onDailyGoal,
}) {
  return (
    <div className="settings-panel">
      <div className="settings-group">
        <span className="mono-label">EXPERIENCE</span>
        <ToggleRow
          label="Sound effects"
          desc="Little chimes for taps, wins, and level-ups."
          value={soundOn}
          onChange={setSoundOn}
        />
        <ToggleRow
          label="Auto-read tutor replies"
          desc="The tutor reads answers aloud as they arrive."
          value={voiceOn}
          onChange={setVoiceOn}
        />
        <ToggleRow
          label="Reduce motion"
          desc="Turns off floating, orbiting, and confetti animations."
          value={reduceMotion}
          onChange={setReduceMotion}
        />
      </div>

      <div className="settings-group">
        <span className="mono-label">DAILY STAR GOAL</span>
        <p className="settings-help">Choose how many stars counts as a great day.</p>
        <div className="goal-options">
          {[20, 30, 50].map((goal) => (
            <button
              type="button"
              key={goal}
              className={dailyGoal === goal ? 'active' : ''}
              onClick={() => onDailyGoal(goal)}
            >
              {goal} ⭐
            </button>
          ))}
        </div>
      </div>

      <div className="settings-group">
        <span className="mono-label">PRIVACY</span>
        <p className="settings-help">
          Profiles and progress live in your private Postgres database. AI prompts are sent from
          server routes only. This app does not use child data for ads or training.
        </p>
      </div>
    </div>
  );
}

function ToggleRow({ label, desc, value, onChange }) {
  return (
    <button
      type="button"
      className="setting-row"
      onClick={() => onChange(!value)}
      role="switch"
      aria-checked={value}
    >
      <span>
        <strong>{label}</strong>
        <small>{desc}</small>
      </span>
      <span className={`switch ${value ? 'on' : ''}`}>
        <i />
      </span>
    </button>
  );
}

function LevelUpModal({ data, onClose }) {
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal levelup-modal" role="dialog" aria-modal="true" aria-label="Level up">
        <span className="levelup-burst">🏆</span>
        <span className="mono-label">LEVEL UP</span>
        <h2>Genius Level {data.level}</h2>
        <p>
          New rank unlocked: <strong>{data.rank.icon} {data.rank.name}</strong>
        </p>
        <p className="levelup-sub">Keep following the questions. The lab grows with you.</p>
        <button type="button" className="btn btn-primary" onClick={onClose}>
          Back to the lab →
        </button>
      </div>
    </div>
  );
}

function BadgeToast({ badge, onClose }) {
  return (
    <div className="badge-toast" role="status">
      <span className="badge-toast-icon">{badge.icon}</span>
      <div>
        <span className="mono-label">BADGE UNLOCKED</span>
        <strong>{badge.name}</strong>
        <small>{badge.requirement}</small>
      </div>
      <button type="button" onClick={onClose} aria-label="Dismiss badge">✕</button>
    </div>
  );
}

function Toast({ toast, onClose }) {
  return (
    <div className={`toast toast-${toast.tone || 'info'}`} role="status">
      <span>{toast.tone === 'error' ? '⚠️' : toast.tone === 'success' ? '✨' : '💫'}</span>
      <p>{toast.text}</p>
      <button type="button" onClick={onClose} aria-label="Dismiss message">✕</button>
    </div>
  );
}

function Onboarding({ step, setStep, onFinish }) {
  const slides = [
    {
      kicker: 'WELCOME TO THE LAB',
      title: 'A playground for big questions.',
      body: 'Kid Genius Lab turns “why?” into a conversation, a quiz, a hands-on mission, or a bedtime story.',
      art: '🪐',
    },
    {
      kicker: 'STEP 1 · THE CREW',
      title: 'Every explorer has a vibe.',
      body: 'Ethan loves space and challenges. Valentino builds brave adventures. Enzo explores gently with music and senses. Progress saves separately.',
      art: '🚀🦖🎵',
    },
    {
      kicker: 'STEP 2 · THE FLOW',
      title: 'Pick a wonder. Then play.',
      body: 'Type any topic, tap a chip, or use Today’s Spark. The tutor explains, the quiz coaches, the mission gets hands-on, and the story winds it down.',
      art: '🧠🎯🧪📖',
    },
  ];
  const slide = slides[step] || slides[0];

  return (
    <div className="modal-backdrop onboarding-backdrop">
      <div className="modal onboarding-modal" role="dialog" aria-modal="true" aria-label="Welcome to Kid Genius Lab">
        <div className="onboarding-art">{slide.art}</div>
        <span className="mono-label">{slide.kicker}</span>
        <h2>{slide.title}</h2>
        <p>{slide.body}</p>
        <div className="onboarding-dots">
          {slides.map((_, index) => (
            <span key={index} className={index === step ? 'active' : ''} />
          ))}
        </div>
        <div className="onboarding-actions">
          <button type="button" className="btn btn-ghost" onClick={onFinish}>Skip tour</button>
          {step > 0 && (
            <button type="button" className="btn btn-ghost" onClick={() => setStep(step - 1)}>
              Back
            </button>
          )}
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              if (step >= slides.length - 1) onFinish();
              else setStep(step + 1);
            }}
          >
            {step >= slides.length - 1 ? 'Enter the lab →' : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Confetti() {
  const colors = ['#8b5cf6', '#22d3ee', '#fbbf24', '#fb7185', '#34d399'];
  return (
    <div className="confetti" aria-hidden="true">
      {Array.from({ length: 44 }, (_, index) => (
        <span
          key={index}
          style={{
            left: `${(index * 17) % 100}%`,
            animationDelay: `${(index % 11) * 0.04}s`,
            background: colors[index % colors.length],
            transform: `rotate(${index * 13}deg)`,
          }}
        />
      ))}
    </div>
  );
}
