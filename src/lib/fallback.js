export const kids = {
  ethan: {
    name: 'Ethan',
    vibe: 'curious, funny, challenge-heavy, and science-loving',
    tone: 'fast, playful, smart, and slightly mischievous'
  },
  valentino: {
    name: 'Valentino',
    vibe: 'imaginative, visual, movement-friendly, and confidence-building',
    tone: 'warm, adventurous, simple, and encouraging'
  },
  enzo: {
    name: 'Enzo',
    vibe: 'baby-safe, sensory, musical, gentle, and parent-led',
    tone: 'soft, rhythmic, loving, and simple'
  }
};

export function fallbackMission(child = 'ethan', subject = 'science') {
  const kid = kids[child] || kids.ethan;
  return {
    title: `${kid.name}'s ${subject} mission`,
    summary: `A parent-guided ${subject} challenge built for ${kid.name}: ${kid.vibe}.`,
    steps: [
      `Ask ${kid.name} one big question about ${subject}.`,
      'Do a tiny experiment, drawing, or explanation together.',
      'Let the child teach the parent what they discovered.',
      'Finish with one funny or surprising fact.'
    ],
    reward: 'Unlock one Genius Star and add the discovery to the vault.'
  };
}

export function fallbackStory(child = 'ethan', theme = 'space') {
  const kid = kids[child] || kids.ethan;
  return `${kid.name} stepped into a tiny ${theme} adventure where every question opened a secret door. The mission was simple: notice one strange thing, ask why it mattered, and come back brave enough to explain it. By the end, ${kid.name} had a new idea glowing like a little star.`;
}

export function fallbackExplain(child = 'ethan', topic = 'gravity') {
  const kid = kids[child] || kids.ethan;
  return `${kid.name}, imagine ${topic} is like an invisible helper that keeps things connected. You cannot always see it, but you can notice what it does. The smart move is to ask: what changes when it is stronger, weaker, closer, or farther away?`;
}
