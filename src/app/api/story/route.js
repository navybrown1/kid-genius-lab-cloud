import { generateStory } from '../../../lib/mistral';

export async function POST(req) {
  const body = await req.json();
  const story = await generateStory(body.child, body.theme);
  return Response.json({ story });
}
