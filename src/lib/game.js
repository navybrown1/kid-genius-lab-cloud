export const CHILD_KEYS = ['ethan', 'valentino', 'enzo'];

export const childProfiles = {
  ethan: {
    name: 'Ethan',
    avatar: '🚀',
    tag: 'Science Explorer',
    traits: 'Curious, funny, challenge-hungry',
    mascotLine: 'Ready to launch a brain rocket today?',
    themeLine: 'Space missions, science puzzles, and big questions.',
    accent: '#8b5cf6',
    accent2: '#22d3ee',
    accentSoft: 'rgba(139, 92, 246, 0.18)',
  },
  valentino: {
    name: 'Valentino',
    avatar: '🦖',
    tag: 'Adventure Builder',
    traits: 'Visual, bold, movement-friendly',
    mascotLine: 'Let’s stomp through this mission like a genius dinosaur.',
    themeLine: 'Movement, pictures, missions, and brave little wins.',
    accent: '#fb923c',
    accent2: '#f43f5e',
    accentSoft: 'rgba(251, 146, 60, 0.18)',
  },
  enzo: {
    name: 'Enzo',
    avatar: '🎵',
    tag: 'Tiny Wonder',
    traits: 'Gentle, sensory, musical',
    mascotLine: 'Soft sounds, bright colors, tiny genius energy.',
    themeLine: 'Parent-led discovery with music, shapes, and sensory play.',
    accent: '#34d399',
    accent2: '#38bdf8',
    accentSoft: 'rgba(52, 211, 153, 0.18)',
  },
};

export const XP_PER_LEVEL = 120;

export const RANKS = [
  { min: 1, name: 'Curious Sprout', icon: '🌱' },
  { min: 2, name: 'Lab Explorer', icon: '🧭' },
  { min: 3, name: 'Idea Builder', icon: '🧩' },
  { min: 5, name: 'Star Scientist', icon: '⭐' },
  { min: 7, name: 'Genius Inventor', icon: '⚙️' },
  { min: 10, name: 'Cosmic Legend', icon: '🌌' },
];

export function rankForLevel(level = 1) {
  return [...RANKS].reverse().find((rank) => level >= rank.min) || RANKS[0];
}

export function levelFromXp(xp = 0) {
  return Math.max(1, Math.floor(Math.max(0, xp) / XP_PER_LEVEL) + 1);
}

export function levelProgress(xp = 0) {
  const level = levelFromXp(xp);
  const into = Math.max(0, xp) - (level - 1) * XP_PER_LEVEL;
  return {
    level,
    into,
    needed: XP_PER_LEVEL,
    remaining: XP_PER_LEVEL - into,
    percent: Math.min(100, Math.round((into / XP_PER_LEVEL) * 100)),
    rank: rankForLevel(level),
    nextRank: RANKS.find((rank) => rank.min > level) || null,
  };
}

export function xpFromScore(score = 0) {
  return 10 + Math.round(Math.max(0, Math.min(100, score)) / 10);
}

export function starsFromScore(score = 0) {
  return score >= 70 ? 3 : 1;
}

export function nextDifficulty(current = 'medium', performance = 0.5) {
  const order = ['easy', 'medium', 'hard'];
  const index = order.indexOf(order.includes(current) ? current : 'medium');
  if (performance >= 0.8) return order[Math.min(index + 1, order.length - 1)];
  if (performance <= 0.45) return order[Math.max(index - 1, 0)];
  return order[index];
}

export const badgeCatalog = [
  { id: 'first-quest', name: 'First Quest', icon: '👣', requirement: 'Finish 1 practice run', check: (child) => (child.practiceCount ?? 0) >= 1 },
  { id: 'star-spark', name: 'Star Spark', icon: '⭐', requirement: 'Collect 10 genius stars', check: (child) => (child.stars ?? 0) >= 10 },
  { id: 'quiz-champ', name: 'Quiz Champ', icon: '🏆', requirement: 'Complete 3 quiz decks', check: (child) => (child.quizCount ?? 0) >= 3 },
  { id: 'streak-fire', name: 'Streak Fire', icon: '🔥', requirement: 'Reach a 3-day streak', check: (child) => (child.streakDays ?? 0) >= 3 },
  { id: 'topic-traveler', name: 'Topic Traveler', icon: '🗺️', requirement: 'Explore 3 different topics', check: (child) => (child.recentTopics?.length ?? 0) >= 3 },
  { id: 'level-builder', name: 'Level Builder', icon: '💎', requirement: 'Reach Genius Level 3', check: (child) => (child.level ?? 1) >= 3 },
  { id: 'mission-master', name: 'Mission Master', icon: '🧪', requirement: 'Complete a hands-on mission', check: (child) => (child.missionsDone ?? 0) >= 1 },
  { id: 'story-weaver', name: 'Story Weaver', icon: '📖', requirement: 'Finish a bedtime story', check: (child) => (child.storiesRead ?? 0) >= 1 },
  { id: 'daily-hero', name: 'Daily Hero', icon: '☀️', requirement: 'Hit today’s star goal', check: (child) => (child.dailyStars ?? 0) >= (child.dailyGoal ?? 30) },
];

export const topicPacks = [
  {
    id: 'cosmos',
    name: 'Cosmos & Earth',
    icon: '🪐',
    topics: [
      { name: 'Space', icon: '🌌' },
      { name: 'Black Holes', icon: '🕳️' },
      { name: 'Solar System', icon: '🪐' },
      { name: 'Volcanoes', icon: '🌋' },
      { name: 'Weather', icon: '⛈️' },
      { name: 'Water Cycle', icon: '💧' },
    ],
  },
  {
    id: 'nature',
    name: 'Wild Life',
    icon: '🦖',
    topics: [
      { name: 'Dinosaurs', icon: '🦖' },
      { name: 'Ocean Animals', icon: '🐋' },
      { name: 'Photosynthesis', icon: '🌱' },
      { name: 'Human Body', icon: '🫀' },
      { name: 'Bees', icon: '🐝' },
      { name: 'Trees', icon: '🌳' },
    ],
  },
  {
    id: 'build',
    name: 'How Things Work',
    icon: '⚙️',
    topics: [
      { name: 'Gravity', icon: '🍎' },
      { name: 'Electricity', icon: '⚡' },
      { name: 'Magnets', icon: '🧲' },
      { name: 'Coding', icon: '🤖' },
      { name: 'Robots', icon: '🦾' },
      { name: 'Architecture', icon: '📐' },
    ],
  },
  {
    id: 'create',
    name: 'Big Imagination',
    icon: '🎨',
    topics: [
      { name: 'Music', icon: '🎵' },
      { name: 'Colors', icon: '🌈' },
      { name: 'Inventions', icon: '💡' },
      { name: 'Dreams', icon: '🌙' },
      { name: 'Bridges', icon: '🌉' },
      { name: 'Time', icon: '⏳' },
    ],
  },
];

export const FEATURED_TOPICS = [
  { name: 'Space', icon: '🌌' },
  { name: 'Dinosaurs', icon: '🦖' },
  { name: 'Gravity', icon: '🍎' },
  { name: 'Coding', icon: '🤖' },
  { name: 'Ocean Animals', icon: '🐋' },
  { name: 'Music', icon: '🎵' },
];

export const ALL_TOPICS = topicPacks.flatMap((pack) => pack.topics);

export const wonderQuestions = [
  { q: 'Why is the sky blue?', topic: 'Light', emoji: '🌈', kicker: 'Every color hides inside sunlight.' },
  { q: 'How do bees talk to each other?', topic: 'Bees', emoji: '🐝', kicker: 'They dance to share directions.' },
  { q: 'What would happen if the Moon disappeared?', topic: 'Space', emoji: '🌙', kicker: 'Oceans and night skies would notice.' },
  { q: 'Why do we dream?', topic: 'Dreams', emoji: '💭', kicker: 'Your brain never stops exploring.' },
  { q: 'How does a seed know how to become a tree?', topic: 'Trees', emoji: '🌳', kicker: 'Tiny instructions are folded inside.' },
  { q: 'Why does ice float on water?', topic: 'Water Cycle', emoji: '🧊', kicker: 'Frozen water is a little lighter.' },
  { q: 'How do magnets pull without touching?', topic: 'Magnets', emoji: '🧲', kicker: 'An invisible field does the work.' },
  { q: 'Why do volcanoes explode?', topic: 'Volcanoes', emoji: '🌋', kicker: 'Pressure finds a way out.' },
  { q: 'How do robots know what to do?', topic: 'Robots', emoji: '🦾', kicker: 'People write step-by-step instructions.' },
  { q: 'Why does music make us want to dance?', topic: 'Music', emoji: '🎵', kicker: 'Rhythm talks to your whole body.' },
  { q: 'How big is a black hole?', topic: 'Black Holes', emoji: '🕳️', kicker: 'Some are tiny. Some are giant.' },
  { q: 'Why do we have fingerprints?', topic: 'Human Body', emoji: '🫆', kicker: 'They help us grip and feel.' },
  { q: 'How do fish breathe underwater?', topic: 'Ocean Animals', emoji: '🐟', kicker: 'Gills pull oxygen out of water.' },
  { q: 'Why does the Moon change shape?', topic: 'Solar System', emoji: '🌗', kicker: 'Sunlight and shadow play a game.' },
  { q: 'How does a bridge hold so much weight?', topic: 'Bridges', emoji: '🌉', kicker: 'Shapes share the load.' },
  { q: 'Why do we get goosebumps?', topic: 'Human Body', emoji: '🪶', kicker: 'An old survival reflex is still in you.' },
  { q: 'Where does lightning come from?', topic: 'Weather', emoji: '⚡', kicker: 'Tiny charges build into a giant spark.' },
  { q: 'Could people live on Mars?', topic: 'Space', emoji: '🔴', kicker: 'It would take clever engineering.' },
  { q: 'Why do leaves change color in fall?', topic: 'Photosynthesis', emoji: '🍂', kicker: 'Hidden colors appear when green fades.' },
  { q: 'How do computers store a picture?', topic: 'Coding', emoji: '🖥️', kicker: 'Pictures become patterns of numbers.' },
];

export const QUICK_PROMPTS = [
  'Explain it simpler',
  'Give me a wild example',
  'Why does it matter?',
  'What can I try at home?',
];

export const STARTERS = [
  'I think...',
  'For example...',
  'This happens because...',
  'It matters because...',
];

export function dateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function weekDays() {
  const labels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  return Array.from({ length: 7 }, (_, index) => {
    const offset = 6 - index;
    const date = new Date();
    date.setDate(date.getDate() - offset);
    return {
      key: dateKey(date),
      label: labels[date.getDay()],
      day: date.getDate(),
      isToday: offset === 0,
    };
  });
}

export function pickDailySpark(childKey = 'ethan', date = new Date()) {
  const seed = [...dateKey(date)].reduce((total, char) => total + char.charCodeAt(0), 0);
  const childOffset = Math.max(0, CHILD_KEYS.indexOf(childKey)) * 7;
  return wonderQuestions[(seed + childOffset) % wonderQuestions.length];
}

export function randomTopic(exclude = '') {
  const pool = ALL_TOPICS.filter((item) => item.name.toLowerCase() !== exclude.toLowerCase());
  return pool[Math.floor(Math.random() * pool.length)] || ALL_TOPICS[0];
}

export function titleCase(value = '') {
  return value
    .split(' ')
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(' ');
}

export function formatElapsed(totalSeconds = 0) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function splitStoryIntoPages(text = '') {
  const clean = String(text).trim();
  if (!clean) return [''];

  let paragraphs = clean.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);
  if (paragraphs.length === 1 && paragraphs[0].length > 900) {
    const sentences = paragraphs[0].match(/[^.!?]+[.!?]+/g) || [paragraphs[0]];
    paragraphs = [];
    let chunk = '';
    for (const sentence of sentences) {
      if (chunk && chunk.length + sentence.length > 520) {
        paragraphs.push(chunk.trim());
        chunk = sentence;
      } else {
        chunk += sentence;
      }
    }
    if (chunk.trim()) paragraphs.push(chunk.trim());
  }

  const pages = [];
  let current = '';
  for (const paragraph of paragraphs) {
    if (current && current.length + paragraph.length > 620) {
      pages.push(current.trim());
      current = paragraph;
    } else {
      current = current ? `${current}\n\n${paragraph}` : paragraph;
    }
  }
  if (current.trim()) pages.push(current.trim());
  return pages.length ? pages : [clean];
}

export function flattenAssistantMessage(message) {
  if (!message) return '';
  if (message.kind === 'tutor' && message.data) {
    const { answer, analogy, steps, encouragement } = message.data;
    return [
      answer,
      analogy ? `Analogy: ${analogy}` : '',
      Array.isArray(steps) && steps.length ? `Steps: ${steps.join(' ')}` : '',
      encouragement || '',
    ]
      .filter(Boolean)
      .join('\n');
  }
  return message.content || '';
}
