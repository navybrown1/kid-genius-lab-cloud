import { fallbackExplain, fallbackMission, fallbackStory, kids } from './fallback';

const endpoint = 'https://api.mistral.ai/v1/chat/completions';

async function askMistral(system, user) {
  const key = process.env.MISTRAL_API_KEY;
  if (!key) return null;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: process.env.MISTRAL_MODEL || 'mistral-large-latest',
      temperature: 0.7,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`Mistral request failed with ${response.status}`);
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content || null;
}

export async function generateMission(child, subject) {
  const kid = kids[child] || kids.ethan;
  try {
    const content = await askMistral(
      'You create safe, parent-led learning missions for children. Return concise JSON only with title, summary, steps array, and reward.',
      `Create a mission for ${kid.name}. Personality: ${kid.vibe}. Subject: ${subject}. Make it practical, fun, and parent-supervised.`
    );
    if (!content) return fallbackMission(child, subject);
    return JSON.parse(content.replace(/^```json|```$/g, '').trim());
  } catch {
    return fallbackMission(child, subject);
  }
}

export async function generateStory(child, theme) {
  const kid = kids[child] || kids.ethan;
  try {
    const content = await askMistral(
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
    const content = await askMistral(
      'Explain topics to a child in plain language. Be accurate, vivid, and age-appropriate.',
      `Explain this like I am 7 for ${kid.name}. Personality: ${kid.vibe}. Topic: ${topic}. Include one analogy and one tiny challenge.`
    );
    return content || fallbackExplain(child, topic);
  } catch {
    return fallbackExplain(child, topic);
  }
}
