import { generateExplain } from '../../../lib/mistral';

export async function POST(req) {
  const body = await req.json();
  const explanation = await generateExplain(body.child, body.topic);
  return Response.json({ explanation });
}
