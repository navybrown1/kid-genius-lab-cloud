import { prisma } from './db';

const CHILDREN = ['ethan', 'valentino', 'enzo'];

function createChildState(name) {
  return {
    name,
    stars: 0,
    level: 1,
    streakDays: 0,
    practiceCount: 0,
    quizCount: 0,
    lastDifficulty: 'medium',
    masteredTopics: [],
    struggleTopics: [],
    recentTopics: [],
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

export function normalizeAppState(rawState) {
  const base = createDefaultAppState();
  if (!rawState || typeof rawState !== 'object') {
    return base;
  }

  const children = { ...base.children };
  for (const child of CHILDREN) {
    const source = rawState.children?.[child] || {};
    children[child] = {
      ...base.children[child],
      ...source,
      name: source.name || child,
      stars: Number.isFinite(source.stars) ? source.stars : base.children[child].stars,
      level: Number.isFinite(source.level) ? source.level : base.children[child].level,
      streakDays: Number.isFinite(source.streakDays) ? source.streakDays : 0,
      practiceCount: Number.isFinite(source.practiceCount) ? source.practiceCount : 0,
      quizCount: Number.isFinite(source.quizCount) ? source.quizCount : 0,
      masteredTopics: Array.isArray(source.masteredTopics) ? source.masteredTopics : [],
      struggleTopics: Array.isArray(source.struggleTopics) ? source.struggleTopics : [],
      recentTopics: Array.isArray(source.recentTopics) ? source.recentTopics : [],
      lastDifficulty: ['easy', 'medium', 'hard'].includes(source.lastDifficulty) ? source.lastDifficulty : 'medium',
      updatedAt: source.updatedAt || null,
      lastPerformance: typeof source.lastPerformance === 'number' ? source.lastPerformance : null,
    };
  }

  return {
    ...base,
    ...rawState,
    activeChild: CHILDREN.includes(rawState.activeChild) ? rawState.activeChild : 'ethan',
    children,
    history: Array.isArray(rawState.history) ? rawState.history.slice(0, 20) : [],
  };
}

export function calculateLevel(stars = 0) {
  return Math.max(1, Math.floor(Math.sqrt(Math.max(stars, 0) / 4)) + 1);
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
    streakDays: child.streakDays,
    practiceCount: child.practiceCount,
    quizCount: child.quizCount,
    lastDifficulty: child.lastDifficulty,
    masteredTopics: child.masteredTopics,
    struggleTopics: child.struggleTopics,
    recentTopics: child.recentTopics,
  };
}

export function updateChildProgress(state, childKey, patch) {
  const nextState = normalizeAppState(state);
  const current = nextState.children[childKey] || createDefaultAppState().children.ethan;
  const stars = Math.max(0, current.stars + (patch.starsDelta || 0));
  const mastery = patch.performance ?? null;
  const next = {
    ...current,
    stars,
    level: calculateLevel(stars),
    streakDays: patch.bumpStreak ? current.streakDays + 1 : current.streakDays,
    practiceCount: current.practiceCount + (patch.practiceCountDelta || 0),
    quizCount: current.quizCount + (patch.quizCountDelta || 0),
    lastDifficulty: patch.lastDifficulty || current.lastDifficulty,
    masteredTopics: patch.masteredTopic
      ? Array.from(new Set([patch.masteredTopic, ...current.masteredTopics])).slice(0, 8)
      : current.masteredTopics,
    struggleTopics: patch.struggleTopic
      ? Array.from(new Set([patch.struggleTopic, ...current.struggleTopics])).slice(0, 8)
      : current.struggleTopics,
    recentTopics: patch.topic
      ? [patch.topic, ...current.recentTopics.filter((item) => item !== patch.topic)].slice(0, 5)
      : current.recentTopics,
    updatedAt: new Date().toISOString(),
    lastPerformance: mastery,
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
    history: historyEntry ? [historyEntry, ...nextState.history].slice(0, 20) : nextState.history,
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
