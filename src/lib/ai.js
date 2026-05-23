import { z } from 'zod';
import { fallbackExplain, fallbackMission, fallbackPracticeQuestions, fallbackStory, kids } from './fallback';

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

const DEFAULT_KIMI_BASE_URL = 'https://api.moonshot.ai/v1';
const DEFAULT_MODEL = 'moonshot-v1-8k';
const FALLBACK_MODELS = ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'];

function getApiKey() {
  return process.env.KIMI_API_KEY || process.env.MOONSHOT_API_KEY || '';
}

function getEndpoint() {
  const raw = process.env.KIMI_BASE_URL || process.env.MOONSHOT_BASE_URL || DEFAULT_KIMI_BASE_URL;
  const trimmed = raw.trim().replace(/\/+$/, '');
  return trimmed.endsWith('/chat/completions') ? trimmed : `${trimmed}/chat/completions`;
}

function getPrimaryModel() {
  return process.env.KIMI_MODEL || process.env.MOONSHOT_MODEL || DEFAULT_MODEL;
}

function getModelCandidates() {
  return Array.from(new Set([getPrimaryModel(), ...FALLBACK_MODELS].filter(Boolean)));
}

function stripCodeFences(value) {
  return value.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
}

function extractJsonObject(value) {
  const clean = stripCodeFences(value || '');
  try {
    return JSON.parse(clean);
  } catch {
    const start = clean.indexOf('{');
    const end = clean.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(clean.slice(start, end + 1));
    }
    throw new Error('Model did not return parseable JSON.');
  }
}

async function readErrorBody(response) {
  try {
    const text = await response.text();
    return text.slice(0, 500);
  } catch {
    return '';
  }
}

function logAiFailure(context, error) {
  console.error(`[Kid Genius Lab AI fallback] ${context}:`, error?.message || error);
}

function buildJsonSystem(system) {
  return `${system}\n\nReturn valid JSON only. No markdown. No code fences. Do not include extra keys. Make the content specific to the topic. Never use vague placeholder lines like invisible helper unless the topic actually requires that idea.`;
}

async function askModel(system, user, options = {}) {
  const key = getApiKey();
  if (!key) {
    return null;
  }

  const endpoint = getEndpoint();
  const models = getModelCandidates();
  let lastError = null;

  for (const model of models) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          temperature: options.temperature ?? 0.55,
          max_tokens: options.maxTokens ?? 900,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
        }),
      });

      if (!response.ok) {
        const body = await readErrorBody(response);
        throw new Error(`model ${model} failed with HTTP ${response.status}${body ? `: ${body}` : ''}`);
      }

      const data = await response.json();
      return responseSchema.parse(data?.choices?.[0]?.message?.content || '');
    } catch (error) {
      lastError = error;
      logAiFailure(`Trying next Kimi model after ${model}`, error);
    }
  }

  throw lastError || new Error('No Kimi model returned a response.');
}

async function askJson(schema, fallback, system, user) {
  try {
    const content = await askModel(buildJsonSystem(system), user, { maxTokens: 1100 });
    if (!content) {
      logAiFailure('Missing Kimi API key', new Error('KIMI_API_KEY or MOONSHOT_API_KEY is not configured.'));
      return fallback();
    }

    return schema.parse(extractJsonObject(content));
  } catch (error) {
    logAiFailure('JSON generation failed', error);
    return fallback();
  }
}

export function getAiRuntimeConfig() {
  return {
    hasKey: Boolean(getApiKey()),
    endpoint: getEndpoint(),
    primaryModel: getPrimaryModel(),
    modelCandidates: getModelCandidates(),
  };
}

export async function testKimiConnection() {
  const config = getAiRuntimeConfig();
  if (!config.hasKey) {
    return { ok: false, ...config, error: 'Missing KIMI_API_KEY or MOONSHOT_API_KEY.' };
  }

  try {
    const content = await askModel(
      'You are a connection test. Reply with one short sentence only.',
      'Say: Kid Genius Lab AI is connected.',
      { temperature: 0.1, maxTokens: 60 }
    );
    return { ok: Boolean(content), ...config, sample: content || '' };
  } catch (error) {
    return { ok: false, ...config, error: error?.message || 'Kimi request failed.' };
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
    'You create safe, parent-led learning missions for children ages 6 to 8.',
    `Create a hands-on learning mission for ${kid.name}. Personality: ${kid.vibe}. Topic: ${subject}. Level: ${level}. Difficulty: ${difficulty}. Include a concrete activity, a parent role, a question the child can answer, and a fun reward. Use accurate topic details.`
  );
}

export async function generateStory(child, theme) {
  const kid = kids[child] || kids.ethan;
  try {
    const content = await askModel(
      'You write short bedtime stories for children. Keep it warm, imaginative, safe, and parent-friendly. Use concrete details from the requested theme.',
      `Write a bedtime story for ${kid.name}. Personality: ${kid.vibe}. Theme: ${theme}. Keep it under 350 words. Make the theme visible in the plot, not just mentioned once.`,
      { maxTokens: 900 }
    );
    return content || fallbackStory(child, theme);
  } catch (error) {
    logAiFailure('Story generation failed', error);
    return fallbackStory(child, theme);
  }
}

export async function generateExplain(child, topic) {
  const kid = kids[child] || kids.ethan;
  try {
    const content = await askModel(
      'Explain topics to a child in plain language. Be accurate, vivid, concrete, and age-appropriate. Avoid vague generic explanations.',
      `Explain ${topic} to ${kid.name} like a bright 7-year-old. Personality: ${kid.vibe}. Include: 1 definition, 2 real examples, 1 simple analogy, and 1 tiny challenge. Make it specific to ${topic}.`,
      { maxTokens: 800 }
    );
    return content || fallbackExplain(child, topic);
  } catch (error) {
    logAiFailure('Explanation generation failed', error);
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
        `Say what ${topic} is in one sentence.`,
        `Point to one real example of ${topic}.`,
        `Ask ${kid.name} to explain the idea back using their own example.`,
      ],
      analogy: `${topic} can be easier to understand when you compare it to something the child already knows.`,
      encouragement: `Good thinking, ${kid.name}. The goal is not perfect words. The goal is noticing more.`
    }),
    'You are a kid-friendly tutor who teaches real knowledge clearly and playfully.',
    `Teach ${topic} to ${kid.name}. Personality: ${kid.vibe}. Level: ${level}. Difficulty: ${difficulty}. Return JSON with answer, steps, analogy, and encouragement. The answer must include a real definition, at least two concrete examples, why it matters, and one question the child can answer. Do not produce a generic placeholder explanation.`
  );
}

export async function generatePracticeQuestions(child, topic, level = 1, difficulty = 'medium') {
  const kid = kids[child] || kids.ethan;
  return askJson(
    practiceSchema,
    () => ({ questions: fallbackPracticeQuestions(child, topic) }),
    'You create child-friendly practice questions that build confidence, curiosity, and real understanding.',
    `Create 3 practice questions for ${kid.name}. Topic: ${topic}. Level: ${level}. Difficulty: ${difficulty}. Return questions that check actual understanding of ${topic}. Make each question specific, short, and answerable by a child. Include support hints and expectedClue fields.`
  );
}

export async function generateHint(child, topic, question, level = 1) {
  const kid = kids[child] || kids.ethan;
  return askJson(
    hintSchema,
    () => ({
      hint: `Look for one real example of ${topic}. Then ask what it does, what it is made of, or why people care about it.`,
      nextStep: `Answer this in one sentence: one thing I know about ${topic} is...`,
    }),
    'You give gentle, encouraging hints to children without giving away the full answer.',
    `Child: ${kid.name}. Topic: ${topic}. Level: ${level}. Question: ${question}. Give one specific hint tied to the topic and one small next step.`
  );
}

export async function generateFeedback(child, topic, question, answer, level = 1, difficulty = 'medium') {
  const kid = kids[child] || kids.ethan;
  return askJson(
    feedbackSchema,
    () => ({
      score: answer.trim() ? 75 : 40,
      summary: answer.trim()
        ? `Good effort, ${kid.name}. You gave an answer about ${topic}. Now make it stronger with one specific detail.`
        : `Nice start, ${kid.name}. Let's add one idea about ${topic}.`,
      whatWentWell: answer.trim() ? 'You tried to connect your thinking to the question.' : 'You are ready to start with a small answer.',
      whatToTryNext: `Add one example, detail, or reason connected to ${topic}.`,
      encouragement: `Keep going, ${kid.name}. Smart answers are built one detail at a time.`
    }),
    'You give quiz feedback to children. Be accurate, kind, specific, and growth-minded.',
    `Child: ${kid.name}. Topic: ${topic}. Level: ${level}. Difficulty: ${difficulty}. Question: ${question}. Child answer: ${answer}. Give a fair score from 0 to 100, specific praise, and one precise improvement tip tied to the topic.`
  );
}

export async function generateEncouragement(child, topic, performance = 0.75) {
  const kid = kids[child] || kids.ethan;
  try {
    const content = await askModel(
      'You write short, personalized encouragement messages for children. Be playful, specific, and warm.',
      `Child: ${kid.name}. Topic: ${topic}. Performance: ${performance}. Give one warm sentence with playful praise and one reason to keep learning.`,
      { maxTokens: 120 }
    );
    return content || `Great work, ${kid.name}. Every question about ${topic} is another brain muscle rep.`;
  } catch (error) {
    logAiFailure('Encouragement generation failed', error);
    return `Great work, ${kid.name}. Every question about ${topic} is another brain muscle rep.`;
  }
}

export async function generateParentSummary(child, topic, stateSummary) {
  const kid = kids[child] || kids.ethan;
  return askJson(
    summarySchema,
    () => ({
      practiced: [topic],
      struggledWith: stateSummary.struggleTopics || [],
      improvedOn: stateSummary.masteredTopics || [],
      parentNote: `${kid.name} practiced ${topic}. Next time, ask for one example, one reason it matters, and one sentence explaining it back.`,
    }),
    'You write concise parent summaries about what a child practiced, struggled with, and improved on.',
    `Create a parent summary for ${kid.name}. Topic: ${topic}. Child summary: ${JSON.stringify(stateSummary)}. Keep it short, practical, and specific. Include one next action the parent can do today.`
  );
}
