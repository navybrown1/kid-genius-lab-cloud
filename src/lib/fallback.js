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

function titleCase(value = '') {
  return value
    .split(' ')
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`)
    .join(' ');
}

function topicExamples(topic = 'science') {
  const normalized = topic.toLowerCase().trim();

  if (normalized.includes('architecture')) {
    return {
      definition: 'architecture is the art and science of designing buildings and spaces people can use safely',
      examples: ['a house with rooms placed where a family needs them', 'a school with wide hallways, strong walls, windows, doors, and safe exits'],
      analogy: 'Architecture is like building a giant LEGO plan before anyone stacks the real bricks.',
      challenge: 'Look around and find one thing in the room that an architect had to plan.',
    };
  }

  if (normalized.includes('natural science')) {
    return {
      definition: 'natural science is the study of nature, including animals, plants, rocks, weather, space, and the human body',
      examples: ['watching how rain clouds form', 'studying why plants need sunlight'],
      analogy: 'Natural science is like being a detective for planet Earth.',
      challenge: 'Find one thing outside and ask: what is it made of and why does it behave that way?',
    };
  }

  if (normalized.includes('space')) {
    return {
      definition: 'space is the huge area beyond Earth where planets, stars, moons, comets, and galaxies exist',
      examples: ['the Moon orbiting Earth', 'Mars moving around the Sun'],
      analogy: 'Space is like a giant dark ocean, and planets are islands moving through it.',
      challenge: 'Name one thing in space and one question you have about it.',
    };
  }

  if (normalized.includes('gravity')) {
    return {
      definition: 'gravity is the force that pulls objects toward each other',
      examples: ['a ball falling to the ground', 'the Moon staying near Earth instead of floating away'],
      analogy: 'Gravity is like an invisible pull that keeps the game pieces on the board.',
      challenge: 'Drop a soft object and describe what gravity does.',
    };
  }

  return {
    definition: `${topic} is an idea we can understand better by asking what it is, what it does, and where we can see it`,
    examples: [`one real example of ${topic} in daily life`, `one way people use ${topic} to solve a problem`],
    analogy: `${titleCase(topic)} is like a puzzle piece. It makes more sense when you see where it fits.`,
    challenge: `Find one example of ${topic} and explain why it matters in one sentence.`,
  };
}

export function fallbackMission(child = 'ethan', subject = 'science') {
  const kid = kids[child] || kids.ethan;
  const topic = topicExamples(subject);
  return {
    title: `${kid.name}'s ${titleCase(subject)} mission`,
    summary: `A parent-guided mission where ${kid.name} learns what ${subject} means, sees it in real life, and explains it back.`,
    steps: [
      `Start with this idea: ${topic.definition}.`,
      `Find or draw an example: ${topic.examples[0]}.`,
      `Ask ${kid.name}: why does this matter to people?`,
      `Finish with this challenge: ${topic.challenge}`
    ],
    reward: 'Unlock one Genius Star after explaining the idea back in their own words.'
  };
}

export function fallbackStory(child = 'ethan', theme = 'space') {
  const kid = kids[child] || kids.ethan;
  const topic = topicExamples(theme);
  return `${kid.name} opened a tiny notebook labeled ${titleCase(theme)} Quest. The first clue said: ${topic.definition}. So ${kid.name} searched for examples. One clue looked like ${topic.examples[0]}. Another looked like ${topic.examples[1]}. The more ${kid.name} noticed, the less mysterious the topic felt. By bedtime, the final mission was simple: ${topic.challenge}`;
}

export function fallbackExplain(child = 'ethan', topicName = 'gravity') {
  const kid = kids[child] || kids.ethan;
  const topic = topicExamples(topicName);
  return `${kid.name}, ${topic.definition}. For example, ${topic.examples[0]}. Another example is ${topic.examples[1]}. ${topic.analogy} Tiny challenge: ${topic.challenge}`;
}

export function fallbackPracticeQuestions(child = 'ethan', topicName = 'science') {
  const topic = topicExamples(topicName);
  return [
    {
      id: 'q1',
      prompt: `What does ${topicName} mean?`,
      support: `Start here: ${topic.definition}.`,
      difficulty: 'easy',
      expectedClue: 'A simple definition in the child’s own words.',
    },
    {
      id: 'q2',
      prompt: `Which example shows ${topicName} in real life?`,
      support: `Think about this example: ${topic.examples[0]}.`,
      difficulty: 'medium',
      expectedClue: 'A real example connected to the topic.',
    },
    {
      id: 'q3',
      prompt: `Why does ${topicName} matter?`,
      support: 'Think about how it helps people understand, build, solve, or notice something.',
      difficulty: 'medium',
      expectedClue: 'A reason the topic is useful or important.',
    },
  ];
}
