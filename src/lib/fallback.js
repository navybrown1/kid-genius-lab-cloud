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
      definition: 'Architecture is the clever combination of art, math, and physics to design safe, strong, and beautiful structures that people can live, work, and play in.',
      examples: [
        'Using sturdy interlocking triangles in truss bridges to support heavy cargo trains without bending',
        'Placing wide double-pane windows on south walls to absorb natural winter heat while keeping drafts out'
      ],
      analogy: 'An architect is like a director for a building, planning where every room, pipe, and light switch goes before the first brick is laid.',
      challenge: 'Sketch a quick blueprint of a treehouse! Where will the trapdoor go, and how will you support the platform?',
    };
  }

  if (normalized.includes('photosynthesis')) {
    return {
      definition: 'Photosynthesis is the biological process where plants act as miniature green kitchens, using sunlight, water, and air to cook their own food and release fresh oxygen.',
      examples: [
        'A towering oak tree soaking up bright sunshine to convert carbon dioxide into sweet sap and sturdy wood',
        'Phytoplankton in the ocean absorbing solar energy to generate over half of the oxygen in Earth’s atmosphere'
      ],
      analogy: 'Photosynthesis is like a leaf running on solar panels, charging its batteries with sunshine, carbon dioxide, and water to bake sugar.',
      challenge: 'Inspect a green leaf under a bright light. Can you trace the tiny veins that carry water from the roots to the plant’s kitchen?',
    };
  }

  if (normalized.includes('water cycle') || normalized.includes('rain')) {
    return {
      definition: 'The water cycle is Earth’s infinite recycling system, constantly moving water from the oceans to the sky as vapor, into clouds, and back down as rain.',
      examples: [
        'A warm sun evaporating a puddle on the driveway and turning it into invisible water vapor floating upward',
        'Fluffy clouds cooling down, condensing into heavy droplets, and releasing a refreshing rain shower over a forest'
      ],
      analogy: 'The water cycle is like a massive planetary roller coaster where water drops ride up on sunbeams and slide back down as rain.',
      challenge: 'Place a small cup of water by a sunny window. Draw a line at the water level and check it tomorrow—where did the water go?',
    };
  }

  if (normalized.includes('coding') || normalized.includes('programming') || normalized.includes('computer')) {
    return {
      definition: 'Coding is writing a highly precise, step-by-step set of rules (called an algorithm) to teach a computer or robot exactly how to solve a problem.',
      examples: [
        'Writing a sequence of commands to guide a planetary rover to drive forward, avoid a crater, and scoop up red soil',
        'Instructing a video game character to jump, slide, or change colors instantly whenever a button is pressed'
      ],
      analogy: 'Coding is like writing a recipe for a very literal robot chef who doesn’t know what "chop" means unless you describe it in detail.',
      challenge: 'Write a three-step instruction list to teach a robot how to tie a shoe. Remember, it does not know what a knot is yet!',
    };
  }

  if (normalized.includes('space') || normalized.includes('universe') || normalized.includes('planet')) {
    return {
      definition: 'Space is the vast, quiet universe beyond Earth’s atmosphere containing billions of spinning planets, roaring stars, moons, and mysterious black holes.',
      examples: [
        'The massive Sun holding eight different planets in their orbits using its powerful gravitational pull',
        'A robotic satellite zooming around Jupiter at high speed to beam back beautiful photographs of its Great Red Spot'
      ],
      analogy: 'Space is like a giant cosmic ocean, and planets are moving islands sailing along invisible pathways of gravity.',
      challenge: 'If you could travel to any planet in our solar system, which one would you choose, and what gear would you pack?',
    };
  }

  if (normalized.includes('gravity') || normalized.includes('force')) {
    return {
      definition: 'Gravity is an invisible pulling force that acts like a cosmic magnet, drawing everything with mass toward the center of massive bodies like Earth.',
      examples: [
        'An apple detaching from a branch and dropping straight down to the grass instead of floating sideways',
        'The Earth pulling on the Moon to hold it in a steady orbital circle, which gently pulls our oceans to create tides'
      ],
      analogy: 'Gravity is like the invisible hands of the Earth, keeping our feet on the ground and making sure all the game pieces stay on the board.',
      challenge: 'Drop a soft cushion and a crumpled piece of paper at the same time. Do they hit the floor together? What is gravity doing?',
    };
  }

  return {
    definition: `${titleCase(topic)} is a fascinating area of knowledge that helps us understand how things work, how they are made, and why they behave the way they do.`,
    examples: [
      `One real-life application where scientists, engineers, or artists use ${topic} to create or build something new`,
      `A natural phenomenon or daily habit where ${topic} is active, even if we do not notice it right away`
    ],
    analogy: `${titleCase(topic)} is like a puzzle piece in the giant map of the world—it connects logic, curiosity, and action together.`,
    challenge: `Observe your surroundings and find one object that relates to ${topic}. Explain its purpose in one sentence!`,
  };
}

export function fallbackMission(child = 'ethan', subject = 'science') {
  const kid = kids[child] || kids.ethan;
  const topic = topicExamples(subject);
  return {
    title: `${kid.name}’s ${titleCase(subject)} Laboratory Mission`,
    summary: `A parent-led hands-on experiment where ${kid.name} investigates ${subject}, tracks physical evidence, and presents findings to the chief scientist (you!).`,
    steps: [
      `Chief Scientist briefing: Read the definition of ${subject} together: "${topic.definition}".`,
      `Evidence Gathering: Find a real-life example or sketch one: "${topic.examples[0]}".`,
      `Brainstorming: Discuss the analogy: "${topic.analogy}". Ask ${kid.name} why this analogy makes sense to them.`,
      `Final Lab Challenge: Complete this experiment: "${topic.challenge}".`
    ],
    reward: 'Earn 2 Genius Stars, 10 XP, and a "Curious Scientist" badge after the child explains their findings in one sentence.'
  };
}

export function fallbackStory(child = 'ethan', theme = 'space') {
  const kid = kids[child] || kids.ethan;
  const topic = topicExamples(theme);
  return `Once upon a time, ${kid.name} discovered a secret door in the back of the closet, leading straight into the Kid Genius Lab. Floating screens displayed a new quest: ${titleCase(theme)}. 

The screen read: "${topic.definition}"

Equipped with a notebook, ${kid.name} set out to find clues. In the laboratory gardens, there was a perfect example of ${theme}: ${topic.examples[0]}. Further along the path, ${kid.name} discovered another one: ${topic.examples[1]}. 

"It's like magic, but it's actually science!" ${kid.name} laughed. The computer mascot nodded, glowing happily. "${topic.analogy}"

To unlock the laboratory's main engine, ${kid.name} had to solve one final riddle: "${topic.challenge}" With a bright smile and a clever answer, the screen flashed gold, stars burst into the room, and ${kid.name} became the certified Genius of the Day.`;
}

export function fallbackExplain(child = 'ethan', topicName = 'gravity') {
  const kid = kids[child] || kids.ethan;
  const topic = topicExamples(topicName);
  return `Hey ${kid.name}! Let's talk about ${titleCase(topicName)}. 

Here is the big idea: ${topic.definition}

To see it in action, think about these real-life examples:
1. ${topic.examples[0]}
2. ${topic.examples[1]}

${topic.analogy}

Here is your tiny brain challenge: ${topic.challenge} You got this!`;
}

export function fallbackPracticeQuestions(child = 'ethan', topicName = 'science') {
  const topic = topicExamples(topicName);
  return [
    {
      id: 'q1',
      prompt: `In your own words, how would you describe ${topicName} to a friend?`,
      support: `Remember: ${topic.definition}. Use simple words!`,
      difficulty: 'easy',
      expectedClue: 'A simple definition or concept representation.',
    },
    {
      id: 'q2',
      prompt: `Can you give an everyday example of ${topicName}?`,
      support: `Think about this example: ${topic.examples[0]}.`,
      difficulty: 'medium',
      expectedClue: 'An example matching or closely related to the topic.',
    },
    {
      id: 'q3',
      prompt: `Why do you think scientists or creators want to study and understand ${topicName}?`,
      support: 'Think about how it helps us build cooler machines, save the planet, or explore new worlds.',
      difficulty: 'hard',
      expectedClue: 'An explanation of the utility, importance, or curiosity value.',
    },
  ];
}
