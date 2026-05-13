import { generateMission } from '../../../lib/mistral';

export async function POST(req) {
  const body = await req.json();
  const data = await generateMission(body.child, body.subject);
  return Response.json(data);
}
