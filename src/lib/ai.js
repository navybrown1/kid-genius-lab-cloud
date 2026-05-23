import { z } from 'zod';
import { fallbackExplain, fallbackMission, fallbackStory, kids } from './fallback';

const responseSchema = z.string();

const tutorSchema = z.object({
  answer: z.string(),
  steps: z.array(z.string()).min(2),
  analogy: z.string(),
  encouragement: z.string(),
});

const practiceSchema = z.object({
  questions: z.array(
    z.object({
      id: z.string(),
      prompt: z.string(),
      support: z.string(),
      difficulty: z.enum(['easy', 'medium', 'hard']),
      expectedClue: z.string(),
    })
  ).min(2),
});

const hintSchema = z.object({
  hint: z.string(),
  nextStep: z.string(),
});

const feedbackSchema = z.object({
  score: z.number().min(0).max(100),
  summary: z.string(),
  whatWentWell: z.string(),
  whatToTryNext: z.string(),
  encouragement: z.string(),
});

const summarySchema = z.object({
  practiced: z.array(z.string()),
  struggledWith: z.array(z.string()),
  improvedOn: z.array(z.string()),
  parentNote: z.string(),
});

const endpoint = process.env.KIMI_BASE_URL || 'https://api.moonshot.ai/v1/chat/completions';

function getApiKey() {
  return process.env.KIMI_API_KEY || process.env.MISTRAL_API_KEY || '';
}

function stripCodeFences(value) {
  return value.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
}

async function askModel(system, user) {
  const key = getApiKey();
  if (!key) {
    return null;
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.KIMI_MODEL || process.env.MISTRAL_MODEL || 'kimi-k2-0905-preview',
      temperature: 0.6,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`AI request failed with ${response.status}`);
  }

  const data = await response.json();
  return responseSchema.parse(data?.choices?.[0]?.message?.content || '');
}

async function askJson(schema, fallback, system, user) {
  try {
    const content = await askModel(`${system} Return JSON only.`, user);
    if (!content) {
      return fallback();
    }

    return schema.parse(JSON.parse(stripCodeFences(content)));
  } catch {
    return fallback();
  }
}

export async function generateMission(child, subject, level = 1, difficulty = 'medium') {
  const kid = kids[child] || kids.ethan;
  return askJson(
    z.object({
      title: z.string(),
      summary: z.string(),
      steps: z.array(z.string()).min(3),
      reward: z.string(),
    }),
    () => fallbackMission(child, subject),
    'You create safe, parent-led learning missions for children.',
    `Create a mission for ${kid.name}. Personality: ${kid.vibe}. Subject: ${subject}. Level: ${level}. Difficulty: ${difficulty}. Make it practical, fun, and parent-supervised.`
  );
}

export async function generateStory(child, theme) {
  const kid = kids[child] || kids.ethan;
  try {
    const content = await askModel(
      'You write short bedtime stories for children. Keep it warm, imaginative, safe, and parent-friendly.',
      `Write a bedtime story for ${kid.name}. Personality: ${kid.vibe}. Theme: ${theme}. Keep it under 350 words.`
    );
    return content || fallbackStory(child, theme);
  } catch {
    return fallbackStory(child, theme);
  }
}

export async function generateExplain(child, topic) {
  const kid = kids[child] || kids.ethan;
  try {
    const content = await askModel(
      'Explain topics to a child in plain language. Be accurate, vivid, and age-appropriate.',
      `Explain this like I am 7 for ${kid.name}. Personality: ${kid.vibe}. Topic: ${topic}. Include one analogy and one tiny challenge.`
    );
    return content || fallbackExplain(child, topic);
  } catch {
    return fallbackExplain(child, topic);
  }
}

export async function generateTutorAnswer(child, topic, level = 1, difficulty = 'medium') {
  const kid = kids[child] || kids.ethan;
  return askJson(
    tutorSchema,
    () => ({
      answer: fallbackExplain(child, topic),
      steps: [
        'Start with a simple idea.',
        'Add one tiny example.',
        'Ask the child to repeat it in their own words.',
      ],
      analogy: `Imagine ${topic} like a friendly helper.`,
      encouragement: `Nice work, ${kid.name}!`,
    }),
    'You are a kid-friendly tutor who explains answers clearly, simply, and warmly.',
    `Explain the answer for ${kid.name}. Topic: ${topic}. Level: ${level}. Difficulty: ${difficulty}. Use short sentences, one analogy, and one encouragement.`
  );
}

export async function generatePracticeQuestions(child, topic, level = 1, difficulty = 'medium') {
  const kid = kids[child] || kids.ethan;
  return askJson(
    practiceSchema,
    () => ({
      questions: [
        {
          id: 'q1',
          prompt: `What is one thing you notice about ${topic}?`,
          support: 'Look for a detail you can describe.',
          difficulty: 'easy',
          expectedClue: 'A simple observation.',
        },
        {
          id: 'q2',
          prompt: `Why do you think ${topic} matters in real life?`,
          support: 'Think about where you have seen it before.',
          difficulty: 'medium',
          expectedClue: 'A real-world reason.',
        },
      ],
    }),
    'You create child-friendly practice questions that build confidence and curiosity.',
    `Create practice questions for ${kid.name}. Topic: ${topic}. Level: ${level}. Difficulty: ${difficulty}. Return 2 to 4 questions.`
  );
}

export async function generateHint(child, topic, question, level = 1) {
  return askJson(
    hintSchema,
    () => ({
      hint: `Think about ${topic} step by step.`,
      nextStep: `Try answering the question in one short sentence.`,
    }),
    'You give gentle, encouraging hints to children without giving away the full answer.',
    `Child: ${child}. Topic: ${topic}. Level: ${level}. Question: ${question}. Give one helpful hint and one next step.`
  );
}

export async function generateFeedback(child, topic, question, answer, level = 1, difficulty = 'medium') {
  const kid = kids[child] || kids.ethan;
  return askJson(
    feedbackSchema,
    () => ({
      score: answer.trim() ? 75 : 40,
      summary: answer.trim()
        ? `Good effort, ${kid.name}. You gave it a try.`
        : `Nice start, ${kid.name}. Let's keep practicing.`,
      whatWentWell: 'You stayed engaged and tried to answer.',
      whatToTryNext: 'Add one more detail next time.',
      encouragement: `I'm proud of your effort, ${kid.name}!`,
    }),
    'You give quiz feedback to children. Be accurate, kind, specific, and growth-minded.',
    `Child: ${kid.name}. Topic: ${topic}. Level: ${level}. Difficulty: ${difficulty}. Question: ${question}. Child answer: ${answer}. Give a score from 0 to 100, specific praise, and one improvement tip.`
  );
}

export async function generateEncouragement(child, topic, performance = 0.75) {
  const kid = kids[child] || kids.ethan;
  try {
    const content = await askModel(
      'You write short, personalized encouragement messages for children.',
      `Child: ${kid.name}. Topic: ${topic}. Performance: ${performance}. Give one warm sentence with playful praise.`
    );
    return content || `Great work, ${kid.name}! You ${performance >= 0.75 ? 'showed strong understanding' : 'kept going and learned more'} about ${topic}.`;
  } catch {
    return `Great work, ${kid.name}! You ${performance >= 0.75 ? 'showed strong understanding' : 'kept going and learned more'} about ${topic}.`;
  }
}

export async function generateParentSummary(child, topic, stateSummary) {
  return askJson(
    summarySchema,
    () => ({
      practiced: [topic],
      struggledWith: stateSummary.struggleTopics || [],
      improvedOn: stateSummary.masteredTopics || [],
      parentNote: 'Your child stayed engaged and made steady progress.',
    }),
    'You write concise parent summaries about what a child practiced, struggled with, and improved on.',
    `Create a parent summary for child ${child}. Topic: ${topic}. Child summary: ${JSON.stringify(stateSummary)}. Keep it short and practical.`
  );
}
