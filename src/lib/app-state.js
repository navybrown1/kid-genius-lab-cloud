import { prisma } from './db';

const CHILDREN = ['ethan', 'valentino', 'enzo'];
export const XP_PER_LEVEL = 120;

function formatDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function yesterdayKey() {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return formatDateKey(date);
}

function createChildState(name) {
  return {
    name,
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
    updatedAt: null,
    lastPerformance: null,
  };
}

export function createDefaultAppState() {
  return {
    activeChild: 'ethan',
    children: {
      ethan: createChildState('ethan'),
      valentino: createChildState('valentino'),
      enzo: createChildState('enzo'),
    },
    history: [],
    updatedAt: null,
  };
}

export function calculateLevel(xp = 0) {
  return Math.max(1, Math.floor(Math.max(0, xp) / XP_PER_LEVEL) + 1);
}

export function normalizeAppState(rawState) {
  const base = createDefaultAppState();
  if (!rawState || typeof rawState !== 'object') {
    return base;
  }

  const children = { ...base.children };
  for (const child of CHILDREN) {
    const source = rawState.children?.[child] || {};
    const storedLevel = Number.isFinite(source.level) ? source.level : 1;
    const stars = Number.isFinite(source.stars) ? source.stars : 0;
    const xp = Number.isFinite(source.xp)
      ? source.xp
      : Math.max(0, (Math.max(1, storedLevel) - 1) * XP_PER_LEVEL + stars * 5);

    children[child] = {
      ...base.children[child],
      ...source,
      name: source.name || child,
      stars,
      xp,
      level: calculateLevel(xp),
      streakDays: Number.isFinite(source.streakDays) ? source.streakDays : 0,
      practiceCount: Number.isFinite(source.practiceCount) ? source.practiceCount : 0,
      quizCount: Number.isFinite(source.quizCount) ? source.quizCount : 0,
      missionsDone: Number.isFinite(source.missionsDone) ? source.missionsDone : 0,
      storiesRead: Number.isFinite(source.storiesRead) ? source.storiesRead : 0,
      masteredTopics: Array.isArray(source.masteredTopics) ? source.masteredTopics : [],
      struggleTopics: Array.isArray(source.struggleTopics) ? source.struggleTopics : [],
      recentTopics: Array.isArray(source.recentTopics) ? source.recentTopics : [],
      lastDifficulty: ['easy', 'medium', 'hard'].includes(source.lastDifficulty) ? source.lastDifficulty : 'medium',
      lastActiveDate: typeof source.lastActiveDate === 'string' ? source.lastActiveDate : null,
      dailyDate: typeof source.dailyDate === 'string' ? source.dailyDate : null,
      dailyStars: Number.isFinite(source.dailyStars) ? source.dailyStars : 0,
      dailyGoal: Number.isFinite(source.dailyGoal) ? source.dailyGoal : 30,
      updatedAt: source.updatedAt || null,
      lastPerformance: typeof source.lastPerformance === 'number' ? source.lastPerformance : null,
    };
  }

  return {
    ...base,
    ...rawState,
    activeChild: CHILDREN.includes(rawState.activeChild) ? rawState.activeChild : 'ethan',
    children,
    history: Array.isArray(rawState.history) ? rawState.history.slice(0, 40) : [],
  };
}

export function nextDifficulty(current, performance) {
  const order = ['easy', 'medium', 'hard'];
  const safeCurrent = order.includes(current) ? current : 'medium';
  const index = order.indexOf(safeCurrent);

  if (performance >= 0.8) {
    return order[Math.min(index + 1, order.length - 1)];
  }

  if (performance <= 0.45) {
    return order[Math.max(index - 1, 0)];
  }

  return safeCurrent;
}

export function summarizePerformance(state, childKey) {
  const child = state.children[childKey] || createChildState(childKey);
  return {
    child: childKey,
    level: child.level,
    stars: child.stars,
    xp: child.xp,
    streakDays: child.streakDays,
    practiceCount: child.practiceCount,
    quizCount: child.quizCount,
    missionsDone: child.missionsDone,
    storiesRead: child.storiesRead,
    lastDifficulty: child.lastDifficulty,
    masteredTopics: child.masteredTopics,
    struggleTopics: child.struggleTopics,
    recentTopics: child.recentTopics,
  };
}

export function updateChildProgress(state, childKey, patch) {
  const nextState = normalizeAppState(state);
  const current = nextState.children[childKey] || createDefaultAppState().children.ethan;
  const today = formatDateKey();
  const starsDelta = patch.starsDelta || 0;
  const stars = Math.max(0, current.stars + starsDelta);
  const xp = Math.max(0, current.xp + (patch.xpDelta || 0));

  let streakDays = current.streakDays;
  let lastActiveDate = current.lastActiveDate;
  if (patch.bumpStreak) {
    if (current.lastActiveDate !== today) {
      streakDays = current.lastActiveDate === yesterdayKey() ? current.streakDays + 1 : 1;
    } else if (streakDays < 1) {
      streakDays = 1;
    }
    lastActiveDate = today;
  }

  const dailyBase = current.dailyDate === today ? current.dailyStars : 0;
  const next = {
    ...current,
    stars,
    xp,
    level: calculateLevel(xp),
    streakDays,
    lastActiveDate,
    dailyDate: today,
    dailyStars: Math.max(0, dailyBase + Math.max(0, starsDelta)),
    practiceCount: current.practiceCount + (patch.practiceCountDelta || 0),
    quizCount: current.quizCount + (patch.quizCountDelta || 0),
    missionsDone: current.missionsDone + (patch.missionsDoneDelta || 0),
    storiesRead: current.storiesRead + (patch.storiesReadDelta || 0),
    lastDifficulty: patch.lastDifficulty || current.lastDifficulty,
    masteredTopics: patch.masteredTopic
      ? Array.from(new Set([patch.masteredTopic, ...current.masteredTopics])).slice(0, 8)
      : current.masteredTopics,
    struggleTopics: patch.struggleTopic
      ? Array.from(new Set([patch.struggleTopic, ...current.struggleTopics])).slice(0, 8)
      : current.struggleTopics,
    recentTopics: patch.topic
      ? [patch.topic, ...current.recentTopics.filter((item) => item !== patch.topic)].slice(0, 6)
      : current.recentTopics,
    updatedAt: new Date().toISOString(),
    lastPerformance: patch.performance ?? current.lastPerformance,
  };

  const historyEntry = patch.historyEntry
    ? {
        ...patch.historyEntry,
        child: childKey,
        timestamp: new Date().toISOString(),
      }
    : null;

  return normalizeAppState({
    ...nextState,
    activeChild: childKey,
    children: {
      ...nextState.children,
      [childKey]: next,
    },
    history: historyEntry ? [historyEntry, ...nextState.history].slice(0, 40) : nextState.history,
    updatedAt: new Date().toISOString(),
  });
}

export async function loadAppState() {
  try {
    const row = await prisma.appState.findUnique({ where: { id: 'main' } });
    return normalizeAppState(row?.data);
  } catch {
    return createDefaultAppState();
  }
}

export async function saveAppState(data) {
  const normalized = normalizeAppState(data);
  try {
    await prisma.appState.upsert({
      where: { id: 'main' },
      update: { data: normalized },
      create: { id: 'main', data: normalized },
    });
  } catch {
    // Fall back to returning the normalized payload so the app can continue locally.
  }

  return normalized;
}
